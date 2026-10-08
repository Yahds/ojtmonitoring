<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/flash.php';

class FlashTest extends TestCase
{
    protected function setUp(): void
    {
        $_SESSION = [];
    }

    public function testAMessageIsShownOnTheNextPage(): void
    {
        flash('success', 'Requirement submitted.');
        $this->assertSame(['type' => 'success', 'text' => 'Requirement submitted.'], takeFlash());
    }

    public function testAMessageIsShownOnlyOnce(): void
    {
        flash('error', 'File too large.');
        takeFlash();
        $this->assertNull(takeFlash());
    }
}
