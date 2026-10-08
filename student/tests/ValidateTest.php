<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/validate.php';

class ValidateTest extends TestCase
{
    public function testAcceptsAWholeNumberInsideTheRange(): void
    {
        $this->assertSame(3, wholeNumberIn('3', 1, 52));
    }

    public function testAcceptsTheEdgesOfTheRange(): void
    {
        $this->assertSame(1, wholeNumberIn('1', 1, 52));
        $this->assertSame(52, wholeNumberIn('52', 1, 52));
    }

    public function testRejectsNumbersOutsideTheRange(): void
    {
        $this->assertNull(wholeNumberIn('0', 1, 52));
        $this->assertNull(wholeNumberIn('53', 1, 52));
        $this->assertNull(wholeNumberIn('-4', 1, 52));
    }

    public function testRejectsDecimalsAndText(): void
    {
        $this->assertNull(wholeNumberIn('2.5', 1, 52));
        $this->assertNull(wholeNumberIn('abc', 1, 52));
    }

    public function testRejectsAMissingValue(): void
    {
        $this->assertNull(wholeNumberIn(null, 1, 52));
        $this->assertNull(wholeNumberIn('', 1, 52));
    }
}
