<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/db/index.php';

class StudentDataTest extends TestCase
{
    private const MARIA = 300;
    private const JOSE = 301;
    private const APPLICATION_LETTER = 1;
    private const DATA_PRIVACY_CERTIFICATE = 6;

    private mysqli $db;
    private int $lastVersionBeforeTest;

    protected function setUp(): void
    {
        $this->db = mysqli_connect(
            getenv('MYSQL_HOST'), getenv('MYSQL_USER'), getenv('MYSQL_PASSWORD'), getenv('MYSQL_DATABASE')
        );
        // versions made in the browser are real data; only the ones this test adds get removed
        $this->lastVersionBeforeTest = (int) $this->db->query("SELECT COALESCE(MAX(versionid), 0) FROM requirement_versions")->fetch_row()[0];
    }

    protected function tearDown(): void
    {
        $this->db->query("DELETE FROM requirement_versions WHERE versionid > " . $this->lastVersionBeforeTest);
        $this->db->query("UPDATE internrequirements SET status = 'PENDING', datesubmitted = NULL, intern_remarks = NULL, file_path = NULL, remarks = NULL, due_date = NULL
                          WHERE internid = " . self::JOSE . " AND reqid = " . self::APPLICATION_LETTER);
        $this->db->query("DELETE FROM weeklyreports WHERE internid = " . self::JOSE);
        $this->db->query("DELETE FROM journals WHERE internid = " . self::JOSE);
        $this->db->query("DELETE FROM weeklyreports WHERE file_path = 'test-maria-report.pdf'");
        $this->db->query("UPDATE interns SET status = 'PENDING' WHERE internid = " . self::JOSE);
        $this->db->query("UPDATE interns SET companyid = 3 WHERE internid = " . self::JOSE);
        $this->db->query("UPDATE internrequirements SET status = 'PENDING', intern_remarks = NULL WHERE internid = " . self::MARIA . " AND reqid = " . self::DATA_PRIVACY_CERTIFICATE);
        $this->db->close();
    }

    public function testInternGetsAllSevenRequirements(): void
    {
        $requirements = getRequirements(self::MARIA);

        $this->assertCount(7, $requirements);
    }

    public function testSubmittingARequirementSavesStatusDateAndRemark(): void
    {
        submitRequirement(self::JOSE, self::APPLICATION_LETTER, 'my remark', null);

        $row = $this->db->query("SELECT status, datesubmitted, intern_remarks FROM internrequirements
                                 WHERE internid = " . self::JOSE . " AND reqid = " . self::APPLICATION_LETTER)->fetch_assoc();

        $this->assertSame('SUBMITTED', $row['status']);
        $this->assertSame(date('Y-m-d'), $row['datesubmitted']);
        $this->assertSame('my remark', $row['intern_remarks']);
    }

    public function testEverySubmitIsKeptAsANewVersion(): void
    {
        submitRequirement(self::JOSE, self::APPLICATION_LETTER, 'first try', 'req_first.pdf');
        submitRequirement(self::JOSE, self::APPLICATION_LETTER, 'only a new note', null);

        $versions = $this->db->query("SELECT version_no, file_path, intern_note FROM requirement_versions
                                      WHERE internid = " . self::JOSE . " AND reqid = " . self::APPLICATION_LETTER . " ORDER BY version_no")->fetch_all(MYSQLI_ASSOC);

        $this->assertEquals([
            ['version_no' => 1, 'file_path' => 'req_first.pdf', 'intern_note' => 'first try'],
            // a note without a new file keeps the file the adviser already has
            ['version_no' => 2, 'file_path' => 'req_first.pdf', 'intern_note' => 'only a new note'],
        ], $versions);
    }

    public function testVersionsAreGroupedByRequirementNewestFirst(): void
    {
        submitRequirement(self::JOSE, self::APPLICATION_LETTER, 'first', 'req_one.pdf');
        submitRequirement(self::JOSE, self::APPLICATION_LETTER, 'second', 'req_two.pdf');

        $versions = getRequirementVersions(self::JOSE)[self::APPLICATION_LETTER];

        $this->assertSame(['second', 'first'], array_column($versions, 'intern_note'));
    }

    public function testAnInternCannotGetAnotherInternsVersionFile(): void
    {
        submitRequirement(self::JOSE, self::APPLICATION_LETTER, 'mine', 'req_jose.pdf');
        $versionNo = (int) $this->db->query("SELECT MAX(version_no) FROM requirement_versions WHERE internid = " . self::JOSE . " AND reqid = " . self::APPLICATION_LETTER)->fetch_row()[0];

        $this->assertSame('req_jose.pdf', getRequirementVersionFile(self::JOSE, self::APPLICATION_LETTER, $versionNo));
        $this->assertNull(getRequirementVersionFile(self::MARIA, self::APPLICATION_LETTER, $versionNo + 100));
    }

    public function testARequirementNotSentByItsDeadlineIsOverdue(): void
    {
        $this->db->query("UPDATE internrequirements SET due_date = CURDATE() - INTERVAL 1 DAY WHERE internid = " . self::JOSE . " AND reqid = " . self::APPLICATION_LETTER);

        $letter = array_values(array_filter(getRequirements(self::JOSE), fn ($r) => $r->reqID === self::APPLICATION_LETTER))[0];

        $this->assertSame('OVERDUE', $letter->deadline);
        $this->assertSame(date('M j, Y', strtotime('-1 day')), $letter->dueLabel);
    }

    public function testResubmittingClearsTheOldRemark(): void
    {
        $this->db->query("UPDATE internrequirements SET status = 'REJECTED', remarks = 'wrong file' WHERE internid = " . self::JOSE . " AND reqid = " . self::APPLICATION_LETTER);

        submitRequirement(self::JOSE, self::APPLICATION_LETTER, 'fixed it', null);

        $row = $this->db->query("SELECT status, remarks FROM internrequirements WHERE internid = " . self::JOSE . " AND reqid = " . self::APPLICATION_LETTER)->fetch_assoc();
        $this->assertSame(['status' => 'SUBMITTED', 'remarks' => null], $row);
    }

    public function testSubmittingTheSameNoteTwiceStillWorks(): void
    {
        submitRequirement(self::JOSE, self::APPLICATION_LETTER, 'same note', null);

        $this->assertSame(1, submitRequirement(self::JOSE, self::APPLICATION_LETTER, 'same note', null));
    }

    public function testSubmittingAWeeklyReportSavesItAsPending(): void
    {
        submitWeeklyReport(self::JOSE, 3, 8, 'set up the database', null);

        $row = $this->db->query("SELECT hours, status, datesubmitted FROM weeklyreports
                                 WHERE internid = " . self::JOSE . " AND weeknumber = 3")->fetch_assoc();

        $this->assertEquals(8, $row['hours']);
        $this->assertSame('PENDING', $row['status']);
        $this->assertSame(date('Y-m-d'), $row['datesubmitted']);
    }

    public function testSubmittingAJournalSavesItAsPending(): void
    {
        submitJournal(self::JOSE, 1, 'first month notes', null);

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

        $this->assertSame('test-maria-report.pdf', getWeeklyReportFile(self::MARIA, $mariasReportId));
        $this->assertNull(getWeeklyReportFile(self::JOSE, $mariasReportId));
    }

    public function testInternStatusIsReadFromTheDatabase(): void
    {
        $this->db->query("UPDATE interns SET status = 'ACTIVE' WHERE internid = " . self::JOSE);

        $this->assertSame('ACTIVE', getInternStatus(self::JOSE));
    }

    public function testAnInternThatDoesNotExistHasNoStatus(): void
    {
        $this->assertNull(getInternStatus(999999));
    }

    public function testProfileHasTheCompanyAndTheAdviser(): void
    {
        $this->db->query("UPDATE interns SET companyid = 2 WHERE internid = " . self::MARIA);

        $profile = getInternProfile(self::MARIA);

        $this->assertSame('Microsoft', $profile['companyname']);
        $this->assertSame('Stevens, Amelia', $profile['adviserName']);
        $this->assertSame(240, $profile['target_hours']);
    }
    
    public function testAnApprovedRequirementCannotBeChanged(): void
    {
        $this->db->query("UPDATE internrequirements SET status = 'APPROVED' WHERE internid = " . self::MARIA . " AND reqid = " . self::DATA_PRIVACY_CERTIFICATE);

        $changed = submitRequirement(self::MARIA, self::DATA_PRIVACY_CERTIFICATE, 'trying to change it', null);

        $this->assertSame(0, $changed);
        $versions = $this->db->query("SELECT COUNT(*) FROM requirement_versions WHERE internid = " . self::MARIA . " AND reqid = " . self::DATA_PRIVACY_CERTIFICATE . " AND versionid > " . $this->lastVersionBeforeTest)->fetch_row()[0];
        $this->assertSame(0, (int) $versions);
        $row = $this->db->query("SELECT status FROM internrequirements WHERE internid = " . self::MARIA . " AND reqid = " . self::DATA_PRIVACY_CERTIFICATE)->fetch_assoc();
        $this->assertSame('APPROVED', $row['status']);
    }

    public function testCompanyListHasTheIdNameAndAddress(): void
    {
        $company = getCompanies()[0];

        $this->assertArrayHasKey('companyid', $company);
        $this->assertArrayHasKey('companyname', $company);
        $this->assertArrayHasKey('companyaddress', $company);
    }

    public function testChoosingACompanySavesItForThatIntern(): void
    {
        chooseCompany(self::JOSE, 4);

        $row = $this->db->query("SELECT companyid, status FROM interns WHERE internid = " . self::JOSE)->fetch_assoc();
        $this->assertSame(4, (int) $row['companyid']);
        $this->assertSame('PENDING', $row['status']);
    }

    public function testADeployedInternKeepsTheirCompany(): void
    {
        $this->db->query("UPDATE interns SET status = 'ACTIVE' WHERE internid = " . self::JOSE);

        chooseCompany(self::JOSE, 4);

        $row = $this->db->query("SELECT companyid FROM interns WHERE internid = " . self::JOSE)->fetch_assoc();
        $this->assertSame(3, (int) $row['companyid']);
    }

    public function testAWithdrawnInternCannotPickACompany(): void
    {
        $this->db->query("UPDATE interns SET status = 'WITHDRAWN' WHERE internid = " . self::JOSE);

        chooseCompany(self::JOSE, 4);

        $row = $this->db->query("SELECT companyid, status FROM interns WHERE internid = " . self::JOSE)->fetch_assoc();
        $this->assertSame(3, (int) $row['companyid']);
        $this->assertSame('WITHDRAWN', $row['status']);
    }
}
