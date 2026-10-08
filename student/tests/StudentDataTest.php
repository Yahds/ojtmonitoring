<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/DataAccessObject.php';

class StudentDataTest extends TestCase
{
    private const MARIA = 300;
    private const JOSE = 301;
    private const APPLICATION_LETTER = 1;
    private const ENDORSEMENT_LETTER = 4;

    private DAO $dao;
    private mysqli $db;

    protected function setUp(): void
    {
        $this->dao = new DAO();
        $this->db = mysqli_connect(
            getenv('MYSQL_HOST'), getenv('MYSQL_USER'), getenv('MYSQL_PASSWORD'), getenv('MYSQL_DATABASE')
        );
    }

    protected function tearDown(): void
    {
        $this->db->query("UPDATE internrequirements SET status = 'PENDING', datesubmitted = NULL, intern_remarks = NULL
                          WHERE internid = " . self::JOSE . " AND reqid = " . self::APPLICATION_LETTER);
        $this->db->query("DELETE FROM weeklyreports WHERE internid = " . self::JOSE);
        $this->db->query("DELETE FROM journals WHERE internid = " . self::JOSE);
        $this->db->query("DELETE FROM weeklyreports WHERE file_path = 'test-maria-report.pdf'");
        $this->db->query("UPDATE interns SET status = 'PENDING' WHERE internid = " . self::JOSE);
        $this->db->query("UPDATE interns SET companyid = 3 WHERE internid = " . self::JOSE);
        $this->db->query("UPDATE internrequirements SET status = 'APPROVED', intern_remarks = NULL WHERE internid = " . self::MARIA . " AND reqid = " . self::ENDORSEMENT_LETTER);
        $this->db->close();
    }

    public function testInternGetsAllSevenRequirements(): void
    {
        $requirements = $this->dao->getRequirements(self::MARIA);

        $this->assertCount(7, $requirements);
    }

    public function testSubmittingARequirementSavesStatusDateAndRemark(): void
    {
        $this->dao->submitRequirement(self::JOSE, self::APPLICATION_LETTER, 'my remark', null);

        $row = $this->db->query("SELECT status, datesubmitted, intern_remarks FROM internrequirements
                                 WHERE internid = " . self::JOSE . " AND reqid = " . self::APPLICATION_LETTER)->fetch_assoc();

        $this->assertSame('SUBMITTED', $row['status']);
        $this->assertSame(date('Y-m-d'), $row['datesubmitted']);
        $this->assertSame('my remark', $row['intern_remarks']);
    }

    public function testTotalHoursOnlyCountsApprovedReports(): void
    {
        $this->db->query("INSERT INTO weeklyreports (internid, weeknumber, hours, status)
                          VALUES (" . self::JOSE . ", 1, 8, 'APPROVED'), (" . self::JOSE . ", 2, 40, 'PENDING')");

        $this->assertEquals(8, $this->dao->getTotalHours(self::JOSE));
    }

    public function testAnnouncementsOnlyShowTheInternsOwn(): void
    {
        $announcements = $this->dao->getAnnouncementsForIntern(self::JOSE);

        $this->assertCount(0, $announcements);
    }

        public function testSubmittingAWeeklyReportSavesItAsPending(): void
    {
        $this->dao->submitWeeklyReport(self::JOSE, 3, 8, 'set up the database', null);

        $row = $this->db->query("SELECT hours, status, datesubmitted FROM weeklyreports
                                 WHERE internid = " . self::JOSE . " AND weeknumber = 3")->fetch_assoc();

        $this->assertEquals(8, $row['hours']);
        $this->assertSame('PENDING', $row['status']);
        $this->assertSame(date('Y-m-d'), $row['datesubmitted']);
    }

    public function testSubmittingAJournalSavesItAsPending(): void
    {
        $this->dao->submitJournal(self::JOSE, 1, 'first month notes', null);

        $row = $this->db->query("SELECT notes, status FROM journals
                                 WHERE internid = " . self::JOSE . " AND monthnumber = 1")->fetch_assoc();

        $this->assertSame('first month notes', $row['notes']);
        $this->assertSame('PENDING', $row['status']);
    }

    public function testInternCannotGetAnotherInternsReportFile(): void
    {
        $this->db->query("INSERT INTO weeklyreports (internid, weeknumber, hours, file_path)
                          VALUES (" . self::MARIA . ", 1, 8, 'test-maria-report.pdf')");
        $mariasReportId = $this->db->insert_id;

        $this->assertSame('test-maria-report.pdf', $this->dao->getWeeklyReportFile(self::MARIA, $mariasReportId));
        $this->assertNull($this->dao->getWeeklyReportFile(self::JOSE, $mariasReportId));
    }

    public function testInternStatusIsReadFromTheDatabase(): void
    {
        $this->db->query("UPDATE interns SET status = 'ACTIVE' WHERE internid = " . self::JOSE);

        $this->assertSame('ACTIVE', $this->dao->getInternStatus(self::JOSE));
    }

    public function testAnInternThatDoesNotExistHasNoStatus(): void
    {
        $this->assertNull($this->dao->getInternStatus(999999));
    }

    public function testProfileHasTheCompanyAndTheAdviser(): void
    {
        $this->db->query("UPDATE interns SET companyid = 2 WHERE internid = " . self::MARIA);

        $profile = $this->dao->getInternProfile(self::MARIA);

        $this->assertSame('Microsoft', $profile['companyname']);
        $this->assertSame('Stevens, Amelia', $profile['adviserName']);
    }
    
    public function testAnApprovedRequirementCannotBeChanged(): void
    {
        $this->db->query("UPDATE internrequirements SET status = 'APPROVED' WHERE internid = " . self::MARIA . " AND reqid = " . self::ENDORSEMENT_LETTER);

        $changed = $this->dao->submitRequirement(self::MARIA, self::ENDORSEMENT_LETTER, 'trying to change it', null);

        $this->assertSame(0, $changed);
        $row = $this->db->query("SELECT status FROM internrequirements WHERE internid = " . self::MARIA . " AND reqid = " . self::ENDORSEMENT_LETTER)->fetch_assoc();
        $this->assertSame('APPROVED', $row['status']);
    }

    public function testCompanyListHasTheIdNameAndAddress(): void
    {
        $company = $this->dao->getCompanies()[0];

        $this->assertArrayHasKey('companyid', $company);
        $this->assertArrayHasKey('companyname', $company);
        $this->assertArrayHasKey('companyaddress', $company);
    }

    public function testChoosingACompanySavesItForThatIntern(): void
    {
        $this->dao->chooseCompany(self::JOSE, 4);

        $row = $this->db->query("SELECT companyid, status FROM interns WHERE internid = " . self::JOSE)->fetch_assoc();
        $this->assertSame(4, (int) $row['companyid']);
        $this->assertSame('PENDING', $row['status']);
    }

    public function testADeployedInternKeepsTheirCompany(): void
    {
        $this->db->query("UPDATE interns SET status = 'ACTIVE' WHERE internid = " . self::JOSE);

        $this->dao->chooseCompany(self::JOSE, 4);

        $row = $this->db->query("SELECT companyid FROM interns WHERE internid = " . self::JOSE)->fetch_assoc();
        $this->assertSame(3, (int) $row['companyid']);
    }
}
