<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/db/index.php';

class ChangePasswordTest extends TestCase
{
    private const STUDENT_ID = 2299991;
    private int $internId;

    protected function setUp(): void
    {
        db()->execute_query(
            "INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Password Test', 'BSCS', '4', '9999')",
            [self::STUDENT_ID]
        );
        db()->execute_query(
            "INSERT INTO interns (password, adviserid, studentid, status) VALUES (?, 1, ?, 'ENROLLED')",
            [password_hash('old-password-1234', PASSWORD_BCRYPT), self::STUDENT_ID]
        );
        $this->internId = db()->insert_id;
    }

    protected function tearDown(): void
    {
        db()->execute_query("DELETE FROM interns WHERE studentid = ?", [self::STUDENT_ID]);
        db()->execute_query("DELETE FROM students WHERE studentID = ?", [self::STUDENT_ID]);
    }

    public function testRightCurrentPasswordChangesIt(): void
    {
        $this->assertTrue(changeInternPassword($this->internId, 'old-password-1234', 'blue tables walk slowly'));

        $this->assertNotFalse(internLogIn(self::STUDENT_ID, 'blue tables walk slowly'));
        $this->assertFalse(internLogIn(self::STUDENT_ID, 'old-password-1234'));
    }

    public function testWrongCurrentPasswordChangesNothing(): void
    {
        $this->assertFalse(changeInternPassword($this->internId, 'wrong-password', 'blue tables walk slowly'));

        $this->assertNotFalse(internLogIn(self::STUDENT_ID, 'old-password-1234'));
    }

    public function testInternWithoutPasswordCannotChangeIt(): void
    {
        db()->execute_query("UPDATE interns SET password = NULL WHERE internid = ?", [$this->internId]);

        $this->assertFalse(internHasPassword($this->internId));
        $this->assertFalse(changeInternPassword($this->internId, '', 'blue tables walk slowly'));
    }
}
