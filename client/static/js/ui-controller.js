// UI Interactions and Helpers
function toggleSection(id) {
    const content = document.getElementById(id);
    const arrow = document.getElementById('arrow-' + id);
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        if (arrow) arrow.classList.remove('collapsed');
        
        if (id === 'live-coords' && typeof fetchLiveData === 'function') {
            setTimeout(fetchLiveData, 300);
        }
        if (id === 'target-pos' && typeof updateTargetPlanetaryTable === 'function') {
            setTimeout(updateTargetPlanetaryTable, 300);
        }
        if (id === 'meteorology-chakras' && typeof switchChakraData === 'function') {
            setTimeout(() => switchChakraData('target'), 300);
        }
    } else {
        content.classList.add('collapsed');
        if (arrow) arrow.classList.add('collapsed');
    }
}

function showLoading() {
    const btn = document.getElementById('submit-btn');
    if (btn) {
        btn.innerHTML = '<span style="display: inline-block; animation: pulse 1s infinite;">🌌</span> CALCULATING...';
        btn.disabled = true;
    }
}

function updateTargetPlanetaryTable() {
    const timeVal = document.getElementById('targetTableTime')?.value || '12:00';
    const timeFormatted = timeVal.length === 5 ? timeVal + ':00' : timeVal;
    const targetDate = document.getElementById('inputTarget')?.value;
    const lat = document.getElementById('inputLat')?.value || 28.6139;
    const lon = document.getElementById('inputLon')?.value || 77.2090;
    const tz = document.getElementById('inputTz')?.value || 5.5;
    
    if (!targetDate) return;
    
    const tbody = document.getElementById('targetPlanetaryBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--accent-cyan);">🌌 Calculating...</td></tr>';
    }
    
    fetch('/calculate-chakras', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            time_type: 'target',
            date: targetDate,
            time: timeFormatted,
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            tz: parseFloat(tz)
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.planets) {
            renderTargetPlanetaryTable(data.planets);
        } else {
            throw new Error(data.error || 'Failed to load data');
        }
    })
    .catch(err => {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#ff4d7d;">⚠ Error: ${err.message}</td></tr>`;
    });
}

function renderTargetPlanetaryTable(planets) {
    const tbody = document.getElementById('targetPlanetaryBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const planetOrder = ['Ascendant', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
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
    
    planetOrder.forEach(name => {
        const p = planets[name];
        if (!p) return;
        
        let config = planetConfig[name];
        if (name === 'Ascendant') config = {icon: 'ASC', color: '#FFD700'};
        
        const row = document.createElement('tr');
        let motionHtml = name === 'Ascendant' ? 
            '<span style="color: #00ff88; font-weight: 600;">Rising</span>' :
            (p.is_retro ? '<span class="retro-badge">⚠ RETRO</span>' : '<span style="color: #00ff88; font-weight: 600;">Direct</span>');
        
        row.innerHTML = `
            <td>
                <div class="planet-cell">
                    <span class="planet-icon" style="color: ${config.color}">${config.icon}</span>
                    <span style="color: ${config.color}">${name}</span>
                </div>
            </td>
            <td class="coordinates">${p.longitude}°</td>
            <td>${p.sign_name}</td>
            <td style="font-family: 'Orbitron', monospace; color: var(--accent-cyan);">${p.dms}</td>
            <td style="color: #ffa500;">${p.nakshatra_name} (${p.pada})</td>
            <td>${motionHtml}</td>
            <td style="color: var(--text-secondary); font-size: 0.9em;">${p.lord || 'N/A'}</td>
        `;
        tbody.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize any UI components
    console.log('Cosmic Dashboard Loaded');
});