import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { Env, ContextVariables, Spot, SpotWithMedia, Media } from '../env';

const app = new Hono<{ Bindings: Env; Variables: ContextVariables }>();


// GET /api/spots - List all spots with pagination and filters
app.get('/', async (c) => {
    const { category, type, search, limit = '50', offset = '0' } = c.req.query();

    try {
        let query = 'SELECT * FROM spots WHERE 1=1';
        const params: any[] = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        if (search) {
            query += ' AND (name LIKE ? OR description LIKE ? OR address LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const { results } = await c.env.DB.prepare(query).bind(...params).all();

        // Get media for each spot
        const spotsWithMedia: SpotWithMedia[] = await Promise.all(
            (results as unknown as Spot[]).map(async (spot) => {
                const { results: media } = await c.env.DB
                    .prepare('SELECT * FROM media WHERE spot_id = ?')
                    .bind(spot.id)
                    .all();

                return {
                    ...spot,
                    media: media as unknown as Media[],
                    detailUrl: `detail.html?id=${spot.id}`,
                };
            })
        );

        return c.json({
            success: true,
            data: spotsWithMedia,
            count: spotsWithMedia.length,
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// GET /api/spots/:id - Get single spot with details
app.get('/:id', async (c) => {
    const id = c.req.param('id');

    try {
        const spot = await c.env.DB
            .prepare('SELECT * FROM spots WHERE id = ?')
            .bind(id)
            .first();

        if (!spot) {
            return c.json({ success: false, error: 'Spot not found' }, 404);
        }

        // Get media
        const { results: media } = await c.env.DB
            .prepare('SELECT * FROM media WHERE spot_id = ?')
            .bind(id)
            .all();

        // Get reviews with user info
        const { results: reviews } = await c.env.DB
            .prepare(`
        SELECT r.*, u.name as user_name, u.avatar as user_avatar
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.spot_id = ?
        ORDER BY r.created_at DESC
      `)
            .bind(id)
            .all();

        return c.json({
            success: true,
            data: {
                ...spot,
                media,
                reviews,
            },
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// POST /api/spots - Create new spot (protected - requires authentication)
app.post('/', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as any;
        const body = await c.req.json();
        const { id, name, category, type, lat, lng, address, hours, description, thumbnail } = body;

        // Validation
        if (!id || !name || !category || !type || lat === undefined || lng === undefined) {
            return c.json({ success: false, error: 'Missing required fields' }, 400);
        }

        // Insert spot with created_by
        await c.env.DB
            .prepare(`
        INSERT INTO spots (id, name, category, type, lat, lng, address, hours, description, thumbnail, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(id, name, category, type, lat, lng, address || '', hours || '', description || '', thumbnail || '', user.userId)
            .run();

        // Insert media if provided
        if (body.media && Array.isArray(body.media)) {
            for (const m of body.media) {
                await c.env.DB
                    .prepare('INSERT INTO media (type, url, spot_id, uploaded_by) VALUES (?, ?, ?, ?)')
                    .bind(m.type, m.url, id, user.userId)
                    .run();
            }
        }

        return c.json({
            success: true,
            message: 'Spot created successfully',
            data: { id },
        }, 201);
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// GET /api/spots/nearby - Find nearby spots (geospatial query)
app.get('/nearby', async (c) => {
    const { lat, lng, radius = '10' } = c.req.query();

    if (!lat || !lng) {
        return c.json({ success: false, error: 'lat and lng required' }, 400);
    }

    try {
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        const radiusKm = parseFloat(radius);

        // Simple distance calculation (Haversine formula in SQL)
        const { results } = await c.env.DB
            .prepare(`
        SELECT *,
          (6371 * acos(
            cos(radians(?)) * cos(radians(lat)) *
            cos(radians(lng) - radians(?)) +
            sin(radians(?)) * sin(radians(lat))
          )) AS distance
        FROM spots
        HAVING distance < ?
        ORDER BY distance
        LIMIT 20
      `)
            .bind(userLat, userLng, userLat, radiusKm)
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

export default app;
