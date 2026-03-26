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
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const stripeKeyHint = stripeKey ? `${stripeKey.slice(0, 7)}...${stripeKey.slice(-4)}` : "MISSING";
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
    const privateKey = robustFormatKey(privateKeyRaw);

    try {
        if (!SPREADSHEET_ID || !privateKey || !clientEmail) {
            return res.status(200).json({ 
                status: "Configuration Incomplete", 
                hasSpreadsheetId: !!SPREADSHEET_ID, 
                hasPrivateKey: !!privateKey, 
                hasClientEmail: !!clientEmail 
            });
        }

        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: clientEmail, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        
        // Simple reachability check
        const response = await sheets.spreadsheets.values.get({ 
            spreadsheetId: SPREADSHEET_ID, 
            range: 'Admissions!A1:B2' 
        });

        res.status(200).json({
            timestamp: new Date().toISOString(),
            systemStatus: "Healthy",
            googleSheets: {
                status: "Connected",
                spreadsheetId: SPREADSHEET_ID.slice(0, 5) + "..." + SPREADSHEET_ID.slice(-5),
                rowCount: (response.data.values || []).length
            },
            stripe: {
                status: "Configured",
                keyHint: stripeKeyHint
            }
        });

    } catch (err) {
        res.status(500).json({ 
            status: "Error", 
            message: err.message, 
            type: err.message.includes('1E08010C') ? 'Decoder Failure' : 'Other' 
        });
    }
};
