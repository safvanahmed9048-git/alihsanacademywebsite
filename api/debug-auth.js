const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const apiPath = path.join(process.cwd(), 'api');
    let apiFiles = [];
    try {
        apiFiles = fs.readdirSync(apiPath);
    } catch (fsErr) {
        apiFiles = ["Error: " + fsErr.message];
    }

    function robustFormatKey(key) {
        if (!key) return null;
        let cleaned = key.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
        const beginMarker = '-----BEGIN PRIVATE KEY-----';
        const endMarker = '-----END PRIVATE KEY-----';
        let base64 = cleaned;
        if (cleaned.includes('BEGIN') && cleaned.includes('END')) {
            base64 = cleaned.split(/-----BEGIN[^-]+-----/)[1].split(/-----END[^-]+-----/)[0];
        }
        base64 = base64.replace(/\s/g, '');
        if (!base64) return null;
        const lines = base64.match(/.{1,64}/g) || [];
        return `${beginMarker}\n${lines.join('\n')}\n${endMarker}`;
    }

    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = robustFormatKey(process.env.GOOGLE_PRIVATE_KEY);

    try {
        if (!SPREADSHEET_ID || !privateKey || !clientEmail) {
            return res.status(200).json({ error: "Missing Config", apiFiles });
        }

        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: clientEmail, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const RANGE = 'Admissions!A:B'; // Tiny read test
        
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
        
        res.status(200).json({
            timestamp: new Date().toISOString(),
            status: "Healthy",
            apiFiles,
            rowCount: (response.data.values || []).length
        });

    } catch (err) {
        res.status(500).json({ status: "Error", message: err.message, apiFiles });
    }
};
