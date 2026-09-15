<?php
include("classes.php");
class DAO {
    private $connection;

    public function __construct() {
        $host = 'localhost';
        $user = 'root';
        $password = '';
        $databaseName = "ojt";

        $this->connection = mysqli_connect($host, $user, $password, $databaseName);
    }

    public function internLogIn($id, $password) {
        $query = "SELECT * FROM interns i JOIN students s ON i.studentid = s.studentID WHERE s.studentid = ? and password = ?";
        $statement = $this->connection->prepare($query);

        $statement->bind_param("is", $id, $password);

        $statement->execute();
        $result = $statement->get_result();

        return $result;
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
                $row["requirementname"],
                $row["datesubmitted"],
                $row["status"],
                $row["remarks"],
        );
            $requirements[] = $req;
        }
        $statement->close();
        return $requirements;
    }

    public function updateStatusByCheckbox($requirementInfo, $newStatus, $currentDate) {
        list($internid, $requirementname) = explode('-', $requirementInfo);
        $query = "UPDATE internrequirements ir JOIN requirements r ON ir.reqid = r.reqid SET status = ?, datesubmitted = ? WHERE internid = ? AND requirementname = ?";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("ssis", $newStatus, $currentDate, $internid, $requirementname);
        $statement->execute();
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
    
        if (!$result) {
            error_log('Error executing query: ' . $this->connection->error);
            die('Error executing query: ' . $this->connection->error);
        }
    
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

    public function getSupervisorIDForIntern($internID) {
        $query = "SELECT supervisorid FROM interns WHERE internid = ?";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("i", $internID);
        $statement->execute();
        $result = $statement->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            return $row['supervisorid'];
        } else {
            return null; // Handle if the supervisor ID is not found
        }
    }

    public function insertTimeIn($internID, $companyID, $supervisorID, $currentDate, $currentTime) {
        $query = "INSERT INTO dailyreports (internid, companyid, supervisorid, date, timeIn) VALUES (?, ?, ?, ?, ?)";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("iiiss", $internID, $companyID, $supervisorID, $currentDate, $currentTime);
        $result = $statement->execute();
        $statement->close();
        return $result;
    }

    // Insert Time Out data into dailyreports table
    public function insertTimeOut($internID, $companyID, $timeOut) {
        // Get the current date
        $currentDate = date("Y-m-d");

        $query = "UPDATE dailyreports 
                SET timeOut = ?, hours = HOUR(TIMEDIFF(?, timeIn)) 
                WHERE internid = ? 
                AND companyid = ? 
                AND date = ?"; 
        
        $statement = $this->connection->prepare($query);
        $statement->bind_param("ssiss", $timeOut, $timeOut, $internID, $companyID, $currentDate);
        $result = $statement->execute();
        $statement->close();
        return $result;
    }

    public function updateWorkDescription($internID, $companyID, $workDescription) {
        $query = "UPDATE dailyreports SET workdescription = ? WHERE internid = ? AND companyid = ? AND date = CURDATE()";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("sii", $workDescription, $internID, $companyID);
        $statement->execute();
    
        return $statement->affected_rows > 0;
    }

    public function getCurrentDayAttendance($internID, $currentDate) {
        $query = "SELECT timeIn, timeOut FROM dailyreports WHERE internid = ? AND date = ?";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("is", $internID, $currentDate);
        $statement->execute();
        $result = $statement->get_result();
    
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            return $row; // Return the time in and time out for the current date
        } else {
            return null; // Return null if no attendance recorded for today
        }
    }

    public function getRecentAttendances($internID) {
        $attendances = [];
        $query = "SELECT * FROM dailyreports WHERE internid = ? ORDER BY date DESC, reportid DESC LIMIT 5";
        $statement = $this->connection->prepare($query);
        $statement->bind_param("i", $internID);
        $statement->execute();
        $result = $statement->get_result();
    
        while ($row = $result->fetch_assoc()) {
            $attendance = [
                'date' => $row['date'],
                'timeIn' => $row['timeIn'],
                'timeOut' => $row['timeOut']
                // Add more fields if needed
            ];
            $attendances[] = $attendance;
        }
        $statement->close();
        return $attendances;
    }

    public function getTotalHours($internID) {
        $query = "SELECT SUM(hours) AS total_hours FROM dailyreports WHERE internid = ?";
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




