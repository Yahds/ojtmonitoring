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
        public String $reqName,
        public String $dateSubmitted,
        public String $status,
        public ?String $remarks = '--',
    ) {}
    
    public function __toString()
    {
        return $this->reqName;
    }
}