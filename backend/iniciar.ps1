$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# Carrega somente as variaveis do banco, sem executar o conteudo do arquivo.
if (Test-Path -LiteralPath '.env') {
    foreach ($line in Get-Content -LiteralPath '.env' -Encoding UTF8) {
        if ($line -match '^(DB_URL|DB_USERNAME|DB_PASSWORD|TEST_DB_URL|TEST_DB_USERNAME|TEST_DB_PASSWORD|CORS_ORIGIN)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
}

& .\mvnw.cmd -B -ntp spring-boot:run
exit $LASTEXITCODE
