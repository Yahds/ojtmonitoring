ALTER TABLE internrequirements
  ADD CONSTRAINT internrequirements_intern FOREIGN KEY (internid) REFERENCES interns (internid),
  ADD CONSTRAINT internrequirements_requirement FOREIGN KEY (reqid) REFERENCES requirements (reqid);

ALTER TABLE announcements
  ADD CONSTRAINT announcements_sender FOREIGN KEY (senderid) REFERENCES advisers (adviserID);
