const { statusOf } = require('../lib/statuses');

test('PENDING means a different thing for each kind of record', () => {
    expect(statusOf('intern', 'PENDING').label).toBe('Waiting for deployment');
    expect(statusOf('requirement', 'PENDING').label).toBe('Not submitted');
    expect(statusOf('review', 'PENDING').label).toBe('Waiting for review');
});

test('an unknown status is shown as it is stored', () => {
    expect(statusOf('intern', 'SOMETHING_NEW')).toEqual({ label: 'SOMETHING_NEW', tag: '' });
});
