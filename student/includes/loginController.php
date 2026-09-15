<?php
    include("./DataAccessObject.php");
    session_start();
    $db = new DAO();

    if (isset($_POST['id'])) {
        $id = $_POST['id'];
        $password = $_POST['password'];
        $row = $db->internLogIn($id, $password);

        if ($row) {
            session_regenerate_id(true);

            $_SESSION['id'] = $row['studentid'];
            $_SESSION['studentName'] = $row['studentName'];
            $_SESSION['course'] = $row['course'];
            $_SESSION['year'] = $row['year'];
            $_SESSION['internid'] = $row['internid'];
            $_SESSION['companyid'] = $row['companyid'];
            $_SESSION['status'] = $row['status'];

            if ($_SESSION['status'] != "ACCEPTED") {
                header('Location: ../views/chooseCompany.php');
            } else {
                header('Location: ../index.php');
            }
            exit();
            
        }
    }

    header('Location: ../login.html');
    exit();
    

