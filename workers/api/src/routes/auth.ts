import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import type { Env } from '../env';

const app = new Hono<{ Bindings: Env }>();

// Convenience endpoint - redirects to Google OAuth
app.get('/login', async (c) => {
    return c.redirect('/api/auth/google');
});

// Google OAuth login - redirect to Google
app.get('/google', async (c) => {
    if (!c.env.GOOGLE_CLIENT_ID) {
        return c.json({ success: false, error: 'Google OAuth not configured' }, 500);
    }

    const origin = new URL(c.req.url).origin;
    const redirectUri = `${origin}/api/auth/callback`;

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', c.env.GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');

    return c.redirect(googleAuthUrl.toString());
});

// OAuth callback - handle Google response
app.get('/callback', async (c) => {
    const code = c.req.query('code');
    const error = c.req.query('error');

    if (error) {
        const frontendUrl = c.env.FRONTEND_URL || new URL(c.req.url).origin;
        return c.redirect(`${frontendUrl}/?error=${error}`);
    }

    if (!code) {
        return c.json({ success: false, error: 'No authorization code' }, 400);
    }

    try {
        if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
            throw new Error('Google OAuth not configured');
        }

        const origin = new URL(c.req.url).origin;
        const redirectUri = `${origin}/api/auth/callback`;

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                client_id: c.env.GOOGLE_CLIENT_ID,
                client_secret: c.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Token exchange failed:', errorData);
            throw new Error('Failed to exchange code for token');
        }

        const tokens = await tokenResponse.json() as any;

        // Get user info from Google
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!userResponse.ok) {
            throw new Error('Failed to get user info');
        }

        const googleUser = await userResponse.json() as any;

        // Check if user exists by Google ID or email
        let user = await c.env.DB
            .prepare('SELECT * FROM users WHERE google_id = ? OR email = ?')
            .bind(googleUser.id, googleUser.email)
            .first() as any;

        if (!user) {
            // Create new user with OAuth fields
            const result = await c.env.DB
                .prepare(`
                    INSERT INTO users (email, name, avatar, google_id, provider, email_verified, password_hash, role, last_login)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    RETURNING id
                `)
                .bind(
                    googleUser.email,
                    googleUser.name,
                    googleUser.picture,
                    googleUser.id,
                    'google',
                    true,
                    null, // No password for OAuth users
                    'user'
                )
                .first() as any;

            user = {
                id: result.id,
                email: googleUser.email,
                name: googleUser.name,
                avatar: googleUser.picture,
                google_id: googleUser.id,
                role: 'user',
            };
        } else {
            // Update existing user's last login and Google ID if not set
            await c.env.DB
                .prepare(`
                    UPDATE users 
                    SET last_login = CURRENT_TIMESTAMP,
                        google_id = COALESCE(google_id, ?),
                        avatar = COALESCE(?, avatar),
                        name = COALESCE(?, name)
                    WHERE id = ?
                `)
                .bind(googleUser.id, googleUser.picture, googleUser.name, user.id)
                .run();
        }

        // Generate JWT token with proper signing
        const payload = {
            userId: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
        };

        const token = await sign(payload, c.env.JWT_SECRET);

        // Store session in KV
        await c.env.KV.put(`session:${user.id}`, token, {
            expirationTtl: 7 * 24 * 60 * 60 // 7 days
        });

        // Redirect to frontend with token
        const frontendUrl = c.env.FRONTEND_URL || origin;
        return c.redirect(`${frontendUrl}/?token=${token}`);

    } catch (error: any) {
        console.error('OAuth error:', error);
        const frontendUrl = c.env.FRONTEND_URL || new URL(c.req.url).origin;
        return c.redirect(`${frontendUrl}/?error=auth_failed`);
    }
});

// Get current user info
app.get('/me', async (c) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, error: 'No authorization token' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        // Verify JWT with proper secret
        const payload = await verify(token, c.env.JWT_SECRET) as any;

        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return c.json({ success: false, error: 'Token expired' }, 401);
        }

        // Get fresh user data from database
        const user = await c.env.DB
            .prepare('SELECT id, email, name, avatar, role, provider, email_verified, created_at, last_login FROM users WHERE id = ?')
            .bind(payload.userId)
            .first();

        if (!user) {
            return c.json({ success: false, error: 'User not found' }, 404);
        }

        return c.json({
            success: true,
            data: user
        });

    } catch (error: any) {
        console.error('Token verification error:', error);
        return c.json({ success: false, error: 'Invalid token' }, 401);
    }
});

// Logout
app.post('/logout', async (c) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');

        try {
            const payload = await verify(token, c.env.JWT_SECRET) as any;
            // Remove session from KV
            await c.env.KV.delete(`session:${payload.userId}`);
        } catch (error) {
            // Ignore errors
        }
    }

    return c.json({ success: true, message: 'Logged out' });
});

export default app;

