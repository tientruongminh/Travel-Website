# Cloudflare Workers API

Backend API cho Travel Website sử dụng Cloudflare Workers + D1 + R2 + Stream.

## 🚀 Quick Start

### 1. Cài đặt dependencies
```bash
cd workers/api
npm install
```

### 2. Login Cloudflare
```bash
npx wrangler login
```

### 3. Tạo D1 Database
```bash
npx wrangler d1 create travel-db
```

Copy `database_id` vào `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "travel-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 4. Chạy migrations
```bash
npx wrangler d1 execute travel-db --file=schema.sql
```

### 5. Tạo R2 Bucket
```bash
npx wrangler r2 bucket create travel-images
```

### 6. Tạo KV Namespace
```bash
npx wrangler kv:namespace create "KV"
```

Copy `id` vào `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_ID_HERE"
```

### 7. Set secrets
```bash
npx wrangler secret put JWT_SECRET
# Nhập: your-super-secret-jwt-key-here
```

### 8. Dev server
```bash
npm run dev
```

API sẽ chạy tại: `http://localhost:8787`

## 📡 API Endpoints

### Spots
- `GET /api/spots` - Danh sách địa điểm
  - Query params: `?category=tour&type=play&search=halong&limit=50&offset=0`
- `GET /api/spots/:id` - Chi tiết địa điểm
- `POST /api/spots` - Tạo địa điểm mới
- `GET /api/spots/nearby?lat=20.951&lng=107.059&radius=10` - Tìm gần

### Reviews
- `GET /api/reviews/:spotId` - Lấy reviews
- `POST /api/reviews/:spotId` - Tạo review

### Upload
- `POST /api/upload/image` - Upload ảnh lên R2
- `POST /api/upload/youtube` - Lưu YouTube URL

### Auth (Coming soon)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

## 🧪 Testing

### Với curl
```bash
# Health check
curl http://localhost:8787

# Get spots
curl http://localhost:8787/api/spots

# Get spot detail
curl http://localhost:8787/api/spots/halong

# Create spot
curl -X POST http://localhost:8787/api/spots \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-spot",
    "name": "Test Location",
    "category": "tour",
    "type": "play",
    "lat": 20.951,
    "lng": 107.059,
    "address": "Test Address",
    "description": "Test description"
  }'
```

## 📦 Deploy to Production

```bash
npm run deploy
```

## 🔧 Seed Data

Để import dữ liệu từ `data/spots.json`:

```bash
# Tạo script seed (sẽ làm sau)
node scripts/seed.js
```

## 📝 Notes

- GeoJSON files vẫn ở client (static files)
- D1 chỉ lưu spots, users, reviews, media
- R2 cho ảnh, Stream cho video
- Auth sẽ implement sau với JWT
