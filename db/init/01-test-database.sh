#!/bin/sh
# a second database only for automated tests, so they never change the demo data.
# MySQL runs this once, when the database volume is first created.
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "
  CREATE DATABASE IF NOT EXISTS \`$MYSQL_TEST_DATABASE\`;
  GRANT ALL PRIVILEGES ON \`$MYSQL_TEST_DATABASE\`.* TO '$MYSQL_USER'@'%';"
