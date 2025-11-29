import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { Env, ContextVariables } from '../env';

const app = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// GET /api/saved-spots - Get user's saved spots
app.get('/', authMiddleware, async (c) => {
    const user = c.get('user');

    if (!user) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    try {
        const { results } = await c.env.DB
            .prepare(`
                SELECT s.*, ss.created_at as saved_at
                FROM saved_spots ss
                JOIN spots s ON ss.spot_id = s.id
                WHERE ss.user_id = ?
                ORDER BY ss.created_at DESC
            `)
            .bind(user.userId)
            .all();

        return c.json({
            success: true,
            data: results,
            count: results.length,
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// POST /api/saved-spots/:spotId - Save a spot to favorites
app.post('/:spotId', authMiddleware, async (c) => {
    const user = c.get('user');
    const spotId = c.req.param('spotId');

    if (!user) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    try {
        // Check if spot exists
        const spot = await c.env.DB
            .prepare('SELECT id FROM spots WHERE id = ?')
            .bind(spotId)
            .first();

        if (!spot) {
            return c.json({ success: false, error: 'Spot not found' }, 404);
        }

        // Save spot (INSERT OR IGNORE to handle duplicates)
        await c.env.DB
            .prepare('INSERT OR IGNORE INTO saved_spots (user_id, spot_id) VALUES (?, ?)')
            .bind(user.userId, spotId)
            .run();

        return c.json({
            success: true,
            message: 'Spot saved to favorites',
        }, 201);
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// DELETE /api/saved-spots/:spotId - Remove a spot from favorites
app.delete('/:spotId', authMiddleware, async (c) => {
    const user = c.get('user');
    const spotId = c.req.param('spotId');

    if (!user) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    try {
        const result = await c.env.DB
            .prepare('DELETE FROM saved_spots WHERE user_id = ? AND spot_id = ?')
            .bind(user.userId, spotId)
            .run();

        if (result.meta.changes === 0) {
            return c.json({ success: false, error: 'Spot not in favorites' }, 404);
        }

        return c.json({
            success: true,
            message: 'Spot removed from favorites',
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// GET /api/saved-spots/check/:spotId - Check if a spot is saved
app.get('/check/:spotId', authMiddleware, async (c) => {
    const user = c.get('user');
    const spotId = c.req.param('spotId');

    if (!user) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    try {
        const saved = await c.env.DB
            .prepare('SELECT 1 FROM saved_spots WHERE user_id = ? AND spot_id = ?')
            .bind(user.userId, spotId)
            .first();

        return c.json({
            success: true,
            data: { isSaved: !!saved },
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

export default app;
