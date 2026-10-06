UPDATE internrequirements SET datesubmitted = NULL WHERE datesubmitted = '';
UPDATE weeklyreports SET datesubmitted = NULL WHERE datesubmitted = '';
UPDATE journals SET datesubmitted = NULL WHERE datesubmitted = '';

ALTER TABLE internrequirements MODIFY datesubmitted DATE NULL;
ALTER TABLE weeklyreports MODIFY datesubmitted DATE NULL;
ALTER TABLE journals MODIFY datesubmitted DATE NULL;

ALTER TABLE announcements
  MODIFY senderid INT NOT NULL,
  MODIFY subject VARCHAR(255) NOT NULL,
  MODIFY message TEXT NOT NULL;
