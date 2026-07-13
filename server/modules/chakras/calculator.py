from apps.config import SAPT_NADI_MAP, MANDAL_MAP, DUAR_MAP
from .normalize import normalize_nak

def calculate_chakras(planets_data):
    sapt_nadi = [[] for _ in range(7)]
    mandal = {'Agni': [], 'Vayu': [], 'Varuna': [], 'Mahendra': []}
    
    duar = {
        'Megh Duar': {'color': '#87ceeb', 'items': []},
        'Vayu Duar': {'color': '#ff4d4d', 'items': []},
        'Dharam Duar': {'color': '#ffd700', 'items': []},
        'Ret Duar': {'color': '#1e90ff', 'items': []},
        'Hem Duar': {'color': '#9932cc', 'items': []}
    }
    
    for planet_name, data in planets_data.items():
        if planet_name == 'Ascendant':
            continue
        
        nak = data['nakshatra_name']
        nak_normalized = normalize_nak(nak)
        
        planet_obj = {
            'name': planet_name,
            'icon': data['icon'],
            'color': data['color'],
            'nakshatra': nak,
            'nakshatra_name': nak,
            'pada': data['pada'],
            'is_glowing': data.get('is_glowing', False),
            'is_critical': data.get('is_critical', False),
            'is_jumping': data.get('is_jumping', False),
            'deg_crossed': data.get('deg_crossed', 0),
            'minutes_to_change': data.get('minutes_to_change', 999),
            'is_retro': data.get('is_retro', False),
            'longitude': data.get('longitude', 0),
            'sign_name': data.get('sign_name', ''),
            'dms': data.get('dms', ''),
            'lord': data.get('lord', '')
        }
        
        # Sapt Nadi
        for nadi_idx, nak_list in SAPT_NADI_MAP.items():
            for nak_name in nak_list:
                if normalize_nak(nak_name) == nak_normalized:
                    sapt_nadi[nadi_idx].append(planet_obj)
                    break
        
        # Mandal
        for mandal_name, nak_list in MANDAL_MAP.items():
            for nak_name in nak_list:
                if normalize_nak(nak_name) == nak_normalized:
                    mandal[mandal_name].append({'nakshatra': nak, 'planet': planet_obj})
                    break
        
        # DUAR_MAP
        for duar_name, duar_info in DUAR_MAP.items():
            for nak_name in duar_info['nakshatras']:
                if normalize_nak(nak_name) == nak_normalized:
                    duar[duar_name]['items'].append({'nakshatra': nak, 'planet': planet_obj})
                    break
    
    return {
        'sapt_nadi': sapt_nadi,
        'mandal': mandal,
        'duar': duar,
        'planets': planets_data
    }
