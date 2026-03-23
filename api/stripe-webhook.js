const { google } = require('googleapis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Readable } = require('stream');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Specify we want the raw body for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read the raw body stream
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const formData = session.metadata;

        if (formData && formData.studentName) {
            try {
                const num = await processGoogleSheetsAndDrive(session, formData);
                if (num) await sendSuccessEmail(session, formData, num);
            } catch (err) {
                console.error("Webhook processing error:", err.message);
            }
        }
    }
    res.status(200).end();
}

async function processGoogleSheetsAndDrive(session, formData) {
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

    const privateKey = robustFormatKey(process.env.GOOGLE_PRIVATE_KEY);
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!SPREADSHEET_ID || !privateKey || !clientEmail) return null;

    const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'];
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: SCOPES,
    });
    
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const drive = google.drive({ version: 'v3', auth: authClient });

    const RANGE = 'Admissions!A:N';

    // 1. Fetch existing records to check for duplicates and generate Admission Number
    let currentYear = new Date().getFullYear().toString().slice(-2);
    let nextCount = 1;

    try {
         const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
         const rows = response.data.values || [];

         if (rows.length > 1) { // Skip Header
             for (let i = 1; i < rows.length; i++) {
                 const row = rows[i];
                 if (row[12] === session.id) {
                     // Payment ID matches, duplicate found (idempotency check)
                     return row[0]; // Return the existing admission number
                 }
                 const adNum = row[0];
                 if (adNum && adNum.startsWith(currentYear)) {
                     const count = parseInt(adNum.slice(2), 10);
                     if (!isNaN(count) && count >= nextCount) {
                         nextCount = count + 1;
                     }
                 }
             }
         }
    } catch(err) {
         console.error("Sheet read error:", err.message);
         // If sheet is just empty, we continue
    }

    const nextCountStr = nextCount.toString().padStart(3, '0');
    const admissionNumber = `${currentYear}${nextCountStr}`;

    const photoUrl = formData.photoUrl || '';
    const admissionDate = new Date().toISOString();

    // 3. Append Data to Sheets
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
        formData.doj,
        photoUrl,
        session.id,
        admissionDate
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: RANGE,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
    });

    return admissionNumber;
}

async function sendSuccessEmail(session, formData, admissionNumber) {
    if (!process.env.RESEND_API_KEY) return;
    
    const amount = (session.amount_total / 100).toFixed(2);
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0a305c; padding: 20px; text-align: center;">
                <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Al Ihsan Academy</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
                <h2 style="color: #333333; margin-top: 0;">Payment Successful</h2>
                <p style="color: #555555; font-size: 16px;">Dear ${formData.guardianName},</p>
                <p style="color: #555555; font-size: 16px;">Your admission has been successfully registered.</p>
                
                <div style="background-color: #f9f9f9; border-left: 4px solid #d4af37; padding: 15px; margin: 25px 0;">
                    <p style="margin: 0; color: #333333; font-size: 18px;"><strong>Admission Number:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #0a305c; font-size: 28px; font-weight: bold;">${admissionNumber}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Student Name:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #333333; font-weight: bold; text-align: right;">${formData.studentName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Email:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #333333; font-weight: bold; text-align: right;">${formData.email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Payment Amount:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #333333; font-weight: bold; text-align: right;">£${amount}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Payment Date:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #333333; font-weight: bold; text-align: right;">${date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #666666;">Transaction ID:</td>
                        <td style="padding: 10px 0; color: #333333; font-weight: bold; text-align: right; font-size: 12px; word-break: break-all;">${session.id}</td>
                    </tr>
                </table>

                <p style="color: #555555; font-size: 14px; text-align: center;">Please save your Admission Number for future reference.</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; color: #888888; font-size: 12px;">
                <p style="margin: 0;">This is an automated receipt from Al Ihsan Academy, United Kingdom.</p>
            </div>
        </div>
    `;

    try {
        await resend.emails.send({
            from: 'Al Ihsan Academy <admissions@alihsanacademy.uk>', // Must be a verified domain in Resend
            to: formData.email,
            subject: 'Admission Payment Receipt - Al Ihsan Academy',
            html: htmlContent
        });
    } catch (e) {
        console.error("Email sending failed:", e);
    }
}
