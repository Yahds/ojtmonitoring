<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/require-login.php';

class IdleTest extends TestCase
{
    public function testRecentActivityKeepsTheSession(): void
    {
        $this->assertFalse(sessionExpired(1000, 1000 + 29 * 60));
    }

    public function testThirtyMinutesWithoutActivityEndsIt(): void
    {
        $this->assertTrue(sessionExpired(1000, 1000 + 31 * 60));
    }

    public function testSessionWithoutActivityTimeEnds(): void
    {
        $this->assertTrue(sessionExpired(null, 1000));
    }
}