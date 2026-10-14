// same week rules as the student app's weeks.php. dates are 'YYYY-MM-DD' text
const DEFAULT_DUE_DAYS = 3;
const DAY = 24 * 60 * 60 * 1000;

const toDate = text => new Date(`${text}T00:00:00Z`);
const toText = date => date.toISOString().slice(0, 10);
const addDays = (text, days) => toText(new Date(toDate(text).getTime() + days * DAY));

function firstFriday(deployedOn) {
    return addDays(deployedOn, (5 - toDate(deployedOn).getUTCDay() + 7) % 7);
}

function weekRange(deployedOn, week) {
    if (week === 1) return [deployedOn, firstFriday(deployedOn)];
    const monday = addDays(firstFriday(deployedOn), 3 + 7 * (week - 2));
    return [monday, addDays(monday, 4)];
}

function dueDaysOn(dueRules, friday) {
    let days = DEFAULT_DUE_DAYS;
    dueRules.forEach(rule => {
        if (rule.starts_on <= friday) days = rule.due_days;
    });
    return days;
}

// the report is due at 12 noon on this date
function weekDueOn(deployedOn, week, dueRules) {
    const friday = weekRange(deployedOn, week)[1];
    return addDays(friday, dueDaysOn(dueRules, friday));
}

// weeks that opened (their friday came) but have no report
function missingWeeks(deployedOn, today, reportedWeeks, dueRules) {
    const missing = [];
    for (let week = 1; weekRange(deployedOn, week)[1] <= today; week++) {
        if (!reportedWeeks.includes(week)) {
            missing.push({ week, range: weekRange(deployedOn, week), due: weekDueOn(deployedOn, week, dueRules) });
        }
    }
    return missing;
}

function isPastNoon(date, now = new Date()) {
    const pad = number => String(number).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    return today > date || (today === date && now.getHours() >= 12);
}

const format = (text, options) => toDate(text).toLocaleDateString('en-US', { timeZone: 'UTC', ...options });

function weekLabel([start, end]) {
    const sameMonth = start.slice(0, 7) === end.slice(0, 7);
    return `${format(start, { month: 'short', day: 'numeric' })} – ${format(end, sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' })}`;
}

function dueLabel(date) {
    return format(date, { weekday: 'long', month: 'short', day: 'numeric' });
}

module.exports = { firstFriday, weekRange, weekDueOn, missingWeeks, isPastNoon, weekLabel, dueLabel };
