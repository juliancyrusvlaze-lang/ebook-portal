$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$desktopDir = Join-Path $root "desktop"
if (-not (Test-Path $desktopDir)) {
    New-Item -ItemType Directory -Path $desktopDir | Out-Null
}

# 1. Generate Custom Blue Book Icon (desktop/app.ico)
Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background rounded square (Deep Navy #071942)
$navyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 7, 25, 66))
$cobaltBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 56, 168))
$skyPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 56, 189, 248), 8)
$whitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 10)
$icePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 147, 197, 253), 10)
$skyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 56, 189, 248))

$g.FillRectangle($navyBrush, 16, 16, 224, 224)
$g.DrawRectangle($skyPen, 24, 24, 208, 208)

# Inner Cobalt Book Panel
$g.FillRectangle($cobaltBrush, 44, 44, 168, 168)

# Open Book Pages
$g.DrawRectangle($whitePen, 64, 74, 60, 104)
$g.DrawRectangle($icePen, 128, 74, 64, 104)

# Book Base Line & Top Diamond Accent
$g.DrawLine($skyPen, 52, 192, 204, 192)
$g.FillEllipse($skyBrush, 118, 48, 20, 20)

$g.Dispose()

# Write valid ICO with embedded 256x256 PNG
$icoPath = Join-Path $desktopDir "app.ico"
$msPng = New-Object System.IO.MemoryStream
$bmp.Save($msPng, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $msPng.ToArray()
$msPng.Dispose()
$bmp.Dispose()

$fsIco = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fsIco)
# ICONDIR Header
$bw.Write([uint16]0)   # Reserved
$bw.Write([uint16]1)   # Type: 1 = Icon
$bw.Write([uint16]1)   # Count: 1 image
# ICONDIRENTRY
$bw.Write([byte]0)     # Width: 0 means 256
$bw.Write([byte]0)     # Height: 0 means 256
$bw.Write([byte]0)     # ColorCount
$bw.Write([byte]0)     # Reserved
$bw.Write([uint16]1)   # Planes
$bw.Write([uint16]32)  # BitCount
$bw.Write([uint32]$pngBytes.Length) # BytesInRes
$bw.Write([uint32]22)  # ImageOffset (6 + 16)
$bw.Write($pngBytes)
$bw.Flush()
$bw.Close()
$fsIco.Close()

# 2. Compile SintAklat-sanayan.exe using csc.exe
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$outExe = Join-Path $root "SintAklat-sanayan.exe"
$csFile = Join-Path $desktopDir "Program.cs"

$argsList = @(
    "/target:winexe",
    "/optimize+",
    "/out:$outExe",
    "/win32icon:$icoPath",
    "/resource:`"$(Join-Path $root 'index.html')`",index.html",
    "/resource:`"$(Join-Path $root 'css\style.css')`",style.css",
    "/resource:`"$(Join-Path $root 'js\app.js')`",app.js",
    "/resource:`"$(Join-Path $root 'js\modules_data.js')`",modules_data.js",
    "`"$csFile`""
)

& $csc $argsList

if ($LASTEXITCODE -eq 0 -and (Test-Path $outExe)) {
    $sizeKB = [math]::Round((Get-Item $outExe).Length / 1KB, 1)
    Write-Host "Successfully built SintAklat-sanayan.exe ($sizeKB KB)" -ForegroundColor Green
} else {
    throw "Failed to compile SintAklat-sanayan.exe"
}
