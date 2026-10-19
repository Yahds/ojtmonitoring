// runs before every test file: use the test database when one is set, so tests never change the demo data
if (process.env.MYSQL_TEST_DATABASE) {
    process.env.MYSQL_DATABASE = process.env.MYSQL_TEST_DATABASE;
}
