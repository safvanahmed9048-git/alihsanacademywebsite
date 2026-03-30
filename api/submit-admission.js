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
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const { sessionId } = req.body;
    if (!sessionId) {
        return res.status(400).json({ error: "Missing sessionId" });
    }

    try {
        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
        const privateKey = robustFormatKey(privateKeyRaw);

        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: clientEmail, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const RANGE = 'Admissions!A:P';

        const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
        const rows = response.data.values || [];

        if (rows.length > 1) {
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                // Column 12 is the sessionId
                if (row[12] && row[12].trim() === sessionId.trim()) {
                    return res.status(200).json({ 
                        status: 'success', 
                        admissionData: {
                            admissionNumber: row[0],
                            studentName: row[1],
                            guardianName: row[4],
                            classAdmitted: row[8],
                            classType: row[9],
                            admissionDate: row[13],
                            paymentId: row[14],
                            amountPaid: row[15]
                        }
                    });
                }
            }
        }

        res.status(202).json({ status: 'pending', message: 'Admission number is being generated...' });

    } catch (err) {
        console.error("Submit Admission Error:", err.message);
        res.status(500).json({ error: err.message, details: err.message.includes('1E08010C') ? 'Internal decoder failure' : 'Database read error' });
    }
};
