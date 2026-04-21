$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe"
$mvnCmd = Join-Path $root "tools\apache-maven-3.9.9\bin\mvn.cmd"
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$mysqlIni = Join-Path $root "mysql-data\my.ini"
$logDir = Join-Path $root "logs"

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Test-PortListening {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    return $null -ne $conn
}

function Wait-Port {
    param([int]$Port, [int]$Seconds = 40)
    for ($i = 0; $i -lt $Seconds; $i++) {
        if (Test-PortListening -Port $Port) {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

if (-not (Test-PortListening -Port 3306)) {
    if (-not (Test-Path $mysqlExe)) {
        throw "MySQL not found: $mysqlExe"
    }
    if (-not (Test-Path $mysqlIni)) {
        throw "MySQL config not found: $mysqlIni"
    }
    Start-Process -FilePath $mysqlExe -ArgumentList "--defaults-file=$mysqlIni" -WindowStyle Hidden | Out-Null
    if (-not (Wait-Port -Port 3306 -Seconds 25)) {
        throw "MySQL failed to start on 3306."
    }
}

if (-not (Test-PortListening -Port 8080)) {
    if (-not (Test-Path $mvnCmd)) {
        throw "Maven not found: $mvnCmd"
    }
    Start-Process -FilePath $mvnCmd -ArgumentList "spring-boot:run" -WorkingDirectory $backendDir -RedirectStandardOutput (Join-Path $logDir "backend.out.log") -RedirectStandardError (Join-Path $logDir "backend.err.log") -WindowStyle Hidden | Out-Null
    if (-not (Wait-Port -Port 8080 -Seconds 60)) {
        throw "Backend failed to start on 8080. See logs\backend.err.log"
    }
}

if (-not (Test-PortListening -Port 5173)) {
    Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- --host 0.0.0.0 --port 5173" -WorkingDirectory $frontendDir -RedirectStandardOutput (Join-Path $logDir "frontend.out.log") -RedirectStandardError (Join-Path $logDir "frontend.err.log") -WindowStyle Hidden | Out-Null
    if (-not (Wait-Port -Port 5173 -Seconds 30)) {
        throw "Frontend failed to start on 5173. See logs\frontend.err.log"
    }
}

Write-Host ""
Write-Host "All services are up."
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend : http://localhost:8080"
Write-Host "MySQL   : 127.0.0.1:3306 / db=indcrm"
Write-Host "Login   : 13800000000 / Admin@123"
