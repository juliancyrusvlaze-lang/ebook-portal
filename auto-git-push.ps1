# Set repository path to current directory
$repoPath = $PSScriptRoot

# Configure the file system watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $repoPath
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Filter out Git, node_modules, and build outputs
$excludeList = @('\.git', 'node_modules', '\android\app\build', '\android\.gradle', '\.idea')

Write-Host "Auto-push active for $repoPath. Press Ctrl+C to stop." -ForegroundColor Cyan

# Main watcher loop
$lastRun = [DateTime]::MinValue
while ($true) {
    $result = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::Changed -bor [System.IO.WatcherChangeTypes]::Created -bor [System.IO.WatcherChangeTypes]::Deleted, 2000)
    
    if ($result.TimedOut -eq $false) {
        $filePath = $result.Name
        $shouldIgnore = $false

        foreach ($pattern in $excludeList) {
            if ($filePath -match $pattern) {
                $shouldIgnore = $true
                break
            }
        }

        # Debounce to prevent spamming pushes on rapid writes (wait 5 seconds between runs)
        if (-not $shouldIgnore -and ((Get-Date) - $lastRun).TotalSeconds -gt 5) {
            $lastRun = Get-Date
            Start-Sleep -Seconds 2

            Write-Host "Change detected in: $filePath" -ForegroundColor Yellow
            
            git -C $repoPath add .
            $status = git -C $repoPath status --porcelain
            
            if ($status) {
                $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                git -C $repoPath commit -m "Auto-update by Antigravity: $timestamp"
                git -C $repoPath push origin main
                Write-Host "Pushed changes to GitHub successfully at $timestamp" -ForegroundColor Green
            }
        }
    }
}