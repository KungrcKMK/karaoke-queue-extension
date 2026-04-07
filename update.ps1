# ============================================================
#  KungRC Karaoke Queue — OTA Updater
#  วางไฟล์นี้ไว้นอกโฟลเดอร์ extension (ระดับเดียวกับโฟลเดอร์)
# ============================================================

$VERSION_URL  = "https://raw.githubusercontent.com/KungrcKMK/karaoke-queue-extension/main/version.json"
$EXT_FOLDER   = Join-Path $PSScriptRoot "KungRC_Karaoke_Queue"
$TMP_ZIP      = Join-Path $env:TEMP "kungrc_update.zip"
$TMP_EXTRACT  = Join-Path $env:TEMP "kungrc_update_extracted"

# ── ฟังก์ชัน UI ──────────────────────────────────────────────
function Write-Header {
    Clear-Host
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "   KungRC Karaoke Queue — OTA Updater" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step($msg) {
    Write-Host "  >> $msg" -ForegroundColor Yellow
}

function Write-OK($msg) {
    Write-Host "  OK  $msg" -ForegroundColor Green
}

function Write-Err($msg) {
    Write-Host " ERR  $msg" -ForegroundColor Red
}

# ── 1. ตรวจเวอร์ชัน ──────────────────────────────────────────
Write-Header
Write-Step "กำลังตรวจสอบเวอร์ชันล่าสุด..."

try {
    $remote = Invoke-RestMethod -Uri $VERSION_URL -UseBasicParsing
} catch {
    Write-Err "เชื่อมต่อ GitHub ไม่ได้: $_"
    Read-Host "กด Enter เพื่อปิด"
    exit 1
}

# อ่านเวอร์ชันปัจจุบันจาก manifest.json
$manifestPath = Join-Path $EXT_FOLDER "manifest.json"
$manifest     = Get-Content $manifestPath -Raw | ConvertFrom-Json
$currentVer   = $manifest.version
$latestVer    = $remote.version

Write-Host ""
Write-Host "  เวอร์ชันปัจจุบัน : $currentVer" -ForegroundColor Gray
Write-Host "  เวอร์ชันล่าสุด   : $latestVer" -ForegroundColor White
Write-Host ""

# เปรียบเทียบเวอร์ชัน
function Compare-Version($a, $b) {
    $pa = $a -split '\.' | ForEach-Object { [int]$_ }
    $pb = $b -split '\.' | ForEach-Object { [int]$_ }
    for ($i = 0; $i -lt 3; $i++) {
        $x = if ($i -lt $pa.Count) { $pa[$i] } else { 0 }
        $y = if ($i -lt $pb.Count) { $pb[$i] } else { 0 }
        if ($x -gt $y) { return 1 }
        if ($x -lt $y) { return -1 }
    }
    return 0
}

if ((Compare-Version $latestVer $currentVer) -le 0) {
    Write-OK "ใช้เวอร์ชันล่าสุดอยู่แล้ว ไม่จำเป็นต้องอัปเดต"
    Read-Host "กด Enter เพื่อปิด"
    exit 0
}

Write-Host "  มีเวอร์ชันใหม่! $($remote.notes)" -ForegroundColor Cyan
Write-Host ""
$confirm = Read-Host "  อัปเดตเป็น v$latestVer เลยมั้ย? (Y/N)"
if ($confirm -notmatch '^[Yy]') {
    Write-Host "  ยกเลิก" -ForegroundColor Gray
    exit 0
}

# ── 2. ดาวน์โหลด ─────────────────────────────────────────────
Write-Host ""
Write-Step "กำลังดาวน์โหลด v$latestVer ..."

try {
    Invoke-WebRequest -Uri $remote.downloadUrl -OutFile $TMP_ZIP -UseBasicParsing
    Write-OK "ดาวน์โหลดสำเร็จ"
} catch {
    Write-Err "ดาวน์โหลดไม่ได้: $_"
    Read-Host "กด Enter เพื่อปิด"
    exit 1
}

# ── 3. แตกไฟล์ ───────────────────────────────────────────────
Write-Step "กำลังแตกไฟล์..."

if (Test-Path $TMP_EXTRACT) { Remove-Item $TMP_EXTRACT -Recurse -Force }
Expand-Archive -Path $TMP_ZIP -DestinationPath $TMP_EXTRACT -Force

# หา subfolder ข้างใน zip (ถ้ามี)
$inner = Get-ChildItem $TMP_EXTRACT -Directory | Select-Object -First 1
$srcFolder = if ($inner) { $inner.FullName } else { $TMP_EXTRACT }

Write-OK "แตกไฟล์สำเร็จ"

# ── 4. ปิด Chrome ────────────────────────────────────────────
Write-Step "กำลังปิด Chrome..."

$chromeProcs = Get-Process -Name "chrome" -ErrorAction SilentlyContinue
if ($chromeProcs) {
    $chromeProcs | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-OK "ปิด Chrome แล้ว"
} else {
    Write-OK "Chrome ไม่ได้เปิดอยู่"
}

# ── 5. คัดลอกไฟล์ใหม่ ────────────────────────────────────────
Write-Step "กำลังอัปเดตไฟล์ extension..."

# สำรองไว้ก่อน
$backupFolder = Join-Path $PSScriptRoot "KungRC_backup_$currentVer"
if (Test-Path $EXT_FOLDER) {
    Copy-Item $EXT_FOLDER $backupFolder -Recurse -Force
}

# คัดลอกไฟล์ใหม่ทับ
Copy-Item "$srcFolder\*" $EXT_FOLDER -Recurse -Force
Write-OK "อัปเดตไฟล์สำเร็จ (สำรองไว้ที่: KungRC_backup_$currentVer)"

# ── 6. เปิด Chrome ───────────────────────────────────────────
Write-Step "กำลังเปิด Chrome..."

$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$chromeExe = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chromeExe) {
    Start-Process $chromeExe "https://www.youtube.com"
    Write-OK "เปิด Chrome แล้ว — extension โหลดเวอร์ชันใหม่อัตโนมัติ"
} else {
    Write-Err "หา chrome.exe ไม่เจอ กรุณาเปิด Chrome เอง"
}

# ── 7. ล้างไฟล์ชั่วคราว ──────────────────────────────────────
Remove-Item $TMP_ZIP -Force -ErrorAction SilentlyContinue
Remove-Item $TMP_EXTRACT -Recurse -Force -ErrorAction SilentlyContinue

# ── เสร็จ ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "   อัปเดตเสร็จสมบูรณ์! v$currentVer → v$latestVer" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Read-Host "กด Enter เพื่อปิด"
