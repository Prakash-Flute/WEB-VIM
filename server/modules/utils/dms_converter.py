def to_dms_rounded(degrees):
    total_seconds = round(degrees * 3600)
    d = total_seconds // 3600
    remaining = total_seconds % 3600
    m = remaining // 60
    s = remaining % 60
    return d, m, s
