<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/nav.php';

class NavTest extends TestCase
{
    private function labels(array $nav): array
    {
        return array_column($nav, 'label');
    }

    public function testAPendingInternSeesDashboardRequirementsAndAnnouncements(): void
    {
        $this->assertSame(['Dashboard', 'Requirements', 'Announcements'], $this->labels(navFor('PENDING', '/requirements')));
    }

    public function testADeployedInternAlsoSeesWeeklyReportsAndJournals(): void
    {
        $this->assertSame(['Dashboard', 'Requirements', 'Weekly reports', 'Journals', 'Announcements'], $this->labels(navFor('ACTIVE', '/dashboard')));
    }

    public function testTheCurrentPageIsMarked(): void
    {
        $current = array_filter(navFor('ACTIVE', '/journals'), fn ($link) => $link['current']);
        $this->assertSame(['Journals'], array_column($current, 'label'));
    }

    public function testAFinishedInternStillSeesTheirReportsAndJournals(): void
    {
        $this->assertSame(['Dashboard', 'Requirements', 'Weekly reports', 'Journals', 'Announcements'], $this->labels(navFor('FINISHED', '/dashboard')));
    }
}
