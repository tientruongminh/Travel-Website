# Cloudflare API Token Setup Guide

## 🔑 Tạo API Token

### Bước 1: Vào Cloudflare Dashboard
1. Mở browser: https://dash.cloudflare.com
2. Login với tài khoản của bạn
3. Click vào **Profile icon** (góc phải trên)
4. Chọn **My Profile**

### Bước 2: Tạo API Token
1. Sidebar → **API Tokens**
2. Click **Create Token**
3. Tìm template **"Edit Cloudflare Workers"**
4. Click **Use template**

### Bước 3: Configure Permissions
Template sẽ có sẵn permissions:
- ✅ Account - Cloudflare Workers Scripts - Edit
- ✅ Account - Cloudflare D1 - Edit
- ✅ Account - Cloudflare Pages - Edit
- ✅ Account - Cloudflare KV Storage - Edit
- ✅ Account - Cloudflare R2 Storage - Edit

**Nếu cần thêm:**
- Add permission: Account - Cloudflare Stream - Edit

### Bước 4: Account Resources
- Account Resources: **Include** → **All accounts**

### Bước 5: Create Token
1. Click **Continue to summary**
2. Click **Create Token**
3. **COPY TOKEN NGAY** (chỉ hiện 1 lần!)

---

## 💻 Setup Token trong Terminal

### Option A: Set Environment Variable (Recommended)
```bash
# Linux/Mac
export CLOUDFLARE_API_TOKEN="your-token-here"

# Verify
echo $CLOUDFLARE_API_TOKEN
```

### Option B: Wrangler Config File
```bash
# Create config
mkdir -p ~/.wrangler
echo "api_token = \"your-token-here\"" > ~/.wrangler/config/default.toml
```

---

## ✅ Test Token

```bash
cd /home/tiencd123456/Travel-Website-2/workers/api

# Test với whoami
npx wrangler whoami

# Nếu thành công, sẽ hiển thị:
# ✔ You are logged in with an API Token, associated with the email '...@...'
```

---

## 🚀 Tiếp tục Deploy

Sau khi set token xong:

```bash
# 1. Create D1 database
npx wrangler d1 create travel-db

# 2. Create R2 bucket
npx wrangler r2 bucket create travel-images

# 3. Create KV namespace
npx wrangler kv:namespace create "KV"

# 4. Update wrangler.toml với IDs
# 5. Run migrations
# 6. Deploy!
```

---

## 🔒 Security Notes

- ⚠️ **KHÔNG commit token** vào git
- ⚠️ **KHÔNG share token** với ai
- ✅ Token có thể revoke bất cứ lúc nào
- ✅ Nên tạo token riêng cho mỗi project

---

## 📝 Next Steps

1. ✅ Tạo token theo hướng dẫn trên
2. ✅ Copy token
3. ✅ Run: `export CLOUDFLARE_API_TOKEN="your-token"`
4. ✅ Test: `npx wrangler whoami`
5. ✅ Tiếp tục với deployment!

Sau khi set token xong, báo tôi để tiếp tục nhé!
