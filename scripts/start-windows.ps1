# Note: no $ErrorActionPreference = "Stop" — docker prints build progress to
# stderr, which Stop turns into a terminating error whenever the script's
# output is redirected. Failures are handled via $LASTEXITCODE instead.
Set-Location (Split-Path -Parent $PSScriptRoot)

$ContainerName = "prelegal"
$ImageName = "prelegal:latest"
$Port = 8000

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is required."
    exit 1
}

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") { Copy-Item ".env.example" ".env" }
    else { New-Item -ItemType File ".env" | Out-Null }
    Write-Warning "No .env found; created a placeholder. Add real API keys for AI features."
}

docker build -t $ImageName .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if ($existing) { docker rm -f $ContainerName | Out-Null }
docker run -d --name $ContainerName --env-file .env -p "${Port}:8000" $ImageName | Out-Null
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "prelegal is running at http://localhost:$Port"
            exit 0
        }
    } catch {}
    Start-Sleep -Seconds 1
}
Write-Warning "Health check did not pass within 30s. Check 'docker logs $ContainerName'."
exit 1
