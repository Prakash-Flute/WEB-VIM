from flask import render_template, request
from apps.dasha_logic import calculate_dasha
from apps.utils import compute_karve_ascendant

def vimshottari():
    form_data = {}
    if request.method == "POST":
        try:
            lat = float(request.form["lat"])
            lon = float(request.form["lon"])
            tz = float(request.form["tz"])
            
            if not (-90 <= lat <= 90): raise ValueError(f"Latitude {lat} invalid")
            if not (-180 <= lon <= 180): raise ValueError(f"Longitude {lon} invalid")
            if not (-12 <= tz <= 14): raise ValueError(f"Timezone {tz} invalid")
            
            result = calculate_dasha(request.form["dob"], request.form["tob"], lat, lon, tz, request.form["target"])
            
            # ---- Karve ascendant ----
            dob_str = request.form["dob"]  # YYYY-MM-DD
            tob_str = request.form["tob"]  # HH:MM or HH:MM:SS
            try:
                # parse day and month from dob
                year, month, day = map(int, dob_str.split('-'))
                karve_asc = compute_karve_ascendant(day, month, tob_str)
                result['karve_ascendant'] = karve_asc
                print(f"[Karve] Computed ascendant: {karve_asc} for {day}/{month} at {tob_str}")
            except Exception as e:
                result['karve_ascendant'] = None
                print("[Karve] Error:", e)
            
            form_data = request.form
            return render_template('VIMSHOTTARI/vimshottari.html', result=result, error=None, form_data=form_data)
        except Exception as e:
            form_data = request.form
            return render_template('VIMSHOTTARI/vimshottari.html', result=None, error=str(e), form_data=form_data)
    # GET request
    return render_template('VIMSHOTTARI/vimshottari.html', result=None, error=None, form_data={})
