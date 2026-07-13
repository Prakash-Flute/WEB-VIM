from datetime import datetime

def parse_flexible_datetime(date_str, time_str):
    date_str = date_str.strip() if date_str else ""
    time_str = time_str.strip() if time_str else "00:00:00"
    time_parts = time_str.split(':')
    if len(time_parts) == 2:
        time_str += ":00"
    dt_formats = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y"]
    for fmt in dt_formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            time_obj = datetime.strptime(time_str, "%H:%M:%S").time()
            return dt.replace(hour=time_obj.hour, minute=time_obj.minute, second=time_obj.second)
        except ValueError:
            continue
    raise ValueError(f"Unsupported format: '{date_str}'")

def parse_flexible_date(date_str):
    date_str = date_str.strip() if date_str else ""
    formats = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unsupported format: '{date_str}'")
