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

        $this->assertSame(40, $summary['approvedHours']);
        $this->assertSame(32, $summary['waitingHours']);
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

    public function testEachCourseHasItsOwnHoursTarget(): void
    {
        $this->assertSame(240, targetHoursFor('BSCS'));
        $this->assertSame(600, targetHoursFor('BSIT'));
        $this->assertNull(targetHoursFor('UNKNOWN'));
    }
}
