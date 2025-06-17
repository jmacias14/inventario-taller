Write-Host "`n>>> Inventario Taller - Setup SSL + Docker <<<`n"

# === 1. Ingresar IP manualmente ===
$selectedIp = Read-Host "Ingresa la IP LOCAL del servidor (ej: 192.168.1.44 o localhost)"
if (-not $selectedIp -or $selectedIp -eq "") {
    Write-Host "ERROR: No se ingreso una IP valida. Abortando..." -ForegroundColor Red
    exit 1
}
Write-Host "`nUsando IP: $selectedIp"

# === 2. Verificar mkcert (debe estar instalado manualmente) ===
$mkcertPath = "$env:USERPROFILE\mkcert.exe"
if (-not (Test-Path $mkcertPath)) {
    Write-Host "`nERROR: mkcert.exe no encontrado en $mkcertPath" -ForegroundColor Red
    Write-Host "Descarga mkcert desde https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert.exe"
    Write-Host "Y colocalo en tu carpeta de usuario antes de continuar."
    exit 1
}
Write-Host "OK: mkcert ya esta instalado."

# === 3. NSS Tools (opcional solo para Firefox) ===
$nssPath = "$env:ProgramFiles\NSS\bin"
if (-not (Test-Path $nssPath)) {
    Write-Host "INFO: NSS Tools no detectado (solo requerido para Firefox)."
    Write-Host "Si lo necesitas, descargalo manualmente de: https://github.com/CarloWood/nss-tools-installer/releases/latest/download/nss-tools-installer.msi"
} else {
    Write-Host "OK: NSS Tools detectado."
}

# === 4. Instalar la CA local de mkcert ===
Write-Host "Instalando la CA local de mkcert (puede pedir permisos)..."
& "$mkcertPath" -install

# === 5. Generar certificados si no existen como archivos ===
$certsFolder = Join-Path $PSScriptRoot "certs"
if (-not (Test-Path $certsFolder)) {
    New-Item -ItemType Directory -Path $certsFolder | Out-Null
}

$certFile = Join-Path $certsFolder "dev-cert.pem"
$keyFile  = Join-Path $certsFolder "dev-key.pem"

# Si existen pero son carpetas, eliminarlas
if ((Test-Path $certFile) -and (Get-Item $certFile).PSIsContainer) {
    Remove-Item -Recurse -Force $certFile
}
if ((Test-Path $keyFile) -and (Get-Item $keyFile).PSIsContainer) {
    Remove-Item -Recurse -Force $keyFile
}

# Generar solo si no existen como archivos
if ((-not (Test-Path $certFile -PathType Leaf)) -or (-not (Test-Path $keyFile -PathType Leaf))) {
    Write-Host "Generando certificados SSL para frontend..."
    & "$mkcertPath" -key-file $keyFile -cert-file $certFile "localhost" "127.0.0.1" $selectedIp
    Write-Host "OK: Certificados generados en $certsFolder"
} else {
    Write-Host "OK: Certificados ya existen en $certsFolder, no se regeneran."
}

# === 6. Crear o actualizar el .env del frontend ===
$envFile = Join-Path $PSScriptRoot "frontend/.env"
$frontendEnv = @"
VITE_HTTPS=true
VITE_SSL_CERT=/app/certs/dev-cert.pem
VITE_SSL_KEY=/app/certs/dev-key.pem
VITE_API_URL=https://$selectedIp:3001
"@

if (Test-Path $envFile) {
    $regenera = Read-Host "Ya existe frontend/.env. Quieres regenerarlo con los valores recomendados? (s/n)"
    if ($regenera -eq 's') {
        Set-Content -Path $envFile -Value $frontendEnv -Encoding UTF8
        Write-Host "Archivo .env regenerado para frontend."
    } else {
        Write-Host "Se mantiene el archivo .env existente."
    }
} else {
    Set-Content -Path $envFile -Value $frontendEnv -Encoding UTF8
    Write-Host "Archivo .env creado para frontend."
}

Write-Host "`nContenido actual de frontend/.env:`n"
Get-Content $envFile | Write-Host

# === 7. Levantar Docker Compose ===
Write-Host "`nListo! Ahora se inicia Docker Compose con SSL configurado.`n"
docker compose up --build -d
Write-Host "`nTodo listo. Accede a: https://$selectedIp:5173"