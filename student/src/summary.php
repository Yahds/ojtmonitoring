<?php
// OJT hours each course must finish
function targetHoursFor(string $course): ?int
{
    return ['BSCS' => 240, 'BSIT' => 600][$course] ?? null;
}

// numbers and the to-do list for the student dashboard
function summarize(array $requirements, array $reports): array
{
    $hoursWith = fn (string $status) => array_sum(array_map(
        fn ($report) => $report['status'] === $status ? (int) $report['hours'] : 0,
        $reports
    ));
    $requirementsWith = fn (string $status) => count(array_filter($requirements, fn ($r) => $r->status === $status));
    $reportsWith = fn (string $status) => count(array_filter($reports, fn ($report) => $report['status'] === $status));

    return [
        'approvedHours' => $hoursWith('APPROVED'),
        'waitingHours' => $hoursWith('PENDING'),
        'reportsApproved' => $reportsWith('APPROVED'),
        'reportsWaiting' => $reportsWith('PENDING'),
        'requirementsApproved' => $requirementsWith('APPROVED'),
        'requirementsTotal' => count($requirements),
        'requirementsWaiting' => $requirementsWith('SUBMITTED'),
        'requirementsNeedChanges' => $requirementsWith('REJECTED'),
        'todo' => groupRequirements($requirements)['action'],
    ];
}

// splits requirements into what the intern must do, what waits for the adviser, and what is done
function groupRequirements(array $requirements): array
{
    $withStatus = fn (array $statuses) => array_values(array_filter($requirements, fn ($r) => in_array($r->status, $statuses, true)));

    // rejected ones first: they already have the adviser's remark to act on
    $action = $withStatus(['REJECTED', 'PENDING']);
    usort($action, fn ($a, $b) => ($a->status === 'REJECTED' ? 0 : 1) <=> ($b->status === 'REJECTED' ? 0 : 1));

    return [
        'action' => $action,
        'waiting' => $withStatus(['SUBMITTED']),
        'approved' => $withStatus(['APPROVED']),
    ];
}
