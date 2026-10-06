# OJT (On-the-Job Training) Monitoring System

The Web-Based OJT (On-the-Job Training) Monitoring System is a comprehensive platform designed to streamline the management and monitoring of Saint Louis University's SAMCIS on-the-job training. Tailored to meet the specific needs of both students undergoing training and advisers overseeing their progress, this system provides a centralized hub for tracking requirements, progress reports, and feedback. Students submit their internship requirements, weekly reports and monthly journals. Advisers review them, track each intern's hours and be able to post important announcements.

Originally built in 2023 as a five-person university team project. In 2026 I revamped it: fixed its security problems, restructured and tested the backend, and set it up with Docker and CI. A full write-up of the changes is in progress.

## Features

**Students**
- Choose their host company
- Submit requirements (file and remarks) and see the adviser's decision and remarks
- Submit weekly reports with hours worked, and monthly journals
- See their total approved hours and their adviser's announcements

**Advisers**
- Dashboard with each intern's approved hours (240-hour target) and status
- Enroll interns; each new intern gets the full requirement list automatically
- Review requirements, weekly reports and journals: approve or reject, add remarks, open the submitted files
- Deploy an intern once they have a company and an approved endorsement letter
- Post announcements to their interns

**Department head**
- View and add the department's advisers

## Tech stack

- **Adviser app:** Node.js 22, Express, Pug
- **Student app:** PHP 8.2 (Apache)
- **Database:** MySQL 8.0
- **Entry point:** nginx 1.27, which sends `/student/` to the PHP app and everything else to the Node app
- **Setup:** Docker Compose
- **Quality:** Jest + SuperTest tests, ESLint, GitHub Actions CI

## Screenshots


## Run it locally
You need **Docker Desktop** (which includes Docker Compose).
1. Clone the repo:
   ```
   git clone https://github.com/Yahds/ojtmonitoring.git
   cd ojtmonitoring
   ```
2. Copy `.env.example` to `.env`, then fill in `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` and `SESSION_SECRET` with long random values. Keep `.env` private; it is ignored by Git.
3. Start everything:
   ```
   docker compose up -d
   ```
   The first start builds the database by running the Flyway migrations in `db/migrations/`, then adds demo data from `db/demo-data/`.
4. Open:
   - Adviser and department head: http://localhost:8080/ojt-login-page/
   - Student: http://localhost:8080/student/

### Demo logins

All names and accounts in the seed data are made up.

| Role | Login | Password |
|---|---|---|
| Adviser | `amelia.stevens@example.com` | `amelia123` |
| Department head | `maria.cruz@example.com` | `deanpass` |
| Student | `2299001` | `1234` |

Amelia is the adviser of student 2299001.

### If a page shows "502 Bad Gateway"

nginx keeps the address the app had when nginx started. If a container was recreated, restart nginx:
```
docker compose restart nginx
```

## Tests

The tests run inside the adviser container against the real database:
```
docker compose exec adviser-node sh -c "npm run lint && npm test"
```
GitHub Actions runs lint and the tests on every pull request and on every push to `main`.

## Project structure

```
adviser/          Node.js app for advisers and the department head
  app.js          app setup: sessions, static files, CSRF, routers
  routes/         pages and form handlers, one file per area
  db/             database queries, one file per table
  middleware/     login, role and CSRF checks
  tests/          Jest + SuperTest tests
student/          PHP app for students
db/               Flyway migrations (migrations/) & demo data (demo-data/)
nginx/            reverse proxy config
```

## Authors

**Original team project (2023)**
- Database and documentation: Albert Jannsen Ramos, Ariel Tarlit Jr.
- Adviser side (Node.js): Jahn Crystan Abella, Joshua Daniel David, Haydee Shane Saguid
- Student side (PHP): Jonison Martel Molintas, Haydee Shane Saguid, Maervin Villalobos
- About Us page: Ariel Tarlit Jr.

**2026 revamp:** Haydee Shane Saguid

## Status

This app is a portfolio case study and is not deployed.
