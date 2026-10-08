const { displayName, navFor, homeFor } = require('../middleware/currentUser');

describe('displayName', () => {
    test('turns "Last, First" into "First Last"', () => {
        expect(displayName('Stevens, Amelia')).toBe('Amelia Stevens');
    });

    test('leaves a name without a comma as it is', () => {
        expect(displayName('Amelia Stevens')).toBe('Amelia Stevens');
    });
});

describe('navFor', () => {
    const current = (role, path) => navFor(role, path).filter(link => link.current).map(link => link.label);

    test('an adviser on a review page sees Interns as the current page', () => {
        expect(current('adviser', '/adviser/interns/5/requirements')).toEqual(['Interns']);
    });

    test('Dashboard is current only on the dashboard itself', () => {
        expect(current('adviser', '/adviser/dashboard')).toEqual(['Dashboard']);
        expect(current('adviser', '/adviser/dashboard')).toEqual(['Dashboard']);
    });

    test('a dept head gets the dept head links', () => {
        expect(navFor('dept_head', '/adviser/admin').map(link => link.label)).toEqual(['Overview', 'Advisers', 'Interns', 'About us']);
    });
});

describe('homeFor', () => {
    test('sends a dept head to the overview and an adviser to the dashboard', () => {
        expect(homeFor('dept_head')).toBe('/adviser/admin');
        expect(homeFor('adviser')).toBe('/adviser/dashboard');
    });
});
