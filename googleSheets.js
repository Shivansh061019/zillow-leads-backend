// googleSheets.js
const { google } = require('googleapis');
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

// Then your normal appendLeadsToSheet() function below...


// Replace with your own Google Sheet ID
const SPREADSHEET_ID = "1zRvzQROqa9b1-IcXLLGmPAlzWwMPLGTwtx3TblV3-Bk";

async function appendLeadsToSheet(rows) {
	try {
		const resource = {
			values: rows,
		};

		await sheets.spreadsheets.values.append({
			spreadsheetId: SPREADSHEET_ID,
			range: "Sheet1!A1",
			valueInputOption: "RAW",
			resource,
		});

		console.log("✅ Leads pushed to Google Sheet.");
	} catch (err) {
		console.error("❌ Failed to push to Google Sheet:", err.message);
	}
}

module.exports = appendLeadsToSheet;
