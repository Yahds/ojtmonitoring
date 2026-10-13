<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/db/index.php';

class EndorsementTest extends TestCase
{
    private const STUDENT_ID = 2299992;
    private int $internId;
    private array $form = [
        'contact_name' => 'Ana Reyes',
        'contact_email' => 'hr@company.test',
        'position' => 'IT department',
        'start_date' => '2026-11-03',
    ];

    protected function setUp(): void
    {
        db()->execute_query(
            "INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Endorsement Test', 'BSCS', '4', '9999')",
            [self::STUDENT_ID]
        );
        db()->execute_query("INSERT INTO interns (adviserid, studentid, status) VALUES (1, ?, 'ENROLLED')", [self::STUDENT_ID]);
        $this->internId = db()->insert_id;
        chooseCompany($this->internId, 2);
    }

    protected function tearDown(): void
    {
        db()->execute_query("DELETE FROM endorsements WHERE internid = ?", [$this->internId]);
        db()->execute_query("DELETE FROM interns WHERE internid = ?", [$this->internId]);
        db()->execute_query("DELETE FROM students WHERE studentID = ?", [self::STUDENT_ID]);
    }

    public function testSavingTheFormRequestsAnEndorsement(): void
    {
        saveEndorsementForm($this->internId, 2, $this->form);

        $endorsement = getEndorsement($this->internId);
        $this->assertSame('REQUESTED', $endorsement['status']);
        $this->assertSame('Ana Reyes', $endorsement['contact_name']);
    }

    public function testSavingAgainReplacesTheAnswers(): void
    {
        saveEndorsementForm($this->internId, 2, $this->form);
        saveEndorsementForm($this->internId, 2, ['contact_name' => 'Ben Cruz'] + $this->form);

        $this->assertSame('Ben Cruz', getEndorsement($this->internId)['contact_name']);
    }

    public function testChoosingAnotherCompanyClearsTheForm(): void
    {
        saveEndorsementForm($this->internId, 2, $this->form);

        chooseCompany($this->internId, 3);

        $this->assertNull(getEndorsement($this->internId));
    }
}
