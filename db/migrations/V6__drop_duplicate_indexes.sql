ALTER TABLE advisers DROP INDEX adviserID_UNIQUE;
ALTER TABLE announcements DROP INDEX announcementid_UNIQUE;
ALTER TABLE interns DROP INDEX internid_UNIQUE;
ALTER TABLE students DROP INDEX studentID_UNIQUE;
ALTER TABLE internrequirements DROP INDEX internid_fk_idx;
