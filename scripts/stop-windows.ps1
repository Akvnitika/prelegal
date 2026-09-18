$ContainerName = "prelegal"

$existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if ($existing) {
    docker rm -f $ContainerName | Out-Null
    Write-Host "prelegal stopped."
} else {
    Write-Host "prelegal is not running."
}
