<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/passwords.php';

class PasswordsTest extends TestCase
{
    public function testShortPasswordIsRejected(): void
    {
        $this->assertSame('Use at least 15 characters.', passwordProblem('short'));
    }

    public function testVeryLongPasswordIsRejected(): void
    {
        $this->assertSame('Use 64 characters or fewer.', passwordProblem(str_repeat('a', 65)));
    }

    public function testCommonPasswordIsRejected(): void
    {
        $this->assertSame('This password is too common. Choose another one.', passwordProblem('PasswordPassword'));
    }

    public function testLongSentenceIsAccepted(): void
    {
        $this->assertNull(passwordProblem('blue tables walk slowly'));
    }
}
