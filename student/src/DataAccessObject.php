<?php
require_once __DIR__ . '/classes.php';
require_once __DIR__ . '/db/connection.php';
class DAO {
    private $connection;

    public function __construct() {
        $this->connection = db();
    }

    public function internLogIn($id, $password) {
        $query = "SELECT * FROM interns i JOIN students s ON i.studentid = s.studentID WHERE s.studentid = ?";
        $statement = $this->connection->prepare($query);

        $statement->bind_param("i", $id);

        $statement->execute();
        $result = $statement->get_result();

        $row = $result->fetch_assoc();
        if ($row && password_verify($password, $row['password'])){
            return $row;
        }

        return false;
    }

    public function getInternStatus($internID) {
        $statement = $this->connection->prepare("SELECT status FROM interns WHERE internid = ?");
        $statement->bind_param("i", $internID);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        $statement->close();
        return $row ? $row['status'] : null;
    }

    public function getRequirementFile($internID, $reqID) {
        $query = "SELECT file_path FROM internrequirements WHERE internid = ? AND reqid = ?";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("ii", $internID, $reqID);
        $statement->execute();
        $result = $statement->get_result();
        $row = $result->fetch_assoc();
        $statement->close();
        return $row ? $row['file_path'] : null;
    }


    public function getRequirements($internID) {
        $requirements = [];
        $query = "SELECT * FROM internrequirements ir JOIN requirements r ON ir.reqid = r.reqid where internid = ?";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("i", $internID);
        $statement->execute();
        $result = $statement->get_result();

        if ($result->num_rows === 0) {
            return $requirements;
        }

        while ($row = $result->fetch_assoc()) {
            $req = new Requirement(
                $row["internid"],
                $row["reqid"],
                $row["requirementname"],
                $row["datesubmitted"],
                $row["status"],
                $row["remarks"],
                $row["intern_remarks"],
                $row["file_path"],
        );
            $requirements[] = $req;
        }
        $statement->close();
        return $requirements;
    }

    public function getWeeklyReports($internID) {
        $reports = [];
        $query = "SELECT * FROM weeklyreports WHERE internid = ? ORDER BY weeknumber";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("i", $internID);
        $statement->execute();
        $result = $statement->get_result();

        while ($row = $result->fetch_assoc()) {
            $reports[] = $row;
        }

        $statement->close();
        return $reports;
    }

    public function getWeeklyReportFile($internID, $reportID) {
        $query = "SELECT file_path FROM weeklyreports WHERE internid = ? AND reportid = ?";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("ii", $internID, $reportID);
        $statement->execute();
        $result = $statement->get_result();
        $row = $result->fetch_assoc();
        $statement->close();
        return $row ? $row['file_path'] : null;
    }

    public function submitRequirement($internID, $reqID, $internRemarks, $filePath) {
        $date = date("Y-m-d");
        if ($filePath !== null) {
            $query = "UPDATE internrequirements SET intern_remarks = ?, file_path = ?, status = 'SUBMITTED', datesubmitted = ? WHERE internid = ? AND reqid = ? AND status <> 'APPROVED'";
            $statement = $this->connection->prepare($query);
            $statement->bind_param("sssii", $internRemarks, $filePath, $date, $internID, $reqID);
        } else {
            $query = "UPDATE internrequirements SET intern_remarks = ?, status = 'SUBMITTED', datesubmitted = ? WHERE internid = ? AND reqid = ? AND status <> 'APPROVED'";
            $statement = $this->connection->prepare($query);
            $statement->bind_param("ssii", $internRemarks, $date, $internID, $reqID);
        }
        $statement->execute();
        return $statement->affected_rows;
    }

   public function submitWeeklyReport($internID, $weeknumber, $hours, $workdescription, $filePath) {
        $date = date("Y-m-d");
        $query = "INSERT INTO weeklyreports (internid, weeknumber, hours, workdescription, file_path, status, datesubmitted) VALUES (?, ?, ?, ?, ?, 'PENDING', ?)";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("iiisss", $internID, $weeknumber, $hours, $workdescription, $filePath, $date);
        $statement->execute();
        return $statement->affected_rows;
    }

    public function getMonthlyJournals($internID){
        $journals = [];
        $query = "SELECT * FROM journals WHERE internid = ? ORDER BY monthnumber";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("i", $internID);
        $statement->execute();
        $result = $statement->get_result();

        while ($row = $result->fetch_assoc()){
            $journals[] = $row;
        }

        $statement->close();
        return $journals;
    }

    public function getMonthlyJournalFile($internID, $journalID) {
        $query = "SELECT file_path FROM journals WHERE internid = ? AND journalid = ?";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("ii", $internID, $journalID);
        $statement->execute();
        $result = $statement->get_result();
        $row = $result->fetch_assoc();
        $statement->close();
        return $row ? $row['file_path'] : null;
    }

    public function submitJournal($internID, $monthnumber, $notes, $filePath) {
        $date = date("Y-m-d");
        $query = "INSERT INTO journals (internid, monthnumber, notes, file_path, status, datesubmitted) VALUES (?, ?, ?, ?, 'PENDING', ?)";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("iisss", $internID, $monthnumber, $notes, $filePath, $date);
        $statement->execute();
        return $statement->affected_rows;
    }

    // every company an intern can pick, sorted by name
    public function getCompanies() {
        $result = $this->connection->query("SELECT companyid, companyname, companyaddress FROM company ORDER BY companyname");
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    // saves the intern's chosen company; a deployed (ACTIVE) intern cannot change it
    public function chooseCompany($internID, $companyID) {
        $query = "UPDATE interns SET companyid = ?, status = 'PENDING' WHERE internid = ? AND status <> 'ACTIVE'";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("ii", $companyID, $internID);
        $statement->execute();
        $statement->close();
    }
    
    public function getAnnouncementsForIntern($internID) {
        $announcements = [];
        $query = "SELECT * FROM announcements WHERE recipientid = ?";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("i", $internID);
        $statement->execute();
        $result = $statement->get_result();
    
        while ($row = $result->fetch_assoc()) {
            $announcement = [
                'subject' => $row['subject'],
                'date' => $row['date'],
                'message' => $row['message']
                // Add more fields if needed
            ];
            $announcements[] = $announcement;
        }
        $statement->close();
        return $announcements;
    }

    public function getInternProfile($internID) {
        $query = "SELECT s.studentName, s.course, s.classcode, i.companyid, c.companyname, a.adviserName, a.adviserEmail
                  FROM interns i
                  JOIN students s ON s.studentID = i.studentid
                  JOIN advisers a ON a.adviserID = i.adviserid
                  LEFT JOIN company c ON c.companyid = i.companyid
                  WHERE i.internid = ?";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("i", $internID);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        $statement->close();
        return $row;
    }

}




