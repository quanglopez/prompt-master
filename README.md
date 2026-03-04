# Prompt Master — Hướng Dẫn Deploy lên Vercel

Công cụ AI giúp bạn tối ưu hóa prompt nhanh chóng, biến prompt tầm thường thành prompt xuất sắc.

---

## 1. Giới thiệu

**Prompt Master** là ứng dụng web giúp người dùng tối ưu hóa prompt AI với các tính năng:
- 9 loại prompt (tự động, viết lách, code, nghiên cứu, hình ảnh, video, v.v.)
- 3 mức độ sáng tạo (chính xác, cân bằng, sáng tạo)
- 4 quy tắc tuỳ chỉnh
- Streaming response theo thời gian thực
- Tích hợp Clerk để xác thực người dùng
- Quản lý gói dịch vụ (Miễn phí / Sinh viên / Pro / Pro Năm)

Phiên bản này sử dụng **OpenRouter** làm API trung gian, cho phép bạn dùng hầu hết các mô hình AI lớn (Claude, GPT-4, Gemini...) với một API key duy nhất.

---

## 2. Yêu cầu

- Tài khoản **Vercel** (Free tier hoạt động, Pro khuyến nghị để có streaming tốt hơn)
- Tài khoản **OpenRouter** với API key
- Tài khoản **GitHub** để lưu code và kết nối với Vercel

---

## 3. Hướng dẫn lấy OpenRouter API key

1. Truy cập [https://openrouter.ai/](https://openrouter.ai/)
2. Nhấn **Sign In** hoặc **Get Started** để đăng ký tài khoản
3. Sau khi đăng nhập, vào [https://openrouter.ai/keys](https://openrouter.ai/keys)
4. Nhấn **Create Key** → đặt tên cho key (ví dụ: `promptmaster-production`) → **Create**
5. Sao chép API key dạng `sk-or-v1-xxx...` và lưu lại ngay (chỉ hiển thị một lần)
6. Nạp credit: vào [https://openrouter.ai/credits](https://openrouter.ai/credits) → **Add Credits**
   - Có thể dùng $5 credit ban đầu miễn phí khi đăng ký lần đầu (tùy chương trình khuyến mãi)
   - Nạp tối thiểu $5 để bắt đầu sử dụng

---

## 4. Hướng dẫn deploy lên Vercel

### Bước 1: Đẩy code lên GitHub

```bash
# Di chuyển vào thư mục dự án
cd prompt-master-vercel

# Khởi tạo git repository
git init

# Thêm tất cả file
git add .

# Commit lần đầu
git commit -m "Initial commit: Prompt Master Vercel deployment"

# Tạo repository mới trên GitHub (https://github.com/new)
# Đặt tên repo, ví dụ: prompt-master
# Sau đó kết nối với remote:
git remote add origin https://github.com/YOUR_USERNAME/prompt-master.git

# Đẩy code lên GitHub
git branch -M main
git push -u origin main
```

### Bước 2: Import vào Vercel

1. Truy cập [https://vercel.com/new](https://vercel.com/new)
2. Nhấn **Import Git Repository**
3. Chọn repository `prompt-master` vừa tạo
4. Vercel sẽ tự động phát hiện cấu hình từ `vercel.json`

### Bước 3: Thêm Environment Variables

Trước khi deploy, thêm các biến môi trường:

| Tên biến | Giá trị | Bắt buộc |
|----------|---------|----------|
| `OPENROUTER_API_KEY` | `sk-or-v1-your-key-here` | ✅ |
| `OPENROUTER_MODEL` | `anthropic/claude-sonnet-4-20250514` | Không (có mặc định) |

Cách thêm:
1. Trong trang import, kéo xuống phần **Environment Variables**
2. Nhập `OPENROUTER_API_KEY` vào ô **Name**, dán API key vào ô **Value**
3. Nhấn **Add** để thêm biến thứ hai nếu muốn thay đổi model
4. Nhấn **Deploy**

### Bước 4: Chờ deploy hoàn tất

Vercel sẽ tự động cài đặt dependencies và build project. Sau khoảng 1-2 phút, bạn sẽ có URL dạng:
```
https://prompt-master-xxx.vercel.app
```

---

## 5. Cấu hình domain tùy chỉnh

Để dùng domain riêng như `promptmaster.sbs`:

1. Vào **Vercel Dashboard** → chọn project → **Settings** → **Domains**
2. Nhấn **Add Domain** → nhập `promptmaster.sbs` → **Add**
3. Vercel sẽ hiển thị DNS records cần cấu hình

### Cập nhật DNS tại nhà cung cấp domain

Thêm hoặc chỉnh sửa DNS records theo hướng dẫn của Vercel:

**Nếu dùng apex domain (`promptmaster.sbs`):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**Nếu dùng subdomain (`www.promptmaster.sbs`):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

DNS thường propagate trong 10-30 phút. Vercel sẽ tự cấp SSL certificate miễn phí.

---

## 6. Cập nhật Clerk domain

Nếu bạn chuyển sang domain mới (ví dụ `promptmaster.sbs`), cần cập nhật cấu hình Clerk:

1. Đăng nhập [https://dashboard.clerk.com/](https://dashboard.clerk.com/)
2. Chọn ứng dụng **Prompt Master**
3. Vào **Domains** → **Add domain** → nhập `promptmaster.sbs`
4. Làm theo hướng dẫn xác minh domain của Clerk

---

## 7. Thay đổi mô hình AI

Bạn có thể dễ dàng thay đổi model AI mà không cần sửa code:

### Danh sách model phổ biến trên OpenRouter

| Model | Tên trên OpenRouter | Chi phí ước tính |
|-------|--------------------|--------------------|
| Claude Sonnet 4 (khuyến nghị) | `anthropic/claude-sonnet-4-20250514` | ~$3/1M token |
| Claude Haiku 3.5 (tiết kiệm hơn) | `anthropic/claude-haiku-3.5` | ~$0.25/1M token |
| GPT-4o mini | `openai/gpt-4o-mini` | ~$0.15/1M token |
| Gemini Flash 1.5 | `google/gemini-flash-1.5` | ~$0.075/1M token |
| Gemini 2.0 Flash | `google/gemini-2.0-flash-001` | ~$0.1/1M token |

Xem thêm tại [https://openrouter.ai/models](https://openrouter.ai/models).

### Cách thay đổi model

1. Vào **Vercel Dashboard** → project → **Settings** → **Environment Variables**
2. Tìm `OPENROUTER_MODEL` → nhấn **Edit**
3. Thay đổi giá trị thành model mới, ví dụ: `anthropic/claude-haiku-3.5`
4. Nhấn **Save**
5. Vào **Deployments** → nhấn **Redeploy** để áp dụng thay đổi

---

## 8. Chi phí ước tính

### Vercel
- **Free tier**: Đủ để test, có giới hạn serverless function execution
- **Pro ($20/tháng)**: Khuyến nghị cho production, streaming hoạt động tốt hơn

### OpenRouter
Chi phí tính theo số token sử dụng (input + output):

| Kịch bản | Model | Chi phí ước tính/tháng |
|----------|-------|------------------------|
| 1.000 lần enhance | Claude Sonnet 4 | ~$3-5 |
| 1.000 lần enhance | Claude Haiku 3.5 | ~$0.3-0.5 |
| 1.000 lần enhance | GPT-4o mini | ~$0.2-0.3 |
| 5.000 lần enhance | Claude Haiku 3.5 | ~$1.5-2.5 |

> Mỗi lần enhance trung bình ~500 input tokens + ~800 output tokens = ~1.300 tokens/lần

### Tổng chi phí ví dụ
- Vercel Pro + 1.000 enhance/tháng với Claude Sonnet: **~$23-25/tháng**
- Vercel Free + 1.000 enhance/tháng với Claude Haiku: **~$0.3-0.5/tháng**

---

## 9. Cấu trúc project

```
prompt-master-vercel/
├── api/
│   └── index.py          ← FastAPI app xử lý /api/* routes
├── public/
│   ├── index.html        ← Giao diện chính
│   ├── style.css         ← Styles và design tokens
│   ├── base.css          ← Base reset styles
│   ├── app.js            ← Frontend logic
│   └── assets/
│       ├── qr-bank.jpg   ← QR code chuyển khoản
│       └── zalo-logo.jpg ← Logo Zalo
├── vercel.json           ← Cấu hình Vercel routing
├── requirements.txt      ← Python dependencies
├── .env.example          ← Mẫu biến môi trường
├── .gitignore
└── README.md
```

---

## 10. Phát triển local

Để chạy local trước khi deploy:

```bash
# Cài dependencies
pip install -r requirements.txt

# Tạo file .env từ mẫu
cp .env.example .env
# Chỉnh sửa .env, thêm OPENROUTER_API_KEY thực của bạn

# Chạy FastAPI server
uvicorn api.index:app --reload --port 8000

# Mở trình duyệt
open http://localhost:8000
```

---

## 11. Xử lý lỗi thường gặp

### Lỗi "OPENROUTER_API_KEY not set"
- Kiểm tra lại Environment Variables trong Vercel Dashboard
- Đảm bảo đã Redeploy sau khi thêm biến

### Lỗi 401 Unauthorized từ OpenRouter
- API key không hợp lệ hoặc hết hạn
- Tạo key mới tại [https://openrouter.ai/keys](https://openrouter.ai/keys)

### Lỗi 402 Payment Required từ OpenRouter
- Tài khoản OpenRouter hết credit
- Nạp thêm credit tại [https://openrouter.ai/credits](https://openrouter.ai/credits)

### Streaming không hoạt động
- Vercel Free tier có giới hạn timeout 10 giây cho serverless functions
- Nâng lên Vercel Pro để có timeout lên đến 300 giây

### Model không tồn tại
- Kiểm tra tên model chính xác tại [https://openrouter.ai/models](https://openrouter.ai/models)
- Model names phân biệt chữ hoa/thường

---

*Prompt Master — Built with Perplexity Computer*
