<?php
// returns the value as a whole number when it is between $min and $max, or null when it is not
function wholeNumberIn(mixed $value, int $min, int $max): ?int
{
    $number = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => $min, 'max_range' => $max]]);
    return $number === false ? null : $number;
}
