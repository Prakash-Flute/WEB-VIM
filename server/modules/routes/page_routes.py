from flask import render_template, request, redirect, url_for, flash, url_for
import os
from apps.config import ADDITIONAL_DIR

def load_additional_files():
    file_list = []
    if os.path.exists(ADDITIONAL_DIR):
        for filename in os.listdir(ADDITIONAL_DIR):
            if filename.endswith('.txt'):
                name, _ = os.path.splitext(filename)
                if '(' in name and ')' in name:
                    srno = name[name.find('(')+1:name.find(')')]
                    adhyay = name.replace(f'({srno})', '').strip()
                else:
                    srno = ''
                    adhyay = name
                url = url_for('view_article', filename=filename)
                file_list.append({'srno': srno, 'adhyay': adhyay, 'url': url})
    return file_list

def page(page_number):
    if 1 <= page_number <= 15:
        if request.method == 'POST':
            if page_number == 2:
                ascendant = request.form.get('ascendant')
                house = request.form.get('house')
                planet = request.form.get('planet')
                aspected_by = request.form.get('aspectedBy')
                aspected_from_house = request.form.get('aspectedFromHouse')
                nakshatra = request.form.get('nakshatra')
                
                if not ascendant or not house or not planet:
                    flash("All fields are required. Please fill them out.")
                    return redirect(url_for('page', page_number=2))
                
                return redirect(url_for('page', page_number=3,
                                        ascendant=ascendant, house=house, planet=planet,
                                        aspected_by=aspected_by, aspected_from_house=aspected_from_house,
                                        nakshatra=nakshatra))

        if page_number == 3:
            return render_template('PAGE 3/page3.html')

        if page_number == 15:
            files = load_additional_files()
            return render_template('PAGE 15/page15.html', file_list=files)

        return render_template(f'pages/page{page_number}.html')
    else:
        return "Page not found", 404
