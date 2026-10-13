const { isRealDate, today } = require('../lib/dates');

test('only real calendar dates are accepted', () => {
    expect(isRealDate('2026-11-03')).toBe(true);
    expect(isRealDate('2026-02-31')).toBe(false);
    expect(isRealDate('next monday')).toBe(false);
});

test('today looks like 2026-11-03', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
