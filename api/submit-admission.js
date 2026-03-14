const { google } = require('googleapis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const { Readable } = require('stream');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { sessionId, formData } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Missing Session ID' });
        }

        // 1. Verify Payment via Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment has not been completed.' });
        }

        // Google Services Credentials
        const credentials = {
            client_email: process.env.GOOGLE_CLIENT_EMAIL || 'your-service-account-email',
            private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        };

        const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'];
        const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
        
        const sheets = google.sheets({ version: 'v4', auth });
        const drive = google.drive({ version: 'v3', auth });

        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID; 
        const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

        // Skip actual saving if ENV variables are not fully configured yet
        if (!SPREADSHEET_ID || !credentials.private_key) {
             console.warn("Google API not configured. Sending mock success.");
             return res.status(200).json({
                 admissionData: {
                     admissionNumber: '26001',
                     studentName: formData ? formData.studentName : session.customer_details.name,
                     guardianName: formData ? formData.guardianName : "N/A",
                     classAdmitted: formData ? formData.classAdmitted : "Class",
                     classType: formData ? formData.classType : "N/A",
                     admissionDate: new Date().toISOString(),
                     paymentId: sessionId,
                     amountPaid: (session.amount_total / 100).toFixed(2)
                 }
             });
        }

        const RANGE = 'Admissions!A:N';

        // 2. Fetch existing records to check for duplicates and generate Admission Number
        let currentYear = new Date().getFullYear().toString().slice(-2); // e.g., '26'
        let nextCount = 1;
        let foundDuplicate = null;

        try {
             const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
             const rows = response.data.values || [];

             if (rows.length > 1) { // Skip Header
                 for (let i = 1; i < rows.length; i++) {
                     const row = rows[i];
                     if (row[12] === sessionId) {
                         // Payment ID matches, duplicate found
                         foundDuplicate = row;
                         break;
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

             if (foundDuplicate) {
                 return res.status(200).json({
                     admissionData: {
                         admissionNumber: foundDuplicate[0],
                         studentName: foundDuplicate[1],
                         guardianName: foundDuplicate[4],
                         classAdmitted: foundDuplicate[8],
                         classType: foundDuplicate[9],
                         admissionDate: foundDuplicate[13],
                         paymentId: sessionId,
                         amountPaid: (session.amount_total / 100).toFixed(2)
                     }
                 });
             }
        } catch(err) {
             console.error("Sheet read error (might be empty sheet):", err.message);
        }

        if (!formData) {
             return res.status(400).json({ error: "Missing required form data for new admission." });
        }

        const nextCountStr = nextCount.toString().padStart(3, '0');
        const admissionNumber = `${currentYear}${nextCountStr}`;

        // 3. Upload Photo to Google Drive
        let photoUrl = '';
        if (formData.photoBase64 && DRIVE_FOLDER_ID) {
            const base64Data = formData.photoBase64.replace(/^data:image\/\w+;base64,/, "");
            const bufferStream = new Readable();
            bufferStream.push(Buffer.from(base64Data, 'base64'));
            bufferStream.push(null);

            const fileMetadata = {
                name: `Student_${admissionNumber}.jpg`,
                parents: [DRIVE_FOLDER_ID],
            };
            const media = {
                mimeType: 'image/jpeg',
                body: bufferStream,
            };

            const driveResp = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, webViewLink, webContentLink',
            });
            photoUrl = driveResp.data.webViewLink;
            
            // Make file publicly readable
            await drive.permissions.create({
                fileId: driveResp.data.id,
                requestBody: { role: 'reader', type: 'anyone' },
            });
        }

        const admissionDate = new Date().toISOString();

        // 4. Append Data to Sheets
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
            sessionId,
            admissionDate
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowData] },
        });

        // 5. Respond with generated Admission details
        res.status(200).json({
             admissionData: {
                 admissionNumber,
                 studentName: formData.studentName,
                 guardianName: formData.guardianName,
                 classAdmitted: formData.classAdmitted,
                 classType: formData.classType,
                 admissionDate,
                 paymentId: sessionId,
                 amountPaid: (session.amount_total / 100).toFixed(2)
             }
        });

    } catch (err) {
        console.error("Submit Admission Error:", err);
        res.status(500).json({ error: err.message });
    }
}
