from flask import send_file, request, jsonify
from io import BytesIO
from apps.dasha_logic import calculate_dasha, get_compressed_dasha_data
from apps.pdf_generator import generate_pdf_report, generate_compressed_pdf_report
from apps.config import SECONDS_IN_YEAR

def download_full_cycle_pdf():
    try:
        dob = request.form["dob"]
        tob = request.form["tob"]
        lat = float(request.form["lat"])
        lon = float(request.form["lon"])
        tz = float(request.form["tz"])
        target = request.form["target"]
        cycle_offset = int(request.form.get("cycle_offset", 0))
        
        result = calculate_dasha(dob, tob, lat, lon, tz, target)
        pdf_bytes = generate_pdf_report(result, mode='full_cycle', cycle_offset=cycle_offset)
        
        # pdf_bytes is already raw bytes from the generator
        pdf_stream = BytesIO(pdf_bytes)
        pdf_stream.seek(0)
        
        if cycle_offset == 0: 
            download_name = f'Vimshottari_Full_{dob}.pdf'
        else: 
            download_name = f'Vimshottari_Cycle_{cycle_offset}_{dob}.pdf'
        
        return send_file(
            pdf_stream, 
            as_attachment=True, 
            download_name=download_name, 
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return f"Error: {str(e)}", 500

def download_compressed_pdf():
    try:
        data = request.get_json()
        dob = data.get('dob')
        tob = data.get('tob')
        lat = float(data.get('lat', 28.6139))
        lon = float(data.get('lon', 77.2090))
        tz = float(data.get('tz', 5.5))
        target = data.get('target')
        scale_factor = float(data.get('scale_factor', 1.0))

        # Recompute the full result to get the base data
        result = calculate_dasha(dob, tob, lat, lon, tz, target)
        if not result:
            return jsonify({'success': False, 'error': 'Failed to calculate base dasha'}), 400

        md_start_ts = result.get('md_start_ts')
        start_lord = result.get('nak_lord')
        target_ts = result.get('target_local')

        total_original_seconds = 120 * SECONDS_IN_YEAR
        # scale_factor is already computed from frontend, we trust it

        comp_data = get_compressed_dasha_data(md_start_ts, start_lord, target_ts, scale_factor)

        # Prepare data for PDF generation
        pdf_data = {
            'all_periods': comp_data['all_periods'],
            'birth_time': result['birth_time'],
            'birth_lat': result['birth_lat'],
            'birth_lon': result['birth_lon'],
            'birth_tz': result['birth_tz'],
            'moon_sign': result['moon_sign'],
            'moon_dms': result['moon_dms'],
            'nak_name': result['nak_name'],
            'nak_num': result['nak_num'],
            'nak_pada': result['nak_pada'],
            'nak_lord': result['nak_lord']
        }

        pdf_bytes = generate_compressed_pdf_report(pdf_data, scale_factor)
        pdf_stream = BytesIO(pdf_bytes)
        pdf_stream.seek(0)

        download_name = f'Compressed_Vimshottari_{dob}.pdf'

        return send_file(
            pdf_stream,
            as_attachment=True,
            download_name=download_name,
            mimetype='application/pdf'
        )

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
