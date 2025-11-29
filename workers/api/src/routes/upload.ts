import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { Env, ContextVariables } from '../env';

const app = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// POST /api/upload/image - Upload image to R2 (requires authentication)
app.post('/image', authMiddleware, async (c) => {

    try {
        const formData = await c.req.formData();
        const fileEntry = formData.get('file');

        if (!fileEntry || typeof fileEntry === 'string') {
            return c.json({ success: false, error: 'No file provided' }, 400);
        }

        const file = fileEntry as File;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return c.json({ success: false, error: 'File must be an image' }, 400);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return c.json({ success: false, error: 'Image too large (max 5MB)' }, 400);
        }

        // Generate unique key
        const ext = file.name.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const key = `images/${timestamp}-${random}.${ext}`;

        // Upload to R2
        if (!c.env.IMAGES) {
            return c.json({ success: false, error: 'R2 storage not configured' }, 500);
        }
        await c.env.IMAGES!.put(key, file.stream(), {
            httpMetadata: {
                contentType: file.type,
            },
        });

        // Generate public URL
        // Note: Configure R2 custom domain in Cloudflare dashboard
        // For now, use placeholder - will be replaced with actual R2 public URL
        const publicUrl = `https://images.yourdomain.com/${key}`;

        return c.json({
            success: true,
            data: {
                url: publicUrl,
                key,
                type: 'image',
                size: file.size,
                contentType: file.type,
            },
        }, 201);
    } catch (error: any) {
        console.error('Image upload error:', error);
        return c.json({ success: false, error: error.message || 'Upload failed' }, 500);
    }
});

// POST /api/upload/video - Upload video to Cloudflare Stream (requires authentication)
app.post('/video', authMiddleware, async (c) => {

    try {
        const formData = await c.req.formData();
        const fileEntry = formData.get('file');

        if (!fileEntry || typeof fileEntry === 'string') {
            return c.json({ success: false, error: 'No file provided' }, 400);
        }

        const file = fileEntry as File;

        // Validate file type
        if (!file.type.startsWith('video/')) {
            return c.json({ success: false, error: 'File must be a video' }, 400);
        }

        // Validate file size (max 200MB for Stream)
        if (file.size > 200 * 1024 * 1024) {
            return c.json({ success: false, error: 'Video too large (max 200MB)' }, 400);
        }

        if (!c.env.STREAM_API_KEY || !c.env.STREAM_ACCOUNT_ID) {
            return c.json({ success: false, error: 'Stream not configured' }, 500);
        }

        // Upload to Cloudflare Stream
        const streamFormData = new FormData();
        streamFormData.append('file', file);

        const streamResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${c.env.STREAM_ACCOUNT_ID}/stream`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${c.env.STREAM_API_KEY}`,
                },
                body: streamFormData,
            }
        );

        if (!streamResponse.ok) {
            throw new Error('Failed to upload to Stream');
        }

        const streamResult = await streamResponse.json() as any;

        if (!streamResult.success) {
            throw new Error(streamResult.errors?.[0]?.message || 'Stream upload failed');
        }

        const video = streamResult.result;

        return c.json({
            success: true,
            data: {
                uid: video.uid,
                url: `https://customer-${c.env.STREAM_ACCOUNT_ID}.cloudflarestream.com/${video.uid}/manifest/video.m3u8`,
                thumbnail: video.thumbnail,
                preview: video.preview,
                status: video.status,
                type: 'video',
            },
        }, 201);
    } catch (error: any) {
        console.error('Video upload error:', error);
        return c.json({ success: false, error: error.message || 'Upload failed' }, 500);
    }
});

// POST /api/upload/youtube - Save YouTube URL (requires authentication)
app.post('/youtube', authMiddleware, async (c) => {

    try {
        const { url, spot_id } = await c.req.json();

        if (!url) {
            return c.json({ success: false, error: 'URL required' }, 400);
        }

        // Validate YouTube URL
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            return c.json({ success: false, error: 'Invalid YouTube URL' }, 400);
        }

        // Save to media table
        const result = await c.env.DB
            .prepare('INSERT INTO media (type, url, spot_id) VALUES (?, ?, ?) RETURNING *')
            .bind('youtube', url, spot_id || null)
            .first();

        return c.json({
            success: true,
            data: result,
        }, 201);
    } catch (error: any) {
        console.error('YouTube save error:', error);
        return c.json({ success: false, error: error.message || 'Save failed' }, 500);
    }
});

// GET /api/upload/signed-url - Get signed URL for direct upload (future)
app.get('/signed-url', async (c) => {
    // TODO: Implement signed URL generation for direct client-to-R2 upload
    return c.json({
        success: false,
        message: 'Signed URLs not implemented yet',
    }, 501);
});

export default app;
