// Chakra Visualization System
let chakraLiveInterval = null;
let currentChakraMode = 'target';

const nadiHeaders = [
    {name: "Parchand", lord: "Saturn", nature: "Fierce", color: "#ff4d4d"},
    {name: "Pawan", lord: "Sun", nature: "Windy", color: "#ffd700"},
    {name: "Dahan", lord: "Mars", nature: "Hot", color: "#ff6347"},
    {name: "Soumya", lord: "Jupiter", nature: "Weather", color: "#9acd32"},
    {name: "Neera", lord: "Venus", nature: "Good Rain", color: "#00ced1"},
    {name: "Jala", lord: "Mercury", nature: "Better Rain", color: "#1e90ff"},
    {name: "Amrit", lord: "Moon", nature: "Best Rain", color: "#9932cc"}
];

function initChakras() {
    const container = document.getElementById('nadiHeaders');
    if (!container) return;
    container.innerHTML = nadiHeaders.map((h, i) => `
        <div class="nadi-header" style="--header-color: ${h.color}">
            <h3>${h.name}</h3>
            <div class="nadi-lord">♄ ${h.lord}</div>
            <div class="nadi-nature">${h.nature}</div>
        </div>
    `).join('');
}

function switchChakraData(type) {
    document.querySelectorAll('.time-selector .time-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-chakra-${type}`).classList.add('active');
    currentChakraMode = type;
    
    const timeControl = document.getElementById('targetTimeControl');
    if (timeControl) {
        timeControl.style.display = type === 'target' ? 'flex' : 'none';
    }
    
    const statusBar = document.getElementById('chakraStatus');
    if (statusBar) statusBar.style.display = 'block';
    
    document.getElementById('chakraCurrentMode').textContent = type.toUpperCase();
    
    const lat = document.getElementById('inputLat')?.value || 28.6139;
    const lon = document.getElementById('inputLon')?.value || 77.2090;
    const tz = document.getElementById('inputTz')?.value || 5.5;
    
    if (type === 'live') {
        fetchChakraData('live', {lat, lon, tz});
        if (chakraLiveInterval) clearInterval(chakraLiveInterval);
        chakraLiveInterval = setInterval(() => fetchChakraData('live', {lat, lon, tz}), 60000);
    } else if (type === 'target') {
        const targetDate = document.getElementById('inputTarget')?.value || document.getElementById('chakraTargetDateDisplay')?.textContent;
        const timeVal = document.getElementById('chakraTargetTime')?.value || '12:00';
        document.getElementById('chakraCurrentTime').textContent = timeVal;
        fetchChakraData('target', {date: targetDate, time: timeVal, lat, lon, tz});
    } else {
        const dob = document.querySelector('input[name="dob"]')?.value;
        const tob = document.querySelector('input[name="tob"]')?.value || "00:00:00";
        fetchChakraData('birth', {date: dob, time: tob, lat, lon, tz});
    }
}

function updateChakraTime() {
    const timeVal = document.getElementById('chakraTargetTime')?.value || '12:00';
    document.getElementById('chakraCurrentTime').textContent = timeVal;
}

function refreshChakraWithTime() {
    if (currentChakraMode === 'target') {
        switchChakraData('target');
    }
}

async function fetchChakraData(timeType, params) {
    try {
        const response = await fetch('/calculate-chakras', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({...params, time_type: timeType})
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.planets) delete data.planets['Ascendant'];
            updateChakraUI(data);
            const count = document.getElementById('chakraPlanetCount');
            if (count) count.textContent = Object.keys(data.planets || {}).length;
        }
    } catch (error) {
        console.error('Chakra fetch error:', error);
    }
}

function updateChakraUI(data) {
    renderSaptNadi(data.sapt_nadi, data.planets);
    renderMandal(data.mandal);
    renderDaur(data.duar);
}

function renderSaptNadi(saptColumns, planets) {
    const container = document.getElementById('nadiColumns');
    if (!container) return;
    container.innerHTML = '';
    
    if (!saptColumns) {
        container.innerHTML = '<div class="empty-state">No data available</div>';
        return;
    }
    
    for (let nadiIdx = 0; nadiIdx < 7; nadiIdx++) {
        const column = document.createElement('div');
        column.className = 'nadi-column';
        
        const planetsInNadi = saptColumns[nadiIdx] || [];
        
        if (planetsInNadi.length === 0) {
            column.innerHTML = '<div style="flex: 1; display: flex; align-items: center; justify-content: center; opacity: 0.2; font-size: 0.8rem; color: var(--text-secondary)">No Planets</div>';
        } else {
            const nakGroups = {};
            planetsInNadi.forEach(p => {
                if (!nakGroups[p.nakshatra]) nakGroups[p.nakshatra] = [];
                nakGroups[p.nakshatra].push(p);
            });
            
            Object.entries(nakGroups).forEach(([nakName, nakPlanets]) => {
                const box = document.createElement('div');
                box.className = 'nakshatra-box';
                
                let planetsHtml = nakPlanets.map(p => {
                    let classes = `planet planet-${p.name.toLowerCase()}`;
                    let status = [];
                    if (p.is_glowing) { classes += ' glow'; status.push('Changing in ' + Math.round(p.minutes_to_change) + 'm'); }
                    if (p.is_critical) { classes += ' critical'; status.push('NOW!'); }
                    if (p.is_jumping) { classes += ' jump'; status.push('Jumping'); }
                    
                    return `
                        <div class="${classes}" 
                             data-name="${p.name}" 
                             data-nakshatra="${p.nakshatra}"
                             data-pada="${p.pada}"
                             data-status="${status.join(' | ') || 'Stable'}"
                             title="${p.name} - ${p.nakshatra}">
                            ${p.icon}
                            <span class="pada-badge">${p.pada}</span>
                        </div>
                    `;
                }).join('');
                
                box.innerHTML = `
                    <div class="nakshatra-name">${nakName}</div>
                    <div class="planets-wrapper">${planetsHtml}</div>
                `;
                column.appendChild(box);
            });
        }
        container.appendChild(column);
    }
}

function renderMandal(mandalData) {
    const container = document.getElementById('mandalContainer');
    if (!container) return;
    container.innerHTML = '';
    
    const colors = {'Agni': '#ff4d4d', 'Vayu': '#87ceeb', 'Varuna': '#1e90ff', 'Mahendra': '#ffd700'};
    
    if (!mandalData || Object.keys(mandalData).length === 0) {
        container.innerHTML = '<div class="empty-state">No planets in Mandal classification</div>';
        return;
    }
    
    for (const [mandalName, items] of Object.entries(mandalData)) {
        const filteredItems = items.filter(item => item.planet && item.planet.name !== 'Ascendant');
        if (filteredItems.length === 0) continue;
        
        const card = document.createElement('div');
        card.className = 'category-card';
        card.style.setProperty('--category-color', colors[mandalName] || '#00f3ff');
        
        card.innerHTML = `
            <div class="category-header">
                <span class="category-name">${mandalName}</span>
                <span class="category-count">${filteredItems.length} Planets</span>
            </div>
            <div class="nakshatra-list">
                ${filteredItems.map(item => {
                    const p = item.planet;
                    let classes = `planet planet-${p.name.toLowerCase()}`;
                    if (p.is_glowing) classes += ' glow';
                    if (p.is_critical) classes += ' critical';
                    if (p.is_jumping) classes += ' jump';
                    return `
                        <div class="nakshatra-item">
                            <span class="nakshatra-info">${item.nakshatra}</span>
                            <div class="${classes}" style="width: 28px; height: 28px; font-size: 1rem;">
                                ${p.icon}
                                <span class="pada-badge">${p.pada}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(card);
    }
}

function renderDaur(duarData) {
    const container = document.getElementById('duarContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (!duarData || Object.keys(duarData).length === 0) {
        container.innerHTML = '<div class="empty-state">No planets in Daur classification</div>';
        return;
    }
    
    for (const [duarName, data] of Object.entries(duarData)) {
        const filteredItems = data.items.filter(item => item.planet && item.planet.name !== 'Ascendant');
        if (filteredItems.length === 0) continue;
        
        const card = document.createElement('div');
        card.className = 'category-card';
        card.style.setProperty('--category-color', data.color || '#00f3ff');
        
        card.innerHTML = `
            <div class="category-header">
                <span class="category-name">${duarName}</span>
                <span class="category-count">${filteredItems.length} Planets</span>
            </div>
            <div class="nakshatra-list">
                ${filteredItems.map(item => {
                    const p = item.planet;
                    let classes = `planet planet-${p.name.toLowerCase()}`;
                    if (p.is_glowing) classes += ' glow';
                    if (p.is_critical) classes += ' critical';
                    if (p.is_jumping) classes += ' jump';
                    return `
                        <div class="nakshatra-item">
                            <span class="nakshatra-info">${item.nakshatra}</span>
                            <div class="${classes}" style="width: 28px; height: 28px; font-size: 1rem;">
                                ${p.icon}
                                <span class="pada-badge">${p.pada}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(card);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initChakras();
});