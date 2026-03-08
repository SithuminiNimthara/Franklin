/**
 * ONE-TIME SCRIPT: Run this once to get a Google Drive refresh token.
 * 
 * Usage: node get-drive-token.js
 * 
 * 1. It will print a URL — open it in your browser
 * 2. Sign in with your Google account (jointhinker@gmail.com)
 * 3. Allow access
 * 4. Copy the authorization code from the browser
 * 5. Paste it into the terminal
 * 6. The script will save the refresh token to .env
 */

import { google } from 'googleapis';
import fs from 'fs';
import readline from 'readline';
import path from 'path';

const CREDENTIALS_PATH = path.resolve('oauth-credentials.json');
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

const { client_id, client_secret, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'urn:ietf:wg:oauth:2.0:oob'  // Out-of-band redirect for desktop apps
);

// Generate auth URL
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║      Google Drive Authorization Setup                ║');
console.log('╚══════════════════════════════════════════════════════╝\n');
console.log('1. Open this URL in your browser:\n');
console.log(`   ${authUrl}\n`);
console.log('2. Sign in with your Google account');
console.log('3. Click "Allow"');
console.log('4. Copy the authorization code\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('5. Paste the authorization code here: ', async (code) => {
    try {
        const { tokens } = await oAuth2Client.getToken(code.trim());

        console.log('\n✅ Authorization successful!\n');
        console.log('Refresh Token:', tokens.refresh_token);

        // Append to .env file
        const envPath = path.resolve('.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Remove old token if exists
        envContent = envContent.replace(/\nGOOGLE_DRIVE_REFRESH_TOKEN=.*/g, '');
        envContent = envContent.replace(/\nGOOGLE_OAUTH_CLIENT_ID=.*/g, '');
        envContent = envContent.replace(/\nGOOGLE_OAUTH_CLIENT_SECRET=.*/g, '');

        // Add new tokens
        envContent += `\nGOOGLE_OAUTH_CLIENT_ID=${client_id}`;
        envContent += `\nGOOGLE_OAUTH_CLIENT_SECRET=${client_secret}`;
        envContent += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`;

        fs.writeFileSync(envPath, envContent.trim() + '\n');

        console.log('\n✅ Tokens saved to .env file!');
        console.log('   - GOOGLE_OAUTH_CLIENT_ID');
        console.log('   - GOOGLE_OAUTH_CLIENT_SECRET');
        console.log('   - GOOGLE_DRIVE_REFRESH_TOKEN');
        console.log('\nYou can now restart the backend server. 🚀\n');
    } catch (error) {
        console.error('\n❌ Error getting token:', error.message);
        console.log('Make sure you copied the full authorization code.\n');
    }
    rl.close();
});
