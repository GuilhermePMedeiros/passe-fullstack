#!/bin/bash
set -eu

# Run only inside the db service, after stopping the application.
if [ "${1:-}" != '--confirm-reset-passedb' ]; then
    echo 'Recria somente passedb deste container. Use --confirm-reset-passedb.' >&2
    exit 1
fi
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --user=root <<'SQL'
DROP DATABASE IF EXISTS passedb;
CREATE DATABASE passedb CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci;
SQL
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --user=root --database=passedb < /opt/passe-sql/000-core-schema.sql
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --user=root --database=passedb < /opt/passe-sql/002-entidades-restantes.sql
