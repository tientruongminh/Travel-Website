import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './env';
import spotsRouter from './routes/spots';
import authRouter from './routes/auth';
import reviewsRouter from './routes/reviews';
import uploadRouter from './routes/upload';
import savedSpotsRouter from './routes/saved-spots';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080'], // Dev
    credentials: true,
}));

// Health check
app.get('/', (c) => {
    return c.json({
        success: true,
        message: 'Travel API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

// Routes
app.route('/api/spots', spotsRouter);
app.route('/api/auth', authRouter);
app.route('/api/reviews', reviewsRouter);
app.route('/api/upload', uploadRouter);
app.route('/api/saved-spots', savedSpotsRouter);


// 404 handler
app.notFound((c) => {
    return c.json({ success: false, error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
    console.error('Error:', err);
    return c.json({
        success: false,
        error: err.message || 'Internal Server Error',
    }, 500);
});

export default app;
