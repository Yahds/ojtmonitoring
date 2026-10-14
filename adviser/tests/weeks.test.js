const { weekRange, weekDueOn, missingWeeks, isPastNoon, weekLabel, dueLabel } = require('../lib/weeks');

// same cases as the student app's WeeksTest, so both apps count weeks the same way
const DEPLOYED_TUESDAY = '2026-09-01';

test('week 1 runs from the deploy day to the first friday, then weeks are monday to friday', () => {
    expect(weekRange(DEPLOYED_TUESDAY, 1)).toEqual(['2026-09-01', '2026-09-04']);
    expect(weekRange(DEPLOYED_TUESDAY, 2)).toEqual(['2026-09-07', '2026-09-11']);
    expect(weekRange(DEPLOYED_TUESDAY, 5)).toEqual(['2026-09-28', '2026-10-02']);
    expect(weekRange('2026-09-05', 1)).toEqual(['2026-09-05', '2026-09-11']);
});

test('a report is due on the monday after by default, or what the rule for that week says', () => {
    const rules = [{ starts_on: '2026-09-26', due_days: 10 }];

    expect(weekDueOn(DEPLOYED_TUESDAY, 1, [])).toBe('2026-09-07');
    expect(weekDueOn(DEPLOYED_TUESDAY, 4, rules)).toBe('2026-09-28');
    expect(weekDueOn(DEPLOYED_TUESDAY, 5, rules)).toBe('2026-10-12');
});

test('a week is missing once its friday came and nothing was sent for it', () => {
    expect(missingWeeks(DEPLOYED_TUESDAY, '2026-09-03', [], [])).toEqual([]);
    expect(missingWeeks(DEPLOYED_TUESDAY, '2026-09-20', [1, 3], []).map(missing => missing.week)).toEqual([2]);
    expect(missingWeeks(DEPLOYED_TUESDAY, '2026-09-11', [1], [])).toEqual([
        { week: 2, range: ['2026-09-07', '2026-09-11'], due: '2026-09-14' },
    ]);
});

test('overdue starts at 12 noon on the due date', () => {
    expect(isPastNoon('2026-09-14', new Date(2026, 8, 14, 11, 59))).toBe(false);
    expect(isPastNoon('2026-09-14', new Date(2026, 8, 14, 12, 0))).toBe(true);
    expect(isPastNoon('2026-09-14', new Date(2026, 8, 15, 8, 0))).toBe(true);
});

test('labels read like the student page', () => {
    expect(weekLabel(weekRange(DEPLOYED_TUESDAY, 2))).toBe('Sep 7 – 11');
    expect(weekLabel(weekRange(DEPLOYED_TUESDAY, 5))).toBe('Sep 28 – Oct 2');
    expect(dueLabel('2026-10-12')).toBe('Monday, Oct 12');
});
