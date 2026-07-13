def calculate_sub_period_duration(main_period_sec, sub_lord):
    """Calculate sub-period (Antardasha) duration in seconds
    Formula: (Years of sub-lord / 120) * Main period duration
    """
    from apps.config import DASHA_YEARS
    total_vim_years = 120  # Sum of all dasha years (7+20+6+10+7+18+16+19+17)
    sub_lord_years = DASHA_YEARS.get(sub_lord, 0)
    
    # Calculate proportional duration
    duration = (sub_lord_years / total_vim_years) * main_period_sec
    return duration
