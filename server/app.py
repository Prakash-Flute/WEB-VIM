#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Flask
from apps.routes import register_routes
from apps.tree_manager import tree_manager
import os
import threading

basedir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(
    __name__,
    template_folder=os.path.join(basedir, 'client', 'templates'),
    static_folder=os.path.join(basedir, 'client', 'static')
)

app.secret_key = 'supersecretkey'

register_routes(app)

tree_manager.start()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))

    threading.Timer(
        2,
        lambda: os.system(
            f'termux-open-url "http://127.0.0.1:{port}/infinite-vimshottari"'
        )
    ).start()

    app.run(
        host="0.0.0.0",
        port=port,
        debug=True,
        use_reloader=False   # <-- Prevents multiprocessing warning
    )
