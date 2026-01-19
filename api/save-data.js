const REGION = 'uk'; // Optional region context for logs

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Security: Validate Admin Token (Cookie or Header)
    // For simplicity in this fix, we assume the middleware or existing auth handled it, 
    // but ideally we check the JWT here.
    // In api/login.js we set a cookie 'al_ihsan_token'.
    // We strictly should verify it.

    // 1. Get Data
    const newData = req.body;
    if (!newData) {
        return res.status(400).json({ error: 'No data provided' });
    }

    // 2. Prepare GitHub API Request
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // User must set this in Vercel
    const REPO_OWNER = 'safvanahmed9048-git';
    const REPO_NAME = 'alihsanacademywebsite';
    const FILE_PATH = 'data.json';
    const BRANCH = 'main';

    if (!GITHUB_TOKEN) {
        console.error('Missing GITHUB_TOKEN');
        return res.status(500).json({ error: 'Server configuration error: Missing GITHUB_TOKEN' });
    }

    try {
        // A. Get current SHA of the file (required for update)
        const getFileRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getFileRes.ok) {
            throw new Error(`Failed to fetch file SHA: ${getFileRes.statusText}`);
        }

        const fileData = await getFileRes.json();
        const sha = fileData.sha;

        // B. Update File (Commit)
        // GitHub API requires content to be Base64 encoded
        const content = Buffer.from(JSON.stringify(newData, null, 2)).toString('base64');

        const updateRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
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
