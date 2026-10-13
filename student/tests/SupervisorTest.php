<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/db/index.php';

class SupervisorTest extends TestCase
{
    private const STUDENT_ID = 2299993;
    private const EMAIL = 'test.supervisor@company.test';
    private int $internId;

    protected function setUp(): void
    {
        db()->execute_query(
            "INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Supervisor Test', 'BSCS', '4', '9999')",
            [self::STUDENT_ID]
        );
        db()->execute_query("INSERT INTO interns (adviserid, studentid, companyid, status) VALUES (1, ?, 2, 'ACTIVE')", [self::STUDENT_ID]);
        $this->internId = db()->insert_id;
    }

    protected function tearDown(): void
    {
        db()->execute_query("DELETE FROM interns WHERE internid = ?", [$this->internId]);
        db()->execute_query("DELETE FROM students WHERE studentID = ?", [self::STUDENT_ID]);
        db()->execute_query("DELETE FROM supervisors WHERE supervisoremail = ?", [self::EMAIL]);
    }

    private function save(string $name): void
    {
        saveSupervisor($this->internId, ['name' => $name, 'email' => self::EMAIL, 'position' => 'QA Lead']);
    }

    public function testInternWithoutSupervisorGetsNull(): void
    {
        $this->assertNull(getSupervisor($this->internId));
    }

    public function testSavedSupervisorIsLinkedToTheIntern(): void
    {
        $this->save('Ana Reyes');

        $supervisor = getSupervisor($this->internId);
        $this->assertSame('Ana Reyes', $supervisor['supervisorname']);
        $this->assertSame('QA Lead', $supervisor['position']);
    }

    public function testChangingSupervisorKeepsTheOldRow(): void
    {
        $this->save('Ana Reyes');
        $this->save('Ben Cruz');

        $this->assertSame('Ben Cruz', getSupervisor($this->internId)['supervisorname']);
        $rows = db()->execute_query("SELECT COUNT(*) AS total FROM supervisors WHERE supervisoremail = ?", [self::EMAIL])->fetch_assoc();
        $this->assertSame(2, $rows['total']);
    }
}
