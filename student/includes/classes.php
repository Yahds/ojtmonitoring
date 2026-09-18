<?php

class Intern {
    public function __construct(
        private int $id,
        private String $name,
        private String $password,
        private int $adviserID,
        private int $companyID,
        private int $supervisorID
    ){}
}

class Requirement {
    public function __construct(
        public int $internID,
        public int $reqID,
        public String $reqName,
        public ?String $dateSubmitted,
        public String $status,
        public ?String $remarks = null, 
        public ?String $internRemarks = null,
        public ?String $filePath = null,
    ) {}
    
    public function __toString()
    {
        return $this->reqName;
    }
}