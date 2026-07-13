// North Indian Diamond Chart Renderer (Geometric Layout)
// Supports both Rasi (D1) and Navamsa (D9) charts

const planetAbbr = {
    'Sun': 'Su', 'Moon': 'Mo', 'Mars': 'Ma', 'Mercury': 'Me',
    'Jupiter': 'Ju', 'Venus': 'Ve', 'Saturn': 'Sa',
    'Rahu': 'Ra', 'Ketu': 'Ke',
    'Uranus': 'Ur', 'Neptune': 'Ne', 'Pluto': 'Pl'
};

const planetColors = {
    'Sun': '#FFD700',
    'Moon': '#C0C0C0',
    'Mercury': '#FFA500',
    'Venus': '#FF69B4',
    'Mars': '#FF4500',
    'Jupiter': '#DAA520',
    'Saturn': '#F4A460',
    'Rahu': '#9932CC',
    'Ketu': '#708090',
    'Uranus': '#87CEEB',
    'Neptune': '#4169E1',
    'Pluto': '#8B4513'
};

const signNames = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

// Fixed 12 house positions (clockwise from top inner) – house numbering never changes
const signCorners = [
    {x:200, y:178},  // house 1  (top inner)
    {x:300, y:82},   // house 12 (top‑right outer)
    {x:318, y:100},  // house 11 (right‑top outer)
    {x:218, y:200},  // house 10 (right inner)
    {x:318, y:300},  // house 9  (right‑bottom outer)
    {x:300, y:318},  // house 8  (bottom‑right outer)
    {x:200, y:218},  // house 7  (bottom inner)
    {x:100, y:318},  // house 6  (bottom‑left outer)
    {x:82,  y:300},  // house 5  (left‑bottom outer)
    {x:178, y:200},  // house 4  (left inner)
    {x:82,  y:100},  // house 3  (left‑top outer)
    {x:100, y:82}    // house 2  (top‑left outer)
];

// Planet placement slots for each house (12 slots per house)
const housePlanetPositions = {
    1: [
        {x:170,y:56},{x:200,y:56},{x:230,y:56},
        {x:170,y:66},{x:200,y:66},{x:230,y:66},
        {x:170,y:76},{x:200,y:76},{x:230,y:76},
        {x:170,y:86},{x:200,y:86},{x:230,y:86}
    ],
    2: [
        {x:35,y:16},{x:65,y:16},{x:95,y:16},{x:125,y:16},{x:155,y:16},
        {x:50,y:32},{x:78,y:32},{x:106,y:32},{x:134,y:32},
        {x:65,y:48},{x:92,y:48},{x:119,y:48}
    ],
    3: [
        {x:16,y:70},{x:16,y:90},{x:16,y:110},{x:16,y:130},{x:16,y:150},
        {x:32,y:80},{x:32,y:100},{x:32,y:120},{x:32,y:140},
        {x:48,y:90},{x:48,y:110},{x:48,y:130}
    ],
    4: [
        {x:44,y:186},{x:56,y:186},{x:68,y:186},{x:80,y:186},
        {x:44,y:196},{x:56,y:196},{x:68,y:196},{x:80,y:196},
        {x:44,y:206},{x:56,y:206},{x:68,y:206},{x:80,y:206}
    ],
    5: [
        {x:16,y:270},{x:16,y:290},{x:16,y:310},{x:16,y:330},{x:16,y:350},
        {x:32,y:280},{x:32,y:300},{x:32,y:320},{x:32,y:340},
        {x:48,y:290},{x:48,y:310},{x:48,y:330}
    ],
    6: [
        {x:40,y:384},{x:70,y:384},{x:100,y:384},{x:130,y:384},{x:160,y:384},
        {x:55,y:368},{x:83,y:368},{x:111,y:368},{x:139,y:368},
        {x:70,y:352},{x:97,y:352},{x:124,y:352}
    ],
    7: [
        {x:170,y:316},{x:200,y:316},{x:230,y:316},
        {x:170,y:328},{x:200,y:328},{x:230,y:328},
        {x:170,y:340},{x:200,y:340},{x:230,y:340},
        {x:170,y:352},{x:200,y:352},{x:230,y:352}
    ],
    8: [
        {x:240,y:384},{x:270,y:384},{x:300,y:384},{x:330,y:384},{x:360,y:384},
        {x:255,y:368},{x:283,y:368},{x:311,y:368},{x:339,y:368},
        {x:270,y:352},{x:297,y:352},{x:324,y:352}
    ],
    9: [
        {x:384,y:270},{x:384,y:290},{x:384,y:310},{x:384,y:330},{x:384,y:350},
        {x:368,y:280},{x:368,y:300},{x:368,y:320},{x:368,y:340},
        {x:352,y:290},{x:352,y:310},{x:352,y:330}
    ],
    10: [
        {x:318,y:186},{x:332,y:186},{x:346,y:186},{x:360,y:186},
        {x:318,y:196},{x:332,y:196},{x:346,y:196},{x:360,y:196},
        {x:318,y:206},{x:332,y:206},{x:346,y:206},{x:360,y:206}
    ],
    11: [
        {x:384,y:70},{x:384,y:90},{x:384,y:110},{x:384,y:130},{x:384,y:150},
        {x:368,y:80},{x:368,y:100},{x:368,y:120},{x:368,y:140},
        {x:352,y:90},{x:352,y:110},{x:352,y:130}
    ],
    12: [
        {x:245,y:16},{x:275,y:16},{x:305,y:16},{x:335,y:16},{x:365,y:16},
        {x:255,y:32},{x:283,y:32},{x:311,y:32},{x:339,y:32},
        {x:270,y:48},{x:298,y:48},{x:326,y:48}
    ]
};

// ============================================================
// NAVAMSA (D9) COMPUTATION
// ============================================================
function getNavamsaSignIndex(siderealLongitude) {
    let navLon = (siderealLongitude * 9) % 360;
    if (navLon < 0) navLon += 360;
    const signIdx = Math.floor(navLon / 30);
    return signIdx;
}

// ============================================================
// CORE CHART GENERATION
// ============================================================
function generateChart(planetsData, ascSignIdx, signMapper) {
    const size = 400;
    const signToHouse = new Array(13);
    for (let s = 1; s <= 12; s++) {
        const i = (ascSignIdx - (s - 1) + 12) % 12;
        signToHouse[s] = (12 - i) % 12 + 1;
    }

    const planetHouses = {};
    for (const [name, data] of Object.entries(planetsData)) {
        if (name === 'Ascendant') continue;
        let signNum;
        if (typeof signMapper === 'function') {
            signNum = signMapper(name, data);
        } else {
            signNum = data.sign_num;
        }
        if (signNum < 1 || signNum > 12) signNum = ((signNum % 12) + 12) % 12 + 1;
        planetHouses[name] = signToHouse[signNum];
    }

    const houseGroups = {};
    for (let h = 1; h <= 12; h++) houseGroups[h] = [];
    for (const [name, house] of Object.entries(planetHouses)) {
        if (houseGroups[house]) houseGroups[house].push(name);
    }

    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="background:#0a0a0f;">`;
    svg += `<rect x="0" y="0" width="${size}" height="${size}" fill="none" stroke="#00d9ff" stroke-width="2.5" opacity="0.6"/>`;
    svg += `<line x1="0" y1="0" x2="${size}" y2="${size}" stroke="#00d9ff" stroke-width="1.2" opacity="0.35"/>`;
    svg += `<line x1="${size}" y1="0" x2="0" y2="${size}" stroke="#00d9ff" stroke-width="1.2" opacity="0.35"/>`;
    svg += `<polygon points="200,0 400,200 200,400 0,200" fill="none" stroke="#00d9ff" stroke-width="1.5" opacity="0.45"/>`;
    const dots = [[200,200],[100,100],[300,100],[100,300],[300,300]];
    dots.forEach(([cx,cy]) => {
        svg += `<circle cx="${cx}" cy="${cy}" r="2.5" fill="#00d9ff" opacity="0.5"/>`;
    });

    for (let i = 0; i < 12; i++) {
        const pos = signCorners[i];
        const signNum = (ascSignIdx - i + 12) % 12 + 1;
        svg += `<text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle"
            fill="#00d9ff" font-size="14" font-weight="700" font-family="Arial,sans-serif"
            paint-order="stroke fill" stroke="#0a0a0f" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round">${signNum}</text>`;
    }

    for (let h = 1; h <= 12; h++) {
        const planetsInHouse = houseGroups[h] || [];
        const positions = housePlanetPositions[h];
        if (!positions) continue;
        planetsInHouse.forEach((pname, idx) => {
            if (idx >= positions.length) return;
            const pos = positions[idx];
            const abbr = planetAbbr[pname] || pname.substring(0,2);
            const color = planetColors[pname] || '#ffffff';
            svg += `<text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle"
                fill="${color}" font-size="11" font-weight="700" font-family="Arial,sans-serif"
                paint-order="stroke fill" stroke="#0a0a0f" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">${abbr}</text>`;
        });
    }
    svg += `</svg>`;
    return svg;
}

// ============================================================
// SHOW BIRTH CHART
// ============================================================
function showChart() {
    console.log('showChart called');
    const tobInput = document.getElementById('inputTob');
    let secondsPresent = false;
    if (tobInput) {
        const parts = tobInput.value.split(':');
        if (parts.length === 3 && parts[2] && parts[2] !== '00') secondsPresent = true;
        else if (parts.length === 3) secondsPresent = true;
    }
    if (!secondsPresent) {
        alert('⚠️ Seconds are not filled in Birth Time. D9 (Navamsa) chart requires seconds for accuracy. Only Rasi (D1) chart will be shown.');
    }
    if (!window.natalPlanetsData) {
        alert('Natal planets data not available. Please calculate first.');
        return;
    }
    try {
        const planetsData = window.natalPlanetsData;
        let ascSignIdx = 0, ascLongitude = 0;
        if (planetsData['Ascendant']) {
            ascSignIdx = planetsData['Ascendant'].sign_num - 1;
            ascLongitude = planetsData['Ascendant'].longitude;
        } else {
            alert('Ascendant not found.');
            return;
        }

        const svgD1 = generateChart(planetsData, ascSignIdx, null);
        let svgD9 = null, d9Available = false;
        if (secondsPresent) {
            function getNavamsaSign(name, data) {
                if (name === 'Ascendant') return data.sign_num;
                const navIdx = getNavamsaSignIndex(data.longitude);
                return navIdx + 1;
            }
            const navAscIdx = getNavamsaSignIndex(ascLongitude);
            svgD9 = generateChart(planetsData, navAscIdx, getNavamsaSign);
            d9Available = true;
        }
        // For birth chart, we don't pass an ascendant; it will use window.karveAscendant
        showChartInModal(svgD1, svgD9, 'Birth Chart', d9Available);
    } catch (error) {
        console.error('Error in showChart:', error);
        alert('Error: ' + error.message);
    }
}

// ============================================================
// SHOW TRANSIT CHART – auto‑refresh every 10 seconds
// ============================================================
let transitRefreshInterval = null;

function showLiveChart() {
    console.log('showLiveChart called');
    if (transitRefreshInterval) {
        clearInterval(transitRefreshInterval);
        transitRefreshInterval = null;
    }
    if (typeof window.fetchLiveDataAndShow === 'function') {
        window.fetchLiveDataAndShow();
        transitRefreshInterval = setInterval(() => {
            console.log('Transit chart auto‑refresh (10s)');
            window.fetchLiveDataAndShow();
        }, 10000);
    } else {
        alert('fetchLiveDataAndShow not available. Please ensure live-tracker.js is loaded.');
    }
}

// ============================================================
// HELPER: Display chart in modal with optional ascendant confirmation
// ============================================================
function showChartInModal(svgD1, svgD9, title, d9Available, ascFromLive) {
    const titleEl = document.getElementById('chartModalTitle');
    if (titleEl) titleEl.textContent = title;

    const content = document.getElementById('chartModalContent');
    if (!content) {
        alert('Chart content container not found.');
        return;
    }

    // Determine ascendant to display:
    // - If ascFromLive is provided (for transit), use that.
    // - Otherwise fall back to window.karveAscendant (for birth chart).
    const ascToShow = ascFromLive || window.karveAscendant || '';

    let confirmMsg = '';
    if (ascToShow) {
        confirmMsg = `
            <div style="margin-top:8px; padding:4px 8px; background:rgba(255,215,0,0.04); border:1px solid rgba(255,215,0,0.15); border-radius:4px; text-align:center; width:100%; max-width:380px; line-height:1.2;">
                <div style="font-size:0.6rem; color:var(--text-secondary); letter-spacing:0.3px;">ASCENDANT CONFIRMATION</div>
                <strong style="color:var(--accent-gold); font-size:0.85rem; display:block; margin:1px 0;">${ascToShow}</strong>
                <div style="font-size:0.45rem; color:var(--text-secondary); opacity:0.6; border-top:1px solid rgba(255,215,0,0.08); padding-top:2px; margin-top:2px;">
                    MUNDANE ASTROLOGY BOOK • A BOOK FOR ASTROLOGERS BY K.B.GOPALAKRISHNAN<br>
                    (Birth time correction – should not be followed blindly; works in some cases. Editor)
                </div>
            </div>
        `;
    } else {
        confirmMsg = `
            <div style="margin-top:8px; padding:2px 6px; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.08); border-radius:4px; text-align:center; width:100%; max-width:380px;">
                <span style="font-size:0.5rem; color:var(--text-secondary); opacity:0.4;">(Ascendant confirmation not available)</span>
            </div>
        `;
    }

    let html = '';
    if (d9Available && svgD9) {
        html = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">
                <div style="text-align:center;">
                    <div style="font-family:'Orbitron',sans-serif; color:var(--accent-cyan); font-size:0.9rem; margin-bottom:6px;">Rasi (D1)</div>
                    ${svgD1}
                    ${confirmMsg}
                </div>
                <hr style="width:70%; border-color:rgba(255,255,255,0.08);">
                <div style="text-align:center;">
                    <div style="font-family:'Orbitron',sans-serif; color:var(--accent-gold); font-size:0.9rem; margin-bottom:6px;">Navamsa (D9)</div>
                    ${svgD9}
                </div>
            </div>
        `;
    } else {
        html = `
            <div style="display:flex; flex-direction:column; align-items:center;">
                <div style="font-family:'Orbitron',sans-serif; color:var(--accent-cyan); font-size:0.9rem; margin-bottom:6px;">Rasi (D1)</div>
                ${svgD1}
                ${confirmMsg}
                ${!d9Available ? '<div style="text-align:center; color:var(--text-secondary); margin-top:10px; font-size:0.65rem;">⚠️ D9 (Navamsa) not generated – seconds missing in birth time.</div>' : ''}
            </div>
        `;
    }

    content.innerHTML = html;

    const modal = document.getElementById('chartModal');
    if (modal) modal.style.display = 'flex';
}

// ============================================================
// MODAL CONTROLS
// ============================================================
function closeChartModal() {
    if (transitRefreshInterval) {
        clearInterval(transitRefreshInterval);
        transitRefreshInterval = null;
        console.log('Transit auto‑refresh stopped.');
    }
    const modal = document.getElementById('chartModal');
    if (modal) modal.style.display = 'none';
}

document.addEventListener('click', function(e) {
    const modal = document.getElementById('chartModal');
    if (modal && e.target === modal) closeChartModal();
});

window.showChart = showChart;
window.showLiveChart = showLiveChart;
window.closeChartModal = closeChartModal;
window.getNavamsaSignIndex = getNavamsaSignIndex;
window.generateChart = generateChart;
window.showChartInModal = showChartInModal;
