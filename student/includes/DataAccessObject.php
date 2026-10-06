<?php
include("classes.php");
class DAO {
    private $connection;

    public function __construct() {
        $host = getenv('MYSQL_HOST') ?: 'localhost';
        $user = getenv('MYSQL_USER') ?: 'root';
        $password = getenv('MYSQL_PASSWORD') ?: '';
        $databaseName = getenv('MYSQL_DATABASE') ?: 'ojt';

        $this->connection = mysqli_connect($host, $user, $password, $databaseName);
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
            $query = "UPDATE internrequirements SET intern_remarks = ?, file_path = ?, status = 'SUBMITTED', datesubmitted = ? WHERE internid = ? AND reqid = ?";
            $statement = $this->connection->prepare($query);
            $statement->bind_param("sssii", $internRemarks, $filePath, $date, $internID, $reqID);
        } else {
            $query = "UPDATE internrequirements SET intern_remarks = ?, status = 'SUBMITTED', datesubmitted = ? WHERE internid = ? AND reqid = ?";
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

    // used in updateCompany.php when intern has no company and needs to input the company information
    // the company information is to be confirmed by the adviser or no
    public function updateCompany($studentid, $companyName, $companyLocation) {
        $query1 = "SELECT * FROM company WHERE companyname = ? AND companyaddress = ?";
        $statement = $this->connection->prepare($query1);
        $statement->bind_param("ss", $companyName, $companyLocation);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        $companyid = $row['companyid'];
        
        $query2 = "UPDATE interns SET companyid = ?, status = 'PENDING' WHERE interns.internid = ?";
        $statement = $this->connection->prepare($query2);
        $statement->bind_param("ii", $companyid, $studentid);
        $statement->execute();

        return $companyid;
    }


    public function getCompanyID($studentid) {
        $query = "SELECT * from interns where studentid = ?";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("i", $studentid);
        $statement->execute();
        $result = $statement->get_result();
        return $result;
    }

    // retrieve company details
    public function getCompanyData() {
        $query = "SELECT companyname, companyaddress FROM company";
        $result = $this->connection->query($query);
        return $result;
    }
    
    // dashboard
    // fetch the company information
    public function getCompanyInfoById($companyId) {
        $query = "SELECT companyname, companyaddress FROM company WHERE companyid = ?";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("i", $companyId);
        $statement->execute();
        $result = $statement->get_result();
    
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            return $row; // Return an associative array with companyname and companyaddress
        } else {
            return array("companyname" => "Unknown Company", "companyaddress" => "Unknown Address");
        }
    }

    public function getTotalHours($internID) {
        $query = "SELECT SUM(hours) AS total_hours FROM weeklyreports WHERE internid = ? AND status = 'APPROVED'";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("i", $internID);
        $statement->execute();
        $result = $statement->get_result();
    
        $totalHours = 0;
    
        if ($row = $result->fetch_assoc()) {
            $totalHours = $row['total_hours'];
        }
    
        $statement->close();
        return $totalHours;
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
}




