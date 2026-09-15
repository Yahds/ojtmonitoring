FROM mysql:8.0

# When the container starts, this SQL will be executed.
COPY db/schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY db/seed.sql /docker-entrypoint-initdb.d/02-seed.sql

# By default, MySQL listens on port 3306
EXPOSE 3306