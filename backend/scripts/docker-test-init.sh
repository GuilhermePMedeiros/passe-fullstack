#!/bin/bash
set -eu

# Executed only by the dedicated, disposable tests-db service.
if [ "$MYSQL_DATABASE" != passedb_test ]; then
    echo 'Inicializacao de testes exige o banco passedb_test.' >&2
    exit 1
fi
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --user=root --database=passedb_test < /opt/passe-sql/000-core-schema.sql
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --user=root --database=passedb_test < /opt/passe-sql/002-entidades-restantes.sql
