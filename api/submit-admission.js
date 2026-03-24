const { google } = require('googleapis');
// Force Redeploy: 2026-03-24 08:50:00
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Missing Session ID' });
        }

        // 1. Verify Payment via Stripe to ensure they actually paid
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment has not been completed.' });
        }

        // 2. Setup Google Sheets to poll for the completed Admission Number created by the Webhook
        function robustFormatKey(key) {
            if (!key) return null;
            
            // Handle cases where the whole JSON was pasted instead of just the key
            if (key.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(key);
                    if (parsed.private_key) return robustFormatKey(parsed.private_key);
                } catch (e) {}
            }

            // Clean up surrounding quotes, spaces, and escaped newlines
            let cleaned = key.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
            
            // Standardize headers
            const beginMarker = '-----BEGIN PRIVATE KEY-----';
            const endMarker = '-----END PRIVATE KEY-----';
            
            // Extract core base64 content
            let base64 = cleaned;
            if (cleaned.includes('BEGIN') && cleaned.includes('END')) {
                base64 = cleaned.split(/-----BEGIN[^-]+-----/)[1].split(/-----END[^-]+-----/)[0];
            }
            
            base64 = base64.replace(/\s/g, ''); // Remove all whitespace
            
            if (!base64) return null;

            // Reconstruct perfect PEM
            const lines = base64.match(/.{1,64}/g) || [];
            return `${beginMarker}\n${lines.join('\n')}\n${endMarker}`;
        }

        const privateKey = robustFormatKey(process.env.GOOGLE_PRIVATE_KEY);
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

        if (!SPREADSHEET_ID || !privateKey || !clientEmail) {
             const missing = [];
             if (!SPREADSHEET_ID) missing.push("SPREADSHEET_ID");
             if (!privateKey) missing.push("PRIVATE_KEY");
             if (!clientEmail) missing.push("CLIENT_EMAIL");
             return res.status(500).json({ error: `System configuration error: Missing ${missing.join(', ')}` });
        }

        const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

        // Add obfuscated logging for diagnostics
        console.log("Auth Diagnostics:", {
            hasSpreadsheetId: !!SPREADSHEET_ID,
            spreadsheetIdEnd: SPREADSHEET_ID ? SPREADSHEET_ID.slice(-5) : "null",
            hasPrivateKey: !!privateKey,
            privateKeyStart: privateKey ? privateKey.slice(0, 30) : "null",
            hasClientEmail: !!clientEmail,
            clientEmail: clientEmail ? `${clientEmail.slice(0, 5)}...${clientEmail.slice(-10)}` : "null"
        });

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: privateKey,
            },
            scopes: SCOPES,
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const RANGE = 'Admissions!A:N';

        // Fetch existing records to check if the Webhook has processed the Session ID yet
        let foundRecord = null;
        try {
             const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
             const rows = response.data.values || [];

             if (rows.length > 1) { // Skip Header
                 for (let i = 1; i < rows.length; i++) {
                     const row = rows[i];
                     // Use trim() for robust comparison
                     if (row[12] && row[12].trim() === sessionId.trim()) {
                         foundRecord = row;
                         break;
                     }
                 }
             }
             
             if (foundRecord) {
                 return res.status(200).json({
                     admissionData: {
                         admissionNumber: foundRecord[0],
                         studentName: foundRecord[1],
                         guardianName: foundRecord[4],
                         classAdmitted: foundRecord[8],
                         classType: foundRecord[9],
                         admissionDate: foundRecord[13],
                         paymentId: sessionId,
                         amountPaid: (session.amount_total / 100).toFixed(2)
                     }
                 });
             } else {
                 // Webhook hasn't processed it yet
                 return res.status(202).json({ message: "Processing payment...", status: "pending" });
             }

        } catch(err) {
             console.error("Sheet read error:", err.message);
             return res.status(500).json({ error: `Database read error: ${err.message}` });
        }

    } catch (err) {
        console.error("Submit Admission Error:", err.message); // Updated to include err.message
        res.status(500).json({ error: err.message });
    }
}
