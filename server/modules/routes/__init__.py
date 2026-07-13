from flask import Flask
from .auth_routes import login
from .page_routes import page, load_additional_files
from .vimshottari_routes import vimshottari
from .api_routes import (
    api_live_planets, calculate_chakras_api, receive_gps,
    compressed_dasha_api,
    api_local_data, api_sync_local, api_append_local,
    api_cycle_data
)
from .pdf_routes import download_full_cycle_pdf, download_compressed_pdf
from .article_routes import view_article

def register_routes(app):
    app.route('/', methods=['GET', 'POST'])(login)
    app.route('/page<int:page_number>', methods=['GET', 'POST'])(page)
    app.route('/infinite-vimshottari', methods=['GET', 'POST'])(vimshottari)
    app.route('/api/live-planets')(api_live_planets)
    app.route('/calculate-chakras', methods=['POST'])(calculate_chakras_api)
    app.route('/receive-gps', methods=['POST'])(receive_gps)
    app.route('/api/compressed-dasha', methods=['POST'])(compressed_dasha_api)
    app.route('/api/cycle-data', methods=['GET'])(api_cycle_data)
    app.route('/download-full-cycle-pdf', methods=['POST'])(download_full_cycle_pdf)
    app.route('/download-compressed-pdf', methods=['POST'])(download_compressed_pdf)
    app.route('/article/<filename>')(view_article)
    app.route('/api/local-data', methods=['GET'])(api_local_data)
    app.route('/api/sync-local', methods=['POST'])(api_sync_local)
    app.route('/api/append-local', methods=['POST'])(api_append_local)
