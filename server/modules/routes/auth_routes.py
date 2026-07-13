from flask import render_template, request, redirect, url_for, flash
from apps.config import USERNAME, PASSWORD

def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == USERNAME and password == PASSWORD:
            return redirect(url_for('page', page_number=1))
        else:
            flash("Invalid credentials. Please try again.")
            return render_template('Login/login.html')
    return render_template('Login/login.html')
