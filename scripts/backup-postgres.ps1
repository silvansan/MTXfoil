param(
  [string]$BackupDir = (Join-Path (Split-Path $PSScriptRoot -Parent) "backups\postgres"),
  [string]$PostgresUser = $env:POSTGRES_USER,
  [string]$PostgresDb = $env:POSTGRES_DB,
  [string]$PostgresContainer = "mtxfoil-postgres"
)

if (-not $PostgresUser) { $PostgresUser = "mtxfoil" }
if (-not $PostgresDb) { $PostgresDb = "mtxfoil" }

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$outputFile = Join-Path $BackupDir "mtxfoil-postgres-$timestamp.sql.gz"

Write-Host "Creating Postgres backup: $outputFile"
docker exec $PostgresContainer pg_dump -U $PostgresUser $PostgresDb | gzip > $outputFile
Write-Host "Backup complete."
