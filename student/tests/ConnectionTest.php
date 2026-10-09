<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/db/connection.php';

class ConnectionTest extends TestCase
{
    public function testEveryCallSharesOneConnection(): void
    {
        $this->assertSame(db(), db());
    }

    public function testASettingIsReadFromTheEnvironment(): void
    {
        putenv('OJT_TEST_SETTING=hello');

        $this->assertSame('hello', requiredEnv('OJT_TEST_SETTING'));

        putenv('OJT_TEST_SETTING');
    }

    public function testAMissingSettingStopsTheApp(): void
    {
        $this->expectException(RuntimeException::class);

        requiredEnv('OJT_SETTING_THAT_DOES_NOT_EXIST');
    }
}
