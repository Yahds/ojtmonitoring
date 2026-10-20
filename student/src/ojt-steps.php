<?php
const OJT_STEPS = [
    ['title' => 'Choose companies', 'text' => 'Pick up to 3 SLU partner companies. Your adviser sends your CV to them.', 'href' => '/choose-company'],
    ['title' => 'Get accepted', 'text' => 'When a company accepts you, record it, or your adviser records it for you. Not on the list? Add your own company and submit an MOA.', 'href' => '/choose-company'],
    ['title' => 'Endorsement', 'text' => 'Send the endorsement form. Your adviser sends the letter, and you are official once the company sends back the reply form.', 'href' => '/choose-company'],
    ['title' => 'Requirements', 'text' => 'Get your requirements approved, including the Data Privacy Certificate. Then your adviser deploys you.', 'href' => '/requirements'],
    ['title' => 'Work and report', 'text' => 'Send a weekly report with your hours every week and a journal every month. Only approved hours count.', 'href' => '/weekly-reports'],
    ['title' => 'Finish', 'text' => 'Reach your target hours and submit the Certificate of Completion.', 'href' => '/requirements'],
];

function currentOjtStep(string $status, bool $hasCompany, bool $hasChoices, ?string $endorsementStatus): int
{
    return match (true) {
        $status === 'FINISHED' => 7,
        $status === 'ACTIVE' => 5,
        !$hasCompany => $hasChoices ? 2 : 1,
        $endorsementStatus === 'ACCEPTED' => 4,
        default => 3,
    };
}
