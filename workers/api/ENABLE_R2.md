# 🪣 Enable R2 Storage

## ❌ Vấn đề
```
Please enable R2 through the Cloudflare Dashboard. [code: 10042]
```

## ✅ Giải pháp: Enable R2

### Bước 1: Vào Cloudflare Dashboard
1. Mở: https://dash.cloudflare.com/
2. Login với tài khoản của bạn
3. Chọn account: **Truongminhtien07122005@gmail.com's Account**

### Bước 2: Enable R2
1. Sidebar → **R2** (hoặc search "R2")
2. Click **Enable R2**
3. **Accept Terms** (nếu có)
4. **Confirm** payment method (có thể cần thêm credit card, nhưng free tier không tính phí)

### Bước 3: Tạo Bucket
Sau khi enable R2, quay lại terminal:

```bash
npx wrangler r2 bucket create travel-images
```

---

## 💰 R2 Pricing (Free Tier)

**Miễn phí:**
- 10 GB storage/month
- 1 million Class A operations/month
- 10 million Class B operations/month

**Chỉ trả phí khi vượt quá:**
- $0.015/GB storage
- $4.50/million Class A operations
- $0.36/million Class B operations

**Cho demo của bạn:** Hoàn toàn FREE!

---

## 🔄 Alternative: Skip R2 for Now

Nếu không muốn enable R2 ngay, bạn có thể:

### Option 1: Deploy without R2
Comment out R2 trong `wrangler.toml`:

```toml
# [[r2_buckets]]
# binding = "IMAGES"
# bucket_name = "travel-images"
```

Upload sẽ không hoạt động nhưng các tính năng khác vẫn OK.

### Option 2: Use Placeholder
Giữ nguyên config, upload endpoint sẽ return error cho đến khi enable R2.

---

## 📝 Next Steps

**Sau khi enable R2:**
```bash
# 1. Create R2 bucket
npx wrangler r2 bucket create travel-images

# 2. Seed data vào D1
cd ../..
node scripts/seed-d1.js
cd workers/api

# 3. Deploy!
npm run deploy
```

**Hoặc deploy ngay không cần R2:**
```bash
# Comment R2 trong wrangler.toml
# Deploy
npm run deploy
```

Bạn muốn enable R2 hay skip để deploy trước?
