// googleSheets.js
const { google } = require("googleapis");
const keys = require("./zillow-lead-scraper-6e03a227f6df.json"); //replace with your service account key

const auth = new google.auth.JWT(keys.client_email, null, keys.private_key, [
	"https://www.googleapis.com/auth/spreadsheets",
]);

const sheets = google.sheets({ version: "v4", auth });

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
