Add-Type -AssemblyName System.Drawing

$inputPath = "C:/Users/luisg/.gemini/antigravity/brain/392bc0b5-d4a5-45e4-bf6d-ab3c2ee91e41/.user_uploaded/media_1794341436117_188ebb3b.jpg"
$src = [System.Drawing.Bitmap]::FromFile($inputPath)

if (!(Test-Path "build")) { New-Item -ItemType Directory -Path "build" }
if (!(Test-Path "src/assets")) { New-Item -ItemType Directory -Path "src/assets" }

# 1. Full resolution PNG
$src.Save("public/trankilandia-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$src.Save("src/assets/trankilandia-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 2. Resized 256x256 PNG for Icon
$bmp256 = New-Object System.Drawing.Bitmap 256, 256
$g256 = [System.Drawing.Graphics]::FromImage($bmp256)
$g256.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g256.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g256.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g256.DrawImage($src, 0, 0, 256, 256)
$bmp256.Save("build/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp256.Save("public/favicon-256.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 3. Resized 64x64 PNG for favicon
$bmp64 = New-Object System.Drawing.Bitmap 64, 64
$g64 = [System.Drawing.Graphics]::FromImage($bmp64)
$g64.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g64.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g64.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g64.DrawImage($src, 0, 0, 64, 64)
$bmp64.Save("public/favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 4. Save ICO using System.Drawing.Icon
$hIcon = $bmp256.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream "build/icon.ico", ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

$fsFav = New-Object System.IO.FileStream "public/favicon.ico", ([System.IO.FileMode]::Create)
$icon.Save($fsFav)
$fsFav.Close()

$src.Dispose()
$bmp256.Dispose()
$bmp64.Dispose()
Write-Output "Assets generated successfully"
