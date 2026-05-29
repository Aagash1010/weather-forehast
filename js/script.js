const elements = {
    cityInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('search-btn'),
    locationBtn: document.getElementById('current-location-btn'),
    locationDisplay: document.getElementById('location-display'),
    cityName: document.getElementById('city-name'),
    dateTime: document.getElementById('date-time'),
    temperature: document.getElementById('temperature'),
    description: document.getElementById('weather-description'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('wind-speed'),
    feelsLike: document.getElementById('feels-like'),
    appContainer: document.querySelector('.app-container'),
    weatherIcon: document.getElementById('weather-icon') // We need to create this container or inject into it
};

// Open-Meteo WMO Weather interpretation codes
const weatherCodes = {
    0: { desc: 'Clear sky', icon: '☀️' },
    1: { desc: 'Mainly clear', icon: '🌤️' },
    2: { desc: 'Partly cloudy', icon: '⛅' },
    3: { desc: 'Overcast', icon: '☁️' },
    45: { desc: 'Fog', icon: 'fg' },
    48: { desc: 'Depositing rime fog', icon: 'fg' },
    51: { desc: 'Light drizzle', icon: 'ea' },
    53: { desc: 'Moderate drizzle', icon: 'ea' },
    55: { desc: 'Dense drizzle', icon: 'ea' },
    56: { desc: 'Light freezing drizzle', icon: 'ea' },
    57: { desc: 'Dense freezing drizzle', icon: 'ea' },
    61: { desc: 'Slight rain', icon: '🌧️' },
    63: { desc: 'Moderate rain', icon: '🌧️' },
    65: { desc: 'Heavy rain', icon: '🌧️' },
    66: { desc: 'Light freezing rain', icon: '🌧️' },
    67: { desc: 'Heavy freezing rain', icon: '🌧️' },
    71: { desc: 'Slight snow fall', icon: '❄️' },
    73: { desc: 'Moderate snow fall', icon: '❄️' },
    75: { desc: 'Heavy snow fall', icon: '❄️' },
    77: { desc: 'Snow grains', icon: '❄️' },
    80: { desc: 'Slight rain showers', icon: '🌦️' },
    81: { desc: 'Moderate rain showers', icon: '🌦️' },
    82: { desc: 'Violent rain showers', icon: '🌦️' },
    85: { desc: 'Slight snow showers', icon: '❄️' },
    86: { desc: 'Heavy snow showers', icon: '❄️' },
    95: { desc: 'Thunderstorm', icon: '⚡' },
    96: { desc: 'Thunderstorm with slight hail', icon: '⛈️' },
    99: { desc: 'Thunderstorm with heavy hail', icon: '⛈️' }
};

// Event Listeners
elements.searchBtn.addEventListener('click', () => {
    const city = elements.cityInput.value.trim();
    if (city) fetchWeather(city);
});

elements.cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = elements.cityInput.value.trim();
        if (city) fetchWeather(city);
    }
});

elements.locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            (error) => {
                let msg = 'Unable to retrieve location.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        msg = 'User denied the request for Geolocation. Please enable location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        msg = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        msg = 'The request to get user location timed out.';
                        break;
                    case error.UNKNOWN_ERROR:
                        msg = 'An unknown error occurred.';
                        break;
                }
                showError(msg);
                console.error('Geolocation Error:', error);
            }
        );
    } else {
        showError('Geolocation is not supported by your browser.');
    }
});

// Fetch functions
async function fetchWeather(city) {
    try {
        setLoading(true);
        // 1. Geocoding
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        // 2. Weather Data
        // Includes temperature, current weather code, windspeed etc.
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&timezone=auto`;
        
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        updateUI(weatherData, name, country);
        setLoading(false);

    } catch (error) {
        setLoading(false);
        showError(error.message === 'City not found' ? 'City not found. Please try again.' : 'An error occurred. Please try again later.');
        console.error(error);
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        setLoading(true);
        
        // Reverse Geocoding (Optional: to get city name from coords - using Open-Meteo implies strictness, but we can display "Current Location" or try to infer)
        // For simplicity, we can fetch weather directly, but displaying text is nice.
        // We will skip reverse geocoding for now and label it "Your Location" or try to find a free reverse geocoder if needed.
        // Actually, the main geocoding API doesn't do reverse.
        // We will just display "My Location" if we can't find it, OR we use another API. 
        // Let's use BigDataCloud free client-side reverse geocoding or just generic text.
        // For this task, "Current Location" is acceptable.

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&timezone=auto`;
        
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        updateUI(weatherData, "Current Location", "");
        setLoading(false);

    } catch (error) {
        setLoading(false);
        showError('Unable to fetch weather for your location.');
        console.error(error);
    }
}

function updateUI(data, city, country) {
    const current = data.current;
    
    // Update City Name
    elements.cityName.textContent = country ? `${city}, ${country}` : city;
    elements.locationDisplay.classList.remove('hidden');

    // Date Time (Local to the location)
    const utcOffsetSeconds = data.utc_offset_seconds;
    const now = new Date();
    // Calculate local time: Current UTC time + Offset
    const localTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (utcOffsetSeconds * 1000));
    
    const options = { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' };
    elements.dateTime.textContent = localTime.toLocaleDateString('en-US', options);

    // Temperature & Details
    elements.temperature.textContent = Math.round(current.temperature_2m);
    elements.humidity.textContent = `${current.relative_humidity_2m}%`;
    elements.windSpeed.textContent = `${current.wind_speed_10m} km/h`;
    elements.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°`;

    // Weather Description & Icon
    const wmo = weatherCodes[current.weather_code] || { desc: 'Unknown', icon: '❓' };
    elements.description.textContent = wmo.desc;
    
    // Inject icon
    const iconContainer = document.querySelector('.weather-icon');
    if(iconContainer) {
        iconContainer.innerHTML = `<div style="font-size: 4rem;">${wmo.icon}</div>`;
    }

    // Toggle Day/Night Theme based on is_day
    // Note: is_day comes from the API which knows if it's day/night at that location
    if (current.is_day === 1) {
        document.body.classList.add('day-mode');
    } else {
        document.body.classList.remove('day-mode');
    }
}

function setLoading(state) {
    if (state) {
        elements.searchBtn.disabled = true;
        elements.searchBtn.innerHTML = '<span class="loader">...</span>'; // Simple loader text
        elements.appContainer.style.opacity = '0.7';
    } else {
        elements.searchBtn.disabled = false;
        elements.searchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
        elements.appContainer.style.opacity = '1';
    }
}

function showError(message) {
    alert(message); // Simple alert for now, could be a toast
}
