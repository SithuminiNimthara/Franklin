import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1nJvwaZJeTxMgFu1r47feb4PtFWysOmbD';

let driveClient = null;

function getDriveClient() {
    if (driveClient) return driveClient;

    try {
        // Use OAuth2 credentials from .env (set via get-drive-token.js)
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            console.error('❌ Google Drive OAuth2 credentials not found in .env');
            console.error('   Run: node get-drive-token.js  to set them up.');
            return null;
        }

        const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oAuth2Client.setCredentials({ refresh_token: refreshToken });

        driveClient = google.drive({ version: 'v3', auth: oAuth2Client });
        console.log('✅ Google Drive client initialized (OAuth2).');
        return driveClient;
    } catch (error) {
        console.error('❌ Failed to initialize Google Drive client:', error.message);
        return null;
    }
}

/**
 * Upload a file buffer to Google Drive and return a public viewable URL.
 * @param {Buffer} fileBuffer - The file data
 * @param {string} fileName - Name for the file in Drive
 * @param {string} mimeType - MIME type (e.g. 'image/jpeg')
 * @returns {Promise<{fileId: string, webViewLink: string, directLink: string}>}
 */
export async function uploadToGoogleDrive(fileBuffer, fileName, mimeType) {
    const drive = getDriveClient();

    if (!drive) {
        throw new Error('Google Drive client not available. Run: node get-drive-token.js');
    }

    // Convert buffer to readable stream
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    // Upload file to the target folder
    const fileMetadata = {
        name: fileName,
        parents: [FOLDER_ID],
    };

    const media = {
        mimeType: mimeType,
        body: stream,
    };

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
    });

    const fileId = response.data.id;

    // Make the file publicly viewable
    await drive.permissions.create({
        fileId: fileId,
        requestBody: {
            role: 'reader',
            type: 'anyone',
        },
    });

    const directLink = `https://drive.google.com/uc?export=view&id=${fileId}`;
    const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    console.log(`📁 Uploaded to Google Drive: ${fileName} → ${directLink}`);

    return {
        fileId,
        webViewLink,
        directLink,
    };
}
