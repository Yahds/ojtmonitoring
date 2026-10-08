// keeps the time and date in the dashboard hero up to date
const clockTime = document.getElementById('clock-time');
const clockDate = document.getElementById('clock-date');

function tick() {
    const now = new Date();
    clockTime.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    clockDate.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

if (clockTime && clockDate) {
    tick();
    setInterval(tick, 15000);
}
