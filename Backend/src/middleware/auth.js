import { createClerkClient } from '@clerk/clerk-sdk-node';

export const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });


export const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        console.warn('[Auth] No Authorization header found');
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    if (!authHeader.startsWith('Bearer ')) {
        console.warn('[Auth] Authorization header is not in "Bearer <token>" format');
        return res.status(401).json({ error: 'Unauthorized: Invalid header format' });
    }

    const token = authHeader.split(' ')[1];
    console.log(`[Auth] Verifying token (starts with: ${token.substring(0, 10)}...)`);

    try {
        const sessionClaims = await clerkClient.verifyToken(token);

        console.log('[Auth] Token verified. UserId:', sessionClaims.sub);

        req.auth = {
            userId: sessionClaims.sub,
            claims: sessionClaims
        };

        next();
    } catch (error) {
        console.error('[Auth] Clerk Verification Error:', error.message);
        return res.status(401).json({ error: `Authentication failed: ${error.message}` });
    }
};
