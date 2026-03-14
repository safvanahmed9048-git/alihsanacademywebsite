const jwt = require('jsonwebtoken');
const cookie = require('cookie');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Security: Validate Admin Token
    try {
        const cookies = cookie.parse(req.headers.cookie || '');
        const token = cookies.al_ihsan_token;

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No session found' });
        }

        jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.error('Auth Error:', err);
        return res.status(401).json({ error: 'Unauthorized: Invalid session' });
    }

    // 2. Get Data
    const newData = req.body;
    if (!newData) {
        return res.status(400).json({ error: 'No data provided' });
    }

    // 3. Prepare GitHub API Request
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = 'safvanahmed9048-git';
    const REPO_NAME = 'alihsanacademywebsite';
    const FILE_PATH = 'data.json';
    const BRANCH = 'main';

    if (!GITHUB_TOKEN) {
        console.error('Missing GITHUB_TOKEN');
        return res.status(500).json({ error: 'Server configuration error: Missing GITHUB_TOKEN' });
    }

    const commonHeaders = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Al-Ihsan-Academy-CMS'
    };

    try {
        // A. Get current SHA of the file (required for update)
        const getFileRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`, {
            headers: commonHeaders
        });

        if (!getFileRes.ok) {
            const errorText = await getFileRes.text();
            console.error('GitHub fetch SHA error:', errorText);
            throw new Error(`Failed to fetch file SHA: ${getFileRes.statusText} (${getFileRes.status})`);
        }

        const fileData = await getFileRes.json();
        const sha = fileData.sha;

        // B. Update File (Commit)
        const content = Buffer.from(JSON.stringify(newData, null, 2)).toString('base64');

        const updateRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            method: 'PUT',
            headers: {
                ...commonHeaders,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Update data.json via Admin Panel',
                content: content,
                sha: sha,
                branch: BRANCH
            })
        });

        if (!updateRes.ok) {
            const err = await updateRes.text();
            throw new Error(`Failed to update file: ${err}`);
        }

        return res.status(200).json({ success: true, message: 'Data saved to GitHub. Site will update in ~1 min.' });

    } catch (error) {
        console.error('GitHub API Error:', error);
        return res.status(500).json({ error: 'Failed to save data. ' + error.message });
    }
};

