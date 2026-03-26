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
        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: clientEmail, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        let readTest = { status: "Not Run" };
        let writeTest = { status: "Not Run" };

        try {
            const response = await sheets.spreadsheets.values.get({ 
                spreadsheetId: SPREADSHEET_ID, 
                range: 'Admissions!A1:B1' 
            });
            readTest = { status: "Success", rowCount: (response.data.values || []).length };
        } catch (e) { readTest = { status: "Error", message: e.message }; }

        if (action === 'write_test') {
            try {
                const row = ["DIAGNOSTIC", "Deep Test", "N/A", "N/A", "N/A", "deep@diag.com", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "DEEP_" + Date.now(), new Date().toISOString()];
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: 'Admissions!A:N',
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [row] }
                });
                writeTest = { status: "Success" };
            } catch (e) { writeTest = { status: "Error", message: e.message }; }
        }

        res.status(200).json({
            diagTime: new Date().toISOString(),
            status: (readTest.status === "Success" && (action !== 'write_test' || writeTest.status === "Success")) ? "OK" : "ERROR",
            readTest,
            writeTest
        });
    } catch (err) {
        res.status(500).json({ status: "Fatal", message: err.message });
    }
};
