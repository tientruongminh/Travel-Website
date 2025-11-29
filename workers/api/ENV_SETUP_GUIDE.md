# 🔑 Hướng Dẫn Điền .env File

## Bước 1: Mở file `.env`
File đã được tạo tại: `/home/tiencd123456/Travel-Website-2/workers/api/.env`

Mở file này trong editor của bạn.

---

## Bước 2: Điền các key theo thứ tự

### 1️⃣ CLOUDFLARE_API_TOKEN (BẮT BUỘC NGAY)
```bash
CLOUDFLARE_API_TOKEN=your-token-here
```

**Làm gì:**
- Paste token bạn vừa copy từ Cloudflare Dashboard
- Token sẽ dài khoảng 40-50 ký tự
- Ví dụ: `CLOUDFLARE_API_TOKEN=abc123xyz456def789...`

**Quan trọng:** Đây là key DUY NHẤT cần điền ngay bây giờ!

---

### 2️⃣ JWT_SECRET (BẮT BUỘC)
```bash
JWT_SECRET=your-random-secret-here
```

**Làm gì:**
- Tạo một chuỗi ngẫu nhiên dài ít nhất 32 ký tự
- Chạy command này để generate:
  ```bash
  openssl rand -base64 32
  ```
- Hoặc dùng bất kỳ string nào, ví dụ: `my-super-secret-jwt-key-2024-production`

---

### 3️⃣ GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET (TÙY CHỌN - để sau)
```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

**Làm gì:**
- **Để trống bây giờ**
- Sẽ setup sau khi deploy xong
- Lấy từ: https://console.cloud.google.com/apis/credentials

---

### 4️⃣ STREAM_ACCOUNT_ID & STREAM_API_KEY (TÙY CHỌN - để sau)
```bash
STREAM_ACCOUNT_ID=
STREAM_API_KEY=
```

**Làm gì:**
- **Để trống bây giờ**
- Chỉ cần nếu muốn upload video
- Lấy từ: Cloudflare Dashboard → Stream

---

## Bước 3: Load .env vào terminal

### Option A: Load toàn bộ file
```bash
cd /home/tiencd123456/Travel-Website-2/workers/api

# Load tất cả biến từ .env
set -a
source .env
set +a
```

### Option B: Load từng biến (nhanh hơn)
```bash
# Chỉ cần load token
export CLOUDFLARE_API_TOKEN="paste-token-của-bạn-vào-đây"

# Và JWT secret
export JWT_SECRET="your-random-secret"
```

### Option C: Dùng script tôi tạo
```bash
# Tôi sẽ tạo script load-env.sh cho bạn
source load-env.sh
```

---

## Bước 4: Verify token hoạt động

```bash
npx wrangler whoami
```

**Kết quả mong đợi:**
```
✔ You are logged in with an API Token, associated with the email 'your-email@example.com'
```

---

## 📝 Tóm tắt: Chỉ cần 2 keys ngay bây giờ

1. ✅ **CLOUDFLARE_API_TOKEN** - Token bạn vừa copy
2. ✅ **JWT_SECRET** - Random string (hoặc chạy `openssl rand -base64 32`)
3. ⏸️ Google OAuth - Để sau
4. ⏸️ Stream - Để sau

---

## 🚀 Sau khi điền xong

1. Save file `.env`
2. Load vào terminal: `source .env` hoặc `export CLOUDFLARE_API_TOKEN="..."`
3. Test: `npx wrangler whoami`
4. Tiếp tục deploy!

---

## ⚠️ Lưu ý bảo mật

- ❌ KHÔNG commit file `.env` vào git (đã được gitignore)
- ❌ KHÔNG share token với ai
- ✅ Token có thể revoke và tạo lại bất cứ lúc nào

Bạn đã điền xong chưa? Báo tôi để tiếp tục nhé!
