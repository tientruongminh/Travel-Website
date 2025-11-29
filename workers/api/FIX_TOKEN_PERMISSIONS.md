# 🔧 Fix Token Permissions

## ❌ Vấn đề hiện tại
Token thiếu permission để tạo D1 database.

Error: `Authentication error [code: 10000]`

## ✅ Giải pháp: Update Token Permissions

### Bước 1: Vào Cloudflare Dashboard
1. Mở: https://dash.cloudflare.com/profile/api-tokens
2. Tìm token bạn vừa tạo
3. Click **Edit** (icon bút chì)

### Bước 2: Thêm D1 Permissions
Trong phần **Permissions**, đảm bảo có:

**Account Permissions:**
- ✅ `Account - Workers Scripts - Edit`
- ✅ `Account - Workers KV Storage - Edit`
- ✅ `Account - Workers R2 Storage - Edit`
- ✅ `Account - D1 - Edit` ← **QUAN TRỌNG**
- ✅ `Account - Cloudflare Pages - Edit`
- ✅ `Account - Cloudflare Stream - Edit` (optional)

### Bước 3: Account Resources
- Account Resources: **Include** → **All accounts**

### Bước 4: Save Changes
1. Click **Continue to summary**
2. Click **Update Token**

---

## 🔄 Hoặc: Tạo Token Mới (Nhanh hơn)

### Option A: Dùng Template "Edit Cloudflare Workers"
1. https://dash.cloudflare.com/profile/api-tokens
2. **Create Token**
3. Template: **Edit Cloudflare Workers** → Use template
4. **Thêm permission:** Account - D1 - Edit
5. Create Token
6. Copy token mới

### Option B: Tạo Custom Token với Full Permissions
1. **Create Token** → **Create Custom Token**
2. Permissions:
   ```
   Account - Workers Scripts - Edit
   Account - Workers KV Storage - Edit
   Account - Workers R2 Storage - Edit
   Account - D1 - Edit
   Account - Cloudflare Pages - Edit
   Account - Cloudflare Stream - Edit
   ```
3. Account Resources: All accounts
4. Create Token

---

## 📝 Sau khi có token mới

### Update .env file:
```bash
# Mở file .env
nano .env

# Thay token cũ bằng token mới
CLOUDFLARE_API_TOKEN=new-token-here
```

### Reload environment:
```bash
source load-env.sh
npx wrangler whoami
```

### Thử lại:
```bash
npx wrangler d1 create travel-db
```

---

## 🎯 Quick Fix (Recommended)

**Cách nhanh nhất:**
1. Vào: https://dash.cloudflare.com/profile/api-tokens
2. **Create Token** → **Edit Cloudflare Workers** template
3. Click **+ Add more** → Chọn **D1** → **Edit**
4. Create Token → Copy
5. Update `.env` với token mới
6. `source load-env.sh`
7. Retry!

Bạn muốn tôi tạo token với permissions đầy đủ hơn không? Hoặc bạn có thể update token hiện tại!
