# server/modules/utils/karve_ascendant.py

MONTH_NUMBERS = {
    1: 726,   # January
    2: 850,
    3: 996,
    4: 1086,
    5: 1208,
    6: 1327,
    7: 6,
    8: 127,
    9: 250,
    10: 366,
    11: 491,
    12: 604
}

LAGNA_RANGES = [
    ('Mesha', 76, 181),
    ('Vrisha', 181, 302),
    ('Mithuna', 302, 434),
    ('Karka', 434, 566),
    ('Simha', 566, 691),
    ('Kanya', 691, 818),
    ('Tula', 818, 949),
    ('Vrischik', 949, 1083),
    ('Dhanu', 1083, 1208),
    ('Makara', 1208, 1319),
    ('Kumbha', 1319, 1419),
]

def compute_karve_ascendant(day, month, time_str):
    """
    Compute ascendant using the method of Shri S.E. Karve.
    day: int (1-31)
    month: int (1-12)
    time_str: string like "HH:MM:SS" or "HH:MM"
    Returns: sign name (string)
    """
    # Step 1: day * 4
    day_part = day * 4

    # Step 2: month number
    month_num = MONTH_NUMBERS.get(month)
    if month_num is None:
        raise ValueError(f"Invalid month: {month}")

    # Step 3: time in minutes from preceding midnight
    parts = time_str.split(':')
    if len(parts) == 2:
        h, m = int(parts[0]), int(parts[1])
        s = 0
    elif len(parts) == 3:
        h, m, s = int(parts[0]), int(parts[1]), int(parts[2])
    else:
        raise ValueError(f"Invalid time format: {time_str}")

    total_minutes = h * 60 + m + s / 60.0

    # Step 4: sum
    total = day_part + month_num + total_minutes

    # Step 5: if total >= 1440, subtract 1440 repeatedly
    while total >= 1440:
        total -= 1440

    # Map to lagna
    for sign, low, high in LAGNA_RANGES:
        if low <= total < high:
            return sign

    # Meena: special case (0-76 and 1419-1440)
    if total < 76 or total >= 1419:
        return 'Meena'

    # fallback (should never happen)
    return 'Unknown'
