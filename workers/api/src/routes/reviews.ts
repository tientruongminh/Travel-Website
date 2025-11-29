import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { Env, ContextVariables } from '../env';

const app = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// GET /api/reviews/:spotId - Get reviews for a spot
app.get('/:spotId', async (c) => {
    const spotId = c.req.param('spotId');

    try {
        const { results } = await c.env.DB
            .prepare(`
        SELECT r.*, u.name as user_name, u.avatar as user_avatar
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.spot_id = ?
        ORDER BY r.created_at DESC
      `)
            .bind(spotId)
            .all();

        return c.json({
            success: true,
            data: results,
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// POST /api/reviews/:spotId - Create review (requires authentication)
app.post('/:spotId', authMiddleware, async (c) => {
    const spotId = c.req.param('spotId');
    const user = c.get('user');

    if (!user) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    try {
        const { rating, text } = await c.req.json();

        if (!rating || rating < 1 || rating > 5) {
            return c.json({ success: false, error: 'Invalid rating (must be 1-5)' }, 400);
        }

        // Check if spot exists
        const spot = await c.env.DB
            .prepare('SELECT id FROM spots WHERE id = ?')
            .bind(spotId)
            .first();

        if (!spot) {
            return c.json({ success: false, error: 'Spot not found' }, 404);
        }

        // Insert review with authenticated user
        await c.env.DB
            .prepare('INSERT OR REPLACE INTO reviews (user_id, spot_id, rating, text) VALUES (?, ?, ?, ?)')
            .bind(user.userId, spotId, rating, text || '')
            .run();

        return c.json({
            success: true,
            message: 'Review created successfully',
        }, 201);
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

export default app;

