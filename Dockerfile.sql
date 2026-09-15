FROM mysql:5.7

# Set environment variables for MySQL
ENV MYSQL_DATABASE=ojt_database
ENV MYSQL_USER=user
ENV MYSQL_PASSWORD=password
ENV MYSQL_ROOT_PASSWORD=rootpassword

# When the container starts, this SQL will be executed.
COPY db/schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY db/seed.sql /docker-entrypoint-initdb.d/02-seed.sql

# By default, MySQL listens on port 3306
EXPOSE 3306