/**
 * Sheet Integration – Google Sheets for Kundali storage
 * Uses Google Identity Services (GIS) OAuth 2.0
 *
 * FEATURES:
 * - Searches local DATACENTER (offline) first, falls back to Drive if connected.
 * - Syncs Drive data to local CSV files.
 * - Blinking green dot when connected.
 * - Single SYNC button that syncs and refreshes.
 * - Mobile-friendly (no zoom on touch).
 * - Recursive Drive scanning with expanded mimeTypes.
 * - Dynamic sheet reading (Google Sheets, Excel, CSV, ODS).
 * - Auto-fill and submit on click.
 */

const SheetManager = {
    SCOPES: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
    CLIENT_ID: '683357297369-ol0gt1l9o06fop8uldona4iph5vq162e.apps.googleusercontent.com',
    tokenClient: null,
    accessToken: null,
    expiresAt: 0,
    folderName: 'ASTROLOGY DATA BANK',
    folderId: null,
    selectedSheetId: null,
    sheets: [],
    allKundalis: [],          // will hold local data after load
    isInitialized: false,
    gisLoaded: false,
    folderOperationInProgress: false,
    _scopeChanged: false,
    isSyncing: false,

    // ---- Initialization ----

    loadGIS() {
        return new Promise((resolve, reject) => {
            if (typeof google !== 'undefined' && google.accounts) {
                this.gisLoaded = true;
                resolve();
                return;
            }
            const existing = document.querySelector('script[src*="gsi/client"]');
            if (existing) {
                const check = setInterval(() => {
                    if (typeof google !== 'undefined' && google.accounts) {
                        clearInterval(check);
                        this.gisLoaded = true;
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(check);
                    reject(new Error('GIS script load timeout'));
                }, 10000);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                const check = setInterval(() => {
                    if (typeof google !== 'undefined' && google.accounts) {
                        clearInterval(check);
                        this.gisLoaded = true;
                        resolve();
                    }
                }, 100);
            };
            script.onerror = () => reject(new Error('Failed to load GIS script'));
            document.head.appendChild(script);
        });
    },

    async init() {
        console.log('SheetManager.init() called');
        if (this.isInitialized) return;
        try {
            await this.loadGIS();
        } catch (e) {
            console.error('GIS load failed:', e);
            this.setStatus('Failed to load Google Identity Services. Please check your internet and refresh.', true);
            this.showConnectedUI(false);
            return;
        }
        if (!this.gisLoaded) {
            this.setStatus('Google Identity Services not available. Please refresh.', true);
            this.showConnectedUI(false);
            return;
        }
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES,
            prompt: 'select_account',
            callback: (tokenResponse) => {
                console.log('OAuth callback', tokenResponse);
                if (tokenResponse && tokenResponse.access_token) {
                    this.accessToken = tokenResponse.access_token;
                    this.expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
                    localStorage.setItem('sm_gsheet_token', this.accessToken);
                    localStorage.setItem('sm_gsheet_expires', String(this.expiresAt));
                    this._scopeChanged = false;
                    this.onConnected();
                } else {
                    console.error('OAuth failed', tokenResponse);
                    this.setStatus('OAuth failed. Please try again.', true);
                    this.showConnectedUI(false);
                }
            }
        });
        this.loadStoredToken();
        this.restoreState();
        this.isInitialized = true;
        this.updateUI();
        console.log('SheetManager initialized');
        this.loadLocalData();
    },

    loadStoredToken() {
        const t = localStorage.getItem('sm_gsheet_token');
        const e = parseInt(localStorage.getItem('sm_gsheet_expires') || '0');
        if (t && Date.now() < e) {
            this.accessToken = t;
            this.expiresAt = e;
        }
    },

    getToken() {
        this.loadStoredToken();
        if (this.accessToken && Date.now() < this.expiresAt) return this.accessToken;
        return null;
    },

    // ---- State persistence ----

    restoreState() {
        const fid = localStorage.getItem('sm_folder_id');
        if (fid) {
            this.folderId = fid;
            console.log('Restored folder ID:', fid);
        }
        const sid = localStorage.getItem('sm_selected_sheet');
        if (sid) {
            this.selectedSheetId = sid;
            console.log('Restored selected sheet ID:', sid);
        }
    },

    saveState() {
        if (this.folderId) {
            localStorage.setItem('sm_folder_id', this.folderId);
        }
        if (this.selectedSheetId) {
            localStorage.setItem('sm_selected_sheet', this.selectedSheetId);
        }
    },

    // ---- Connection flow ----

    connect() {
        console.log('SheetManager.connect() called');
        const token = this.getToken();
        if (token && this.sheets.length === 0 && !this._scopeChanged) {
            console.log('Token exists but no sheets – forcing re-authentication for new scope.');
            this._scopeChanged = true;
            localStorage.removeItem('sm_gsheet_token');
            localStorage.removeItem('sm_gsheet_expires');
            this.accessToken = null;
            this.expiresAt = 0;
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPES,
                prompt: 'consent',
                callback: (tokenResponse) => {
                    console.log('Re-auth callback', tokenResponse);
                    if (tokenResponse && tokenResponse.access_token) {
                        this.accessToken = tokenResponse.access_token;
                        this.expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
                        localStorage.setItem('sm_gsheet_token', this.accessToken);
                        localStorage.setItem('sm_gsheet_expires', String(this.expiresAt));
                        this._scopeChanged = false;
                        this.onConnected();
                    } else {
                        console.error('Re-auth failed', tokenResponse);
                        this.setStatus('Re-authentication failed. Please try again.', true);
                        this.showConnectedUI(false);
                    }
                }
            });
            this.tokenClient.requestAccessToken();
            return;
        }

        if (!this.isInitialized) {
            this.setStatus('Initializing Google services...', false);
            this.init().then(() => {
                if (this.tokenClient) this.tokenClient.requestAccessToken();
                else this.setStatus('Failed to initialize. Please refresh.', true);
            }).catch(err => this.setStatus('Error: ' + err.message, true));
            return;
        }
        if (!this.tokenClient) {
            this.setStatus('Token client not ready. Please refresh.', true);
            return;
        }
        this.tokenClient.requestAccessToken();
    },

    onConnected() {
        console.log('Connected to Google Sheets');
        this.showConnectedUI(true);
        this.ensureFolder().then(() => {
            this.loadSheets().then(() => {
                this.syncFromDriveToLocal().then(() => {
                    this.setStatus('Ready', false);
                    this.populateModalSheets();
                    this.populateSheetDropdown();
                    this.setSyncButtonSuccess();
                }).catch(err => {
                    this.setStatus('Error loading Drive data: ' + err.message, true);
                });
            }).catch(err => {
                this.setStatus('Error loading sheets: ' + err.message, true);
            });
        }).catch(err => {
            this.setStatus('Folder error: ' + err.message, true);
            this.showConnectedUI(false);
        });
    },

    showConnectedUI(connected) {
        const connectBtn = document.getElementById('connect-btn');
        const connectedState = document.getElementById('connected-state');
        const dot = document.getElementById('live-dot');
        const syncBtn = document.getElementById('sync-btn');
        if (connected) {
            if (connectBtn) connectBtn.style.display = 'none';
            if (connectedState) connectedState.style.display = 'flex';
            if (dot) dot.style.display = 'block';
            if (syncBtn) syncBtn.style.display = 'block';
        } else {
            if (connectBtn) connectBtn.style.display = 'block';
            if (connectedState) connectedState.style.display = 'none';
            if (dot) dot.style.display = 'none';
            if (syncBtn) syncBtn.style.display = 'none';
        }
    },

    updateUI() {
        const token = this.getToken();
        if (token) {
            this.showConnectedUI(true);
            if (this.folderId && this.sheets.length === 0) {
                this.loadSheets();
            }
        } else {
            this.showConnectedUI(false);
        }
        this.loadLocalData();
    },

    // ---- Folder management ----

    async ensureFolder() {
        if (this.folderId) {
            try {
                await this.getFolderInfo(this.folderId);
                return this.folderId;
            } catch (e) {
                console.warn('Stored folder ID invalid, will search again.', e);
                this.folderId = null;
                localStorage.removeItem('sm_folder_id');
            }
        }

        if (this.folderOperationInProgress) {
            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (!this.folderOperationInProgress) {
                        clearInterval(interval);
                        resolve(this.folderId);
                    }
                }, 200);
            });
        }

        this.folderOperationInProgress = true;
        try {
            const token = this.getToken();
            if (!token) throw new Error('Not connected');

            const q = `mimeType='application/vnd.google-apps.folder' and name='${this.folderName}' and trashed=false`;
            const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name,createdTime)`;
            const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const d = await r.json();
            if (d.error) throw new Error(d.error.message);

            if (d.files && d.files.length > 0) {
                const sorted = d.files.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
                this.folderId = sorted[0].id;
                console.log('Using existing folder:', this.folderName, this.folderId);
                localStorage.setItem('sm_folder_id', this.folderId);
                return this.folderId;
            }

            console.log('Folder not found, creating new:', this.folderName);
            const createUrl = 'https://www.googleapis.com/drive/v3/files';
            const body = JSON.stringify({
                name: this.folderName,
                mimeType: 'application/vnd.google-apps.folder'
            });
            const cr = await fetch(createUrl, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body
            });
            const cd = await cr.json();
            if (cd.error) throw new Error(cd.error.message);
            this.folderId = cd.id;
            localStorage.setItem('sm_folder_id', this.folderId);
            console.log('Created new folder:', this.folderName, this.folderId);
            return this.folderId;
        } finally {
            this.folderOperationInProgress = false;
        }
    },

    async getFolderInfo(folderId) {
        const token = this.getToken();
        if (!token) throw new Error('Not connected');
        const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) {
            const err = await r.json();
            throw new Error(err.error?.message || 'Folder not found');
        }
        return r.json();
    },

    // ---- Recursive Drive scanning (expanded mimeTypes) ----

    async _getAllSheetIds(parentId) {
        const token = this.getToken();
        if (!token) throw new Error('Not connected');

        let allSheetIds = [];

        try {
            const folderQ = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            let pageToken = '';
            do {
                const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQ)}&spaces=drive&fields=nextPageToken,files(id)&pageToken=${pageToken}`;
                const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                const d = await r.json();
                if (d.error) throw new Error(d.error.message);
                for (const f of d.files) {
                    console.log('Found subfolder:', f.id);
                    const subSheets = await this._getAllSheetIds(f.id);
                    allSheetIds = allSheetIds.concat(subSheets);
                }
                pageToken = d.nextPageToken || '';
            } while (pageToken);

            const spreadsheetMimeTypes = [
                'application/vnd.google-apps.spreadsheet',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'text/csv',
                'text/tsv',
                'application/csv',
                'application/vnd.oasis.opendocument.spreadsheet'
            ];
            const mimeQuery = spreadsheetMimeTypes.map(m => `mimeType='${m}'`).join(' or ');
            const sheetQ = `'${parentId}' in parents and (${mimeQuery}) and trashed=false`;
            pageToken = '';
            do {
                const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(sheetQ)}&spaces=drive&fields=nextPageToken,files(id,name,mimeType)&pageToken=${pageToken}`;
                const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                const d = await r.json();
                if (d.error) throw new Error(d.error.message);
                for (const f of d.files) {
                    console.log('Found spreadsheet:', f.name, f.id, 'mimeType:', f.mimeType);
                    allSheetIds.push({ id: f.id, name: f.name, mimeType: f.mimeType });
                }
                pageToken = d.nextPageToken || '';
            } while (pageToken);
        } catch (e) {
            console.error('Error in _getAllSheetIds:', e);
        }

        return allSheetIds;
    },

    async listSheets() {
        const token = this.getToken();
        if (!token) throw new Error('Not connected');
        if (!this.folderId) {
            await this.ensureFolder();
        }
        return await this._getAllSheetIds(this.folderId);
    },

    async loadSheets() {
        try {
            if (!this.folderId) {
                await this.ensureFolder();
            }
            this.sheets = await this.listSheets();
            console.log('Total sheets found:', this.sheets.length);
            this.populateModalSheets();
            this.populateSheetDropdown();
            this.setStatus('Sheets loaded: ' + this.sheets.length, false);
        } catch (e) {
            this.setStatus('Error loading sheets: ' + e.message, true);
        }
    },

    // ---- Sheet dropdown (display only) ----

    populateSheetDropdown() {
        const select = document.getElementById('sheet-filter-dropdown');
        if (!select) return;
        select.innerHTML = '';
        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = '';
        select.appendChild(allOpt);

        this.sheets.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name + (s.mimeType && s.mimeType !== 'application/vnd.google-apps.spreadsheet' ? ' (non-Google)' : '');
            select.appendChild(opt);
        });

        select.value = '';
        select.onchange = null;
    },

    // ---- Modal management ----

    openSaveModal() {
        const token = this.getToken();
        if (!token) {
            alert('Please connect a Google Sheet first using the "Connect" button.');
            return;
        }
        if (this.sheets.length === 0) {
            this.loadSheets().then(() => {
                this.populateModalSheets();
                this.showModal();
            }).catch(() => this.showModal());
        } else {
            this.populateModalSheets();
            this.showModal();
        }
        const cityInput = document.getElementById('citySearch');
        const modalCity = document.getElementById('modal-city');
        if (modalCity && cityInput) {
            modalCity.value = cityInput.value.trim();
        }
    },

    showModal() {
        const modal = document.getElementById('save-kundali-modal');
        if (modal) modal.style.display = 'flex';
        setTimeout(() => {
            const nameInput = document.getElementById('modal-name');
            if (nameInput) nameInput.focus();
        }, 100);
    },

    closeSaveModal() {
        const modal = document.getElementById('save-kundali-modal');
        if (modal) modal.style.display = 'none';
    },

    populateModalSheets() {
        const select = document.getElementById('modal-sheet-select');
        if (!select) return;
        select.innerHTML = '';
        if (this.sheets.length === 0) {
            select.innerHTML = '<option value="">No sheets found</option>';
            return;
        }
        this.sheets.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            select.appendChild(opt);
        });
        if (this.selectedSheetId) {
            const exists = Array.from(select.options).some(opt => opt.value === this.selectedSheetId);
            if (exists) {
                select.value = this.selectedSheetId;
            }
        }
    },

    // ---- Sheet operations from modal ----

    async createSheetFromModal() {
        const name = prompt('Enter new sheet name:');
        if (!name) return;
        const token = this.getToken();
        if (!token) { alert('Not connected'); return; }
        try {
            if (!this.folderId) {
                await this.ensureFolder();
            }
            this.sheets = await this.listSheets();
            const existing = this.sheets.find(s => s.name.toLowerCase() === name.toLowerCase());
            if (existing) {
                alert('A sheet with this name already exists.');
                return;
            }

            const body = JSON.stringify({
                properties: { title: name },
                sheets: [{ properties: { title: 'Sheet1', gridProperties: { rowCount: 1000, columnCount: 10 } } }]
            });
            const r = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body
            });
            const d = await r.json();
            if (d.error) {
                if (d.error.message && d.error.message.includes('disabled')) {
                    alert('Google Sheets API is not enabled. Please enable it and try again.');
                    return;
                }
                throw new Error(d.error.message);
            }
            const sheetId = d.spreadsheetId;

            const moveUrl = `https://www.googleapis.com/drive/v3/files/${sheetId}?addParents=${this.folderId}`;
            const mr = await fetch(moveUrl, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
            const md = await mr.json();
            if (md.error) throw new Error(`Move to folder failed: ${md.error.message}`);

            const headers = [['Name', 'City', 'DOB (D/M/Y)', 'TOB (H/M/S)', 'Longitude', 'Latitude', 'Timezone']];
            const hurl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:G1:append?valueInputOption=USER_ENTERED`;
            const hr = await fetch(hurl, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: headers })
            });
            const hd = await hr.json();
            if (hd.error) throw new Error(hd.error.message);

            this.setStatus('Sheet created: ' + name, false);
            await this.loadSheets();
            const select = document.getElementById('modal-sheet-select');
            if (select) {
                const opt = Array.from(select.options).find(o => o.textContent === name);
                if (opt) {
                    select.value = opt.value;
                    this.selectedSheetId = opt.value;
                    this.saveState();
                }
            }
            this.populateSheetDropdown();
        } catch (e) {
            alert('Create failed: ' + e.message);
        }
    },

    async deleteSheetFromModal() {
        const select = document.getElementById('modal-sheet-select');
        if (!select || !select.value) { alert('Select a sheet first.'); return; }
        if (!confirm('Delete sheet permanently? This cannot be undone.')) return;
        const token = this.getToken();
        if (!token) { alert('Not connected'); return; }
        try {
            const url = `https://www.googleapis.com/drive/v3/files/${select.value}`;
            const r = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            if (!r.ok) throw new Error('Delete failed');
            this.setStatus('Sheet deleted', false);
            if (this.selectedSheetId === select.value) {
                this.selectedSheetId = null;
                localStorage.removeItem('sm_selected_sheet');
            }
            await this.loadSheets();
            const select2 = document.getElementById('modal-sheet-select');
            if (select2 && select2.options.length > 0) {
                select2.value = select2.options[0].value;
                this.selectedSheetId = select2.value;
                this.saveState();
            }
            this.syncFromDriveToLocal();
            this.populateSheetDropdown();
        } catch (e) {
            alert('Delete failed: ' + e.message);
        }
    },

    // ---- Save from modal ----

    async saveFromModal() {
        const token = this.getToken();
        if (!token) { alert('Not connected'); return; }

        const select = document.getElementById('modal-sheet-select');
        if (!select || !select.value) {
            alert('Please select or create a sheet first.');
            return;
        }

        const sheetId = select.value;
        this.selectedSheetId = sheetId;
        this.saveState();

        const name = document.getElementById('modal-name').value.trim();
        const city = document.getElementById('modal-city').value.trim();

        if (!name) { alert('Please enter a name.'); return; }
        if (!city) { alert('Please enter a city.'); return; }

        const dob = document.getElementById('inputDob').value;
        const tob = document.getElementById('inputTob').value;
        const lat = document.getElementById('inputLat').value;
        const lon = document.getElementById('inputLon').value;
        const tz = document.getElementById('inputTz').value;

        if (!dob || !tob || !lat || !lon || !tz) {
            alert('Please fill in all birth details (DOB, TOB, Lat, Lon, TZ).');
            return;
        }

        const dobParts = dob.split('-');
        const dobDMY = `${dobParts[2]}/${dobParts[1]}/${dobParts[0]}`;
        const tobParts = tob.split(':');
        const tobHMS = `${tobParts[0].padStart(2,'0')}:${tobParts[1].padStart(2,'0')}:00`;

        const row = [[name, city, dobDMY, tobHMS, lon, lat, tz]];

        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:G:append?valueInputOption=USER_ENTERED`;
            const r = await fetch(url, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: row })
            });
            const d = await r.json();
            if (d.error) {
                if (d.error.message && d.error.message.includes('disabled')) {
                    alert('Google Sheets API is not enabled. Please enable it and try again.');
                    return;
                }
                throw new Error(d.error.message);
            }
            this.setStatus('Kundali saved!', false);
            document.getElementById('citySearch').value = city;

            try {
                const sheetName = select.options[select.selectedIndex].text;
                const appendRes = await fetch('/api/append-local', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sheetName: sheetName,
                        row: row[0]
                    })
                });
                if (!appendRes.ok) {
                    console.warn('Failed to update local CSV, but Drive save succeeded.');
                }
            } catch (e) {
                console.warn('Local append error:', e);
            }

            await this.loadLocalData();
            this.closeSaveModal();
        } catch (e) {
            alert('Save failed: ' + e.message);
        }
    },

    // ---- Status helper ----

    setStatus(msg, isError = false) {
        const el = document.getElementById('sheet-status');
        if (el) {
            el.textContent = msg;
            el.style.color = isError ? '#ff4d7d' : 'var(--accent-cyan)';
        }
    },

    // ---- Load all Kundalis (supports multiple file types) ----

    async _readSheetData(sheet) {
        const token = this.getToken();
        const sid = sheet.id;
        const mimeType = sheet.mimeType || 'application/vnd.google-apps.spreadsheet';

        let rows = [];

        try {
            if (mimeType === 'application/vnd.google-apps.spreadsheet') {
                let sheetName = 'Sheet1';
                try {
                    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties.title`;
                    const metaRes = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
                    const meta = await metaRes.json();
                    if (meta.sheets && meta.sheets.length > 0) {
                        sheetName = meta.sheets[0].properties.title || 'Sheet1';
                    }
                } catch (e) {
                    console.warn('Could not fetch sheet metadata for', sheet.name, 'fallback to Sheet1', e);
                }

                const range = `${sheetName}!A:G`;
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(range)}`;
                const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                const d = await r.json();
                if (d.error) {
                    console.warn('Error reading Google Sheet', sheet.name, ':', d.error);
                    return [];
                }
                rows = d.values || [];
            } else if (
                mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                mimeType === 'application/vnd.ms-excel' ||
                mimeType === 'application/vnd.oasis.opendocument.spreadsheet'
            ) {
                const exportUrl = `https://www.googleapis.com/drive/v3/files/${sid}/export?mimeType=text/csv`;
                const r = await fetch(exportUrl, { headers: { Authorization: `Bearer ${token}` } });
                if (!r.ok) {
                    console.warn('Export failed for', sheet.name, r.status);
                    return [];
                }
                const csvText = await r.text();
                const lines = csvText.split('\n').filter(line => line.trim() !== '');
                rows = lines.map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
            } else if (mimeType === 'text/csv' || mimeType === 'application/csv') {
                const url = `https://www.googleapis.com/drive/v3/files/${sid}?alt=media`;
                const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                if (!r.ok) {
                    console.warn('CSV read failed for', sheet.name, r.status);
                    return [];
                }
                const csvText = await r.text();
                const lines = csvText.split('\n').filter(line => line.trim() !== '');
                rows = lines.map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
            } else {
                console.warn('Unsupported mimeType for', sheet.name, mimeType);
                return [];
            }
        } catch (e) {
            console.warn('Error reading sheet', sheet.name, ':', e);
            return [];
        }

        return rows;
    },

    async loadAllKundalis() {
        try {
            const token = this.getToken();
            if (!token) {
                console.warn('Not connected to Drive, cannot load Kundalis.');
                this.allKundalis = [];
                this.renderList();
                return;
            }
            if (!this.folderId) {
                await this.ensureFolder();
            }
            this.sheets = await this.listSheets();
            console.log('Loading data from', this.sheets.length, 'sheets');
            let all = [];

            for (const sheet of this.sheets) {
                const rows = await this._readSheetData(sheet);
                if (rows.length === 0) continue;

                const firstRow = rows[0];
                const hasHeader = firstRow.length > 0 && firstRow[0].trim().toLowerCase() === 'name';
                const startRow = hasHeader ? 1 : 0;

                for (let i = startRow; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length >= 4) {
                        all.push({
                            name: row[0] ? row[0].trim() : 'Unnamed',
                            city: row[1] ? row[1].trim() : '',
                            dob: row[2] ? row[2].trim() : '',
                            tob: row[3] ? row[3].trim() : '',
                            lon: row[4] ? row[4].trim() : '',
                            lat: row[5] ? row[5].trim() : '',
                            tz: row[6] ? row[6].trim() : '',
                            sheetId: sheet.id,
                            sheetName: sheet.name
                        });
                    }
                }
            }

            this.allKundalis = all;
            console.log('Total kundalis loaded from Drive:', all.length);
            await this.syncFromDriveToLocal(all);
            this.renderList();
        } catch (e) {
            console.warn('Load all kundalis error:', e);
            this.allKundalis = [];
            this.renderList();
        }
    },

    // ---- Sync Drive data to local (called after Drive read) ----

    async syncFromDriveToLocal(dataArray = null) {
        if (this.isSyncing) return;
        this.isSyncing = true;
        this.setSyncButtonBlink(true);

        try {
            if (!dataArray) {
                dataArray = this.allKundalis;
            }
            console.log('Syncing to local, entries count:', dataArray.length);

            const sheetsPayload = [];
            if (dataArray.length > 0) {
                const groups = {};
                for (const entry of dataArray) {
                    const sheetName = entry.sheetName || 'Unknown';
                    if (!groups[sheetName]) groups[sheetName] = [];
                    groups[sheetName].push([
                        entry.name || '',
                        entry.city || '',
                        entry.dob || '',
                        entry.tob || '',
                        entry.lon || '',
                        entry.lat || '',
                        entry.tz || ''
                    ]);
                }

                for (const [sheetName, rows] of Object.entries(groups)) {
                    sheetsPayload.push({
                        sheetName: sheetName,
                        rows: rows,
                        headers: ['Name', 'City', 'DOB (D/M/Y)', 'TOB (H/M/S)', 'Longitude', 'Latitude', 'Timezone']
                    });
                }
            }

            await this._sendSyncRequest(sheetsPayload);
            await this.loadLocalData();
            this.setSyncButtonSuccess();
        } catch (e) {
            console.warn('Sync error:', e);
            this.setSyncButtonBlink(false);
        } finally {
            this.isSyncing = false;
        }
    },

    async _sendSyncRequest(sheetsPayload) {
        try {
            const res = await fetch('/api/sync-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheets: sheetsPayload })
            });
            if (!res.ok) {
                console.warn('Sync to local failed:', await res.text());
            } else {
                const data = await res.json();
                console.log('Sync to local success:', data);
            }
        } catch (e) {
            console.warn('Error syncing to local:', e);
            throw e;
        }
    },

    // ---- Load local data (for search) ----

    async loadLocalData() {
        try {
            const res = await fetch('/api/local-data');
            if (!res.ok) {
                throw new Error('Failed to fetch local data');
            }
            const data = await res.json();
            if (data.success) {
                this.allKundalis = data.data || [];
                this.renderList();
                console.log('Loaded local data:', this.allKundalis.length, 'entries');
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (e) {
            console.warn('Error loading local data:', e);
            this.allKundalis = [];
            this.renderList();
        }
    },

    // ---- Render search results (top bar dropdown) ----

    renderList() {
        const container = document.getElementById('kundali-results');
        if (!container) return;
        const searchVal = document.getElementById('kundali-search')?.value?.toLowerCase() || '';

        // Remove any leftover old container if present (safety)
        const oldContainer = document.getElementById('kundali-names-list');
        if (oldContainer) oldContainer.remove();

        if (!searchVal) {
            container.classList.remove('active');
            container.innerHTML = '';
            return;
        }

        const filtered = this.allKundalis.filter(k =>
            k.name.toLowerCase().includes(searchVal)
        );

        if (filtered.length === 0) {
            container.classList.add('active');
            container.innerHTML = '<div class="no-results">No matching kundalis found</div>';
            return;
        }

        container.classList.add('active');
        container.innerHTML = filtered.map(k => `
            <div class="kundali-name-item" data-name="${k.name}" data-city="${k.city}" data-dob="${k.dob}" data-tob="${k.tob}" data-lon="${k.lon}" data-lat="${k.lat}" data-tz="${k.tz}" onclick="SheetManager.loadKundali(this)">
                ${k.name} <span class="kundali-city">[${k.sheetName || ''}]</span>
            </div>
        `).join('');
    },

    filterList(val) {
        this.renderList();
    },

    // ---- Load Kundali - robust parsing, defaults, and auto-submit ----
    loadKundali(element) {
        const city = element.dataset.city || '';
        const dobDMY = element.dataset.dob || '';
        const tobHMS = element.dataset.tob || '';
        let lon = element.dataset.lon || '';
        let lat = element.dataset.lat || '';
        let tz = element.dataset.tz || '';

        document.getElementById('citySearch').value = city;

        if (dobDMY) {
            const parts = dobDMY.split('/');
            if (parts.length === 3) {
                const dobISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                document.getElementById('inputDob').value = dobISO;
            }
        }

        if (tobHMS) {
            const parts = tobHMS.split(':');
            if (parts.length >= 2) {
                let timeValue = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
                if (parts.length >= 3 && parts[2] !== undefined && parts[2] !== '') {
                    timeValue += `:${parts[2].padStart(2, '0')}`;
                }
                document.getElementById('inputTob').value = timeValue;
            }
        }

        const parseCoord = (val, defaultVal) => {
            const num = parseFloat(val);
            return isNaN(num) ? defaultVal : num;
        };

        const defaultLat = 28.6139;
        const defaultLon = 77.2090;
        const defaultTz = 5.5;

        let latNum = parseCoord(lat, defaultLat);
        let lonNum = parseCoord(lon, defaultLon);
        let tzNum = parseCoord(tz, defaultTz);

        if (latNum < -90 || latNum > 90) latNum = defaultLat;
        if (lonNum < -180 || lonNum > 180) lonNum = defaultLon;
        if (tzNum < -12 || tzNum > 14) tzNum = defaultTz;

        document.getElementById('inputLat').value = latNum;
        document.getElementById('inputLon').value = lonNum;
        document.getElementById('inputTz').value = tzNum;

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('inputTarget').value = `${year}-${month}-${day}`;

        const form = document.getElementById('dashaForm');
        if (form) {
            setTimeout(() => form.submit(), 100);
        }

        const container = document.getElementById('kundali-results');
        if (container) container.classList.remove('active');
    },

    // ---- Sync (single button: sync + refresh) ----

    sync() {
        if (this.isSyncing) return;
        if (!this.getToken()) {
            alert('Not connected to Drive. Connect first.');
            return;
        }
        this.setSyncButtonBlink(true);
        this.loadAllKundalis().then(() => {
            this.setSyncButtonSuccess();
        }).catch(err => {
            console.warn('Sync error:', err);
            this.setSyncButtonBlink(false);
        });
    },

    // ---- Button state helpers ----

    setSyncButtonBlink(blink) {
        const btn = document.getElementById('sync-btn');
        if (!btn) return;
        if (blink) {
            btn.classList.add('blink');
            btn.classList.remove('success');
            btn.textContent = 'SYNC';
        } else {
            btn.classList.remove('blink');
            btn.classList.remove('success');
            btn.textContent = 'SYNC';
        }
    },

    setSyncButtonSuccess() {
        const btn = document.getElementById('sync-btn');
        if (!btn) return;
        btn.classList.remove('blink');
        btn.classList.add('success');
        btn.textContent = 'SYNC ✓';
        setTimeout(() => {
            btn.classList.remove('success');
            btn.textContent = 'SYNC';
        }, 2000);
    }
};

window.SheetManager = SheetManager;

document.addEventListener('DOMContentLoaded', function() {
    // Safety: remove any lingering old container
    const oldContainer = document.getElementById('kundali-names-list');
    if (oldContainer) oldContainer.remove();

    SheetManager.init().then(() => {
        SheetManager.updateUI();
        const connectBtn = document.getElementById('connect-btn');
        if (connectBtn) {
            connectBtn.onclick = () => SheetManager.connect();
        }
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.onclick = () => SheetManager.sync();
        }
    }).catch(err => {
        console.error('Failed to load GIS:', err);
    });
});
