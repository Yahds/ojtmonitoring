<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../includes/DataAccessObject.php';

class LoginTest extends TestCase
{
    public function testRightPasswordReturnsTheIntern(): void
    {
        $dao = new DAO();
        $row = $dao->internLogIn(2299001, '1234');

        $this->assertNotFalse($row);
        $this->assertSame(300, $row['internid']);
    }

    public function testWrongPasswordIsRejected(): void
    {
        $dao = new DAO();

        $this->assertFalse($dao->internLogIn(2299001, 'wrong-password'));
    }
}
