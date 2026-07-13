from flask import jsonify, request
from datetime import timedelta
import swisseph as swe
import os
import csv
import json
from apps.calculations import get_live_planetary_positions, calculate_all_planets
from apps.chakras import calculate_chakras
from apps.utils import parse_flexible_datetime
from apps.dasha_logic import calculate_dasha, get_compressed_dasha_data, get_cycle_data
from apps.config import CYCLE_SECONDS, SECONDS_IN_YEAR

# -------------------- LOCAL DATA CENTER --------------------
DATACENTER_DIR = "/storage/emulated/0/WEB-VIM/DATACENTER"
COMBINED_FILE = os.path.join(DATACENTER_DIR, "all_kundalis.json")

def ensure_datacenter():
    if not os.path.exists(DATACENTER_DIR):
        os.makedirs(DATACENTER_DIR)

def get_sheet_csv_path(sheet_name):
    safe = "".join(c for c in sheet_name if c.isalnum() or c in " ._-")
    return os.path.join(DATACENTER_DIR, f"{safe}.csv")

def write_csv_from_rows(sheet_name, rows, headers):
    ensure_datacenter()
    path = get_sheet_csv_path(sheet_name)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

def append_csv_row(sheet_name, row):
    ensure_datacenter()
    path = get_sheet_csv_path(sheet_name)
    headers = ['Name', 'City', 'DOB (D/M/Y)', 'TOB (H/M/S)', 'Longitude', 'Latitude', 'Timezone']
    file_exists = os.path.exists(path)
    with open(path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(headers)
        writer.writerow(row)

def rebuild_combined_json():
    ensure_datacenter()
    all_entries = []
    for fname in os.listdir(DATACENTER_DIR):
        if fname.endswith('.csv') and fname != 'all_kundalis.json':
            path = os.path.join(DATACENTER_DIR, fname)
            sheet_name = os.path.splitext(fname)[0]
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    rows = list(reader)
                if not rows:
                    continue
                header = rows[0]
                start_idx = 0
                if header and header[0].strip().lower() == 'name':
                    start_idx = 1
                for row in rows[start_idx:]:
                    if len(row) >= 7:
                        all_entries.append({
                            'name': row[0].strip() if row[0] else '',
                            'city': row[1].strip() if row[1] else '',
                            'dob': row[2].strip() if row[2] else '',
                            'tob': row[3].strip() if row[3] else '',
                            'lon': row[4].strip() if row[4] else '',
                            'lat': row[5].strip() if row[5] else '',
                            'tz': row[6].strip() if row[6] else '',
                            'sheetName': sheet_name
                        })
            except Exception as e:
                print(f"Error reading {fname}: {e}")
                continue
    with open(COMBINED_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_entries, f, indent=2)
    return all_entries

def load_combined_json():
    if os.path.exists(COMBINED_FILE):
        try:
            with open(COMBINED_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

# -------------------- API ROUTES --------------------

def api_live_planets():
    try:
        lat = request.args.get('lat', 28.6139, type=float)
        lon = request.args.get('lon', 77.2090, type=float) 
        tz = request.args.get('tz', 5.5, type=float)
        live_data = get_live_planetary_positions(lat, lon, tz)
        return jsonify({'success': True, 'timestamp': live_data.get('timestamp', ''), 'planets': live_data.get('planets', {})})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def calculate_chakras_api():
    try:
        data = request.get_json()
        time_type = data.get('time_type', 'birth')
        lat = float(data.get('lat', 28.6139))
        lon = float(data.get('lon', 77.2090))
        tz = float(data.get('tz', 5.5))
        
        if time_type == 'live':
            live_data = get_live_planetary_positions(lat, lon, tz)
            chakras = calculate_chakras(live_data['planets'])
        else:
            date = data.get('date')
            time = data.get('time', '12:00:00')
            dt = parse_flexible_datetime(date, time)
            dt_utc = dt - timedelta(hours=tz)
            jd = swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, dt_utc.hour + dt_utc.minute/60 + dt_utc.second/3600)
            swe.set_sid_mode(swe.SIDM_LAHIRI)
            planets = calculate_all_planets(jd, lat, lon)
            chakras = calculate_chakras(planets)
        
        return jsonify({
            'success': True,
            'sapt_nadi': chakras['sapt_nadi'],
            'mandal': chakras['mandal'],
            'duar': chakras['duar'],
            'planets': chakras['planets']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def receive_gps():
    try:
        data = request.get_json()
        lat = float(data.get('lat', 0))
        lon = float(data.get('lon', 0))
        acc = float(data.get('accuracy', 999))
        return jsonify({
            'success': True,
            'latitude': lat,
            'longitude': lon,
            'accuracy_meters': acc,
            'precision_level': 'EXCELLENT' if acc < 10 else 'GOOD' if acc < 50 else 'FAIR',
            'message': f'GPS locked: {lat:.6f}, {lon:.6f}'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

def compressed_dasha_api():
    try:
        data = request.get_json()
        dob = data.get('dob')
        tob = data.get('tob')
        lat = float(data.get('lat', 28.6139))
        lon = float(data.get('lon', 77.2090))
        tz = float(data.get('tz', 5.5))
        target = data.get('target')
        compressed_seconds = float(data.get('compressed_seconds', 1))

        full_result = calculate_dasha(dob, tob, lat, lon, tz, target)
        if not full_result:
            return jsonify({'success': False, 'error': 'Failed to calculate base dasha'}), 400

        md_start_ts = full_result.get('md_start_ts')
        start_lord = full_result.get('nak_lord')
        target_ts = full_result.get('target_local')

        total_original_seconds = 120 * SECONDS_IN_YEAR
        scale_factor = compressed_seconds / total_original_seconds if total_original_seconds > 0 else 0

        comp_data = get_compressed_dasha_data(md_start_ts, start_lord, target_ts, scale_factor)

        all_periods = []
        for p in comp_data['all_periods']:
            all_periods.append({
                'md': p['md'], 'ad': p['ad'], 'pd': p['pd'],
                'sd': p['sd'], 'pr': p['pr'],
                'start': p['start'].isoformat(),
                'end': p['end'].isoformat()
            })

        birth = comp_data['birth_dasha']
        target_d = comp_data['target_dasha']

        return jsonify({
            'success': True,
            'all_periods': all_periods,
            'birth_dasha': {
                'md': birth['md'], 'ad': birth['ad'], 'pd': birth['pd'],
                'sd': birth['sd'], 'pr': birth['pr'],
                'start': birth['start'].isoformat(),
                'end': birth['end'].isoformat()
            } if birth else None,
            'target_dasha': {
                'md': target_d['md'], 'ad': target_d['ad'], 'pd': target_d['pd'],
                'sd': target_d['sd'], 'pr': target_d['pr'],
                'start': target_d['start'].isoformat(),
                'end': target_d['end'].isoformat()
            } if target_d else None,
            'compressed_total_seconds': comp_data['compressed_total_seconds'],
            'scale_factor': scale_factor
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ----- NEW: API to fetch cycle data on demand -----
def api_cycle_data():
    try:
        offset = int(request.args.get('offset', 0))
        md_start_str = request.args.get('md_start')
        nak_lord = request.args.get('nak_lord')
        if not md_start_str or not nak_lord:
            return jsonify({'success': False, 'error': 'Missing md_start or nak_lord'}), 400

        from datetime import datetime
        md_start_ts = datetime.fromisoformat(md_start_str)
        tree = get_cycle_data(offset, md_start_ts, nak_lord)
        return jsonify({'success': True, 'data': tree})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# -------------------- LOCAL DATA ENDPOINTS --------------------

def api_local_data():
    try:
        data = load_combined_json()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def api_sync_local():
    try:
        data = request.get_json()
        if not data or 'sheets' not in data:
            return jsonify({'success': False, 'error': 'Missing sheets data'}), 400

        ensure_datacenter()
        sheets = data['sheets']
        default_headers = ['Name', 'City', 'DOB (D/M/Y)', 'TOB (H/M/S)', 'Longitude', 'Latitude', 'Timezone']
        for sheet in sheets:
            sheet_name = sheet.get('sheetName', 'Untitled')
            rows = sheet.get('rows', [])
            headers = sheet.get('headers', default_headers)
            write_csv_from_rows(sheet_name, rows, headers)

        all_entries = rebuild_combined_json()
        return jsonify({'success': True, 'count': len(all_entries)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def api_append_local():
    try:
        data = request.get_json()
        sheet_name = data.get('sheetName')
        row = data.get('row')
        if not sheet_name or not row:
            return jsonify({'success': False, 'error': 'Missing sheetName or row'}), 400

        append_csv_row(sheet_name, row)
        rebuild_combined_json()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
