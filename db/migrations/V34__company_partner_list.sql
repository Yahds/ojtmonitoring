-- advisers add companies from the app, so MySQL numbers them; the keys that point here are dropped first, then put back
ALTER TABLE supervisors DROP FOREIGN KEY companid;
ALTER TABLE interns DROP FOREIGN KEY companyid;
ALTER TABLE endorsements DROP FOREIGN KEY endorsements_company;

ALTER TABLE company
  MODIFY companyid INT NOT NULL AUTO_INCREMENT,
  MODIFY companyname VARCHAR(100) NOT NULL,
  MODIFY companyaddress VARCHAR(150) NULL,
  ADD COLUMN contact_email VARCHAR(255) NULL,
  ADD COLUMN moa_on_file BOOLEAN NOT NULL DEFAULT FALSE,
  ADD UNIQUE KEY company_name (companyname);

ALTER TABLE supervisors ADD CONSTRAINT companid FOREIGN KEY (companyid) REFERENCES company (companyid);
ALTER TABLE interns ADD CONSTRAINT companyid FOREIGN KEY (companyid) REFERENCES company (companyid);
ALTER TABLE endorsements ADD CONSTRAINT endorsements_company FOREIGN KEY (companyid) REFERENCES company (companyid);
