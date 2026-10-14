// shows each day's hours and the week total while the intern types; the server counts them again
document.querySelectorAll('[data-time-record]').forEach((form) => {
  const minutes = (time) => {
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  };
  const input = (row, field) => row.querySelector(`[name$="[${field}]"]`);
  const hoursText = (total) => String(Math.round((total / 60) * 100) / 100);

  const checkDay = (row) => {
    const wrong = new Set();
    let total = 0;
    ['am', 'pm'].forEach((part) => {
      const start = input(row, `${part}_in`);
      const end = input(row, `${part}_out`);
      if (!start.value || !end.value) return;
      if (minutes(end.value) <= minutes(start.value)) {
        wrong.add(start).add(end);
      } else {
        total += minutes(end.value) - minutes(start.value);
      }
    });
    const amEnd = input(row, 'am_out');
    const pmStart = input(row, 'pm_in');
    if (amEnd.value && pmStart.value && minutes(pmStart.value) < minutes(amEnd.value)) {
      wrong.add(amEnd).add(pmStart);
    }
    row.querySelectorAll('input').forEach((field) => {
      if (wrong.has(field)) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    });
    return wrong.size ? null : total;
  };

  const parts = ['am_in', 'am_out', 'pm_in', 'pm_out'];
  const weekdays = [...form.querySelectorAll('tr[data-day]')].filter((row) => !row.closest('details'));
  const isEmpty = (row) => parts.every((field) => !input(row, field).value);
  const copyButton = form.querySelector('[data-copy-days]');
  copyButton.hidden = false;
  copyButton.addEventListener('click', () => {
    const first = weekdays.find((row) => !isEmpty(row));
    weekdays.filter(isEmpty).forEach((row) => {
      parts.forEach((field) => {
        input(row, field).value = input(first, field).value;
      });
    });
    update();
    saveDraft();
  });

  const update = () => {
    copyButton.disabled = weekdays.every(isEmpty) || !weekdays.some(isEmpty);
    let week = 0;
    form.querySelectorAll('tr[data-day]').forEach((row) => {
      const day = checkDay(row);
      const cell = row.querySelector('[data-day-hours]');
      cell.classList.toggle('time-wrong', day === null);
      cell.textContent = day === null ? 'Check times' : day ? hoursText(day) : '–';
      week += day || 0;
    });
    form.querySelector('[data-week-total]').textContent = hoursText(week);
  };

  // keeps what the intern typed if they leave the page, like going to change their supervisor
  const draftKey = form.dataset.draft;
  const fields = form.querySelectorAll('input[type="time"], input[type="text"], select, textarea');
  const saveDraft = () => {
    const draft = Object.fromEntries([...fields].map((field) => [field.name, field.value]));
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {}
  };
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('weekly-draft-') && key !== draftKey)
      .forEach((key) => sessionStorage.removeItem(key));
    const draft = JSON.parse(sessionStorage.getItem(draftKey) || '{}');
    fields.forEach((field) => {
      if (!field.value && draft[field.name]) field.value = draft[field.name];
    });
  } catch {}
  form.querySelectorAll('details').forEach((section) => {
    if ([...section.querySelectorAll('input:not([type="file"]), select')].some((field) => field.value)) {
      section.open = true;
    }
  });

  form.addEventListener('input', () => {
    update();
    saveDraft();
  });
  update();
});
