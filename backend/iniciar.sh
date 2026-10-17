#!/bin/sh
set -eu
cd "$(dirname "$0")"

# Le valores literalmente: nao executa comandos nem expande a senha do arquivo.
if [ -f .env ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        line=$(printf '%s' "$line" | tr -d '\r')
        case "$line" in
            DB_URL=*|DB_USERNAME=*|DB_PASSWORD=*|TEST_DB_URL=*|TEST_DB_USERNAME=*|TEST_DB_PASSWORD=*|CORS_ORIGIN=*)
                export "$line"
                ;;
        esac
    done < .env
fi

exec sh ./mvnw -B -ntp spring-boot:run
