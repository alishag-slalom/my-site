(function () {
  const WMO = {
    0:  { label: 'Clear Sky',           emoji: '☀️' },
    1:  { label: 'Mostly Clear',        emoji: '🌤️' },
    2:  { label: 'Partly Cloudy',       emoji: '⛅' },
    3:  { label: 'Overcast',            emoji: '☁️' },
    45: { label: 'Foggy',               emoji: '🌫️' },
    48: { label: 'Icy Fog',             emoji: '🌫️' },
    51: { label: 'Light Drizzle',       emoji: '🌦️' },
    53: { label: 'Drizzle',             emoji: '🌦️' },
    55: { label: 'Heavy Drizzle',       emoji: '🌦️' },
    61: { label: 'Light Rain',          emoji: '🌧️' },
    63: { label: 'Rain',                emoji: '🌧️' },
    65: { label: 'Heavy Rain',          emoji: '🌧️' },
    71: { label: 'Light Snow',          emoji: '🌨️' },
    73: { label: 'Snow',                emoji: '❄️' },
    75: { label: 'Heavy Snow',          emoji: '❄️' },
    77: { label: 'Snow Grains',         emoji: '🌨️' },
    80: { label: 'Rain Showers',        emoji: '🌦️' },
    81: { label: 'Rain Showers',        emoji: '🌧️' },
    82: { label: 'Violent Showers',     emoji: '⛈️' },
    85: { label: 'Snow Showers',        emoji: '🌨️' },
    86: { label: 'Heavy Snow Showers',  emoji: '❄️' },
    95: { label: 'Thunderstorm',        emoji: '⛈️' },
    96: { label: 'Thunderstorm',        emoji: '⛈️' },
    99: { label: 'Thunderstorm',        emoji: '⛈️' },
  };

  function wmoInfo(code) {
    return WMO[code] || { label: 'Unknown', emoji: '🌡️' };
  }

  async function fetchWeather(lat, lon) {
    const url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + lat
      + '&longitude=' + lon
      + '&current=temperature_2m,weathercode'
      + '&daily=temperature_2m_max,temperature_2m_min,weathercode'
      + '&temperature_unit=fahrenheit'
      + '&timezone=auto';

    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');
    return res.json();
  }

  async function reverseGeocode(lat, lon) {
    try {
      const url = 'https://nominatim.openstreetmap.org/reverse'
        + '?lat=' + lat + '&lon=' + lon
        + '&format=json';
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      const city = data.address.city
        || data.address.town
        || data.address.village
        || data.address.county
        || '';
      const state = data.address.state_code || data.address.state || '';
      return city && state ? city + ', ' + state : city || state;
    } catch (_) {
      return '';
    }
  }

  function showForecast(daily) {
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const list = document.getElementById('forecastList');
    const count = Math.min(5, daily.time.length);
    let html = '';
    for (let i = 0; i < count; i++) {
      const parts = daily.time[i].split('-');
      const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      const name = i === 0 ? 'Today' : DAY_NAMES[d.getDay()];
      const todayClass = i === 0 ? ' today' : '';
      const { emoji } = wmoInfo(daily.weathercode[i]);
      const hi = Math.round(daily.temperature_2m_max[i]);
      const lo = Math.round(daily.temperature_2m_min[i]);
      html += '<div class="forecast-day">'
        + '<span class="forecast-day-name' + todayClass + '">' + name + '</span>'
        + '<span class="forecast-day-emoji">' + emoji + '</span>'
        + '<span class="forecast-day-temps">'
        + '<span class="hi">' + hi + '°</span>'
        + '<span class="lo">' + lo + '°</span>'
        + '</span></div>';
    }
    list.innerHTML = html;

    const toggle = document.getElementById('forecastToggle');
    const panel  = document.getElementById('forecastPanel');
    toggle.classList.add('visible');
    toggle.addEventListener('click', function () {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      panel.classList.toggle('open', !expanded);
    });
  }

  function showWidget(temp, code, location, daily) {
    const { label, emoji } = wmoInfo(code);
    document.getElementById('weatherEmoji').textContent = emoji;
    document.getElementById('weatherTemp').textContent = Math.round(temp) + '°F';
    document.getElementById('weatherDesc').textContent = label;
    document.getElementById('weatherLoc').textContent = location;
    document.getElementById('weatherWidget').classList.add('loaded');
    if (daily) showForecast(daily);
  }

  function showError(denied) {
    const widget = document.getElementById('weatherWidget');
    const msg = denied
      ? '📍 Enable location to see your weather'
      : 'Weather unavailable';
    widget.innerHTML = '<div class="weather-widget-inner"><span class="weather-error">' + msg + '</span></div>';
    widget.classList.add('loaded');
  }

  function init() {
    if (!('geolocation' in navigator)) { showError(false); return; }
    navigator.geolocation.getCurrentPosition(
      async function (pos) {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const [weather, location] = await Promise.all([
            fetchWeather(lat, lon),
            reverseGeocode(lat, lon),
          ]);
          const c = weather.current;
          showWidget(c.temperature_2m, c.weathercode, location, weather.daily);
        } catch (_) {
          showError(false);
        }
      },
      function (err) { showError(err.code === 1); },
      { timeout: 8000, maximumAge: 300000 }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
