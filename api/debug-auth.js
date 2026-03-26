const { google } = require('googleapis');

function robustFormatKey(key) {
    if (!key) return null;
    let cleaned = key.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
    let base64 = cleaned;
    if (cleaned.includes('BEGIN') && cleaned.includes('END')) {
        const parts = cleaned.split(/-----BEGIN[^-]+-----/);
        if (parts.length > 1) {
            const inner = parts[1].split(/-----END[^-]+-----/);
            if (inner.length > 0) base64 = inner[0];
        }
    }
    base64 = base64.replace(/\s/g, '');
    if (!base64) return null;
    const beginMarker = '-----BEGIN PRIVATE KEY-----';
    const endMarker = '-----END PRIVATE KEY-----';
    const lines = base64.match(/.{1,64}/g) || [];
    return `${beginMarker}\n${lines.join('\n')}\n${endMarker}`;
}

module.exports = async function handler(req, res) {
    const { action } = req.query;
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
    const privateKey = robustFormatKey(privateKeyRaw);

    try {
        if (!SPREADSHEET_ID || !privateKey || !clientEmail) {
            return res.status(200).json({ status: "Error", message: "API Configuration Missing" });
        }

        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: clientEmail, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        let readResult = null;
        let writeResult = null;

        // 1. Read Test
        try {
            const response = await sheets.spreadsheets.values.get({ 
                spreadsheetId: SPREADSHEET_ID, 
                range: 'Admissions!A1:B2' 
            });
            readResult = { status: "Success", rowCount: (response.data.values || []).length };
        } catch (readErr) {
            readResult = { status: "Error", message: readErr.message };
        }

        // 2. Write Test (Optional via trigger)
        if (action === 'write_test') {
            try {
                const testRow = ["DIAGNOSTIC", "Health Check", "N/A", "N/A", "N/A", "test@diag.com", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "DIAG_" + Date.now(), new Date().toISOString()];
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: 'Admissions!A:N',
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [testRow] }
                });
                writeResult = { status: "Success", message: "Diagnostic Row Appended" };
            } catch (writeErr) {
                writeResult = { status: "Error", message: writeErr.message };
            }
        }

        res.status(200).json({
            timestamp: new Date().toISOString(),
            systemStatus: (readResult.status === "Success" && (action !== 'write_test' || writeResult.status === "Success")) ? "Healthy" : "Degraded",
            config: {
                clientEmail: clientEmail,
                spreadsheetId: SPREADSHEET_ID.slice(0, 5) + "..." + SPREADSHEET_ID.slice(-5)
            },
            readTest: readResult,
            writeTest: writeResult || "Use ?action=write_test to trigger"
        });

    } catch (err) {
        res.status(500).json({ status: "Panic", message: err.message });
    }
};
