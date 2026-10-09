<?php
use PHPUnit\Framework\TestCase;

class TimezoneTest extends TestCase
{
    public function testTheStudentAppRunsOnPhilippineTime(): void
    {
        $this->assertSame('+08:00', date('P'));
    }
}
