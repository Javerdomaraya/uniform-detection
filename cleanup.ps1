# Safe Cleanup Script - Removes only cache and temporary files
param([switch]$WhatIf = $false)

$projectRoot = "c:\Users\Javer Domaraya\Downloads\uniform-detections"
Set-Location $projectRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SAFE CLEANUP SCRIPT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($WhatIf) {
    Write-Host "DRY RUN MODE - No files will be deleted`n" -ForegroundColor Yellow
}

function Safe-Remove {
    param($Path, $Description)
    
    $items = Get-ChildItem -Path $Path -ErrorAction SilentlyContinue
    if ($items) {
        Write-Host "$Description" -ForegroundColor Yellow
        foreach ($item in $items) {
            Write-Host "  - $($item.FullName)" -ForegroundColor Gray
        }
        
        if (-not $WhatIf) {
            Remove-Item -Path $Path -Force -ErrorAction SilentlyContinue
            Write-Host "  ✓ Removed`n" -ForegroundColor Green
        }
    }
}

Write-Host "Scanning for cache files...`n" -ForegroundColor Cyan

Safe-Remove ".\**\__pycache__" "[1] Python cache directories"
Safe-Remove ".\**\*.pyc" "[2] Compiled Python files"
Safe-Remove ".\.pytest_cache" "[3] Pytest cache"
Safe-Remove ".\htmlcov" "[4] Coverage reports"
Safe-Remove ".\.coverage" "[5] Coverage data"
Safe-Remove ".\**\.DS_Store" "[6] macOS cache"
Safe-Remove ".\**\Thumbs.db" "[7] Windows cache"

$logs = Get-ChildItem -Path "backend" -Include *.log -Recurse -Force -ErrorAction SilentlyContinue
if ($logs -and -not $WhatIf) {
    Write-Host "[8] Django log files" -ForegroundColor Yellow
    foreach ($log in $logs) {
        Write-Host "  - $($log.FullName)" -ForegroundColor Gray
    }
    
    $confirm = Read-Host "Delete log files? (y/N)"
    if ($confirm -eq 'y') {
        $logs | Remove-Item -Force
        Write-Host "  ✓ Removed`n" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Skipped`n" -ForegroundColor Yellow
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PROTECTED FILES (never deleted):" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ .env, firebase-creds.json, best.pt" -ForegroundColor Green
Write-Host "✓ Source code, database, media files`n" -ForegroundColor Green

if ($WhatIf) {
    Write-Host "DRY RUN - No files deleted" -ForegroundColor Yellow
    Write-Host "Run: .\cleanup.ps1 (without -WhatIf)`n" -ForegroundColor Yellow
} else {
    Write-Host "Cleanup complete! ✓`n" -ForegroundColor Green
}
