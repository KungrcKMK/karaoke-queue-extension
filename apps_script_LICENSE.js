// ============================================================
// KungRC Karaoke Queue — License Verification Backend
// วางโค้ดนี้ใน Google Apps Script แล้ว Deploy as Web App
// Execute as: Me | Who has access: Anyone
// ============================================================

const SHEET_ID = "1eNFiyu7X5ff0f7TBrAKjffWbzqofG35PnBUG9fT3M5g";

function doGet(e) {
  try {
    const key     = (e.parameter.key     || "").trim();
    const machine = (e.parameter.machine || "").trim();

    if (!key || !machine)
      return json({ valid: false, reason: "Missing parameters" });

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    const data  = sheet.getDataRange().getValues();
    if (data.length < 2)
      return json({ valid: false, reason: "Sheet ว่าง" });

    // Headers (row 0)
    const h = data[0].map(v => String(v).toLowerCase().trim());
    const iKey     = h.indexOf("key");
    const iExpiry  = h.indexOf("expiry");
    const iActive  = h.indexOf("active");
    const iMachine = h.indexOf("machineid");

    if (iKey === -1)
      return json({ valid: false, reason: "ไม่พบคอลัมน์ key" });

    // หา row ที่ key ตรง
    let ri = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][iKey]).trim().toLowerCase() === key.toLowerCase()) {
        ri = i; break;
      }
    }
    if (ri === -1)
      return json({ valid: false, reason: "ไม่พบ License Key" });

    const row = data[ri];

    // ตรวจ active
    const act = String(row[iActive] || "").toLowerCase().trim();
    if (!["yes","true","1","active"].includes(act))
      return json({ valid: false, reason: "License Key ถูกระงับ" });

    // ตรวจ expiry
    const exp = String(row[iExpiry] || "").trim();
    if (exp && exp !== "unlimited" && exp !== "-" && exp !== "") {
      const d = new Date(exp);
      if (!isNaN(d) && d < new Date())
        return json({ valid: false, reason: "License หมดอายุ (" + exp + ")" });
    }

    // ตรวจ machineId
    if (iMachine === -1)
      return json({ valid: true, expiry: exp }); // ไม่มีคอลัมน์ machineId → ผ่าน

    const bound = String(row[iMachine] || "").trim();

    if (!bound) {
      // ยังไม่ bind → bind เครื่องนี้
      sheet.getRange(ri + 1, iMachine + 1).setValue(machine);
      return json({ valid: true, expiry: exp, bound: true });
    }

    if (bound.toLowerCase() === machine.toLowerCase())
      return json({ valid: true, expiry: exp });

    // bind เครื่องอื่นแล้ว
    return json({ valid: false, reason: "License Key ถูกใช้บนเครื่องอื่นแล้ว" });

  } catch(err) {
    return json({ valid: false, reason: "Server error: " + err.message });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// เมนูใน Google Sheet
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🔑 License")
    .addItem("สร้าง Key ใหม่", "createNewKey")
    .addItem("ระงับ Key ที่เลือก", "revokeSelectedKey")
    .addItem("ปลดล็อกเครื่อง (ล้าง machineId)", "resetMachineId")
    .addToUi();
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
}

function getHeaders() {
  const sheet = getSheet();
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(v => String(v).toLowerCase().trim());
}

// สร้าง Key ใหม่
function createNewKey() {
  const ui = SpreadsheetApp.getUi();

  const nameRes = ui.prompt("สร้าง License Key ใหม่", "ชื่อลูกค้า (ใส่ในช่อง note):", ui.ButtonSet.OK_CANCEL);
  if (nameRes.getSelectedButton() !== ui.Button.OK) return;
  const note = nameRes.getResponseText().trim();

  const expRes = ui.prompt("วันหมดอายุ", "รูปแบบ: YYYY-MM-DD\nหรือพิมพ์ unlimited:", ui.ButtonSet.OK_CANCEL);
  if (expRes.getSelectedButton() !== ui.Button.OK) return;
  const expiry = expRes.getResponseText().trim() || "unlimited";

  const key = generateUUID();
  const sheet = getSheet();
  const headers = getHeaders();

  const iKey     = headers.indexOf("key");
  const iExpiry  = headers.indexOf("expiry");
  const iActive  = headers.indexOf("active");
  const iMachine = headers.indexOf("machineid");
  const iNote    = headers.indexOf("note");

  const lastRow = sheet.getLastRow() + 1;
  if (iKey     >= 0) sheet.getRange(lastRow, iKey     + 1).setValue(key);
  if (iExpiry  >= 0) sheet.getRange(lastRow, iExpiry  + 1).setValue(expiry);
  if (iActive  >= 0) sheet.getRange(lastRow, iActive  + 1).setValue("yes");
  if (iMachine >= 0) sheet.getRange(lastRow, iMachine + 1).setValue("");
  if (iNote    >= 0) sheet.getRange(lastRow, iNote    + 1).setValue(note);

  ui.alert("✅ สร้าง Key สำเร็จ!\n\n" + key + "\n\nคัดลอกส่งให้ลูกค้าได้เลย");
}

// ระงับ Key ที่เลือก (เปลี่ยน active → no)
function revokeSelectedKey() {
  const ui = SpreadsheetApp.getUi();
  const sheet = getSheet();
  const row = sheet.getActiveCell().getRow();
  if (row <= 1) { ui.alert("กรุณาคลิกที่ row ของ Key ที่ต้องการระงับก่อน"); return; }

  const headers = getHeaders();
  const iActive = headers.indexOf("active");
  const iKey    = headers.indexOf("key");
  if (iActive < 0) { ui.alert("ไม่พบคอลัมน์ active"); return; }

  const key = sheet.getRange(row, iKey + 1).getValue();
  const confirm = ui.alert("ระงับ Key นี้?", key, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  sheet.getRange(row, iActive + 1).setValue("no");
  ui.alert("ระงับ Key แล้ว");
}

// ปลดล็อกเครื่อง — ล้าง machineId ให้ Key นั้น
function resetMachineId() {
  const ui = SpreadsheetApp.getUi();
  const sheet = getSheet();
  const row = sheet.getActiveCell().getRow();
  if (row <= 1) { ui.alert("กรุณาคลิกที่ row ของ Key ที่ต้องการปลดล็อกก่อน"); return; }

  const headers = getHeaders();
  const iMachine = headers.indexOf("machineid");
  const iKey     = headers.indexOf("key");
  if (iMachine < 0) { ui.alert("ไม่พบคอลัมน์ machineId"); return; }

  const key = sheet.getRange(row, iKey + 1).getValue();
  const confirm = ui.alert("ปลดล็อกเครื่องสำหรับ Key นี้?", key + "\n\nลูกค้าจะสามารถใช้บนเครื่องใหม่ได้", ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  sheet.getRange(row, iMachine + 1).setValue("");
  ui.alert("ปลดล็อกแล้ว ลูกค้าสามารถ activate บนเครื่องใหม่ได้");
}
