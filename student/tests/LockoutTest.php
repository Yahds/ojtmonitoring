<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/db/index.php';

class LockoutTest extends TestCase
{
    private const STUDENT_ID = 2299990;

    protected function setUp(): void
    {
        db()->execute_query(
            "INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Lockout Test', 'BSCS', '4', '9999')",
            [self::STUDENT_ID]
        );
        db()->execute_query(
            "INSERT INTO interns (password, adviserid, studentid, status) VALUES (?, 1, ?, 'ENROLLED')",
            [password_hash('right-password', PASSWORD_BCRYPT), self::STUDENT_ID]
        );
    }

    protected function tearDown(): void
    {
        db()->execute_query("DELETE FROM interns WHERE studentid = ?", [self::STUDENT_ID]);
        db()->execute_query("DELETE FROM students WHERE studentID = ?", [self::STUDENT_ID]);
    }

    private function failLogins(int $times): void
    {
        for ($i = 0; $i < $times; $i++) {
            internLogIn(self::STUDENT_ID, 'wrong-password');
        }
    }

    public function testFiveWrongPasswordsLockTheAccount(): void
    {
        $this->failLogins(5);

        $this->assertFalse(internLogIn(self::STUDENT_ID, 'right-password'));
    }

    public function testRightPasswordResetsTheCount(): void
    {
        $this->failLogins(4);
        $this->assertNotFalse(internLogIn(self::STUDENT_ID, 'right-password'));

        $this->failLogins(4);
        $this->assertNotFalse(internLogIn(self::STUDENT_ID, 'right-password'));
    }

    public function testLockEndsAfterFifteenMinutes(): void
    {
        $this->failLogins(5);
        db()->execute_query("UPDATE interns SET locked_until = NOW() - INTERVAL 1 MINUTE WHERE studentid = ?", [self::STUDENT_ID]);

        $this->assertNotFalse(internLogIn(self::STUDENT_ID, 'right-password'));
    }
}
