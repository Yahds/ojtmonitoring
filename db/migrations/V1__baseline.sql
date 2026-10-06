CREATE TABLE `departments` (
  `departmentid` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`departmentid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `advisers` (
  `adviserID` int NOT NULL AUTO_INCREMENT,
  `adviserName` varchar(45) NOT NULL,
  `adviserEmail` varchar(45) NOT NULL,
  `password` varchar(60) NOT NULL,
  `image` blob,
  `departmentid` int DEFAULT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'adviser',
  PRIMARY KEY (`adviserID`),
  UNIQUE KEY `adviserID_UNIQUE` (`adviserID`),
  KEY `departmentid_idx` (`departmentid`),
  CONSTRAINT `advisers_department` FOREIGN KEY (`departmentid`) REFERENCES `departments` (`departmentid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `company` (
  `companyid` int NOT NULL,
  `companyname` varchar(45) DEFAULT NULL,
  `companyaddress` varchar(45) DEFAULT NULL,
  `companytype` varchar(45) DEFAULT 'P, G',
  PRIMARY KEY (`companyid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `supervisors` (
  `supervisorid` int NOT NULL,
  `supervisorname` varchar(45) DEFAULT NULL,
  `supervisoremail` varchar(45) DEFAULT NULL,
  `position` varchar(45) DEFAULT NULL,
  `companyid` int DEFAULT NULL,
  PRIMARY KEY (`supervisorid`),
  KEY `companyid_idx` (`companyid`),
  CONSTRAINT `companid` FOREIGN KEY (`companyid`) REFERENCES `company` (`companyid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `students` (
  `studentID` int NOT NULL,
  `studentName` varchar(45) NOT NULL,
  `course` varchar(45) NOT NULL,
  `year` varchar(45) NOT NULL,
  `classcode` varchar(45) NOT NULL,
  PRIMARY KEY (`studentID`),
  UNIQUE KEY `studentID_UNIQUE` (`studentID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `interns` (
  `internid` int NOT NULL AUTO_INCREMENT,
  `password` varchar(60) NOT NULL,
  `adviserid` int NOT NULL,
  `studentid` int NOT NULL,
  `companyid` int DEFAULT NULL,
  `supervisorid` int DEFAULT NULL,
  `totalhours` int DEFAULT NULL,
  `worktype` varchar(45) DEFAULT NULL,
  `image` blob,
  `status` varchar(45) DEFAULT 'ENROLLED',
  PRIMARY KEY (`internid`),
  UNIQUE KEY `internid_UNIQUE` (`internid`),
  KEY `adviserid_idx` (`adviserid`),
  KEY `studentid_idx` (`studentid`),
  KEY `companyid_idx` (`companyid`),
  KEY `supervisorid_idx` (`supervisorid`),
  CONSTRAINT `adviserid` FOREIGN KEY (`adviserid`) REFERENCES `advisers` (`adviserID`),
  CONSTRAINT `companyid` FOREIGN KEY (`companyid`) REFERENCES `company` (`companyid`),
  CONSTRAINT `studentid` FOREIGN KEY (`studentid`) REFERENCES `students` (`studentID`),
  CONSTRAINT `supervisorid` FOREIGN KEY (`supervisorid`) REFERENCES `supervisors` (`supervisorid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `requirements` (
  `reqid` int NOT NULL AUTO_INCREMENT,
  `requirementname` varchar(45) NOT NULL,
  PRIMARY KEY (`reqid`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE `internrequirements` (
  `internid` int NOT NULL,
  `reqid` int NOT NULL,
  `datesubmitted` varchar(45) DEFAULT NULL,
  `status` varchar(45) DEFAULT NULL,
  `remarks` varchar(200) DEFAULT NULL,
  `intern_remarks` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  KEY `internid_fk_idx` (`internid`),
  KEY `reqid_fk_idx` (`reqid`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE `announcements` (
  `announcementid` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `senderid` varchar(45) NOT NULL,
  `recipientid` int NOT NULL,
  `subject` varchar(45) NOT NULL,
  `message` varchar(45) NOT NULL,
  PRIMARY KEY (`announcementid`),
  UNIQUE KEY `announcementid_UNIQUE` (`announcementid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `weeklyreports` (
  `reportid` int NOT NULL AUTO_INCREMENT,
  `internid` int NOT NULL,
  `weeknumber` int NOT NULL,
  `hours` int NOT NULL,
  `workdescription` varchar(500) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `status` varchar(45) DEFAULT 'PENDING',
  `remark` varchar(255) DEFAULT NULL,
  `datesubmitted` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`reportid`),
  KEY `internid_idx` (`internid`),
  CONSTRAINT `weeklyreports_intern` FOREIGN KEY (`internid`) REFERENCES `interns` (`internid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `journals` (
  `journalid` int NOT NULL AUTO_INCREMENT,
  `internid` int NOT NULL,
  `monthnumber` int NOT NULL,
  `notes` varchar(2000) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `status` varchar(45) DEFAULT 'PENDING',
  `remark` varchar(255) DEFAULT NULL,
  `datesubmitted` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`journalid`),
  KEY `internid_idx` (`internid`),
  CONSTRAINT `journals_intern` FOREIGN KEY (`internid`) REFERENCES `interns` (`internid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
