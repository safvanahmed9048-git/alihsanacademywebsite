const fs = require('fs');
const path = require('path');

export default async function handler(req, res) {
    const apiPath = path.join(process.cwd(), 'api');
    let files = [];
    try {
        files = fs.readdirSync(apiPath);
    } catch (e) {
        files = ["Error: " + e.message];
    }

    res.status(200).json({
        timestamp: new Date().toISOString(),
        cwd: process.cwd(),
        apiPath,
        files
    });
}
