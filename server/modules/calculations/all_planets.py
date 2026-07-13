from apps.config import NAK_DEG, NAKSHATRA_NAMES, ZODIAC_SIGNS, NAK_LORDS, PLANET_INFO
from apps.utils import to_dms_rounded
from .planet_details import get_planet_details

def calculate_all_planets(jd, lat, lon):
    planets_data = {}
    
    for name, info in PLANET_INFO.items():
        if name == 'Ketu' or name == 'Ascendant':
            continue
        
        is_mars = (name == 'Mars')
        details = get_planet_details(jd, info['swe'], lat, lon, is_ascendant=False, is_mars=is_mars)
        for k, v in info.items():
            details[k] = v
        details['name'] = name
        planets_data[name] = details
    
    # Ketu calculation
    rahu_lon = planets_data['Rahu']['longitude']
    ketu_lon = (rahu_lon + 180) % 360
    rahu_speed = planets_data['Rahu']['speed']
    
    sign_num = int(ketu_lon / 30)
    if sign_num >= 12: sign_num = 11
    sign_deg = ketu_lon % 30
    deg, minutes, seconds = to_dms_rounded(sign_deg)
    nak_index = int(ketu_lon / NAK_DEG)
    if nak_index >= 27: nak_index = 26
    nak_pos = ketu_lon - (nak_index * NAK_DEG)
    pada = int(nak_pos / 3.333333) + 1
    if pada > 4: pada = 4
    
    remaining_deg = nak_pos
    minutes_to_change = 99999  # FIX: No infinity
    if rahu_speed != 0:
        days_to_change = abs(remaining_deg / rahu_speed)
        minutes_to_change = days_to_change * 24 * 60
    
    planets_data['Ketu'] = {
        'longitude': round(ketu_lon, 4),
        'sign_num': sign_num + 1,
        'sign_name': ZODIAC_SIGNS[sign_num],
        'deg': deg, 'min': minutes, 'sec': seconds,
        'dms': f"{deg}° {minutes}' {seconds}\"",
        'nakshatra_num': nak_index + 1,
        'nakshatra_name': NAKSHATRA_NAMES[nak_index],
        'pada': pada,
        'is_retro': True,
        'lord': NAK_LORDS[nak_index % 9],
        'icon': '☋', 'color': '#708090', 'orbit': 320, 'size': 12,
        'name': 'Ketu', 'speed': rahu_speed,
        'deg_crossed': round(nak_pos, 2),
        'remaining_deg': round(remaining_deg, 2),
        'minutes_to_change': round(minutes_to_change, 1),
        'is_glowing': 10 <= minutes_to_change <= 60,
        'is_critical': minutes_to_change < 10,
        'is_jumping': nak_pos > 12
    }
    
    # Ascendant calculation
    asc_data = get_planet_details(jd, None, lat, lon, is_ascendant=True)
    asc_data.update({
        'icon': 'ASC', 
        'color': '#FFD700', 
        'orbit': 40, 
        'size': 14, 
        'name': 'Ascendant',
        'speed': 0,  # Ascendant has no speed
        'is_retro': False,
        'minutes_to_change': 99999,  # FIX: Large number instead of infinity
        'is_glowing': False,
        'is_critical': False,
        'is_jumping': False
    })
    planets_data['Ascendant'] = asc_data
    
    return planets_data
