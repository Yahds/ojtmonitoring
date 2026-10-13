<?php
function navFor(string $status, string $path): array
{
    $deployed = in_array($status, ['ACTIVE', 'FINISHED'], true);
    $links = [
        ['href' => $deployed ? '/dashboard' : '/choose-company', 'label' => 'Dashboard'],
        ['href' => '/requirements', 'label' => 'Requirements'],
    ];
    if ($deployed) {
        $links[] = ['href' => '/weekly-reports', 'label' => 'Weekly reports'];
        $links[] = ['href' => '/journals', 'label' => 'Journals'];
    }
    return array_map(fn ($link) => $link + ['current' => $link['href'] === $path], $links);
}
