// warns 2 minutes before the 30-minute idle logout in middleware/idleTimeout.js
const MINUTE = 60 * 1000;
const dialog = document.getElementById('idle-warning');
let warnTimer;
let logoutTimer;

function startTimers() {
    clearTimeout(warnTimer);
    clearTimeout(logoutTimer);
    warnTimer = setTimeout(() => dialog.showModal(), 28 * MINUTE);
    logoutTimer = setTimeout(() => window.location.reload(), 30 * MINUTE + 10 * 1000);
}

dialog.querySelector('[data-stay-logged-in]').addEventListener('click', async () => {
    const res = await fetch('/adviser/session/keep-alive');
    if (res.status !== 204) {
        window.location.reload();
        return;
    }
    dialog.close();
    startTimers();
});

startTimers();
