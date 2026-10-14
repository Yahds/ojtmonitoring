<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/time-record.php';
require_once __DIR__ . '/../src/weeks.php';

class TimeRecordTest extends TestCase
{
    private const MONDAY = '2026-09-07';
    private const TUESDAY = '2026-09-08';

    private function read(array $posted): array
    {
        return readTimeRecord($posted, [self::MONDAY, self::TUESDAY]);
    }

    public function testMorningAndAfternoonAddUpAndLunchIsNotCounted(): void
    {
        $record = $this->read([self::MONDAY => ['am_in' => '08:00', 'am_out' => '12:00', 'pm_in' => '13:00', 'pm_out' => '17:30']]);

        $this->assertNull($record['error']);
        $this->assertSame(8.5, $record['days'][self::MONDAY]['hours']);
    }

    public function testAnEmptyDayIsLeftOut(): void
    {
        $record = $this->read([self::MONDAY => ['am_in' => '08:00', 'am_out' => '12:00'], self::TUESDAY => ['am_in' => '', 'am_out' => '']]);

        $this->assertSame([self::MONDAY], array_keys($record['days']));
    }

    public function testDatesOutsideTheWeekAreIgnored(): void
    {
        $record = $this->read(['2026-12-25' => ['am_in' => '08:00', 'am_out' => '12:00']]);

        $this->assertSame([], $record['days']);
    }

    public function testHalfAPairIsRefused(): void
    {
        $record = $this->read([self::MONDAY => ['am_in' => '08:00']]);

        $this->assertSame('Fill in both the morning start and end on Mon, Sep 7.', $record['error']);
    }

    public function testAnEndBeforeTheStartIsRefused(): void
    {
        $record = $this->read([self::TUESDAY => ['pm_in' => '17:00', 'pm_out' => '13:00']]);

        $this->assertSame('The afternoon end must be after its start on Tue, Sep 8.', $record['error']);
    }

    public function testTheAfternoonCannotStartBeforeTheMorningEnds(): void
    {
        $record = $this->read([self::MONDAY => ['am_in' => '08:00', 'am_out' => '13:00', 'pm_in' => '12:00', 'pm_out' => '17:00']]);

        $this->assertSame('The afternoon must start after the morning ends on Mon, Sep 7.', $record['error']);
    }

    public function testATimeThatIsNotATimeIsRefused(): void
    {
        $this->assertSame('Enter real times on Mon, Sep 7.', $this->read([self::MONDAY => ['am_in' => '25:00', 'am_out' => '26:00']])['error']);
    }

    public function testHoursShowWithoutExtraZeros(): void
    {
        $this->assertSame('8', hoursText('8.00'));
        $this->assertSame('7.5', hoursText(7.5));
        $this->assertSame('7.25', hoursText('7.25'));
    }

    public function testTheFormShowsTheWeekPlusTheWeekendAfterIt(): void
    {
        $days = reportDays(weekRange('2026-09-01', 2));

        $this->assertSame(['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'], array_column($days, 'date'));
        $this->assertSame([false, false, false, false, false, true, true], array_column($days, 'weekend'));
    }
}
