<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/db/index.php';

class StudentDataTest extends TestCase
{
    private const MARIA = 300;
    private const JOSE = 301;
    private const APPLICATION_LETTER = 1;
    private const DATA_PRIVACY_CERTIFICATE = 6;
    private const WEEK_3 = ['number' => 3, 'start' => '2026-09-14', 'due' => '2026-09-21 12:00:00'];

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
        // advisers can add their own on top, so count only the school's
        $schoolIds = array_map('intval', array_column($this->db->query("SELECT reqid FROM requirements WHERE created_by IS NULL")->fetch_all(MYSQLI_ASSOC), 'reqid'));
        $school = array_filter(getRequirements(self::MARIA), fn ($requirement) => in_array($requirement->reqID, $schoolIds, true));

        $this->assertCount(7, $school);
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
        $days = [
            '2026-09-14' => ['am_in' => '08:00', 'am_out' => '12:00', 'pm_in' => '13:00', 'pm_out' => '17:00', 'hours' => 8.0],
            '2026-09-15' => ['am_in' => '08:00', 'am_out' => '11:30', 'pm_in' => null, 'pm_out' => null, 'hours' => 3.5],
        ];
        $reportID = submitWeeklyReport(self::JOSE, self::WEEK_3, $days, 'set up the database', 'Joel Bautista', null);

        $row = $this->db->query("SELECT hours, status, datesubmitted, supervisor_name FROM weeklyreports WHERE reportid = $reportID")->fetch_assoc();
        $saved = $this->db->query("SELECT work_date, hours FROM weeklyreport_days WHERE reportid = $reportID ORDER BY work_date")->fetch_all(MYSQLI_ASSOC);

        $this->assertEquals(11.5, $row['hours']);
        $this->assertSame('PENDING', $row['status']);
        $this->assertSame(date('Y-m-d'), $row['datesubmitted']);
        $this->assertSame('Joel Bautista', $row['supervisor_name']);
        $this->assertEquals([['work_date' => '2026-09-14', 'hours' => 8], ['work_date' => '2026-09-15', 'hours' => 3.5]], $saved);
    }

    public function testAbsencesAreSavedWithTheReport(): void
    {
        $absences = ['2026-09-16' => ['part' => 'DAY', 'reason' => 'Flu', 'proof_type' => 'MEDICAL', 'proof_path' => 'test-proof.pdf']];
        $reportID = submitWeeklyReport(self::JOSE, self::WEEK_3, [], 'out sick', 'Joel Bautista', null, $absences);

        $saved = $this->db->query("SELECT absent_date, part, reason, proof_type, proof_path FROM weeklyreport_absences WHERE reportid = $reportID")->fetch_all(MYSQLI_ASSOC);

        $this->assertSame([['absent_date' => '2026-09-16', 'part' => 'DAY', 'reason' => 'Flu', 'proof_type' => 'MEDICAL', 'proof_path' => 'test-proof.pdf']], $saved);
        $this->assertEquals(1, getWeeklyReports(self::JOSE)[0]['absences']);
    }

    public function testANoWorkWeekIsSavedWithZeroHoursAndCountsAsReported(): void
    {
        submitNoWorkWeek(self::JOSE, ['number' => 4, 'start' => '2026-09-21', 'due' => '2026-09-28 12:00:00'], 'HOLIDAY', 'Company closed for the fiesta', null);

        $row = $this->db->query("SELECT kind, no_work_reason, hours, workdescription, status FROM weeklyreports WHERE internid = " . self::JOSE)->fetch_assoc();

        $this->assertSame(['kind' => 'NO_WORK', 'no_work_reason' => 'HOLIDAY', 'hours' => '0.00', 'workdescription' => 'Company closed for the fiesta', 'status' => 'PENDING'], $row);
        $this->assertSame([4], getReportedWeeks(self::JOSE));
    }

    public function testAReportSentAfterItsDueTimeIsLateAndKeepsTheLetter(): void
    {
        $alreadyDue = ['number' => 3, 'start' => '2026-09-14', 'due' => '2026-09-21 12:00:00'];
        submitWeeklyReport(self::JOSE, $alreadyDue, [], 'late one', 'Joel Bautista', null, [], 'late-letter.pdf');

        $report = getWeeklyReports(self::JOSE)[0];

        $this->assertEquals(1, $report['late']);
        $this->assertSame('late-letter.pdf', $report['late_letter_path']);
        $this->assertSame('2026-09-21 12:00:00', $report['due_at']);
    }

    public function testAReportSentBeforeItsDueTimeIsNotLate(): void
    {
        submitWeeklyReport(self::JOSE, ['number' => 3, 'start' => '2026-09-14', 'due' => date('Y-m-d H:i:s', strtotime('+1 day'))], [], 'on time', 'Joel Bautista', null);

        $this->assertEquals(0, getWeeklyReports(self::JOSE)[0]['late']);
    }

    public function testAWeekThatNeedsChangesOpensAgainAndTheNewReportReplacesIt(): void
    {
        submitWeeklyReport(self::JOSE, self::WEEK_3, [], 'first try', 'Joel Bautista', null);
        $this->db->query("UPDATE weeklyreports SET status = 'REJECTED', submitted_at = '2026-09-20 09:00:00' WHERE internid = " . self::JOSE);
        $this->assertSame([], getReportedWeeks(self::JOSE));

        submitWeeklyReport(self::JOSE, self::WEEK_3, [], 'fixed', 'Joel Bautista', null);

        $reports = getWeeklyReports(self::JOSE);
        $this->assertCount(1, $reports);
        $this->assertSame(['fixed', 'PENDING', '2026-09-20 09:00:00'], [$reports[0]['workdescription'], $reports[0]['status'], $reports[0]['submitted_at']]);
        $this->assertEquals(0, $reports[0]['late'], 'it was on time the first time, so fixing it is not late');
        $this->assertSame([3], getReportedWeeks(self::JOSE));
    }

    public function testAJournalMonthCanOnlyBeSentAgainAfterChangesAreAsked(): void
    {
        $this->assertTrue(submitJournal(self::JOSE, 1, 'first', null));
        $this->assertFalse(submitJournal(self::JOSE, 1, 'again while waiting', null));

        $this->db->query("UPDATE journals SET status = 'REJECTED' WHERE internid = " . self::JOSE);
        $this->assertTrue(submitJournal(self::JOSE, 1, 'fixed', null));

        $journals = getMonthlyJournals(self::JOSE);
        $this->assertCount(1, $journals);
        $this->assertSame(['fixed', 'PENDING'], [$journals[0]['notes'], $journals[0]['status']]);
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
