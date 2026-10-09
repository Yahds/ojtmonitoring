<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/db/index.php';

class LoginTest extends TestCase
{
    public function testRightPasswordReturnsTheIntern(): void
    {
        $row = internLogIn(2299001, '1234');

        $this->assertNotFalse($row);
        $this->assertSame(300, $row['internid']);
    }

    public function testWrongPasswordIsRejected(): void
    {
        $this->assertFalse(internLogIn(2299001, 'wrong-password'));
    }
}
