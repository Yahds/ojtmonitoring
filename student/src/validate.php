<?php
// returns the value as a whole number when it is between $min and $max, or null when it is not
function wholeNumberIn(mixed $value, int $min, int $max): ?int
{
    $number = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => $min, 'max_range' => $max]]);
    return $number === false ? null : $number;
}

// returns the date when it is a real calendar date like 2026-11-03, or null
function validDate(mixed $value): ?string
{
    if (!is_string($value)) {
        return null;
    }
    $date = DateTime::createFromFormat('!Y-m-d', $value);
    return $date && $date->format('Y-m-d') === $value ? $value : null;
}
