Write-Host "`n>>> Inventario Taller - Setup SSL + Docker + Firewall <<<`n"

# — 0) Configurar reglas de firewall —
Try {
    # Frontend Vite (5173)
    New-NetFirewallRule `
      -DisplayName "Allow Vite Frontend 5173" `
      -Direction Inbound `
      -LocalPort 5173 `
      -Protocol TCP `
      -Action Allow -ErrorAction Stop

    # API Backend (3001)
    New-NetFirewallRule `
      -DisplayName "Allow API Backend 3001" `
      -Direction Inbound `
      -LocalPort 3001 `
      -Protocol TCP `
      -Action Allow -ErrorAction Stop

    # Postgres (5432)
    New-NetFirewallRule `
      -DisplayName "Allow Postgres 5432" `
      -Direction Inbound `
      -LocalPort 5432 `
      -Protocol TCP `
      -Action Allow -ErrorAction Stop

    # Asegurar que el firewall está habilitado
    Set-NetFirewallProfile -Profile Domain,Private,Public -Enabled True -ErrorAction Stop

    Write-Host "✅ Reglas de firewall configuradas.`n"
}
Catch {
    Write-Warning "❗ Error al aplicar reglas de firewall: $_`n"
}

Write-Host "`n>>> Inventario Taller - Setup SSL + Docker <<<`n"

# 1. Ingresar IP manualmente con validación adicional
$selectedIp = $null
while ([string]::IsNullOrEmpty($selectedIp) -or ($selectedIp -notmatch '^(\d{1,3}\.){3}\d{1,3}$' -and $selectedIp -ne "localhost")) {
    $selectedIp = Read-Host "Ingresá la IP LOCAL del servidor (ej: 192.168.1.44 o localhost)"
    if ([string]::IsNullOrEmpty($selectedIp) -or ($selectedIp -notmatch '^(\d{1,3}\.){3}\d{1,3}$' -and $selectedIp -ne "localhost")) {
        Write-Host "❌ Valor ingresado no válido. Por favor intentá nuevamente." -ForegroundColor Red
    }
}
Write-Host "`nUsando IP: $selectedIp"

# 2. Verificar mkcert
$mkcertPath = "$env:USERPROFILE\mkcert.exe"
if (-not (Test-Path $mkcertPath)) {
    $mkcertInPath = Get-Command mkcert -ErrorAction SilentlyContinue
    if ($mkcertInPath) {
        $mkcertPath = $mkcertInPath.Source
        Write-Host "✔️ mkcert encontrado en PATH: $mkcertPath"
    } else {
        Write-Host "`n❌ mkcert.exe no encontrado en $mkcertPath o en PATH" -ForegroundColor Red
        Write-Host "Descargá mkcert desde https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert.exe"
        Write-Host "Y colocalo en tu carpeta de usuario o en PATH antes de continuar."
        exit 1
    }
} else {
    Write-Host "✔️ mkcert ya está instalado."
}

# 3. NSS Tools (opcional solo para Firefox)
$nssPath = "$env:ProgramFiles\NSS\bin"
if (-not (Test-Path $nssPath)) {
    Write-Host "ℹ️ NSS Tools no detectado (solo requerido para Firefox)."
    Write-Host "Si lo necesitás, descargalo manualmente de: https://github.com/CarloWood/nss-tools-installer/releases/latest/download/nss-tools-installer.msi"
} else {
    Write-Host "✔️ NSS Tools detectado."
}

# 4. Instalar la CA local de mkcert
Write-Host "Instalando la CA local de mkcert (puede pedir permisos)..."
& "$mkcertPath" -install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error instalando CA de mkcert" -ForegroundColor Red
    exit 1
}

# 5. Generar certificados
$certsFolder = Join-Path $PSScriptRoot "certs"
if (-not (Test-Path $certsFolder)) {
    New-Item -ItemType Directory -Path $certsFolder | Out-Null
}
$certFile = Join-Path $certsFolder "dev-cert.pem"
$keyFile  = Join-Path $certsFolder "dev-key.pem"

if ((Test-Path $certFile) -and (Get-Item $certFile).PSIsContainer) {
    Remove-Item -Recurse -Force $certFile
}
if ((Test-Path $keyFile) -and (Get-Item $keyFile).PSIsContainer) {
    Remove-Item -Recurse -Force $keyFile
}

$debeGenerar = $false
if (-not (Test-Path $certFile -PathType Leaf)) { $debeGenerar = $true }
if (-not (Test-Path $keyFile -PathType Leaf)) { $debeGenerar = $true }

if ($debeGenerar) {
    Write-Host "Generando certificados SSL para frontend..."
    & "$mkcertPath" -key-file $keyFile -cert-file $certFile "localhost" "127.0.0.1" $selectedIp
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error generando certificados" -ForegroundColor Red
        exit 1
    }
    Write-Host "✔️ Certificados generados en $certsFolder"
} else {
    Write-Host "✔️ Certificados ya existen en $certsFolder, no se regeneran."
}

# 6. Crear o actualizar .env con ruta absoluta segura y robustez total
$frontendFolder = Join-Path $PSScriptRoot "frontend"
$envFile = Join-Path $frontendFolder ".env"

# Verificar explícitamente ruta absoluta
Write-Host "Ruta completa del archivo .env: $envFile"

# Forzar creación carpeta frontend con control total de errores
if (-not (Test-Path $frontendFolder)) {
    try {
        New-Item -ItemType Directory -Path $frontendFolder -Force | Out-Null
        Write-Host "✔️ Carpeta frontend creada correctamente."
    } catch {
        Write-Host "❌ No se pudo crear la carpeta frontend en: $frontendFolder" -ForegroundColor Red
        exit 1
    }
}

# Confirmar explícitamente IP disponible
if ([string]::IsNullOrEmpty($selectedIp)) {
    Write-Host "❌ Error crítico: IP no definida. Abortando." -ForegroundColor Red
    exit 1
}

# Generar contenido sin interpolaciones conflictivas
$frontendEnv = "VITE_HTTPS=true`nVITE_SSL_CERT=/app/certs/dev-cert.pem`nVITE_SSL_KEY=/app/certs/dev-key.pem`nVITE_API_URL=https://$selectedIp`:3001"

# Intentar escritura directa, con captura precisa de errores
try {
    Set-Content -Path $envFile -Value $frontendEnv -Encoding UTF8 -Force
    Start-Sleep -Milliseconds 500  # espera adicional para asegurar escritura
    $contenidoEscrito = Get-Content -Path $envFile -Raw

    if ($contenidoEscrito -notlike "*$selectedIp*") {
        throw "IP no encontrada en el archivo tras la escritura."
    }
} catch {
    Write-Host "❌ Error crítico escribiendo o verificando .env: $_" -ForegroundColor Red
    exit 1
}

Write-Host "✔️ Archivo .env creado y verificado correctamente."
Write-Host "`nContenido actual del archivo .env:`n"
Get-Content $envFile | Write-Host

# 7. Verificar Docker y levantar Docker Compose
Write-Host "`nVerificando Docker..."
docker --version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker no está disponible. Asegurate de que Docker Desktop esté ejecutándose." -ForegroundColor Red
    exit 1
}

Write-Host "`nListo! Ahora se inicia Docker Compose con SSL configurado.`n"
docker compose build --no-cache && docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error ejecutando Docker Compose" -ForegroundColor Red
    Write-Host "Revisá los logs con: docker compose logs"
    exit 1
}

Write-Host "`n✅ Todo listo. Accedé a: https://$selectedIp:5173"
