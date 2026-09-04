Add-Type -AssemblyName System.Drawing

$sourcePath = "d:\v2 BMS OFFICIAL\bms_logo_official.png"
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source logo file not found at $sourcePath"
    exit 1
}

$srcBitmap = [System.Drawing.Bitmap]::FromFile($sourcePath)

function Resize-Image {
    param (
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height,
        [string]$outputPath,
        [bool]$isJpeg = $false
    )

    $targetBitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($targetBitmap)

    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($source, 0, 0, $width, $height)

    if ($isJpeg) {
        $jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 100L)
        $targetBitmap.Save($outputPath, $jpegEncoder, $encoderParams)
    } else {
        $targetBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }

    $graphics.Dispose()
    $targetBitmap.Dispose()
    Write-Host "Generated: $outputPath ($width x $height)"
}

function Create-SplashScreen {
    param (
        [System.Drawing.Bitmap]$source,
        [int]$screenWidth,
        [int]$screenHeight,
        [string]$outputPath,
        [string]$bgColorHex = "#0b141a"
    )

    $splashBitmap = New-Object System.Drawing.Bitmap($screenWidth, $screenHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($splashBitmap)

    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $bgColor = [System.Drawing.ColorTranslator]::FromHtml($bgColorHex)
    $graphics.Clear($bgColor)

    # Calculate logo scale (taking up ~35% of min screen dimension)
    $minDim = [Math]::Min($screenWidth, $screenHeight)
    $logoSize = [int]($minDim * 0.35)
    if ($logoSize -lt 128) { $logoSize = 128 }

    $x = [int](($screenWidth - $logoSize) / 2)
    $y = [int](($screenHeight - $logoSize) / 2)

    $graphics.DrawImage($source, $x, $y, $logoSize, $logoSize)

    $splashBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $splashBitmap.Dispose()
    Write-Host "Generated Splash Screen: $outputPath ($screenWidth x $screenHeight)"
}

# 1. Master & High-Res Logos
$masterFiles = @(
    "d:\v2 BMS OFFICIAL\bmtzofficiallogo.png",
    "d:\v2 BMS OFFICIAL\bmstzlogo.png",
    "d:\v2 BMS OFFICIAL\bg_logo.png",
    "d:\v2 BMS OFFICIAL\public\bmtzofficiallogo.png",
    "d:\v2 BMS OFFICIAL\public\bmstzlogo.png",
    "d:\v2 BMS OFFICIAL\public\bg_logo.png",
    "d:\v2 BMS OFFICIAL\public\logo.png"
)

foreach ($file in $masterFiles) {
    Resize-Image -source $srcBitmap -width 1024 -height 1024 -outputPath $file
}

Resize-Image -source $srcBitmap -width 1024 -height 1024 -outputPath "d:\v2 BMS OFFICIAL\logo.jpg" -isJpeg $true
Resize-Image -source $srcBitmap -width 1024 -height 1024 -outputPath "d:\v2 BMS OFFICIAL\public\logo.jpg" -isJpeg $true
Resize-Image -source $srcBitmap -width 512 -height 512 -outputPath "d:\v2 BMS OFFICIAL\badge.png"

# 2. Browser Icons & Favicons
$iconSizes = @(
    @{ w=16; h=16; name="favicon-16x16.png" },
    @{ w=32; h=32; name="favicon-32x32.png" },
    @{ w=48; h=48; name="icon-48x48.png" },
    @{ w=64; h=64; name="icon-64x64.png" },
    @{ w=96; h=96; name="icon-96x96.png" },
    @{ w=128; h=128; name="icon-128x128.png" },
    @{ w=144; h=144; name="icon-144x144.png" },
    @{ w=152; h=152; name="apple-touch-icon-152x152.png" },
    @{ w=180; h=180; name="apple-touch-icon.png" },
    @{ w=192; h=192; name="icon-192x192.png" },
    @{ w=384; h=384; name="icon-384x384.png" },
    @{ w=512; h=512; name="icon-512x512.png" }
)

foreach ($icon in $iconSizes) {
    $outPath = Join-Path "d:\v2 BMS OFFICIAL\public" $icon.name
    Resize-Image -source $srcBitmap -width $icon.w -height $icon.h -outputPath $outPath
}

# Create favicon.ico (32x32 crisp icon format)
$favPath = "d:\v2 BMS OFFICIAL\public\favicon.ico"
Resize-Image -source $srcBitmap -width 32 -height 32 -outputPath $favPath

# 3. Splash Screens
$splashSizes = @(
    @{ w=1024; h=1024; name="splash-screen.png" },
    @{ w=640;  h=1136; name="apple-splash-640x1136.png" },
    @{ w=750;  h=1334; name="apple-splash-750x1334.png" },
    @{ w=828;  h=1792; name="apple-splash-828x1792.png" },
    @{ w=1125; h=2436; name="apple-splash-1125x2436.png" },
    @{ w=1242; h=2688; name="apple-splash-1242x2688.png" },
    @{ w=1170; h=2532; name="apple-splash-1170x2532.png" },
    @{ w=1284; h=2778; name="apple-splash-1284x2778.png" },
    @{ w=1290; h=2796; name="apple-splash-1290x2796.png" },
    @{ w=1536; h=2048; name="apple-splash-1536x2048.png" },
    @{ w=1668; h=2388; name="apple-splash-1668x2388.png" },
    @{ w=2048; h=2732; name="apple-splash-2048x2732.png" }
)

foreach ($splash in $splashSizes) {
    $outPath = Join-Path "d:\v2 BMS OFFICIAL\public" $splash.name
    Create-SplashScreen -source $srcBitmap -screenWidth $splash.w -screenHeight $splash.h -outputPath $outPath
}

$srcBitmap.Dispose()

# 4. Base64 Sync for iOS MobileConfig and logoBase64.js
$badgeBytes = [System.IO.File]::ReadAllBytes("d:\v2 BMS OFFICIAL\badge.png")
$base64Str = [Convert]::ToBase64String($badgeBytes)

# Update js/logoBase64.js
$logoJsPath = "d:\v2 BMS OFFICIAL\js\logoBase64.js"
"export const iconBase64 = `"$base64Str`";`n" | Set-Content -Path $logoJsPath -Encoding UTF8
Write-Host "Updated $logoJsPath"

# Update public/bmstz.mobileconfig
$mobileConfigPath = "d:\v2 BMS OFFICIAL\public\bmstz.mobileconfig"
$xmlContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>FullScreen</key>
			<true/>
			<key>Icon</key>
			<data>
$base64Str
			</data>
			<key>IsRemovable</key>
			<true/>
			<key>Label</key>
			<string>BMSTz</string>
			<key>PayloadDescription</key>
			<string>BMSTz Business Management System Web App</string>
			<key>PayloadDisplayName</key>
			<string>BMSTz Web Clip</string>
			<key>PayloadIdentifier</key>
			<string>com.bmstz.app.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>a3c9e4b1-8d2f-4e9b-9c7a-1f8d9e0b2c3d</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>Precomposed</key>
			<true/>
			<key>URL</key>
			<string>https://bmstz.vercel.app/app/</string>
		</dict>
	</array>
	<key>PayloadDisplayName</key>
	<string>BMSTz Web App</string>
	<key>PayloadIdentifier</key>
	<string>com.bmstz.app.profile</string>
	<key>PayloadOrganization</key>
	<string>BMSTz</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>b4d0f5c2-9e3a-5f0c-ad8b-2e9ea1c3d4e5</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>
"@
Set-Content -Path $mobileConfigPath -Value $xmlContent -Encoding UTF8
Write-Host "Updated $mobileConfigPath"

Write-Host "All assets successfully generated and synced with crisp quality!"
