const STATUSES = {
    intern: {
        ENROLLED: { label: 'Choosing company', tag: '' },
        PENDING: { label: 'Waiting for deployment', tag: 'tag-warn' },
        ACTIVE: { label: 'Deployed', tag: 'tag-ok' },
        FINISHED: { label: 'Finished', tag: 'tag-ok' },
        WITHDRAWN: { label: 'Withdrawn', tag: 'tag-bad' },
    },
    requirement: {
        PENDING: { label: 'Not submitted', tag: '' },
        SUBMITTED: { label: 'Waiting for review', tag: 'tag-warn' },
        APPROVED: { label: 'Approved', tag: 'tag-ok' },
        REJECTED: { label: 'Needs changes', tag: 'tag-bad' },
    },
    review: {
        PENDING: { label: 'Waiting for review', tag: 'tag-warn' },
        APPROVED: { label: 'Approved', tag: 'tag-ok' },
        REJECTED: { label: 'Needs changes', tag: 'tag-bad' },
    },
};

function statusOf(kind, status) {
    return STATUSES[kind][status] || { label: status, tag: '' };
}

module.exports = { statusOf };
