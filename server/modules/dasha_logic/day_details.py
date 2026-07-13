from .timestamp_finder import find_dasha_at_timestamp
from apps.utils import parse_flexible_date

def get_day_dasha_details(md_start_ts, start_md_lord, target_date_str, tz_offset=0):
    target_date = parse_flexible_date(target_date_str)
    day_start = target_date.replace(hour=0, minute=0, second=0)
    day_end = target_date.replace(hour=23, minute=59, second=59)
    
    periods = []
    current_time = day_start
    
    dasha = find_dasha_at_timestamp(current_time, md_start_ts, start_md_lord)
    
    if not dasha:
        return {
            'error': 'Date out of range', 'target_date': target_date_str, 'periods': [],
            'md_lord': 'N/A', 'md_end': 'N/A', 'ad_lord': 'N/A', 'ad_end': 'N/A',
            'pd_lord': 'N/A', 'pd_end': 'N/A', 'sd_lord': 'N/A', 'sd_end': 'N/A'
        }
    
    md_end = dasha['md'][2]
    ad_end = dasha['ad'][2]
    pd_end = dasha['pd'][2]
    sd_end = dasha['sd'][2]
    
    iteration = 0
    while current_time < day_end and iteration < 50:
        dasha = find_dasha_at_timestamp(current_time, md_start_ts, start_md_lord)
        if not dasha: break
        
        pr_end = dasha['pr'][2]
        
        periods.append({
            'md': dasha['md'][0], 'ad': dasha['ad'][0], 'pd': dasha['pd'][0],
            'sd': dasha['sd'][0], 'pr': dasha['pr'][0],
            'end_time': pr_end.strftime("%d-%b-%Y %H:%M:%S"),
            'end_date': pr_end.strftime("%d-%b-%Y"),
            'end_datetime': pr_end
        })
        
        current_time = dasha['pr'][2]
        iteration += 1
        if current_time >= day_end: break
    
    if not periods:
        return {
            'error': 'No periods found', 'target_date': target_date_str, 'periods': [],
            'md_lord': 'N/A', 'md_end': 'N/A', 'ad_lord': 'N/A', 'ad_end': 'N/A',
            'pd_lord': 'N/A', 'pd_end': 'N/A', 'sd_lord': 'N/A', 'sd_end': 'N/A'
        }
    
    return {
        'md_lord': periods[0]['md'], 'md_end': md_end.strftime("%d-%b-%Y %H:%M"),
        'ad_lord': periods[0]['ad'], 'ad_end': ad_end.strftime("%d-%b-%Y %H:%M"),
        'pd_lord': periods[0]['pd'], 'pd_end': pd_end.strftime("%d-%b-%Y %H:%M"),
        'sd_lord': periods[0]['sd'], 'sd_end': sd_end.strftime("%d-%b-%Y %H:%M:%S"),
        'periods': periods, 'target_date': target_date_str
    }
