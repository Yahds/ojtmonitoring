<?php
const DEFAULT_DUE_DAYS = 3;

function firstFriday(string $deployedOn): DateTimeImmutable
{
    // day before, then next friday = first friday on or after the deploy day
    return (new DateTimeImmutable($deployedOn))->modify('-1 day')->modify('next friday');
}

function weekRange(string $deployedOn, int $week): array
{
    if ($week === 1) {
        return [new DateTimeImmutable($deployedOn), firstFriday($deployedOn)];
    }
    $monday = firstFriday($deployedOn)->modify('+3 days')->modify('+' . (7 * ($week - 2)) . ' days');
    return [$monday, $monday->modify('+4 days')];
}

function weekNumberOn(string $deployedOn, string $date): int
{
    if ($date < $deployedOn) {
        return 0;
    }
    $daysAfterFirstFriday = (int) firstFriday($deployedOn)->diff(new DateTimeImmutable($date))->format('%r%a');
    // the weekend still counts as the week before
    return $daysAfterFirstFriday <= 0 ? 1 : 1 + intdiv($daysAfterFirstFriday + 4, 7);
}

function dueDaysOn(array $dueRules, string $friday): int
{
    $days = DEFAULT_DUE_DAYS;
    foreach ($dueRules as $rule) {
        if ($rule['starts_on'] <= $friday) {
            $days = (int) $rule['due_days'];
        }
    }
    return $days;
}

function weekDueAt(string $deployedOn, int $week, array $dueRules): DateTimeImmutable
{
    $friday = weekRange($deployedOn, $week)[1];
    return $friday->modify('+' . dueDaysOn($dueRules, $friday->format('Y-m-d')) . ' days')->setTime(12, 0);
}

function nextWeekToReport(string $deployedOn, string $today, array $reportedWeeks): ?int
{
    $lastOpen = weekNumberOn($deployedOn, $today);
    if ($lastOpen > 0 && weekRange($deployedOn, $lastOpen)[1]->format('Y-m-d') > $today) {
        $lastOpen--;
    }
    for ($week = 1; $week <= $lastOpen; $week++) {
        if (!in_array($week, $reportedWeeks, true)) {
            return $week;
        }
    }
    return null;
}

function weekLabel(array $range): string
{
    return $range[0]->format('M j') . ' – ' . $range[1]->format($range[0]->format('M') === $range[1]->format('M') ? 'j' : 'M j');
}

function reportingWeek(string $deployedOn, array $dueRules, array $reportedWeeks, string $today): array
{
    $week = nextWeekToReport($deployedOn, $today, $reportedWeeks);
    if ($week !== null) {
        return ['week' => $week, 'range' => weekRange($deployedOn, $week), 'due' => weekDueAt($deployedOn, $week, $dueRules), 'opensOn' => null];
    }
    $upcoming = 1;
    while (in_array($upcoming, $reportedWeeks, true)) {
        $upcoming++;
    }
    return ['week' => null, 'range' => null, 'due' => null, 'opensOn' => weekRange($deployedOn, $upcoming)[1]];
}

// week dates + the weekend after
function reportDays(array $range): array
{
    $days = [];
    for ($day = $range[0]; $day <= $range[1]->modify('+2 days'); $day = $day->modify('+1 day')) {
        $days[] = ['date' => $day->format('Y-m-d'), 'weekend' => (int) $day->format('N') >= 6];
    }
    return $days;
}
