// Main Vimshottari JS - Global variables and initialization

{% if result %}
let currentLat = {{ result.birth_lat }};
let currentLon = {{ result.birth_lon }};
let currentTz = {{ result.birth_tz }};
let targetDateGlobal = "{{ result.target_date }}";
{% endif %}

function showLoading() {
    const btn = document.getElementById('submit-btn');
    if (btn) {
        btn.innerHTML = '<span style="display: inline-block; animation: pulse 1s infinite;">­Ъїї</span> CALCULATING...';
        btn.disabled = true;
    }
}

function toggleSection(id) {
    const content = document.getElementById(id);
    const arrow = document.getElementById('arrow-' + id);
    if (!content) return;
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        if (arrow) arrow.classList.remove('collapsed');
        if (id === 'live-coords' && typeof fetchLiveData === 'function') setTimeout(fetchLiveData, 300);
        if (id === 'target-pos' && typeof updateTargetPlanetaryTable === 'function') setTimeout(updateTargetPlanetaryTable, 300);
        if (id === 'meteorology-chakras' && typeof switchChakraData === 'function') setTimeout(() => switchChakraData('target'), 300);
    } else {
        content.classList.add('collapsed');
        if (arrow) arrow.classList.add('collapsed');
    }
}

function openDownloadModal() { 
    const modal = document.getElementById('downloadModal');
    if (modal) modal.style.display = 'block'; 
}

function closeDownloadModal() { 
    const modal = document.getElementById('downloadModal');
    if (modal) modal.style.display = 'none'; 
}

window.onclick = function(event) { 
    const modal = document.getElementById('downloadModal');
    if (event.target === modal) {
        modal.style.display = 'none'; 
    }
}
