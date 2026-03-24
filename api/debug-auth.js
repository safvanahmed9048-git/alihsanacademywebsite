const { google } = require('googleapis');

export default async function handler(req, res) {
    // Only allow GET for easier manual testing in browser
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const results = {
        timestamp: new Date().toISOString(),
        env: {
            NODE_ENV: process.env.NODE_ENV,
            hasSpreadsheetId: !!process.env.GOOGLE_SPREADSHEET_ID,
            spreadsheetIdEnd: process.env.GOOGLE_SPREADSHEET_ID ? process.env.GOOGLE_SPREADSHEET_ID.slice(-5) : "MISSING",
            hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
            privateKeyLength: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0,
            hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
            clientEmailMasked: process.env.GOOGLE_CLIENT_EMAIL ? `${process.env.GOOGLE_CLIENT_EMAIL.slice(0, 5)}...${process.env.GOOGLE_CLIENT_EMAIL.slice(-10)}` : "MISSING",
        },
        authTest: {}
    };

    try {
        // Robust Key Formatting (copied from handlers)
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
        results.env.formattedKeyLength = privateKey ? privateKey.length : 0;
        results.env.formattedKeyFirst30 = privateKey ? privateKey.slice(0, 30) : "MISSING";

        if (privateKey && process.env.GOOGLE_CLIENT_EMAIL) {
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_CLIENT_EMAIL,
                    private_key: privateKey,
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });

            const client = await auth.getClient();
            results.authTest.clientType = client.constructor.name;
            
            // Try to get an access token to verify identity
            const token = await client.getAccessToken();
            results.authTest.tokenSuccess = !!token.token;
            results.authTest.tokenType = typeof token.token;
            results.authTest.identityVerified = true;
        } else {
            results.authTest.error = "Missing credentials for auth test";
        }

    } catch (err) {
        results.authTest.error = err.message;
        results.authTest.stack = err.stack?.split('\n').slice(0, 3).join('\n');
    }

    res.status(200).json(results);
}
