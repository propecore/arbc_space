const INFO = document.getElementById("city-info");

const OWM_KEY = "d9009b5c6a45d5cfc5130db917cd2a3a"; 
const NASA_KEY = "Bt2yUdZg8n1oW6c6k94oQHYfGTaUXwMjwEypYr8c"; 

const buttons = document.querySelectorAll(".city-btn");
buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        const lat = btn.dataset.lat;
        const lon = btn.dataset.lon;
        const cityName = btn.textContent;
        loadCityData(cityName, lat, lon);
    });
});

let loadingInterval = null;

function startLoading() {
    let dots = 0;
    INFO.innerHTML = "<p>Загрузка данных</p>";

    loadingInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        INFO.innerHTML = `<p>Загрузка данных${".".repeat(dots)}</p>`;
    }, 400);
}

function stopLoading() {
    clearInterval(loadingInterval);
    loadingInterval = null;
}

async function loadCityData(cityName, lat, lon) {
    startLoading();

    try {
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${OWM_KEY}`);
        const weather = await weatherRes.json();

        if (!weather.main) {
            stopLoading();
            INFO.innerHTML = `<p>Ошибка получения данных о погоде: ${weather.message || 'проверьте API ключ'}</p>`;
            return;
        }

        const now = new Date((weather.dt + weather.timezone) * 1000);
        const hours = now.getUTCHours();
        const isDay = hours >= 6 && hours < 18;

        const moonPhase = getMoonPhase(new Date());

        const endDate = new Date().toISOString().split("T")[0];
        const startDate = new Date(Date.now() - 24*3600*1000).toISOString().split("T")[0];

        const flaresRes = await fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_KEY}`);
        const flares = await flaresRes.json();

        const stormsRes = await fetch(`https://api.nasa.gov/DONKI/GST?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_KEY}`);
        const storms = await stormsRes.json();

        const temp = weather.main.temp;
        const fireRisk = isDay && temp > 28 ? "Высокий риск" : temp > 20 ? "Средний риск" : "Низкий риск";
        const geomRisk = (storms.length > 0 || flares.length > 0) ? "Высокий риск" : "Низкий риск";
        const tidalRisk = moonPhase > 0.9 || moonPhase < 0.1 ? "Средний риск" : "Низкий риск";

        const fireRisk_color = isDay && temp > 28 ? "high" : temp > 20 ? "med" : "low";
        const geomRisk_color = (storms.length > 0 || flares.length > 0) ? "high" : "low";
        const tidalRisk_color = moonPhase > 0.9 || moonPhase < 0.1 ? "med" : "low";

        stopLoading();
        INFO.innerHTML = `
            <h2>${cityName}</h2>
            <p><strong>Температура:</strong> ${temp.toFixed(1)}°C</p>
            <p><strong>Время в городе:</strong> ${now.toUTCString().slice(17,22)}</p>
            <p><strong>Фаза Луны:</strong> ${moonPhaseText(moonPhase)}</p>

            <h3>Риски:</h3>
            <p>🔥 Пожары: <span class="risk-${fireRisk_color}">${fireRisk}</span></p>
            <p>🌊 Наводнения (приливы): <span class="risk-${tidalRisk_color}">${tidalRisk}</span></p>
            <p>⚡ Геомагнитные бури: <span class="risk-${geomRisk_color}">${geomRisk}</span></p>
        `;
    } catch (e) {
        stopLoading();
        INFO.innerHTML = "<p>Произошла ошибка при получении данных.</p>";
        console.error(e);
    }
}

function getMoonPhase(date) {
    const lp = 29.53;
    const newMoon = new Date(Date.UTC(2001,0,1));
    const diff = (date - newMoon) / 1000 / 86400;
    const phase = (diff % lp) / lp;
    return phase;
}

function moonPhaseText(p) {
    if (p < 0.01 || p > 0.99) return "Новолуние 🌑";
    if (p < 0.25) return "Первая четверть 🌒";
    if (p < 0.51) return "Полнолуние 🌕";
    if (p < 0.75) return "Последняя четверть 🌘";
    return "Фаза 🌙";
}
