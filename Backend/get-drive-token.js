/**
 * ONE-TIME SCRIPT: Run this once to get a Google Drive refresh token.
 *
 * Usage: node get-drive-token.js
 *
 * 1. It will automatically open a browser window
 * 2. Sign in with your Google account (jointhinker@gmail.com)
 * 3. Allow access
 * 4. The script will automatically capture the code and save tokens to .env
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { exec } from 'child_process';

const REDIRECT_PORT = 3099;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

const CREDENTIALS_PATH = path.resolve('oauth-credentials.json');
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

const { client_id, client_secret } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    REDIRECT_URI
);

// Generate auth URL
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',             // Force consent to always get a refresh_token
    scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║      Google Drive Authorization Setup                ║');
console.log('╚══════════════════════════════════════════════════════╝\n');
console.log('Opening your browser for Google sign-in...\n');

// Open the URL in the default browser
const openCommand =
    process.platform === 'win32' ? 'start' :
    process.platform === 'darwin' ? 'open' : 'xdg-open';

exec(`${openCommand} "${authUrl.replace(/&/g, '^&')}"`, (err) => {
    if (err) {
        console.log('Could not open browser automatically.');
        console.log('Please open this URL manually:\n');
        console.log(`   ${authUrl}\n`);
    }
});

// Start a local server to capture the redirect
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authorization denied</h1><p>Error: ${error}</p><p>You can close this tab.</p>`);
        server.close();
        process.exit(1);
    }

    if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>No authorization code received</h1><p>Please try again.</p>');
        return;
    }

    try {
        const { tokens } = await oAuth2Client.getToken(code);

        console.log('\n✅ Authorization successful!\n');
        console.log('Refresh Token:', tokens.refresh_token);

        // Update .env file
        const envPath = path.resolve('.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Remove old tokens if they exist
        envContent = envContent.replace(/\r?\nGOOGLE_DRIVE_REFRESH_TOKEN=.*/g, '');
        envContent = envContent.replace(/\r?\nGOOGLE_OAUTH_CLIENT_ID=.*/g, '');
        envContent = envContent.replace(/\r?\nGOOGLE_OAUTH_CLIENT_SECRET=.*/g, '');

        // Also remove if they appear at the start of the file
        envContent = envContent.replace(/^GOOGLE_DRIVE_REFRESH_TOKEN=.*\r?\n?/gm, '');
        envContent = envContent.replace(/^GOOGLE_OAUTH_CLIENT_ID=.*\r?\n?/gm, '');
        envContent = envContent.replace(/^GOOGLE_OAUTH_CLIENT_SECRET=.*\r?\n?/gm, '');

        // Trim trailing whitespace
        envContent = envContent.trimEnd();

        // Add new tokens
        envContent += `\nGOOGLE_OAUTH_CLIENT_ID=${client_id}`;
        envContent += `\nGOOGLE_OAUTH_CLIENT_SECRET=${client_secret}`;
        envContent += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`;
        envContent += '\n';

        fs.writeFileSync(envPath, envContent);

        console.log('\n✅ Tokens saved to .env file!');
        console.log('   - GOOGLE_OAUTH_CLIENT_ID');
        console.log('   - GOOGLE_OAUTH_CLIENT_SECRET');
        console.log('   - GOOGLE_DRIVE_REFRESH_TOKEN');
        console.log('\nYou can now restart the backend server. 🚀\n');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
            <body style="font-family: sans-serif; text-align: center; padding: 60px; background: #0f172a; color: #e2e8f0;">
                <h1 style="color: #22c55e;">✅ Authorization Successful!</h1>
                <p style="font-size: 18px;">Google Drive tokens have been saved to <code>.env</code></p>
                <p style="color: #94a3b8;">You can close this tab and restart the backend server.</p>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('\n❌ Error exchanging code for token:', err.message);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error</h1><p>${err.message}</p><p>Please try running the script again.</p>`);
    }

    // Give the response time to send, then close
    setTimeout(() => {
        server.close();
        process.exit(0);
    }, 1000);
});

server.listen(REDIRECT_PORT, () => {
    console.log(`Waiting for authorization on http://localhost:${REDIRECT_PORT}...\n`);
});
