// Compression UI Logic – with Split Dashboard (Navigator + Info Panels)
let compressionActive = false;
let compressedData = null;
let allPeriods = [];
let currentFilterStart = null;
let currentFilterEnd = null;
let nestedCompressed = null; // built tree
let mdStartTs = null;
let birthDashaPeriod = null;
let targetDashaPeriod = null;

// ----- Mapping full names to abbreviations -----
const FULL_TO_ABBR = {
    'Sun': 'Su', 'Moon': 'Mo', 'Mars': 'Ma', 'Mercury': 'Me',
    'Jupiter': 'Ju', 'Venus': 'Ve', 'Saturn': 'Sa', 'Rahu': 'Ra', 'Ketu': 'Ke'
};

// ----- Toggle section -----
function toggleCompressionSection() {
    const section = document.getElementById('compressionSection');
    if (section.style.display === 'none' || section.style.display === '') {
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

// ----- Apply compression -----
function applyCompression() {
    const unit = document.getElementById('compressionUnit').value;
    const value = parseFloat(document.getElementById('compressionValue').value);
    if (!value || value <= 0) {
        alert('Please enter a positive number.');
        return;
    }
    let seconds = 0;
    switch(unit) {
        case 'seconds': seconds = value; break;
        case 'minutes': seconds = value * 60; break;
        case 'hours': seconds = value * 3600; break;
        case 'days': seconds = value * 86400; break;
        case 'months': seconds = value * 30.436875 * 86400; break;
        case 'years': seconds = value * 365.242198781 * 86400; break;
    }
    // Cap at 120 years (original)
    const maxSeconds = 120 * 365.242198781 * 86400;
    if (seconds > maxSeconds) {
        alert('Compressed duration cannot exceed 120 years.');
        return;
    }
    // Get the necessary data from the existing result
    const formData = getFormDataFromPage();
    if (!formData) {
        alert('Please calculate the dasha first.');
        return;
    }
    // Add compressed_seconds to the request
    formData.compressed_seconds = seconds;

    fetch('/api/compressed-dasha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            compressedData = data;
            allPeriods = data.all_periods;
            compressionActive = true;
            // Build nested tree from flat periods
            nestedCompressed = buildNestedFromFlat(allPeriods);
            // Store birth and target periods
            birthDashaPeriod = data.birth_dasha;
            targetDashaPeriod = data.target_dasha;
            // Render the dashboard
            renderCompressedDashboard(data);
            document.getElementById('compressionStatus').textContent = 'Active';
            document.getElementById('compressionStatus').style.color = '#00ff88';
            document.getElementById('compressionIndicator').style.display = 'inline';
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(err => {
        alert('Network error: ' + err.message);
    });
}

function getFormDataFromPage() {
    const dob = document.querySelector('input[name="dob"]')?.value;
    const tob = document.querySelector('input[name="tob"]')?.value;
    const lat = document.querySelector('input[name="lat"]')?.value;
    const lon = document.querySelector('input[name="lon"]')?.value;
    const tz = document.querySelector('input[name="tz"]')?.value;
    const target = document.querySelector('input[name="target"]')?.value;
    if (!dob || !tob || !lat || !lon || !tz || !target) {
        return null;
    }
    return { dob, tob, lat, lon, tz, target };
}

// ----- Build nested tree from flat periods (MD->AD->PD->SD->PR) -----
// IMPORTANT: Each node's 'end' must be the true ending date of that level.
// Since periods are chronological, we update the end every time we see a
// period with the same key; the last one will have the latest end.
function buildNestedFromFlat(periods) {
    const mdMap = new Map();
    periods.forEach(p => {
        const mdKey = p.md;
        if (!mdMap.has(mdKey)) {
            mdMap.set(mdKey, { lord: p.md, end: p.end, children: new Map() });
        } else {
            // Update end to the latest (periods are in order)
            mdMap.get(mdKey).end = p.end;
        }
        const mdNode = mdMap.get(mdKey);
        const adKey = p.ad;
        if (!mdNode.children.has(adKey)) {
            mdNode.children.set(adKey, { lord: p.ad, end: p.end, children: new Map() });
        } else {
            mdNode.children.get(adKey).end = p.end;
        }
        const adNode = mdNode.children.get(adKey);
        const pdKey = p.pd;
        if (!adNode.children.has(pdKey)) {
            adNode.children.set(pdKey, { lord: p.pd, end: p.end, children: new Map() });
        } else {
            adNode.children.get(pdKey).end = p.end;
        }
        const pdNode = adNode.children.get(pdKey);
        const sdKey = p.sd;
        if (!pdNode.children.has(sdKey)) {
            pdNode.children.set(sdKey, { lord: p.sd, end: p.end, children: new Map() });
        } else {
            pdNode.children.get(sdKey).end = p.end;
        }
        const sdNode = pdNode.children.get(sdKey);
        const prKey = p.pr;
        if (!sdNode.children.has(prKey)) {
            sdNode.children.set(prKey, { lord: p.pr, end: p.end, children: [] });
        } else {
            // For PR leaves, we can update end as well (though each PR is unique)
            // but we can leave as is because we will not drill below PR.
        }
    });

    // Convert maps to arrays for the expected structure: each node has lord, end, children (array)
    function convertMapToArray(mapNode) {
        const result = [];
        for (let [lord, node] of mapNode) {
            let children;
            if (node.children instanceof Map) {
                children = convertMapToArray(node.children);
            } else {
                children = [];
            }
            result.push({
                lord: node.lord,
                end: node.end,
                children: children
            });
        }
        return result;
    }

    const mdNodes = [];
    for (let [lord, node] of mdMap) {
        const children = convertMapToArray(node.children);
        mdNodes.push({
            lord: node.lord,
            end: node.end,
            children: children
        });
    }
    return mdNodes;
}

// ----- Helper: get abbreviation for a lord -----
function getAbbr(lord) {
    return FULL_TO_ABBR[lord] || lord;
}

// ----- Helper: get level-wise end dates from a flat period and allPeriods -----
function getLevelEnds(period, allPeriods) {
    if (!period || !allPeriods || allPeriods.length === 0) return null;
    const md = period.md;
    const ad = period.ad;
    const pd = period.pd;
    const sd = period.sd;
    const pr = period.pr;
    let mdEnd = null, adEnd = null, pdEnd = null, sdEnd = null, prEnd = null;
    // Iterate through all periods to find the last occurrence for each prefix
    for (let p of allPeriods) {
        if (p.md === md) {
            mdEnd = p.end;
        }
        if (p.md === md && p.ad === ad) {
            adEnd = p.end;
        }
        if (p.md === md && p.ad === ad && p.pd === pd) {
            pdEnd = p.end;
        }
        if (p.md === md && p.ad === ad && p.pd === pd && p.sd === sd) {
            sdEnd = p.end;
        }
        if (p.md === md && p.ad === ad && p.pd === pd && p.sd === sd && p.pr === pr) {
            prEnd = p.end;
        }
    }
    return { mdEnd, adEnd, pdEnd, sdEnd, prEnd };
}

// ----- Render compressed dashboard (split navigator + info panels) -----
function renderCompressedDashboard(data) {
    const container = document.getElementById('compressedTableContainer');
    if (!container) return;

    // Build HTML structure identical to the original dasha dashboard
    let html = `
        <div class="dasha-split-container" id="compressedSplitContainer">
            <!-- LEFT COLUMN: NAVIGATOR -->
            <div class="dasha-left">
                <div class="dasha-navigator">
                    <div class="nav-title">Compressed Dasha</div>
                    <div class="dasha-list-wrap" id="compDashaListWrap">
                        <div id="compDashaList"></div>
                    </div>
                    <button class="nav-back-btn" id="compNavBackBtn" disabled>Back</button>
                    <div class="nav-notes">
                        <span>Dates shown are dasha ending dates (compressed).</span>
                        <span>Tap any row to show next Dasha.</span>
                    </div>
                </div>
            </div>

            <!-- RIGHT COLUMN: INFO PANELS + TOOLS -->
            <div class="dasha-right">
                <!-- Top row: Birth Dasha (left) and Target Dasha (right) -->
                <div class="dasha-row-pair">
                    <!-- Birth Dasha -->
                    <div class="info-panel compact shimmer">
                        <div class="panel-header">
                            <div class="panel-title">Birth</div>
                            <div class="panel-badge">Natal (Compressed)</div>
                        </div>
                        <div class="panel-grid compact-grid" id="compBirthPanel">
                            <div class="panel-row"><span class="panel-lord" id="compBirthMD">—</span><span class="panel-date" id="compBirthMDEnd">—</span></div>
                            <div class="panel-row"><span class="panel-lord" id="compBirthAD">—</span><span class="panel-date" id="compBirthADEnd">—</span></div>
                            <div class="panel-row"><span class="panel-lord" id="compBirthPD">—</span><span class="panel-date" id="compBirthPDEnd">—</span></div>
                            <div class="panel-row"><span class="panel-lord" id="compBirthSD">—</span><span class="panel-date" id="compBirthSDEnd">—</span></div>
                            <div class="panel-row"><span class="panel-lord" id="compBirthPR">—</span><span class="panel-date" id="compBirthPREnd">—</span></div>
                        </div>
                    </div>

                    <!-- Target Dasha -->
                    <div class="info-panel compact shimmer">
                        <div class="panel-header">
                            <div class="panel-title">Target</div>
                            <div class="panel-badge">Live (Compressed)</div>
                        </div>
                        <div class="panel-grid compact-grid" id="compTargetPanel">
                            <div class="panel-row"><span class="panel-lord" id="compTargetMD">—</span><span class="panel-date" id="compTargetMDEnd">—</span></div>
                            <div class="panel-row"><span class="panel-lord" id="compTargetAD">—</span><span class="panel-date" id="compTargetADEnd">—</span></div>
                            <div class="panel-row"><span class="panel-lord" id="compTargetPD">—</span><span class="panel-date" id="compTargetPDEnd">—</span></div>
                            <div class="panel-row"><span class="panel-lord" id="compTargetSD">—</span><span class="panel-date" id="compTargetSDEnd">—</span></div>
                            <div class="panel-row"><span class="panel-lord" id="compTargetPR">—</span><span class="panel-date" id="compTargetPREnd">—</span></div>
                        </div>
                    </div>
                </div>

                <!-- Random Date Dasha Result Panel (below Birth) -->
                <div class="info-panel compact shimmer" id="compRandomDatePanel">
                    <div class="panel-header">
                        <div class="panel-title">Random Date</div>
                        <div class="panel-badge">Custom</div>
                    </div>
                    <div class="tool-row" style="margin-bottom: 8px;">
                        <input type="date" id="compRandomDate" class="tool-input" />
                        <input type="time" id="compRandomTime" class="tool-input" value="12:00" />
                        <button class="tool-btn" id="compRandomDateBtn">Calculate</button>
                    </div>
                    <div class="panel-grid compact-grid" id="compRandomPanel">
                        <div class="panel-row"><span class="panel-lord" id="compRandomMD">—</span><span class="panel-date" id="compRandomMDEnd">—</span></div>
                        <div class="panel-row"><span class="panel-lord" id="compRandomAD">—</span><span class="panel-date" id="compRandomADEnd">—</span></div>
                        <div class="panel-row"><span class="panel-lord" id="compRandomPD">—</span><span class="panel-date" id="compRandomPDEnd">—</span></div>
                        <div class="panel-row"><span class="panel-lord" id="compRandomSD">—</span><span class="panel-date" id="compRandomSDEnd">—</span></div>
                        <div class="panel-row"><span class="panel-lord" id="compRandomPR">—</span><span class="panel-date" id="compRandomPREnd">—</span></div>
                    </div>
                </div>

                <!-- Manual Dasha Lookup Result Panel (below Today) -->
                <div class="info-panel compact shimmer" id="compManualLookupPanel">
                    <div class="panel-header">
                        <div class="panel-title">Manual Lookup</div>
                        <div class="panel-badge">Custom</div>
                    </div>
                    <div class="tool-row" style="margin-bottom: 8px;">
                        <input type="text" id="compManualInput" class="tool-input manual-input" placeholder="e.g. Ra/Sa/Ju/Ma/Ve" />
                        <button class="tool-btn" id="compManualDashaBtn">Find</button>
                    </div>
                    <div class="panel-grid compact-grid" id="compManualPanel">
                        <div class="panel-row"><span class="panel-lord" id="compManualMD">—</span><span class="panel-date" id="compManualMDEnd">—</span></div>
                        <div class="panel-row"><span class="panel-lord" id="compManualAD">—</span><span class="panel-date" id="compManualADEnd">—</span></div>
                        <div class="panel-row"><span class="panel-lord" id="compManualPD">—</span><span class="panel-date" id="compManualPDEnd">—</span></div>
                        <div class="panel-row"><span class="panel-lord" id="compManualSD">—</span><span class="panel-date" id="compManualSDEnd">—</span></div>
                        <div class="panel-row"><span class="panel-lord" id="compManualPR">—</span><span class="panel-date" id="compManualPREnd">—</span></div>
                    </div>
                </div>
            </div>
        </div>
        <div style="margin-top: 20px; color: var(--text-secondary); font-size: 0.9rem;">
            Total compressed periods: <span id="compressedPeriodCount">0</span>
            &nbsp;|&nbsp; Scale factor: <span id="compScaleFactor">1.0</span>
        </div>
    `;

    container.innerHTML = html;

    // Store start time and other needed data
    mdStartTs = data.birth_dasha ? new Date(data.birth_dasha.start) : null;

    // Populate navigator
    if (nestedCompressed && nestedCompressed.length > 0) {
        initCompNavigator(nestedCompressed);
    }

    // Populate birth and target panels
    populateCompressedPanel('compBirth', data.birth_dasha);
    populateCompressedPanel('compTarget', data.target_dasha);

    // Update count and scale factor
    document.getElementById('compressedPeriodCount').textContent = allPeriods.length;
    document.getElementById('compScaleFactor').textContent = data.scale_factor ? data.scale_factor.toFixed(6) : '1.0';

    // Setup Random Date button
    document.getElementById('compRandomDateBtn').addEventListener('click', function() {
        const dateVal = document.getElementById('compRandomDate').value;
        const timeVal = document.getElementById('compRandomTime').value;
        if (!dateVal) {
            populateCompressedPanel('compRandom', null);
            return;
        }
        const dt = new Date(dateVal + 'T' + (timeVal || '12:00:00'));
        if (isNaN(dt)) {
            populateCompressedPanel('compRandom', null);
            return;
        }
        const period = findPeriodAtTimeCompressed(dt);
        if (period) {
            populateCompressedPanel('compRandom', period);
        } else {
            populateCompressedPanel('compRandom', null);
        }
    });

    // Setup Manual Lookup
    const manualInput = document.getElementById('compManualInput');
    manualInput.addEventListener('input', function() {
        let raw = this.value.replace(/[^a-zA-Z]/g, '');
        if (raw.length > 10) raw = raw.slice(0, 10);
        const chunks = [];
        for (let i = 0; i < raw.length; i += 2) {
            chunks.push(raw.slice(i, i + 2));
        }
        const formatted = chunks.join('/');
        if (this.value !== formatted) {
            this.value = formatted;
            this.setSelectionRange(formatted.length, formatted.length);
        }
    });
    document.getElementById('compManualDashaBtn').addEventListener('click', function() {
        const inputVal = manualInput.value.trim();
        if (!inputVal) {
            populateCompressedPanel('compManual', null);
            return;
        }
        const parts = inputVal.split('/').map(s => s.trim()).filter(s => s.length > 0);
        if (parts.length === 0) {
            populateCompressedPanel('compManual', null);
            return;
        }
        // Normalize abbreviations to full names
        const ABBR_TO_FULL = {};
        for (const [full, abbr] of Object.entries(FULL_TO_ABBR)) {
            ABBR_TO_FULL[abbr.toLowerCase()] = full;
        }
        function normalizeAbbr(input) {
            if (!input) return null;
            const lower = input.toLowerCase();
            for (const [full, abbr] of Object.entries(FULL_TO_ABBR)) {
                if (abbr.toLowerCase() === lower) return abbr;
            }
            return null;
        }
        const normalized = parts.map(p => normalizeAbbr(p));
        const invalidIndex = normalized.findIndex(n => n === null);
        if (invalidIndex !== -1) {
            populateCompressedPanel('compManual', null);
            return;
        }
        const fullNames = normalized.map(abbr => ABBR_TO_FULL[abbr.toLowerCase()]);
        while (fullNames.length < 5) fullNames.push(null);
        const [md, ad, pd, sd, pr] = fullNames;
        // Find period by path in nested structure
        const period = findPeriodByPathCompressed(md, ad, pd, sd, pr);
        if (period) {
            populateCompressedPanel('compManual', period);
        } else {
            populateCompressedPanel('compManual', null);
        }
    });
}

// ----- Helper: format date for display (end date) -----
function formatCompressedDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ----- Populate a panel with period data (uses prefix like 'compBirth', 'compTarget') -----
// Each row shows the lord and the END date of that level.
function populateCompressedPanel(prefix, period) {
    const levels = ['MD', 'AD', 'PD', 'SD', 'PR'];
    const keys = ['md', 'ad', 'pd', 'sd', 'pr'];
    // Compute level-wise end dates from the period and allPeriods
    const ends = period ? getLevelEnds(period, allPeriods) : null;
    for (let i = 0; i < levels.length; i++) {
        const key = keys[i];
        const lord = period ? period[key] : null;
        const endKey = key + 'End'; // e.g. mdEnd, adEnd
        const end = ends ? ends[endKey] : null;
        const lordEl = document.getElementById(prefix + levels[i]);
        const dateEl = document.getElementById(prefix + levels[i] + 'End');
        if (lordEl) {
            lordEl.textContent = lord ? getAbbr(lord) : '—';
        }
        if (dateEl) {
            dateEl.textContent = end ? formatCompressedDate(end) : '—';
        }
    }
}

// ----- Find period in compressed data by datetime -----
function findPeriodAtTimeCompressed(targetTime) {
    if (!allPeriods || allPeriods.length === 0) return null;
    for (let p of allPeriods) {
        const start = new Date(p.start);
        const end = new Date(p.end);
        if (targetTime >= start && targetTime < end) {
            return p;
        }
    }
    return null;
}

// ----- Find period by lord path (exact match) -----
function findPeriodByPathCompressed(md, ad, pd, sd, pr) {
    if (!md) return null;
    for (let p of allPeriods) {
        if (p.md === md && p.ad === ad && p.pd === pd && p.sd === sd && p.pr === pr) {
            return p;
        }
    }
    // Fallback: if only some levels match, try to find the closest?
    // For exact match only.
    return null;
}

// ----- Initialize compressed navigator (similar to dasha_analysis) -----
function initCompNavigator(nestedData) {
    if (!nestedData || nestedData.length === 0) {
        document.getElementById('compDashaList').innerHTML = '<div style="padding:20px;text-align:center;color:rgba(255,255,255,0.3);">No entries</div>';
        return;
    }

    let currentLevel = 0;
    let currentPath = [];
    const listEl = document.getElementById('compDashaList');
    const backBtn = document.getElementById('compNavBackBtn');

    function getItemsAtLevel(level, path) {
        let node = nestedData;
        for (let i = 0; i < level; i++) {
            if (i < path.length) {
                const idx = path[i];
                if (node && node[idx] && node[idx].children) {
                    node = node[idx].children;
                } else {
                    return [];
                }
            } else {
                return [];
            }
        }
        return node || [];
    }

    function getAncestorLords(level, path) {
        const lords = [];
        let node = nestedData;
        for (let i = 0; i < level; i++) {
            if (i < path.length) {
                const idx = path[i];
                if (node && node[idx]) {
                    lords.push(node[idx].lord);
                    node = node[idx].children;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        return lords;
    }

    function getFullName(level, path, rowIdx) {
        const items = getItemsAtLevel(level, path);
        if (!items || rowIdx >= items.length) return '';
        const ancestors = getAncestorLords(level, path);
        const currentLord = items[rowIdx].lord;
        const nameParts = ancestors.concat(currentLord).map(l => getAbbr(l));
        return nameParts.join('/');
    }

    function render() {
        const items = getItemsAtLevel(currentLevel, currentPath);
        if (!items || items.length === 0) {
            listEl.innerHTML = '<div style="padding:20px;text-align:center;color:rgba(255,255,255,0.3);">No entries</div>';
            return;
        }
        let html = '';
        items.forEach((item, idx) => {
            const fullName = getFullName(currentLevel, currentPath, idx);
            const dateStr = item.end ? formatCompressedDate(item.end) : '—';
            const isActive = (currentLevel < 4 && currentPath.length > currentLevel && currentPath[currentLevel] === idx);
            html += `
                <div class="dasha-row ${isActive ? 'active-row' : ''}" data-idx="${idx}">
                    <span class="dasha-name">${fullName}</span>
                    <span class="dasha-date">${dateStr}</span>
                </div>
            `;
        });
        listEl.innerHTML = html;
        backBtn.disabled = (currentLevel === 0);
    }

    function goToLevel(level, path) {
        if (level > 4) level = 4;
        if (level < 0) level = 0;
        currentLevel = level;
        currentPath = path.slice(0, level);
        render();
    }

    function drillDown(idx) {
        if (currentLevel >= 4) return;
        const items = getItemsAtLevel(currentLevel, currentPath);
        if (!items || idx >= items.length) return;
        const item = items[idx];
        if (!item.children || item.children.length === 0) return;
        const newPath = currentPath.slice(0, currentLevel);
        newPath.push(idx);
        goToLevel(currentLevel + 1, newPath);
    }

    function goBack() {
        if (currentLevel === 0) return;
        const newPath = currentPath.slice(0, currentLevel - 1);
        goToLevel(currentLevel - 1, newPath);
    }

    listEl.addEventListener('click', function(e) {
        const row = e.target.closest('.dasha-row');
        if (!row) return;
        const idx = parseInt(row.dataset.idx, 10);
        if (!isNaN(idx)) drillDown(idx);
    });

    backBtn.addEventListener('click', goBack);
    goToLevel(0, []);
}

// ----- Date filter (optional) – will refresh navigator? For now we keep it simple: just update the filter and re-render dashboard? We'll not use filter for now. Keep as placeholder. -----
function applyDateFilter() {
    // We can implement filtering of allPeriods and rebuild navigator, but for simplicity we'll just update the count.
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;
    if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const filtered = allPeriods.filter(p => {
            const pStart = new Date(p.start);
            const pEnd = new Date(p.end);
            return pStart >= startDate && pEnd <= endDate;
        });
        // Update count display
        document.getElementById('compressedPeriodCount').textContent = filtered.length;
        // Optionally rebuild navigator with filtered data
        if (filtered.length > 0) {
            const nestedFiltered = buildNestedFromFlat(filtered);
            nestedCompressed = nestedFiltered;
            initCompNavigator(nestedFiltered);
        } else {
            document.getElementById('compDashaList').innerHTML = '<div style="padding:20px;text-align:center;color:rgba(255,255,255,0.3);">No periods in range</div>';
        }
    } else {
        // Reset to all
        nestedCompressed = buildNestedFromFlat(allPeriods);
        initCompNavigator(nestedCompressed);
        document.getElementById('compressedPeriodCount').textContent = allPeriods.length;
    }
}

// ----- Reset compression -----
function resetCompression() {
    compressionActive = false;
    compressedData = null;
    allPeriods = [];
    nestedCompressed = null;
    document.getElementById('compressedTableContainer').innerHTML = '';
    document.getElementById('compressionStatus').textContent = 'Inactive';
    document.getElementById('compressionStatus').style.color = '#ff4d7d';
    document.getElementById('compressionIndicator').style.display = 'none';
    document.getElementById('compressedPeriodCount').textContent = '0';
    document.getElementById('compScaleFactor').textContent = '1.0';
    // No reload – just reset the UI state
}

// ----- Download compressed PDF -----
function downloadCompressedPDF() {
    if (!compressedData) {
        alert('Please apply compression first.');
        return;
    }
    // Build form data for PDF generation
    const formData = getFormDataFromPage();
    if (!formData) {
        alert('Missing data.');
        return;
    }
    // Add scale_factor from compressedData
    const payload = {
        ...formData,
        scale_factor: compressedData.scale_factor
    };

    fetch('/download-compressed-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) {
            return res.text().then(text => { throw new Error(text); });
        }
        return res.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Compressed_Vimshottari_${formData.dob}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    })
    .catch(err => {
        alert('Download failed: ' + err.message);
    });
}
