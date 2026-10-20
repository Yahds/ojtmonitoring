<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/ojt-steps.php';

class OjtStepsTest extends TestCase
{
    public function testThereAreSixSteps(): void
    {
        $this->assertCount(6, OJT_STEPS);
    }

    public function testANewInternStartsByChoosingCompanies(): void
    {
        $this->assertSame(1, currentOjtStep('ENROLLED', false, false, null));
    }

    public function testAfterChoosingTheyWaitToBeAccepted(): void
    {
        $this->assertSame(2, currentOjtStep('ENROLLED', false, true, null));
    }

    public function testWithACompanyTheEndorsementComesNext(): void
    {
        $this->assertSame(3, currentOjtStep('PENDING', true, true, null));
        $this->assertSame(3, currentOjtStep('PENDING', true, false, 'SENT'));
    }

    public function testOnceTheCompanyRepliedTheRequirementsAreLeft(): void
    {
        $this->assertSame(4, currentOjtStep('PENDING', true, false, 'ACCEPTED'));
    }

    public function testDeployedAndFinishedInterns(): void
    {
        $this->assertSame(5, currentOjtStep('ACTIVE', true, false, 'ACCEPTED'));
        $this->assertSame(7, currentOjtStep('FINISHED', true, false, 'ACCEPTED'));
    }
}
