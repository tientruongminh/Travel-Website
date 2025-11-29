import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import type { Env, ContextVariables } from '../env';

/**
 * Authentication middleware - requires valid JWT token
 * Adds user payload to context as 'user'
 */
export async function authMiddleware(
    c: Context<{ Bindings: Env; Variables: ContextVariables }>,
    next: Next
) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({
            success: false,
            error: 'Unauthorized - No token provided'
        }, 401);
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const payload = await verify(token, c.env.JWT_SECRET) as any;

        // Check token expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return c.json({
                success: false,
                error: 'Token expired'
            }, 401);
        }

        // Add user to context
        c.set('user', payload);
        await next();
    } catch (error) {
        return c.json({
            success: false,
            error: 'Invalid token'
        }, 401);
    }
}

/**
 * Optional authentication middleware - doesn't require token
 * If token is present and valid, adds user to context
 * If token is invalid or missing, continues as guest
 */
export async function optionalAuth(
    c: Context<{ Bindings: Env; Variables: ContextVariables }>,
    next: Next
) {
    const authHeader = c.req.header('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.replace('Bearer ', '');
            const payload = await verify(token, c.env.JWT_SECRET) as any;

            // Only set user if token is valid and not expired
            if (!payload.exp || payload.exp >= Math.floor(Date.now() / 1000)) {
                c.set('user', payload);
            }
        } catch (error) {
            // Ignore errors, continue as guest
        }
    }

    await next();
}
