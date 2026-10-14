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

    private function absences(array $posted, bool $acceptsLetter = false, array $workDays = []): array
    {
        return readAbsences($posted, [self::MONDAY, self::TUESDAY], $acceptsLetter, $workDays);
    }

    public function testOnlyDaysMarkedAbsentAreKept(): void
    {
        $result = $this->absences([
            self::MONDAY => ['part' => 'DAY', 'reason' => ' Flu '],
            self::TUESDAY => ['part' => '', 'reason' => 'typed but not absent'],
        ]);

        $this->assertNull($result['error']);
        $this->assertSame([self::MONDAY => ['part' => 'DAY', 'reason' => 'Flu', 'proof_type' => 'MEDICAL']], $result['absences']);
    }

    public function testAParentsLetterOnlyCountsWhenTheAdviserAcceptsIt(): void
    {
        $posted = [self::MONDAY => ['part' => 'DAY', 'reason' => 'Flu', 'proof_type' => 'LETTER']];

        $this->assertSame('MEDICAL', $this->absences($posted)['absences'][self::MONDAY]['proof_type']);
        $this->assertSame('LETTER', $this->absences($posted, true)['absences'][self::MONDAY]['proof_type']);
        $this->assertSame(
            "Choose which proof you're attaching for Mon, Sep 7.",
            $this->absences([self::MONDAY => ['part' => 'DAY', 'reason' => 'Flu']], true)['error']
        );
    }

    public function testAnAbsenceNeedsAReason(): void
    {
        $result = $this->absences([self::MONDAY => ['part' => 'AM', 'reason' => '  ']]);

        $this->assertSame('Write why you were absent on Mon, Sep 7, up to 200 characters.', $result['error']);
    }

    public function testTheAbsentPartOfTheDayCannotHaveWorkTimes(): void
    {
        $afternoonWork = [self::MONDAY => ['am_in' => null, 'am_out' => null, 'pm_in' => '13:00', 'pm_out' => '17:00', 'hours' => 4.0]];
        $clash = 'You marked Mon, Sep 7 as absent but also entered work times for that part of the day.';

        $this->assertNull($this->absences([self::MONDAY => ['part' => 'AM', 'reason' => 'Clinic']], false, $afternoonWork)['error']);
        $this->assertSame($clash, $this->absences([self::MONDAY => ['part' => 'PM', 'reason' => 'Clinic']], false, $afternoonWork)['error']);
        $this->assertSame($clash, $this->absences([self::MONDAY => ['part' => 'DAY', 'reason' => 'Clinic']], false, $afternoonWork)['error']);
    }
}
