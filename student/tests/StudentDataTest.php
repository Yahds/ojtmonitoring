<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../includes/DataAccessObject.php';

class StudentDataTest extends TestCase
{
    private const MARIA = 300;
    private const JOSE = 301;
    private const APPLICATION_LETTER = 1;

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
}
