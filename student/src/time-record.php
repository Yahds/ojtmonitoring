<?php
const MAX_HOURS_A_DAY = 16;

// "08:05" or "08:05:00" from <input type="time">
function readTime(mixed $value): ?string
{
    $value = is_string($value) ? trim($value) : '';
    if ($value === '') {
        return null;
    }
    return preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $value) ? substr($value, 0, 5) : 'invalid';
}

function minutesOf(string $time): int
{
    [$hours, $minutes] = explode(':', $time);
    return (int) $hours * 60 + (int) $minutes;
}

function dayLabel(string $date): string
{
    return (new DateTimeImmutable($date))->format('D, M j');
}

// only the dates of this week count, whatever else the form sends
function readTimeRecord(array $posted, array $dates): array
{
    $days = [];
    foreach ($dates as $date) {
        $row = is_array($posted[$date] ?? null) ? $posted[$date] : [];
        $times = [];
        foreach (['am_in', 'am_out', 'pm_in', 'pm_out'] as $field) {
            $times[$field] = readTime($row[$field] ?? '');
            if ($times[$field] === 'invalid') {
                return ['days' => [], 'error' => 'Enter real times on ' . dayLabel($date) . '.'];
            }
        }

        $minutes = 0;
        foreach (['am' => 'morning', 'pm' => 'afternoon'] as $part => $name) {
            [$in, $out] = [$times["{$part}_in"], $times["{$part}_out"]];
            if (($in === null) !== ($out === null)) {
                return ['days' => [], 'error' => "Fill in both the $name start and end on " . dayLabel($date) . '.'];
            }
            if ($in !== null && minutesOf($out) <= minutesOf($in)) {
                return ['days' => [], 'error' => "The $name end must be after its start on " . dayLabel($date) . '.'];
            }
            $minutes += $in === null ? 0 : minutesOf($out) - minutesOf($in);
        }
        if ($times['am_out'] !== null && $times['pm_in'] !== null && minutesOf($times['pm_in']) < minutesOf($times['am_out'])) {
            return ['days' => [], 'error' => 'The afternoon must start after the morning ends on ' . dayLabel($date) . '.'];
        }
        if ($minutes > MAX_HOURS_A_DAY * 60) {
            return ['days' => [], 'error' => 'More than ' . MAX_HOURS_A_DAY . ' hours on ' . dayLabel($date) . '. Please check the times.'];
        }
        if ($minutes > 0) {
            $days[$date] = $times + ['hours' => round($minutes / 60, 2)];
        }
    }
    return ['days' => $days, 'error' => null];
}

const ABSENCE_PARTS = ['DAY' => 'Whole day', 'AM' => 'Morning', 'PM' => 'Afternoon'];
const PROOF_TYPES = ['MEDICAL' => 'Medical certificate', 'LETTER' => "Parent's letter"];
const NO_WORK_REASONS = ['HOLIDAY' => 'Holiday', 'CLOSED' => 'Company was closed', 'SCHOOL' => 'School activity', 'OTHER' => 'Other'];

function readAbsences(array $posted, array $dates, bool $acceptsLetter, array $workDays): array
{
    $absences = [];
    foreach ($dates as $date) {
        $row = is_array($posted[$date] ?? null) ? $posted[$date] : [];
        $part = is_string($row['part'] ?? null) ? $row['part'] : '';
        if ($part === '') {
            continue;
        }
        $day = dayLabel($date);
        if (!isset(ABSENCE_PARTS[$part])) {
            return ['absences' => [], 'error' => "Choose how long you were absent on $day."];
        }
        $reason = is_string($row['reason'] ?? null) ? trim($row['reason']) : '';
        if ($reason === '' || mb_strlen($reason) > 200) {
            return ['absences' => [], 'error' => "Write why you were absent on $day, up to 200 characters."];
        }
        $proofType = $acceptsLetter ? ($row['proof_type'] ?? '') : 'MEDICAL';
        if (!is_string($proofType) || !isset(PROOF_TYPES[$proofType])) {
            return ['absences' => [], 'error' => "Choose which proof you're attaching for $day."];
        }
        $worked = $workDays[$date] ?? null;
        if ($worked && ($part === 'DAY' || $worked[strtolower($part) . '_in'] !== null)) {
            return ['absences' => [], 'error' => "You marked $day as absent but also entered work times for that part of the day."];
        }
        $absences[$date] = ['part' => $part, 'reason' => $reason, 'proof_type' => $proofType];
    }
    return ['absences' => $absences, 'error' => null];
}

function hoursText(float|string|null $hours): string
{
    return rtrim(rtrim(number_format((float) $hours, 2, '.', ''), '0'), '.');
}
