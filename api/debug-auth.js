const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
    const apiPath = path.join(process.cwd(), 'api');
    let apiFiles = [];
    try { apiFiles = fs.readdirSync(apiPath); } catch (e) {}

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const stripeKeyHint = stripeKey ? `${stripeKey.slice(0, 7)}...${stripeKey.slice(-4)}` : "MISSING";

    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: clientEmail, private_key: privateKey.replace(/\\n/g, '\n') },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Admissions!A1:B2' });

        res.status(200).json({
            timestamp: new Date().toISOString(),
            stripe: { keyHint: stripeKeyHint },
            google: { status: "Healthy", rowCount: (response.data.values || []).length },
            apiFiles
        });
    } catch (err) {
        res.status(200).json({
            timestamp: new Date().toISOString(),
            stripe: { keyHint: stripeKeyHint },
            google: { status: "Error", message: err.message },
            apiFiles
        });
    }
};
