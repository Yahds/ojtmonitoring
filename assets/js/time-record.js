// shows each day's hours and the week total while the intern types; the server counts them again
document.querySelectorAll('[data-time-record]').forEach((form) => {
  const minutes = (time) => {
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  };
  const between = (row, part) => {
    const start = row.querySelector(`[name$="[${part}_in]"]`).value;
    const end = row.querySelector(`[name$="[${part}_out]"]`).value;
    return start && end && minutes(end) > minutes(start) ? minutes(end) - minutes(start) : 0;
  };
  const hoursText = (total) => String(Math.round((total / 60) * 100) / 100);

  const update = () => {
    let week = 0;
    form.querySelectorAll('tr[data-day]').forEach((row) => {
      const day = between(row, 'am') + between(row, 'pm');
      week += day;
      row.querySelector('[data-day-hours]').textContent = day ? hoursText(day) : '–';
    });
    form.querySelector('[data-week-total]').textContent = hoursText(week);
  };

  form.addEventListener('input', update);
  update();
});
