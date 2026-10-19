-- the old demo interns were ACTIVE without a deploy date. Ones without a company were never really deployed,
-- the rest get a recent date so they show as just deployed (0 hours, no week overdue yet)
UPDATE interns SET status = 'ENROLLED'
WHERE status = 'ACTIVE' AND deployed_on IS NULL AND companyid IS NULL;

UPDATE interns SET deployed_on = CURDATE() - INTERVAL 3 DAY
WHERE status = 'ACTIVE' AND deployed_on IS NULL;
