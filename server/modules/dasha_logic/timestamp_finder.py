from datetime import timedelta
from apps.config import DASHA_YEARS, SECONDS_IN_YEAR, CYCLE_SECONDS
from apps.utils import get_dasha_sequence, calculate_sub_period_duration

def find_dasha_at_timestamp(target_ts, md_start_ts, start_md_lord):
    planets = get_dasha_sequence()
    current_time = md_start_ts
    md_planets_cycle = planets[planets.index(start_md_lord):] + planets[:planets.index(start_md_lord)]
    
    md_lord = None
    md_start = None
    md_end = None
    md_duration_sec = 0
    
    for lord in md_planets_cycle:
        years = DASHA_YEARS[lord]
        duration = years * SECONDS_IN_YEAR
        end_time = current_time + timedelta(seconds=duration)
        
        if current_time <= target_ts < end_time:
            md_lord = lord
            md_start = current_time
            md_end = end_time
            md_duration_sec = duration
            break
        elif target_ts == end_time:
            md_lord = planets[(planets.index(lord) + 1) % 9]
            next_duration = DASHA_YEARS[md_lord] * SECONDS_IN_YEAR
            md_start = end_time
            md_end = end_time + timedelta(seconds=next_duration)
            md_duration_sec = next_duration
            break
        current_time = end_time
    
    if not md_lord:
        total_cycle_seconds = CYCLE_SECONDS
        time_since_start = (target_ts - md_start_ts).total_seconds()
        if time_since_start < 0: time_since_start = 0
        
        cycle_position = time_since_start % total_cycle_seconds
        current_pos = 0
        
        for i, lord in enumerate(md_planets_cycle):
            years = DASHA_YEARS[lord]
            duration = years * SECONDS_IN_YEAR
            
            if current_pos <= cycle_position < (current_pos + duration):
                md_lord = lord
                cycles_completed = time_since_start // total_cycle_seconds
                actual_start = md_start_ts + timedelta(seconds=(cycles_completed * total_cycle_seconds) + current_pos)
                md_start = actual_start
                md_end = actual_start + timedelta(seconds=duration)
                md_duration_sec = duration
                break
            current_pos += duration
        
        if not md_lord:
            md_lord = md_planets_cycle[0]
            md_duration_sec = DASHA_YEARS[md_lord] * SECONDS_IN_YEAR
            md_start = md_start_ts
            md_end = md_start_ts + timedelta(seconds=md_duration_sec)
    
    ad_start = md_start
    ad_lord = None
    ad_end = None
    
    for i in range(9):
        planet_idx = (planets.index(md_lord) + i) % 9
        lord = planets[planet_idx]
        duration = calculate_sub_period_duration(md_duration_sec, lord)
        end_time = ad_start + timedelta(seconds=duration)
        
        if ad_start <= target_ts < end_time:
            ad_lord = lord
            ad_end = end_time
            break
        ad_start = end_time
    
    if not ad_lord:
        ad_lord = planets[planets.index(md_lord)]
        ad_end = md_end
        ad_start = md_start
    
    ad_duration_sec = (ad_end - ad_start).total_seconds()
    
    pd_start = ad_start
    pd_lord = None
    pd_end = None
    
    for i in range(9):
        planet_idx = (planets.index(ad_lord) + i) % 9
        lord = planets[planet_idx]
        duration = calculate_sub_period_duration(ad_duration_sec, lord)
        end_time = pd_start + timedelta(seconds=duration)
        
        if pd_start <= target_ts < end_time:
            pd_lord = lord
            pd_end = end_time
            break
        pd_start = end_time
    
    if not pd_lord:
        pd_lord = planets[planets.index(ad_lord)]
        pd_end = ad_end
        pd_start = ad_start
    
    pd_duration_sec = (pd_end - pd_start).total_seconds()
    
    sd_start = pd_start
    sd_lord = None
    sd_end = None
    
    for i in range(9):
        planet_idx = (planets.index(pd_lord) + i) % 9
        lord = planets[planet_idx]
        duration = calculate_sub_period_duration(pd_duration_sec, lord)
        end_time = sd_start + timedelta(seconds=duration)
        
        if sd_start <= target_ts < end_time:
            sd_lord = lord
            sd_end = end_time
            break
        sd_start = end_time
    
    if not sd_lord:
        sd_lord = planets[planets.index(pd_lord)]
        sd_end = pd_end
        sd_start = pd_start
    
    sd_duration_sec = (sd_end - sd_start).total_seconds()
    
    pr_start = sd_start
    pr_lord = None
    pr_end = None
    
    for i in range(9):
        planet_idx = (planets.index(sd_lord) + i) % 9
        lord = planets[planet_idx]
        duration = calculate_sub_period_duration(sd_duration_sec, lord)
        end_time = pr_start + timedelta(seconds=duration)
        
        if pr_start <= target_ts < end_time:
            pr_lord = lord
            pr_end = end_time
            break
        pr_start = end_time
    
    if not pr_lord:
        pr_lord = planets[planets.index(sd_lord)]
        pr_end = sd_end
        pr_start = sd_start
    
    return {
        'md': (md_lord, md_start, md_end), 'ad': (ad_lord, ad_start, ad_end),
        'pd': (pd_lord, pd_start, pd_end), 'sd': (sd_lord, sd_start, sd_end),
        'pr': (pr_lord, pr_start, pr_end)
    }
