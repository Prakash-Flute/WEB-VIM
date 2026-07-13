from flask import render_template
import os
from apps.config import ADDITIONAL_DIR

def view_article(filename):
    file_path = os.path.join(ADDITIONAL_DIR, filename)
    if os.path.exists(file_path):
        with open(file_path, 'r') as file:
            content = file.read()
        return render_template('Article/article_view.html', content=content, filename=filename)
    else:
        return "Article not found", 404
