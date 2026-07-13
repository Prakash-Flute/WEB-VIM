// GPS & City Search Functions
function getPreciseLocation() {
    const btn = event.target.closest('button');
    const statusDiv = document.getElementById('gps-status');
    const origHTML = btn.innerHTML;
    
    btn.innerHTML = '<span style="display:inline-block; animation: pulse 1s infinite;">📡</span> ACQUIRING SATELLITES...';
    btn.disabled = true;
    
    if (!navigator.geolocation) {
        alert("❌ Geolocation not supported");
        btn.innerHTML = origHTML;
        btn.disabled = false;
        return;
    }
    
    const options = {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
        function(pos) {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const acc = pos.coords.accuracy;
            
            document.getElementById('inputLat').value = lat.toFixed(6);
            document.getElementById('inputLon').value = lon.toFixed(6);
            
            const tz = Math.round(lon / 15);
            document.getElementById('inputTz').value = tz;
            
            btn.innerHTML = '<span>✅</span> LOCKED (±' + Math.round(acc) + 'm)';
            btn.style.borderColor = '#00ff88';
            btn.style.color = '#00ff88';
            if(statusDiv) statusDiv.style.display = 'block';
            
            setTimeout(() => {
                btn.innerHTML = origHTML;
                btn.disabled = false;
                btn.style.borderColor = '';
                btn.style.color = '';
            }, 4000);
        },
        function(err) {
            let msg = "GPS Error";
            switch(err.code) {
                case 1: msg = "Permission denied"; break;
                case 2: msg = "Position unavailable"; break;
                case 3: msg = "Timeout"; break;
            }
            alert("⚠️ " + msg);
            btn.innerHTML = origHTML;
            btn.disabled = false;
        },
        options
    );
}

// City Search
let citySearchTimeout;
document.addEventListener('DOMContentLoaded', function() {
    const cityInput = document.getElementById('citySearch');
    const cityDropdown = document.getElementById('cityDropdown');
    
    if (cityInput) {
        cityInput.addEventListener('input', function(e) {
            clearTimeout(citySearchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                if (cityDropdown) cityDropdown.style.display = 'none';
                return;
            }
            
            const searchStatus = document.getElementById('search-status');
            if (searchStatus) {
                searchStatus.style.display = 'block';
                searchStatus.textContent = '🔍 Searching...';
            }
            
            citySearchTimeout = setTimeout(() => performCitySearch(query), 600);
        });
    }
});

function searchCity() {
    const query = document.getElementById('citySearch')?.value;
    if (query) performCitySearch(query);
}

async function performCitySearch(query) {
    const dropdown = document.getElementById('cityDropdown');
    const status = document.getElementById('search-status');
    
    if (!dropdown) return;
    
    dropdown.style.display = 'block';
    dropdown.innerHTML = '<div style="padding:20px; text-align:center; color:var(--accent-cyan);">🌐 Searching cities...</div>';
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(query)}&format=json&limit=8&accept-language=en`);
        const data = await response.json();
        
        if (!data || data.length === 0) {
            dropdown.innerHTML = '<div style="padding:20px; color:#ff4d7d; text-align:center;">🌍 No cities found</div>';
            if (status) status.textContent = '❌ No results';
            return;
        }
        
        let html = '';
        data.forEach(place => {
            const parts = place.display_name.split(',');
            const city = parts[0].trim();
            const country = parts[parts.length-1].trim();
            const lat = parseFloat(place.lat).toFixed(4);
            const lon = parseFloat(place.lon).toFixed(4);
            
            html += `<div onclick="selectCity(${place.lat}, ${place.lon}, '${city.replace(/'/g, "\'")}')" 
                style="padding:14px 16px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.08);" 
                onmouseover="this.style.background='rgba(0,217,255,0.15)'" 
                onmouseout="this.style.background='transparent'">
                <div style="font-weight:600; color:#fff; font-size:0.95rem;">📍 ${city}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary);">${country} • Lat: ${lat}, Lon: ${lon}</div>
            </div>`;
        });
        
        dropdown.innerHTML = html;
        if (status) status.innerHTML = '<span style="color:#00ff88;">✅ Click city to select</span>';
        
    } catch (error) {
        dropdown.innerHTML = '<div style="padding:20px; color:#ff4d7d; text-align:center;">⚠️ Network error</div>';
    }
}

function selectCity(lat, lon, city) {
    document.getElementById('inputLat').value = parseFloat(lat).toFixed(6);
    document.getElementById('inputLon').value = parseFloat(lon).toFixed(6);
    document.getElementById('citySearch').value = city;
    document.getElementById('cityDropdown').style.display = 'none';
    
    const tz = Math.round(lon / 15);
    document.getElementById('inputTz').value = tz;
    
    const tzInput = document.getElementById('inputTz');
    tzInput.style.borderColor = '#00ff88';
    setTimeout(() => { tzInput.style.borderColor = ''; }, 2000);
    
    const status = document.getElementById('search-status');
    if (status) {
        status.innerHTML = `<span style="color:#00ff88;">🎯 ${city} locked! TZ: UTC${tz >= 0 ? '+' : ''}${tz}</span>`;
        setTimeout(() => status.style.display = 'none', 3000);
    }
}

document.addEventListener('click', function(e) {
    const searchBox = document.querySelector('.input-group');
    const dropdown = document.getElementById('cityDropdown');
    if (searchBox && dropdown && !searchBox.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});