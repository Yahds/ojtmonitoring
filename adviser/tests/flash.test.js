const { flash } = require('../middleware/flash');

// runs the middleware once, like one request hitting the server
function runRequest(session) {
    const req = { session };
    const res = { locals: {} };
    const next = jest.fn();
    flash(req, res, next);
    return { req, res, next };
}

test('a message saved on one request shows on the next one', () => {
    const session = {};
    const first = runRequest(session);
    first.req.flash('success', 'Intern enrolled.');

    const second = runRequest(session);
    expect(second.res.locals.flash).toEqual({ type: 'success', text: 'Intern enrolled.' });
});

test('the message shows only once', () => {
    const session = {};
    runRequest(session).req.flash('error', 'Could not deploy.');
    runRequest(session);

    const third = runRequest(session);
    expect(third.res.locals.flash).toBeUndefined();
});

test('it always moves on to the next middleware', () => {
    const { next } = runRequest({});
    expect(next).toHaveBeenCalledTimes(1);
});
