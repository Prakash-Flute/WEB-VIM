// Live Coordinates Auto-Update
let liveUpdateInterval;

function fetchLiveData() {
    const tbody = document.getElementById('liveTableBody');
    const container = document.getElementById('liveTableSection');
    
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--accent-cyan);">Loading planetary data...</td></tr>';
    }
    
    const lat = document.getElementById('inputLat')?.value || 28.6139;
    const lon = document.getElementById('inputLon')?.value || 77.2090;
    const tz = document.getElementById('inputTz')?.value || 5.5;
    
    return fetch(`/api/live-planets?lat=${lat}&lon=${lon}&tz=${tz}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                updateLiveTable(data.planets, data.timestamp);
                document.getElementById('lastUpdateTime').textContent = new Date().toLocaleTimeString();
                return data;
            } else {
                throw new Error(data.error);
            }
        })
        .catch(err => {
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ff4d7d;padding:20px;">⚠️ Error loading data</td></tr>';
            throw err;
        });
}

function updateLiveTable(planets, timestamp) {
    const tbody = document.getElementById('liveTableBody');
    const dateEl = document.getElementById('liveDateTime');
    
    if (dateEl) dateEl.textContent = timestamp || '';
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const planetConfig = {
        'Sun': {icon: '☉', color: '#FFD700'},
        'Moon': {icon: '☽', color: '#C0C0C0'},
        'Mercury': {icon: '☿', color: '#FFA500'},
        'Venus': {icon: '♀', color: '#FF69B4'},
        'Mars': {icon: '♂', color: '#FF4500'},
        'Jupiter': {icon: '♃', color: '#DAA520'},
        'Saturn': {icon: '♄', color: '#F4A460'},
        'Rahu': {icon: '☊', color: '#9932CC'},
        'Ketu': {icon: '☋', color: '#708090'}
    };
    
    Object.entries(planets).forEach(([name, data]) => {
        if (!data) return;
        const config = planetConfig[name] || {icon: '●', color: '#fff'};
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="planet-cell">
                    <span class="planet-icon" style="color: ${config.color}">${config.icon}</span>
                    <span style="color: ${config.color}">${name}</span>
                </div>
            </td>
            <td class="coordinates">${data.longitude || '--'}°</td>
            <td>${data.sign_name || '--'}</td>
            <td style="font-family: 'Orbitron', monospace; color: var(--accent-cyan);">${data.dms || '--'}</td>
            <td style="color: #ffa500;">${data.nakshatra_name || '--'} (${data.pada || '--'})</td>
            <td>${data.is_retro ? '<span class="retro-badge">⚠ RETRO</span>' : '<span style="color: #00ff88;">Direct</span>'}</td>
            <td style="color: rgba(255,255,255,0.4); font-size: 0.85rem;">${data.speed ? data.speed.toFixed(4) : '--'}</td>
        `;
        tbody.appendChild(row);
    });
    
    window.livePlanetsData = planets;
    window.livePlanetsTimestamp = timestamp || '';
    
    if (liveUpdateInterval) clearInterval(liveUpdateInterval);
    liveUpdateInterval = setInterval(fetchLiveData, 120000);
}

// ============================================================
// FETCH LIVE DATA AND SHOW TRANSIT CHART WITH CORRECT ASCENDANT
// ============================================================
function fetchLiveDataAndShow() {
    const lat = document.getElementById('inputLat')?.value || 28.6139;
    const lon = document.getElementById('inputLon')?.value || 77.2090;
    const tz = document.getElementById('inputTz')?.value || 5.5;

    fetch(`/api/live-planets?lat=${lat}&lon=${lon}&tz=${tz}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const planetsData = data.planets;
                if (!planetsData['Ascendant']) {
                    alert('Ascendant not found in live data.');
                    return;
                }
                // Extract live ascendant name
                const liveAscendant = planetsData['Ascendant'].sign_name || '';

                // Generate D1
                const ascSignIdx = planetsData['Ascendant'].sign_num - 1;
                const ascLongitude = planetsData['Ascendant'].longitude;
                const svgD1 = window.generateChart(planetsData, ascSignIdx, null);
                // Generate D9 (always since live data has seconds)
                function getNavamsaSign(name, data) {
                    if (name === 'Ascendant') return data.sign_num;
                    const navIdx = window.getNavamsaSignIndex(data.longitude);
                    return navIdx + 1;
                }
                const navAscIdx = window.getNavamsaSignIndex(ascLongitude);
                const svgD9 = window.generateChart(planetsData, navAscIdx, getNavamsaSign);
                // Show modal with live ascendant passed as the 5th argument
                window.showChartInModal(svgD1, svgD9, 'Live Transit Chart', true, liveAscendant);
            } else {
                alert('Error fetching live data: ' + data.error);
            }
        })
        .catch(err => {
            alert('Network error: ' + err.message);
        });
}

// Expose globally so chart.js can call it
window.fetchLiveDataAndShow = fetchLiveDataAndShow;
