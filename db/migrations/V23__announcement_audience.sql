-- one row per post, sent to one section or (NULL) to all of the adviser's sections
ALTER TABLE announcements
  ADD COLUMN audience_classcode VARCHAR(45) NULL AFTER senderid,
  ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE announcements SET created_at = date;

-- old posts to one intern become posts to that intern's section
UPDATE announcements a
  JOIN interns i ON i.internid = a.recipientid
  JOIN students s ON s.studentID = i.studentid
  SET a.audience_classcode = s.classcode
  WHERE a.recipientid <> 0;

-- the same post sent to several interns was saved once per intern; keep the first copy
DELETE dup FROM announcements dup
  JOIN announcements keep
    ON keep.senderid = dup.senderid AND keep.subject = dup.subject AND keep.message = dup.message
   AND keep.date = dup.date AND keep.audience_classcode <=> dup.audience_classcode
   AND keep.announcementid < dup.announcementid;

ALTER TABLE announcements DROP COLUMN recipientid, DROP COLUMN date;
