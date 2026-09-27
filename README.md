# Bảng giá cày thuê

Website xem giá cày thuê theo từng game, kèm trang quản trị. Không cần cài đặt gì.

## Chạy thử trên máy tính
1. Tải cả thư mục về máy (giữ nguyên cấu trúc thư mục).
2. Mở file **`index.html`** bằng Chrome, Edge hoặc Firefox để xem trang khách.
3. Mở file **`admin.html`** để vào trang quản trị. Mật khẩu mặc định: **`admin123`**.

Mẹo: mở trang khách và trang quản trị ở hai tab. Sửa giá trong quản trị, trang khách tự cập nhật.

## Cấu trúc
```
index.html          Trang khách
admin.html          Trang quản trị
assets/css/         base.css (dùng chung), site.css, admin.css
assets/js/data.js   Dữ liệu mặc định (game, danh mục, sản phẩm, cài đặt)
assets/js/core.js   Kho dữ liệu, biểu tượng, hộp thoại, thông báo
assets/js/app.js    Logic trang khách
assets/js/admin.js  Logic trang quản trị
KE-HOACH.md         Kế hoạch bố cục, hiệu ứng, chức năng
```

## Lưu ý về dữ liệu
- Chỉnh sửa trong trang quản trị được lưu **trong trình duyệt đang dùng**.
- Khi đăng web: vào **Quản trị › Sao lưu dữ liệu › Tải file data.js**, chép đè vào `assets/js/data.js` rồi tải lên hosting.
- Tên, giá, đánh giá khách hàng hiện có là **dữ liệu mẫu**, hãy thay bằng thông tin thật của shop.
- Mật khẩu admin chỉ là khóa giao diện. Muốn bảo mật thật cần máy chủ (xem mục 9 trong `KE-HOACH.md`).
