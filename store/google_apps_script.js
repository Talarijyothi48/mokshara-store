// ============================================================
// MOKSHSHARA STORE — Google Apps Script
// 
// This script receives data from your Mokshara store and
// writes it to this Google Sheet automatically.
//
// SETUP INSTRUCTIONS:
// 1. Open Google Sheets → Create a new spreadsheet
// 2. Name it "Mokshara Store Database"
// 3. Rename the first sheet tab to: Users
// 4. Add a second sheet tab named: Transactions
// 5. In the "Users" sheet, add these headers in Row 1:
//    A1: Date  |  B1: Name  |  C1: Email  |  D1: Provider
// 6. In the "Transactions" sheet, add these headers in Row 1:
//    A1: Date  |  B1: User Email  |  C1: User Name  |  D1: Books Purchased
//    E1: Amount (₹)  |  F1: Payment Method  |  G1: Ref/UTR Number  |  H1: Status
// 7. Go to Extensions → Apps Script
// 8. Delete any existing code and paste ALL of this code
// 9. Click "Deploy" → "New deployment"
// 10. Choose type: "Web app"
// 11. Set "Execute as": Me (your email)
// 12. Set "Who has access": Anyone
// 13. Click "Deploy" → Authorize when prompted
// 14. Copy the Web app URL
// 15. Paste it into your index.html where it says:
//     const GOOGLE_SHEETS_URL = 'PASTE_URL_HERE';
// ============================================================

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data;
    
    // Parse the incoming data
    try {
      data = JSON.parse(e.postData.contents);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Invalid JSON data'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var timestamp = data.timestamp || new Date().toISOString();
    var dateStr = new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    if (data.type === 'user_signup') {
      // ── Write to Users sheet ──────────────────────────
      var usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) {
        usersSheet = ss.insertSheet('Users');
        usersSheet.appendRow(['Date', 'Name', 'Email', 'Provider']);
        // Style header row
        usersSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#4a90d9').setFontColor('#ffffff');
      }
      
      usersSheet.appendRow([
        dateStr,
        data.name || '',
        data.email || '',
        data.provider || 'email'
      ]);
      
    } else if (data.type === 'transaction') {
      // ── Write to Transactions sheet ───────────────────
      var txSheet = ss.getSheetByName('Transactions');
      if (!txSheet) {
        txSheet = ss.insertSheet('Transactions');
        txSheet.appendRow(['Date', 'User Email', 'User Name', 'Books Purchased', 'Amount (₹)', 'Payment Method', 'Ref/UTR Number', 'Status']);
        txSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#2ecc71').setFontColor('#ffffff');
      }
      
      var amount = data.totalAmount || 0;
      
      txSheet.appendRow([
        dateStr,
        data.userEmail || '',
        data.userName || '',
        data.books || '',
        amount === 0 ? 'FREE' : amount,
        data.paymentMethod || '',
        data.paymentId || '',
        data.status || 'completed'
      ]);
      
      // ── Update Revenue Summary ────────────────────────
      _updateRevenueSummary(ss);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Auto-creates a Revenue Summary section at the top of the Transactions sheet
function _updateRevenueSummary(ss) {
  var txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) return;
  
  var lastRow = txSheet.getLastRow();
  if (lastRow < 2) return;
  
  // Check if Summary sheet exists, create if not
  var summarySheet = ss.getSheetByName('Summary');
  if (!summarySheet) {
    summarySheet = ss.insertSheet('Summary');
    summarySheet.appendRow(['Mokshara Store — Revenue Summary']);
    summarySheet.appendRow(['']);
    summarySheet.appendRow(['Metric', 'Value']);
    summarySheet.appendRow(['Total Registered Users', '=COUNTA(Users!C:C)-1']);
    summarySheet.appendRow(['Total Transactions', '=COUNTA(Transactions!B:B)-1']);
    summarySheet.appendRow(['Total Revenue (₹)', '=SUMPRODUCT((Transactions!E2:E<>"FREE")*(Transactions!E2:E))']);
    summarySheet.appendRow(['Free Downloads', '=COUNTIF(Transactions!E:E,"FREE")']);
    summarySheet.appendRow(['QR/UPI Payments', '=COUNTIF(Transactions!F:F,"phonepe_qr")']);
    summarySheet.appendRow(['Bank Transfers', '=COUNTIF(Transactions!F:F,"bank_transfer")']);
    summarySheet.appendRow(['Last Updated', '=NOW()']);
    
    // Style
    summarySheet.getRange(1, 1, 1, 2).setFontWeight('bold').setFontSize(14).setBackground('#8e44ad').setFontColor('#ffffff');
    summarySheet.getRange(3, 1, 1, 2).setFontWeight('bold').setBackground('#ecf0f1');
    summarySheet.setColumnWidth(1, 200);
    summarySheet.setColumnWidth(2, 200);
  }
}

// Test function — run this manually to verify the script works
function testSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('✅ Spreadsheet name: ' + ss.getName());
  Logger.log('✅ Sheets: ' + ss.getSheets().map(s => s.getName()).join(', '));
  Logger.log('✅ Script is ready! Deploy as Web App to get the URL.');
}

// Handle GET requests (for testing the URL in browser)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Mokshara Store Database API is running! Use POST to send data.',
    sheets: SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function(s) { return s.getName(); })
  })).setMimeType(ContentService.MimeType.JSON);
}
