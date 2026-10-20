<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/db/index.php';

class CompanyChoicesTest extends TestCase
{
    // Henry Taylor, still choosing in the demo data
    private const HENRY = 57;

    protected function tearDown(): void
    {
        db()->execute_query("DELETE FROM intern_company_choices WHERE internid = ?", [self::HENRY]);
        db()->execute_query("UPDATE interns SET status = 'ENROLLED', companyid = NULL WHERE internid = ?", [self::HENRY]);
    }

    public function testOnlyPartnerCompaniesCanBeChosen(): void
    {
        $partners = getPartnerCompanies();
        $flags = db()->query("SELECT companyid, moa_on_file FROM company")->fetch_all(MYSQLI_ASSOC);
        $partnerIds = array_map('intval', array_column(array_filter($flags, fn ($row) => (int) $row['moa_on_file'] === 1), 'companyid'));

        $this->assertNotEmpty($partners);
        $this->assertEqualsCanonicalizing($partnerIds, array_map('intval', array_column($partners, 'companyid')));
    }

    public function testSavingAgainReplacesTheOldChoices(): void
    {
        $this->assertTrue(saveCompanyChoices(self::HENRY, [1, 2, 5]));
        $this->assertTrue(saveCompanyChoices(self::HENRY, [5]));

        $choices = getCompanyChoices(self::HENRY);
        $this->assertCount(1, $choices);
        $this->assertSame(5, (int) $choices[0]['companyid']);
        $this->assertSame(1, (int) $choices[0]['choice_rank']);
    }

    public function testAnInternWithACompanyCanNoLongerChoose(): void
    {
        saveCompanyChoices(self::HENRY, [1]);
        db()->execute_query("UPDATE interns SET status = 'PENDING', companyid = 2 WHERE internid = ?", [self::HENRY]);

        $this->assertFalse(saveCompanyChoices(self::HENRY, [2, 3]));
        $this->assertSame(1, (int) getCompanyChoices(self::HENRY)[0]['companyid']);
    }

    public function testAFailedSaveKeepsTheOldChoices(): void
    {
        saveCompanyChoices(self::HENRY, [1, 2]);

        try {
            saveCompanyChoices(self::HENRY, [3, 999999]);
            $this->fail('a company that does not exist should be refused');
        } catch (mysqli_sql_exception) {
        }

        $this->assertSame([1, 2], array_map('intval', array_column(getCompanyChoices(self::HENRY), 'companyid')));
    }
}
