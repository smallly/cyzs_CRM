$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectMysqlData = (Join-Path $root "mysql-data").ToLowerInvariant()

function Stop-ByPort {
    param([int]$Port, [string]$Name)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $conn) {
        Write-Host "$Name is not running on port $Port."
        return
    }

    $processId = $conn.OwningProcess
    if ($Port -eq 3306) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
        if ($null -eq $proc -or $null -eq $proc.CommandLine -or -not $proc.CommandLine.ToLowerInvariant().Contains($projectMysqlData)) {
            Write-Host "Skip stopping MySQL PID $processId (not started from project mysql-data)."
            return
        }
    }

    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped $Name (PID $processId, port $Port)."
}

Stop-ByPort -Port 5173 -Name "Frontend"
Stop-ByPort -Port 8080 -Name "Backend"
Stop-ByPort -Port 3306 -Name "MySQL"
