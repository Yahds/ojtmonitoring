<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/classes.php';
require_once __DIR__ . '/../src/summary.php';

class SummaryTest extends TestCase
{
    private function requirement(string $name, string $status, ?string $remarks = null): Requirement
    {
        return new Requirement(1, 1, $name, null, $status, $remarks);
    }

    public function testHoursCountOnlyApprovedReports(): void
    {
        $summary = summarize([], [
            ['hours' => 40, 'status' => 'APPROVED'],
            ['hours' => 32, 'status' => 'PENDING'],
            ['hours' => 8, 'status' => 'REJECTED'],
        ]);

        $this->assertSame(40.0, $summary['approvedHours']);
        $this->assertSame(32.0, $summary['waitingHours']);
    }

    public function testToDoShowsRejectedRequirementsFirstThenUnsubmittedOnes(): void
    {
        $summary = summarize([
            $this->requirement('Resume', 'APPROVED'),
            $this->requirement('MOA', 'PENDING'),
            $this->requirement('Consent form', 'REJECTED', 'Signature missing'),
            $this->requirement('Endorsement letter', 'SUBMITTED'),
        ], []);

        $this->assertSame(['Consent form', 'MOA'], array_map(fn ($r) => $r->reqName, $summary['todo']));
    }

    public function testRequirementsAreGroupedByWhoActsNext(): void
    {
        $groups = groupRequirements([
            $this->requirement('Resume', 'APPROVED'),
            $this->requirement('MOA', 'PENDING'),
            $this->requirement('Consent form', 'REJECTED'),
            $this->requirement('Endorsement letter', 'SUBMITTED'),
        ]);
        $names = fn (array $list) => array_map(fn ($r) => $r->reqName, $list);

        $this->assertSame(['Consent form', 'MOA'], $names($groups['action']));
        $this->assertSame(['Endorsement letter'], $names($groups['waiting']));
        $this->assertSame(['Resume'], $names($groups['approved']));
    }

    public function testUnsubmittedRequirementsWithTheNearestDeadlineComeFirst(): void
    {
        $due = fn (string $name, ?string $date) => new Requirement(1, 1, $name, null, 'PENDING', null, null, null, $date);

        $groups = groupRequirements([$due('No deadline', null), $due('Later', '2099-03-01'), $due('Sooner', '2099-01-10')]);

        $this->assertSame(['Sooner', 'Later', 'No deadline'], array_map(fn ($r) => $r->reqName, $groups['action']));
    }
}
