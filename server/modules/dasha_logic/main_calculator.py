from datetime import datetime, timedelta
import swisseph as swe
from apps.config import VIM_YEAR, SECONDS_IN_YEAR, NAK_DEG, DASHA_YEARS, TOTAL_VIMSHOTTARI, CYCLE_SECONDS, NAKSHATRA_NAMES, NAK_LORDS, ZODIAC_SIGNS
from apps.utils import to_dms_rounded, parse_flexible_datetime, parse_flexible_date, get_dasha_sequence, calculate_sub_period_duration
from apps.calculations import calculate_all_planets
from apps.chakras import calculate_chakras
from .timestamp_finder import find_dasha_at_timestamp
from .day_details import get_day_dasha_details

def calculate_dasha(dob, tob, lat, lon, tz, target_date_str):
    try:
        birth_local = parse_flexible_datetime(dob, tob)
        target_local = parse_flexible_date(target_date_str)
    except ValueError as e:
        raise ValueError(f"Date/Time parsing error: {str(e)}")
    
    birth_utc = birth_local - timedelta(hours=tz)
    
    if not (-90 <= lat <= 90): raise ValueError(f"Invalid latitude: {lat}")
    if not (-180 <= lon <= 180): raise ValueError(f"Invalid longitude: {lon}")
    
    jd = swe.julday(birth_utc.year, birth_utc.month, birth_utc.day, 
                    birth_utc.hour + birth_utc.minute/60 + birth_utc.second/3600)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    
    moon_trop = swe.calc_ut(jd, swe.MOON)[0][0]
    ayan = swe.get_ayanamsa_ut(jd)
    moon_sid = (moon_trop - ayan) % 360.0
    if moon_sid >= 360.0: moon_sid = moon_sid % 360.0
    
    sign_num = int(moon_sid / 30)
    sign_name = ZODIAC_SIGNS[sign_num]
    sign_deg = moon_sid % 30
    
    deg = int(sign_deg)
    minutes_full = (sign_deg - deg) * 60
    minutes = int(minutes_full)
    seconds = int((minutes_full - minutes) * 60)
    
    nak_index = int(moon_sid / NAK_DEG)
    if nak_index >= 27: nak_index = nak_index % 27
    nak_name = NAKSHATRA_NAMES[nak_index]
    nak_lord = NAK_LORDS[nak_index % 9]
    nak_num = nak_index + 1
    
    nak_pos = moon_sid - (nak_index * NAK_DEG)
    pada = int(nak_pos / 3.333333) + 1
    if pada > 4: pada = 4
    
    elapsed_deg = nak_pos
    remaining_deg = NAK_DEG - elapsed_deg
    if remaining_deg <= 0: remaining_deg = NAK_DEG
    
    md_total_years = DASHA_YEARS[nak_lord]
    md_balance_years = (remaining_deg / NAK_DEG) * md_total_years
    md_balance_seconds = md_balance_years * SECONDS_IN_YEAR
    
    md_total_seconds = md_total_years * SECONDS_IN_YEAR
    md_elapsed_at_birth = md_total_seconds - md_balance_seconds
    md_start_ts = birth_local - timedelta(seconds=md_elapsed_at_birth)
    
    birth_dasha = find_dasha_at_timestamp(birth_local, md_start_ts, nak_lord)
    
    if not birth_dasha:
        first_lord = nak_lord
        first_duration = DASHA_YEARS[first_lord] * SECONDS_IN_YEAR
        birth_dasha = {
            'md': (first_lord, md_start_ts, md_start_ts + timedelta(seconds=first_duration)),
            'ad': (first_lord, md_start_ts, md_start_ts + timedelta(seconds=first_duration/9)),
            'pd': (first_lord, md_start_ts, md_start_ts + timedelta(seconds=first_duration/81)),
            'sd': (first_lord, md_start_ts, md_start_ts + timedelta(seconds=first_duration/729)),
            'pr': (first_lord, md_start_ts, md_start_ts + timedelta(seconds=first_duration/6561))
        }
    
    elapsed_birth = birth_local - md_start_ts
    elapsed_str = f"{elapsed_birth.days}d {elapsed_birth.seconds//3600}h {(elapsed_birth.seconds//60)%60}m {elapsed_birth.seconds%60}s"
    
    time_diff = target_local - birth_local
    years_diff = time_diff.days / VIM_YEAR
    time_diff_str = f"{time_diff.days} days ({years_diff:.2f} years)"
    
    # --- cycle metadata: include PAST cycle (offset -1) and cycles 0-12 ---
    cycle_metadata = []
    # First, past cycle (offset -1)
    for offset in range(-1, 13):  # -1 to 12 inclusive
        start_ts = md_start_ts + timedelta(seconds=offset * CYCLE_SECONDS)
        end_ts = start_ts + timedelta(seconds=CYCLE_SECONDS)
        label = "Past Cycle" if offset == -1 else f"Cycle {offset}"
        cycle_metadata.append({
            'offset': offset,
            'label': label,
            'start_year': start_ts.year,
            'end_year': end_ts.year,
            'start_iso': start_ts.isoformat(),
            'end_iso': end_ts.isoformat()
        })
    
    # initial_cycle_data is for cycle 0 (offset 0)
    initial_cycle_data = build_nested_dasha(md_start_ts, nak_lord)
    
    next_cycles = []
    for i in range(1, 13):
        cycle_start = md_start_ts + timedelta(seconds=(i * CYCLE_SECONDS))
        cycle_end   = md_start_ts + timedelta(seconds=((i + 1) * CYCLE_SECONDS))
        next_cycles.append({'start': cycle_start.strftime("%d/%m/%Y"), 'end': cycle_end.strftime("%d/%m/%Y")})
    
    all_planets_data = calculate_all_planets(jd, lat, lon)
    
    target_utc_noon = target_local.replace(hour=12, minute=0, second=0) - timedelta(hours=tz)
    target_jd_noon = swe.julday(target_utc_noon.year, target_utc_noon.month, target_utc_noon.day,
                               target_utc_noon.hour + target_utc_noon.minute/60 + target_utc_noon.second/3600)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    target_planets = calculate_all_planets(target_jd_noon, lat, lon)
    
    birth_chakras = calculate_chakras(all_planets_data)
    target_chakras = calculate_chakras(target_planets)
    
    return {
        'moon_sid': round(moon_sid, 4), 'moon_sign': sign_name, 'moon_deg': deg,
        'moon_min': minutes, 'moon_sec': seconds, 'moon_dms': f"{deg}° {minutes}' {seconds}\"",
        'nak_num': nak_num, 'nak_name': nak_name, 'nak_lord': nak_lord, 'nak_pada': pada,
        'birth_lat': lat, 'birth_lon': lon, 'birth_tz': tz,
        'birth_time': birth_local.strftime("%d-%b-%Y %H:%M:%S"), 'target_date': target_local.strftime("%d-%b-%Y"),
        'md_start_date': md_start_ts.strftime("%d-%b-%Y %H:%M:%S"), 'elapsed_at_birth': elapsed_str,
        'time_diff': time_diff_str, 'cycle': 1,
        'birth_md': birth_dasha['md'][0], 'birth_ad': birth_dasha['ad'][0],
        'birth_pd': birth_dasha['pd'][0], 'birth_sd': birth_dasha['sd'][0], 'birth_pr': birth_dasha['pr'][0],
        'day_details': get_day_dasha_details(md_start_ts, nak_lord, target_date_str, tz),
        'next_cycles': next_cycles, 'all_planets': all_planets_data,
        'target_planets': target_planets, 'birth_chakras': birth_chakras, 'target_chakras': target_chakras,
        'md_start_ts': md_start_ts,
        'target_local': target_local,
        'nak_lord': nak_lord,
        'cycle_metadata': cycle_metadata,
        'initial_cycle_data': initial_cycle_data
    }


def get_cycle_data(offset, md_start_ts, nak_lord):
    """Return nested dasha tree for a given cycle offset (can be negative)."""
    from datetime import timedelta
    start_ts = md_start_ts + timedelta(seconds=offset * CYCLE_SECONDS)
    return build_nested_dasha(start_ts, nak_lord)


def build_nested_dasha(md_start_ts, start_lord, levels=5):
    from apps.config import DASHA_YEARS, SECONDS_IN_YEAR
    from apps.utils import get_dasha_sequence, calculate_sub_period_duration
    from datetime import timedelta

    planets = get_dasha_sequence()
    start_idx = planets.index(start_lord)

    def build_level(parent_start, parent_duration, parent_lord, level):
        if level >= levels:
            return []
        items = []
        current = parent_start
        for i in range(9):
            lord = planets[(planets.index(parent_lord) + i) % 9]
            if level == 0:
                duration = DASHA_YEARS[lord] * SECONDS_IN_YEAR
            else:
                duration = calculate_sub_period_duration(parent_duration, lord)
            end = current + timedelta(seconds=duration)
            children = build_level(current, duration, lord, level + 1)
            items.append({
                'lord': lord,
                'end': end.isoformat(),
                'children': children
            })
            current = end
        return items

    result = []
    current = md_start_ts
    for i in range(9):
        lord = planets[(start_idx + i) % 9]
        duration = DASHA_YEARS[lord] * SECONDS_IN_YEAR
        end = current + timedelta(seconds=duration)
        children = build_level(current, duration, lord, 1)
        result.append({
            'lord': lord,
            'end': end.isoformat(),
            'children': children
        })
        current = end
    return result


# Also keep the existing compressed functions unchanged (they are separate)
def get_compressed_dasha_series(md_start_ts, start_lord, scale_factor):
    from apps.config import DASHA_YEARS, SECONDS_IN_YEAR
    from apps.utils import get_dasha_sequence
    from datetime import timedelta

    planets = get_dasha_sequence()
    start_idx = planets.index(start_lord)

    periods = []
    current_time = md_start_ts

    for i in range(9):
        md_lord = planets[(start_idx + i) % 9]
        md_years = DASHA_YEARS[md_lord]
        md_duration = md_years * SECONDS_IN_YEAR * scale_factor
        md_end = current_time + timedelta(seconds=md_duration)
        
        ad_start = current_time
        for j in range(9):
            ad_lord = planets[(planets.index(md_lord) + j) % 9]
            ad_duration = (DASHA_YEARS[ad_lord] / 120) * md_duration
            ad_end = ad_start + timedelta(seconds=ad_duration)
            
            pd_start = ad_start
            for k in range(9):
                pd_lord = planets[(planets.index(ad_lord) + k) % 9]
                pd_duration = (DASHA_YEARS[pd_lord] / 120) * ad_duration
                pd_end = pd_start + timedelta(seconds=pd_duration)
                
                sd_start = pd_start
                for l in range(9):
                    sd_lord = planets[(planets.index(pd_lord) + l) % 9]
                    sd_duration = (DASHA_YEARS[sd_lord] / 120) * pd_duration
                    sd_end = sd_start + timedelta(seconds=sd_duration)
                    
                    pr_start = sd_start
                    for m in range(9):
                        pr_lord = planets[(planets.index(sd_lord) + m) % 9]
                        pr_duration = (DASHA_YEARS[pr_lord] / 120) * sd_duration
                        pr_end = pr_start + timedelta(seconds=pr_duration)
                        
                        periods.append({
                            'md': md_lord, 'ad': ad_lord, 'pd': pd_lord,
                            'sd': sd_lord, 'pr': pr_lord,
                            'start': pr_start, 'end': pr_end
                        })
                        pr_start = pr_end
                    sd_start = sd_end
                pd_start = pd_end
            ad_start = ad_end
        current_time = md_end

    return periods


def get_compressed_dasha_data(md_start_ts, start_lord, target_ts, scale_factor):
    from datetime import timedelta
    from apps.config import CYCLE_SECONDS

    all_periods = get_compressed_dasha_series(md_start_ts, start_lord, scale_factor)
    
    birth_dasha = all_periods[0] if all_periods else None
    
    compressed_total = CYCLE_SECONDS * scale_factor
    target_time = md_start_ts + timedelta(seconds=compressed_total)
    if target_ts > target_time:
        target_ts = target_time
    elif target_ts < md_start_ts:
        target_ts = md_start_ts

    target_dasha = None
    for p in all_periods:
        if p['start'] <= target_ts <= p['end']:
            target_dasha = p
            break
    if not target_dasha and all_periods:
        target_dasha = all_periods[-1]

    return {
        'all_periods': all_periods,
        'birth_dasha': birth_dasha,
        'target_dasha': target_dasha,
        'compressed_total_seconds': compressed_total
    }
