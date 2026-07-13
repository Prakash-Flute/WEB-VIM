# WEB-VIM Project Restructuring

## Overview
This project has been reorganized from a flat structure into a professional repository layout while preserving all original functionality.

## New Directory Structure

```
WEB-VIM/
├── client/                 # Frontend assets and templates
│   ├── static/            # CSS, JS, images, videos
│   │   ├── assets/        # Media files (PNG, MP4)
│   │   ├── css/           # Stylesheets
│   │   └── js/            # JavaScript files
│   └── templates/         # HTML templates
│       ├── article/       # Article-related templates
│       ├── login/         # Authentication templates
│       ├── pages/         # Page templates (page1-page15)
│       ├── privacy/       # Privacy policy
│       └── vimshottari/   # Main application templates
│           └── includes/  # Template fragments
├── content/               # Additional content
│   └── durgaa-shapatshati/  # Religious texts
├── docs/                  # Documentation
└── server/                # Backend code
    ├── app.py             # Main Flask application entry point
    ├── apps/              # Main application modules (connectors)
    ├── backups/           # Backup files (.bak)
    └── modules/           # Sub-package modules
        ├── calculations/
        ├── chakras/
        ├── config/
        ├── dasha_logic/
        ├── pdf_generator/
        ├── routes/
        ├── tree_manager/
        └── utils/
```

## Path Updates Made

### 1. Flask Application Configuration (server/app.py)
- Added explicit `template_folder` and `static_folder` configuration
- Templates now loaded from `../client/templates`
- Static files now served from `../client/static`

### 2. Import Path Updates
- All imports from `Appps.` updated to `apps.`
- All relative imports from subfolders updated to `modules.`

### 3. Configuration Paths (server/modules/config/__init__.py)
- `ARTICLES_DIR` updated to point to `client/templates/article`
- `ADDITIONAL_DIR` updated to point to `content/durgaa-shapatshati`

### 4. Template Asset References
- Updated static file references to include `assets/` subdirectory

## Files Preserved
- All 145 original files preserved
- All file fragments remain separate
- All backup files (.bak) preserved unchanged
- All compiled Python files (.pyc) preserved

## Running the Application

```bash
cd server
python app.py
```

The application will start on port 8080 by default.

## Verification
- ✅ All 145 files preserved
- ✅ No file fragments merged
- ✅ No logic modified (only import paths)
- ✅ All functionality preserved
