# Bảng giá cày thuê

Website xem giá cày thuê theo từng game, kèm trang quản trị. Không cần cài đặt gì.

## Chạy trên VPS (đầy đủ chức năng)
Xem **[HUONG-DAN-VPS.md](HUONG-DAN-VPS.md)**. Tóm tắt: cài Node.js 18+ rồi chạy `node server.js`, không cần `npm install`.
Khi chạy bằng server, dữ liệu lưu chung trên VPS (`data/db.json`), mọi khách thấy bảng giá mới trong vòng 30 giây, đăng nhập quản trị được mã hóa và giới hạn số lần sai.

## Chạy thử trên máy tính (không cần server)
1. Tải cả thư mục về máy (giữ nguyên cấu trúc thư mục).
2. Mở file **`index.html`** bằng Chrome, Edge hoặc Firefox để xem trang khách.
3. Mở file **`admin.html`** để vào trang quản trị. Mật khẩu mặc định: **`admin123`**.

Mẹo: mở trang khách và trang quản trị ở hai tab. Sửa giá trong quản trị, trang khách tự cập nhật.

## Cấu trúc
```
server.js           Máy chủ Node.js: phục vụ trang, lưu dữ liệu, đăng nhập
deploy/nginx.conf   Cấu hình nginx mẫu cho tên miền
HUONG-DAN-VPS.md    Hướng dẫn đưa lên VPS
index.html          Trang khách
admin.html          Trang quản trị
assets/css/         base.css (dùng chung), site.css, admin.css
assets/js/data.js   Dữ liệu mặc định (game, danh mục, sản phẩm, cài đặt)
assets/js/core.js   Kho dữ liệu, biểu tượng, hộp thoại, thông báo
assets/js/app.js    Logic trang khách
assets/js/admin.js  Logic trang quản trị
KE-HOACH.md         Kế hoạch bố cục, hiệu ứng, chức năng
```

## Các mục quản trị
Tổng quan · Game · Danh mục · Sản phẩm (mô tả/lưu ý: Mặc định / Để trống / Tùy chỉnh) · Hỏi đáp & đánh giá · **Chân trang** (giới thiệu, các cột, link, dòng bản quyền) · **Liên hệ nhanh** (thanh cạnh màn hình, tự hiện vài giây) · Cài đặt · Sao lưu dữ liệu.

## Lưu ý về dữ liệu
- Chạy bằng `server.js`: dữ liệu lưu trên máy chủ tại `data/` (không đưa lên git).
- Mở file trực tiếp không qua server: chỉnh sửa chỉ lưu **trong trình duyệt đang dùng**.
- Tên, giá, đánh giá khách hàng hiện có là **dữ liệu mẫu**, hãy thay bằng thông tin thật của shop.
- Khi mở file trực tiếp, mật khẩu admin chỉ là khóa giao diện. Chạy bằng `server.js` thì mật khẩu được kiểm tra trên máy chủ.
