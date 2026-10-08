<?php
// escapes text for HTML, so user input will not become markup
function e(?string $text): string
{
    return htmlspecialchars($text ?? '', ENT_QUOTES, 'UTF-8');
}

// "Santos, Maria" -> "Maria Santos"
function displayName(string $name): string
{
    if (!str_contains($name, ',')) {
        return trim($name);
    }
    [$last, $first] = explode(',', $name, 2);
    return trim($first) . ' ' . trim($last);
}
