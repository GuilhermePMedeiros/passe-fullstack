#!/bin/bash
set -eu

# A imagem MySQL executa este arquivo apenas quando o volume esta vazio.
# O usuario da aplicacao e passedb sao criados pela propria imagem oficial.
case "$MYSQL_TEST_USER" in
    ''|*[!a-zA-Z0-9_]*) echo 'MYSQL_TEST_USER deve conter somente letras, numeros e _.' >&2; exit 1 ;;
esac
if [ "$MYSQL_TEST_USER" = "$MYSQL_USER" ] || [ "$MYSQL_TEST_USER" = root ]; then
    echo 'Use um usuario exclusivo para os testes.' >&2
    exit 1
fi

# Aspas simples escapadas como literal SQL; barra invertida nao e escape aqui.
test_password=${MYSQL_TEST_PASSWORD//\'/\'\'}
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --user=root <<SQL
SET SESSION sql_mode = 'NO_BACKSLASH_ESCAPES';
CREATE DATABASE IF NOT EXISTS passedb_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci;
CREATE USER '$MYSQL_TEST_USER'@'%' IDENTIFIED BY '$test_password';
GRANT SELECT ON passedb_test.* TO '$MYSQL_TEST_USER'@'%';
SQL
