const ROLE_LABELS = { adviser: 'Adviser', dept_head: 'Dept head' };

const INTERNS_LINK = {
    href: '/adviser/interns',
    label: 'Interns',
};

const NAV = {
    adviser: [
        { href: '/adviser/dashboard', label: 'Dashboard', exact: true },
        INTERNS_LINK,
        { href: '/adviser/about', label: 'About us' },
    ],
    dept_head: [
        { href: '/ojt-admin', label: 'Overview', exact: true },
        { href: '/ojt-admin/advisers', label: 'Advisers' },
        INTERNS_LINK,
        { href: '/adviser/about', label: 'About us' },
    ],
};

function displayName(name) {
    if (!name.includes(',')) {
        return name.trim();
    }
    const [last, first] = name.split(',');
    return `${first.trim()} ${last.trim()}`;
}

function isCurrent(link, path) {
    if (link.exact) {
        return path === link.href;
    }
    return [link.href, ...(link.also || [])].some(prefix => path.startsWith(prefix));
}

function navFor(role, rawPath) {
    const path = rawPath.replace(/\/+$/, '') || '/';
    return (NAV[role] || NAV.adviser).map(link => ({ ...link, current: isCurrent(link, path) }));
}

function homeFor(role) {
    return role === 'dept_head' ? '/ojt-admin' : '/adviser/dashboard';
}

// gives every page the logged-in user and the sidebar links
function currentUser(req, res, next) {
    if (req.session.isLoggedIn) {
        res.locals.user = {
            name: displayName(req.session.name || ''),
            roleLabel: ROLE_LABELS[req.session.role] || 'Adviser',
            home: homeFor(req.session.role),
        };
        res.locals.nav = navFor(req.session.role, req.path);
    }
    next();
}

module.exports = { currentUser, displayName, navFor, homeFor };
