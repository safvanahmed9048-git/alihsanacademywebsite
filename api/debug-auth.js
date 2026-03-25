const { google } = require('googleapis');

export default async function handler(req, res) {
    // Allowed both GET and POST for easier debugging

    function robustFormatKey(key) {
        if (!key) return null;
        if (key.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(key);
                if (parsed.private_key) return robustFormatKey(parsed.private_key);
            } catch (e) {}
        }
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
            return res.status(200).json({
                error: "Missing Configuration",
                hasSpreadsheetId: !!SPREADSHEET_ID,
                hasPrivateKey: !!privateKey,
                hasClientEmail: !!clientEmail
            });
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: privateKey,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        
        const RANGE = 'Admissions!A:N';
        let sheetTest = {};
        
        try {
            const response = await sheets.spreadsheets.values.get({ 
                spreadsheetId: SPREADSHEET_ID, 
                range: RANGE 
            });
            sheetTest = {
                status: "Success",
                rowCount: (response.data.values || []).length,
                range: RANGE,
                header: response.data.values && response.data.values[0] ? response.data.values[0] : "Empty"
            };
        } catch (err) {
            sheetTest = {
                status: "Error",
                message: err.message,
                hint: err.message.includes("404") ? "Sheet 'Admissions' not found. Is the name correct?" : "Check permissions."
            };
        }

        res.status(200).json({
            timestamp: new Date().toISOString(),
            auth: "Healthy",
            sheetTest
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
