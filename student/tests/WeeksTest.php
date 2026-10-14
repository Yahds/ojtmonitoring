<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/weeks.php';

class WeeksTest extends TestCase
{
    private const DEPLOYED_TUESDAY = '2026-09-01';

    private function range(string $deployedOn, int $week): array
    {
        return array_map(fn ($day) => $day->format('Y-m-d'), weekRange($deployedOn, $week));
    }

    public function testWeekOneRunsFromTheDeployDayToThatFriday(): void
    {
        $this->assertSame(['2026-09-01', '2026-09-04'], $this->range(self::DEPLOYED_TUESDAY, 1));
    }

    public function testLaterWeeksRunMondayToFriday(): void
    {
        $this->assertSame(['2026-09-07', '2026-09-11'], $this->range(self::DEPLOYED_TUESDAY, 2));
        $this->assertSame(['2026-09-28', '2026-10-02'], $this->range(self::DEPLOYED_TUESDAY, 5));
    }

    public function testADeployDayOnASaturdayMakesWeekOneEndTheNextFriday(): void
    {
        $this->assertSame(['2026-09-05', '2026-09-11'], $this->range('2026-09-05', 1));
        $this->assertSame(['2026-09-14', '2026-09-18'], $this->range('2026-09-05', 2));
    }

    public function testTheWeekendAfterAWeekStillCountsAsThatWeek(): void
    {
        $this->assertSame(0, weekNumberOn(self::DEPLOYED_TUESDAY, '2026-08-31'));
        $this->assertSame(1, weekNumberOn(self::DEPLOYED_TUESDAY, '2026-09-01'));
        $this->assertSame(1, weekNumberOn(self::DEPLOYED_TUESDAY, '2026-09-06'));
        $this->assertSame(2, weekNumberOn(self::DEPLOYED_TUESDAY, '2026-09-07'));
        $this->assertSame(2, weekNumberOn(self::DEPLOYED_TUESDAY, '2026-09-12'));
        $this->assertSame(5, weekNumberOn(self::DEPLOYED_TUESDAY, '2026-10-03'));
    }

    public function testWithoutARuleAReportIsDueTheMondayAfterAtNoon(): void
    {
        $this->assertSame('2026-09-07 12:00', weekDueAt(self::DEPLOYED_TUESDAY, 1, [])->format('Y-m-d H:i'));
    }

    public function testANewRuleOnlyMovesWeeksThatEndAfterItStarts(): void
    {
        $rules = [['starts_on' => '2026-09-26', 'due_days' => 10]];

        // week 4 ended sep 25, before the rule
        $this->assertSame('2026-09-28 12:00', weekDueAt(self::DEPLOYED_TUESDAY, 4, $rules)->format('Y-m-d H:i'));
        $this->assertSame('2026-10-12 12:00', weekDueAt(self::DEPLOYED_TUESDAY, 5, $rules)->format('Y-m-d H:i'));
    }

    public function testAWeekOpensForReportingOnItsFriday(): void
    {
        $this->assertNull(nextWeekToReport(self::DEPLOYED_TUESDAY, '2026-09-03', []));
        $this->assertSame(1, nextWeekToReport(self::DEPLOYED_TUESDAY, '2026-09-04', []));
    }

    public function testTheNextWeekToReportIsTheFirstOneMissing(): void
    {
        $this->assertSame(2, nextWeekToReport(self::DEPLOYED_TUESDAY, '2026-09-20', [1, 3]));
        $this->assertNull(nextWeekToReport(self::DEPLOYED_TUESDAY, '2026-09-15', [1, 2]));
    }

    public function testTheWeekLabelShowsTheMonthOnceWhenItIsTheSame(): void
    {
        $this->assertSame('Sep 7 – 11', weekLabel(weekRange(self::DEPLOYED_TUESDAY, 2)));
        $this->assertSame('Sep 28 – Oct 2', weekLabel(weekRange(self::DEPLOYED_TUESDAY, 5)));
    }

    public function testWhenEveryOpenWeekIsReportedThePageSaysWhenTheNextOneOpens(): void
    {
        $now = reportingWeek(self::DEPLOYED_TUESDAY, [], [1], '2026-09-08');

        $this->assertNull($now['week']);
        $this->assertSame('2026-09-11', $now['opensOn']->format('Y-m-d'));
    }

    public function testTheReportingWeekComesWithItsDatesAndDueTime(): void
    {
        $now = reportingWeek(self::DEPLOYED_TUESDAY, [], [], '2026-09-04');

        $this->assertSame(1, $now['week']);
        $this->assertSame('Sep 1 – 4', weekLabel($now['range']));
        $this->assertSame('2026-09-07 12:00', $now['due']->format('Y-m-d H:i'));
    }

    public function testAReportIsLateOnlyAfterTheDueTime(): void
    {
        $now = reportingWeek('2026-09-01', [], [], '2026-09-10');

        $this->assertFalse(isLate($now, new DateTimeImmutable('2026-09-07 11:59')));
        $this->assertTrue(isLate($now, new DateTimeImmutable('2026-09-07 12:01')));
        $this->assertFalse(isLate(null, new DateTimeImmutable('2026-09-07 12:01')));
    }
}
