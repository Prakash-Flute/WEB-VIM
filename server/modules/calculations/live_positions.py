import swisseph as swe
import math
from datetime import datetime, timedelta
from apps.config import PLANET_INFO
from .all_planets import calculate_all_planets

def get_live_planetary_positions(lat=28.6139, lon=77.2090, tz=5.5):
    now_utc = datetime.utcnow()
    local_time = now_utc + timedelta(hours=tz)
    jd = swe.julday(now_utc.year, now_utc.month, now_utc.day, 
                    now_utc.hour + now_utc.minute/60 + now_utc.second/3600)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    planets = calculate_all_planets(jd, lat, lon)
    
    for name, data in planets.items():
        if name not in ['Ascendant', 'Ketu'] and name in PLANET_INFO:
            result = swe.calc_ut(jd, PLANET_INFO[name]['swe'])
            tropical_deg = result[0][0]
            data['angle'] = math.radians(tropical_deg - 90)
        elif name == 'Ketu':
            data['angle'] = (planets['Rahu'].get('angle', 0) + math.pi) % (2 * math.pi)
        else:
            data['angle'] = math.radians(data['longitude'] - 90)
    
    return {
        'timestamp': local_time.strftime("%d-%b-%Y %H:%M:%S"),
        'planets': planets,
        'jd': jd
    }
