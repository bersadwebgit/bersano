# This script creates a backup of the PostgreSQL database from the running docker container.
# It works on Windows PowerShell.

$backupDir = "./backups"
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$date = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupDir/backup_$date.sql"

Write-Host "Starting database backup..." -ForegroundColor Green
docker compose exec -T postgres pg_dump -U postgres shop_final > $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database backup successfully saved to $backupFile" -ForegroundColor Green
} else {
    Write-Host "Database backup failed! Please make sure the postgres container is running." -ForegroundColor Red
}
