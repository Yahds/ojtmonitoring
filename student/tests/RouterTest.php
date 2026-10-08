<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/router.php';

class RouterTest extends TestCase
{
    public function testAPageUrlGivesItsFile(): void
    {
        $this->assertSame('pages/requirements.php', routeFor('GET', '/requirements'));
    }

    public function testTheSameUrlGivesADifferentFileForPost(): void
    {
        $this->assertSame('actions/submit-requirement.php', routeFor('POST', '/requirements'));
    }

    public function testQueryStringAndTrailingSlashAreIgnored(): void
    {
        $this->assertSame('actions/download-requirement.php', routeFor('GET', '/requirements/file?reqid=3'));
        $this->assertSame('pages/requirements.php', routeFor('GET', '/requirements/'));
    }

    public function testAnUnknownUrlGivesNull(): void
    {
        $this->assertNull(routeFor('GET', '/includes/DataAccessObject.php'));
    }
}
