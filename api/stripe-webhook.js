const { google } = require('googleapis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Readable } = require('stream');

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
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

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    console.log("--- Webhook Triggered ---");
    let buf;
    try {
        buf = await buffer(req);
        console.log(`Raw body buffered. Length: ${buf.length}`);
    } catch (bufErr) {
        console.error("Buffer error:", bufErr.message);
        return res.status(400).send("Buffer Error");
    }

    const sig = req.headers['stripe-signature'];
    console.log(`Signature header present: ${!!sig}`);

    if (!endpointSecret) {
        console.error("Webhook Secret is MISSING from environment variables!");
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
        console.log(`Event verified: ${event.id} [${event.type}]`);
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        if (endpointSecret) {
            console.log(`Secret Hint: ${endpointSecret.slice(0, 5)}...${endpointSecret.slice(-5)}`);
        }
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data.object;
        const formData = session.metadata;
        console.log(`Processing Session: ${session.id} | Mode: ${session.livemode ? 'LIVE' : 'TEST'}`);

        if (!formData || Object.keys(formData).length === 0) {
            console.error("CRITICAL: Webhook received NO metadata. Cannot process admission.");
            return res.status(200).json({ received: true, warning: "No metadata" });
        }

        try {
            const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
            const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
            const privateKey = robustFormatKey(process.env.GOOGLE_PRIVATE_KEY);

            const auth = new google.auth.GoogleAuth({
                credentials: { client_email: clientEmail, private_key: privateKey },
                scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
            });

            const authClient = await auth.getClient();
            const sheets = google.sheets({ version: 'v4', auth: authClient });
            const RANGE = 'Admissions!A:N';

            const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
            const rows = response.data.values || [];
            let nextCount = 1;
            if (rows.length > 1) {
                rows.forEach((row, index) => {
                    if (index === 0) return;
                    const id = row[0];
                    if (id && id.length > 2) {
                        const num = parseInt(id.slice(-3));
                        if (!isNaN(num) && num >= nextCount) nextCount = num + 1;
                    }
                });
            }

            const currentYear = new Date().getFullYear().toString().slice(-2);
            const admissionNumber = `${currentYear}${nextCount.toString().padStart(3, '0')}`;
            const admissionDate = new Date().toLocaleString('en-GB', { timeZone: 'UTC' });

            const rowData = [
                admissionNumber,
                formData.studentName,
                formData.gender,
                formData.dob,
                formData.guardianName,
                formData.email,
                formData.address,
                formData.whatsapp,
                formData.classAdmitted,
                formData.classType,
                formData.dateOfJoining,
                formData.photoUrl || '',
                session.id,
                admissionDate
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: RANGE,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [rowData] },
            });

            console.log(`SUCCESS: Admission ${admissionNumber} recorded for session ${session.id}`);

        } catch (sheetsErr) {
            console.error("Google Sheets Error:", sheetsErr.message);
            return res.status(500).send("Database Error");
        }
    }

    res.status(200).json({ received: true });
};
