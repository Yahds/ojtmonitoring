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




