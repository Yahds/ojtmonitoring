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
        public ?String $dueDate = null,  // YYYY-MM-DD, for sorting
        public ?String $dueLabel = null, // "Oct 20, 2026", for showing
        public ?String $deadline = null, // OVERDUE, LATE or null
    ) {}
    
    public function __toString()
    {
        return $this->reqName;
    }
}