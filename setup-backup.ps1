<#
  setup-backup.ps1
  Uso: ejecuta PowerShell como administrador y corre:
    C:\inventario-backups\setup-backup.ps1 -RetentionDays 30 -ScheduleTime "03:00"
#>

param(
    [int]   $RetentionDays = 7,
    [string]$ScheduleTime  = "03:00"
)

# 1) Variables y carpetas
$BackupDir = "C:\inventario-backups"
$RcloneUrl = "https://downloads.rclone.org/rclone-current-windows-amd64.zip"
$TaskName  = "Backup DB Inventario"

if(-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# 2) Descargar y extraer rclone.exe
$zipPath = "$BackupDir\rclone.zip"
Invoke-WebRequest -Uri $RcloneUrl -OutFile $zipPath
Expand-Archive -Path $zipPath -DestinationPath $BackupDir -Force
# Mover el binario al root de BackupDir
$extracted = Get-ChildItem $BackupDir -Directory | Where-Object Name -Match "rclone-.*-windows-amd64"
Move-Item -Path "$($extracted.FullName)\rclone.exe" -Destination $BackupDir -Force
Remove-Item -Recurse -Force $zipPath, $extracted.FullName

# 3) Generar backup.ps1
$bs = @"
param(
    [int]`$RetentionDays = $RetentionDays
)

# Variables del backup
`$Container  = "inventario-taller-db-1"
`$DbUser     = "inventario"
`$DbName     = "inventario"
`$BackupDir  = "`$PSScriptRoot"
`$RcloneExe  = "`$PSScriptRoot\rclone.exe"
`$Timestamp  = Get-Date -Format "yyyy-MM-dd_HH-mm"
`$FileName   = "db_`$Timestamp.sql.gz"
`$RemoteDir  = "inventario-backups"

# 1) Dump + compresión en contenedor
docker exec `$Container sh -c "pg_dump -U `$DbUser `$DbName | gzip -c" > "`$BackupDir\`$FileName"

# 2) Rotación local
Get-ChildItem "`$BackupDir\*.sql.gz" |
  Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-`$RetentionDays) } |
  Remove-Item

# 3) Subida a Drive
& `$RcloneExe copy "`$BackupDir\`$FileName" gdrive:`$RemoteDir `
    --transfers=4 --checkers=8 --drive-chunk-size=16M

# 4) Rotación remota
& `$RcloneExe delete gdrive:`$RemoteDir --min-age `$RetentionDays"d"
"@

$bsPath = Join-Path $BackupDir "backup.ps1"
Set-Content -Path $bsPath -Value $bs -Encoding UTF8

# 4) Permitir ejecución de scripts
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force

# 5) Crear tarea programada
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$bsPath`" -RetentionDays $RetentionDays"
$trigger = New-ScheduledTaskTrigger -Daily -At ([datetime]::ParseExact($ScheduleTime,"HH:mm",$null))
Register-ScheduledTask -TaskName $TaskName `
    -Action $action -Trigger $trigger `
    -Description "Backup diario de Inventario DB" `
    -User "SYSTEM" -RunLevel Highest -Force

Write-Host "`n✅ ¡Configuración completada!"
