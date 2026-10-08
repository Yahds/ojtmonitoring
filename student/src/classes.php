<?php

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