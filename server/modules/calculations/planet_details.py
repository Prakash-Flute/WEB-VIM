import swisseph as swe
from apps.config import MARS_CORRECTION, NAK_DEG, NAKSHATRA_NAMES, ZODIAC_SIGNS, NAK_LORDS
from apps.utils import to_dms_rounded

def get_planet_details(jd, planet_id, lat=None, lon=None, is_ascendant=False, is_mars=False):
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    tropical_long = 0
    is_retro = False
    speed = 0
    
    if is_ascendant:
        houses = swe.houses_ex(jd, lat, lon, b'P')
        tropical_long = houses[1][0]
    else:
        result = swe.calc_ut(jd, planet_id)
        tropical_long = result[0][0]
        speed = result[0][3]
        is_retro = speed < 0
    
    ayan = swe.get_ayanamsa_ut(jd)
    sid_lon = ((tropical_long - ayan) + MARS_CORRECTION) % 360.0 if (is_mars and not is_ascendant) else (tropical_long - ayan) % 360.0
    
    sign_num = int(sid_lon / 30)
    if sign_num >= 12: sign_num = 11
    sign_name = ZODIAC_SIGNS[sign_num]
    
    sign_deg = sid_lon % 30
    deg, minutes, seconds = to_dms_rounded(sign_deg)
    
    nak_index = int(sid_lon / NAK_DEG)
    if nak_index >= 27: nak_index = 26
    nak_name = NAKSHATRA_NAMES[nak_index]
    
    nak_pos = sid_lon - (nak_index * NAK_DEG)
    pada = int(nak_pos / 3.333333) + 1
    if pada > 4: pada = 4
    
    deg_crossed = nak_pos
    remaining_deg = NAK_DEG - nak_pos
    
    # FIX: Handle infinity for JSON serialization
    minutes_to_change = 99999  # Large number instead of infinity
    if speed != 0 and not is_ascendant:
        days_to_change = abs(remaining_deg / speed)
        minutes_to_change = days_to_change * 24 * 60
    
    is_glowing = 10 <= minutes_to_change <= 60
    is_critical = minutes_to_change < 10
    is_jumping = deg_crossed > 12
    
    return {
        'longitude': round(sid_lon, 4),
        'sign_num': sign_num + 1,
        'sign_name': sign_name,
        'deg': deg, 'min': minutes, 'sec': seconds,
        'dms': f"{deg}° {minutes}' {seconds}\"",
        'nakshatra_num': nak_index + 1,
        'nakshatra_name': nak_name,
        'pada': pada,
        'is_retro': is_retro,
        'lord': NAK_LORDS[nak_index % 9],
        'speed': speed,
        'deg_crossed': round(deg_crossed, 2),
        'remaining_deg': round(remaining_deg, 2),
        'minutes_to_change': round(minutes_to_change, 1) if minutes_to_change != float('inf') else 99999,
        'is_glowing': is_glowing,
        'is_critical': is_critical,
        'is_jumping': is_jumping
    }
