# Kế hoạch website bảng giá cày thuê

## 1. Mục tiêu
- Khách xem giá nhanh theo luồng **Game → Danh mục → Sản phẩm → Chi tiết**, không cần ảnh.
- Chủ shop tự sửa giá, thêm/bớt game, danh mục, sản phẩm qua **trang quản trị**, không đụng code.
- Giao diện gọn, màu ổn định, bo góc đều, nhiều hiệu ứng nhưng không rối mắt. Dùng tốt trên điện thoại.

## 2. Sơ đồ trang
| Trang | Nội dung |
|---|---|
| `index.html` (trang khách) | Thanh thông báo · Đầu trang · Hero + gói nổi bật · **Bảng giá** · Quy trình · Cam kết · Đánh giá · Hỏi đáp · Kêu gọi liên hệ · Chân trang |
| `admin.html` (quản trị) | Đăng nhập · Tổng quan · Game · Danh mục · Sản phẩm · Hỏi đáp & đánh giá · Cài đặt · Sao lưu dữ liệu |

## 3. Luồng chọn giá (phần chính)
1. **Ô chọn game**: thanh xổ “Vui lòng chọn game”, có ô tìm game, dùng được bàn phím (↑ ↓ Enter Esc).
2. **Ô danh mục**: khóa, ghi “Vui lòng chọn game trước”. Chọn game xong ô giãn ra; hiện tối đa **5 danh mục**, nhiều hơn thì kéo xuống, có dòng “Kéo xuống để xem thêm N mục”. Mỗi danh mục ghi số gói và **giá thấp nhất**.
3. **Ô sản phẩm**: tương tự, hiện giá ngay trên từng dòng; có sắp xếp giá thấp/cao và lọc “Đang giảm”.
4. **Chi tiết**: giá (đếm số chạy), giá gốc gạch ngang, % giảm, số tiền tiết kiệm, thời gian, mã gói, mô tả, lưu ý; nút **Nhắn Zalo** (tự sao chép thông tin gói), Messenger, sao chép thông tin, sao chép link gói, chọn lại.
- **Đổi game → xóa lựa chọn danh mục và sản phẩm**; đổi danh mục → xóa sản phẩm.
- Thanh tiến trình 4 bước phía trên đổi màu theo bước hiện tại.
- Máy tính: chi tiết nằm cột phải, dính khi cuộn. Điện thoại: chi tiết nằm dưới, tự cuộn tới.

## 4. Chức năng phụ trang khách
- Tìm kiếm toàn bộ gói (**Ctrl K** hoặc phím **/**), không phân biệt dấu (gõ “kim cuong” vẫn ra).
- “Đã xem gần đây”, link chia sẻ từng gói (`index.html#sp-p5`).
- Gói nổi bật tự chuyển trong hero (dừng khi rê chuột).
- Giao diện sáng/tối, nút liên hệ nổi, nút lên đầu trang có vòng tiến độ cuộn.
- Chế độ bảo trì, thanh thông báo đầu trang (khách tắt được).
- Tự cập nhật khi admin sửa ở tab khác.

## 5. Hệ thống thiết kế
- **Chữ**: Be Vietnam Pro (hỗ trợ tiếng Việt đầy đủ), JetBrains Mono cho mã gói.
- **Màu**: nền xám xanh nhạt, chữ xanh than, màu chủ đạo xanh cobalt (đổi được 6 màu trong Cài đặt), giá màu đỏ cam, xanh lá cho trạng thái hoàn thành.
- **Bo góc thống nhất**: 8px (ô nhập, nút nhỏ) · 12px (nút, dòng lựa chọn) · 16px (thẻ, khung).
- Có bản màu tối riêng, không chỉ đảo màu.

## 6. Hiệu ứng
| Chỗ | Hiệu ứng |
|---|---|
| Tải trang | Nội dung hero hiện lần lượt, nền mờ trôi chậm, số liệu đếm lên |
| Cuộn | Các khối hiện dần, đầu trang thu gọn + làm mờ nền, menu tự đánh dấu mục đang xem |
| Chọn giá | Ô giãn ra mượt, danh sách hiện lần lượt từng dòng, chấm radio bật nảy, thanh tiến trình chạy |
| Chi tiết | Trượt vào, giá chạy số, nhãn giảm giá có ánh sáng quét |
| Nút | Gợn sóng khi bấm, nổi lên khi rê chuột |
| Khác | Hỏi đáp mở/đóng mượt, đánh giá chạy ngang, menu điện thoại trượt, nút liên hệ nhấp nháy |
- Tôn trọng cài đặt “giảm chuyển động” của hệ điều hành.

## 7. Trang quản trị
- **Đăng nhập** (mặc định `admin123`, đổi trong Cài đặt).
- **Tổng quan**: số game/danh mục/sản phẩm, gói đang giảm, lượt xem, biểu đồ sản phẩm theo game, top gói xem nhiều, danh sách “cần chú ý”.
- **Game**: thêm/sửa/xóa, chọn màu + chữ viết tắt, ẩn/hiện, kéo thả sắp xếp.
- **Danh mục**: lọc theo game, thêm/sửa/xóa, ẩn/hiện, sắp xếp.
- **Sản phẩm**: tìm, lọc theo game/danh mục/trạng thái, sắp xếp theo cột; sửa nhanh giá ngay trên bảng; nhân bản; xem trước khi lưu; “Lưu & thêm tiếp”.
  - Chọn nhiều → hiện/ẩn, **tăng/giảm giá theo %**, chuyển danh mục, xóa.
- **Hỏi đáp & đánh giá**: thêm/sửa/xóa/ẩn/sắp xếp.
- **Cài đặt**: tên shop, tiêu đề, thông báo, liên hệ, số liệu, màu chủ đạo, nội dung mặc định, bảo trì, đổi mật khẩu.
- **Sao lưu**: tải .json, tải `data.js` để đăng web, nhập file, khôi phục dữ liệu gốc.
- Mọi thao tác xóa đều có nút **Hoàn tác**.

## 8. Dữ liệu
```
Game      : id, name, initials, color, desc, visible
Danh mục  : id, gameId, name, visible
Sản phẩm  : id, catId, name, price, oldPrice, time, badge(hot/new), desc, notes, visible
Cài đặt   : siteName, tagline, heroTitle, zalo, facebook, accent, maintenanceOn, ...
```
Thứ tự trong danh sách = thứ tự hiển thị.

## 9. Công nghệ & giai đoạn tiếp theo
**Giai đoạn 1 (bản này):** HTML/CSS/JS thuần, không cần cài đặt, mở file là chạy. Dữ liệu admin lưu trong trình duyệt; muốn đăng web thì tải `data.js` và chép đè.

**Giai đoạn 2 (khi đăng thật):** chuyển dữ liệu lên máy chủ (Supabase, Firebase hoặc Google Sheet) để:
- Sửa giá ở đâu, mọi khách thấy ngay, không cần chép file.
- Đăng nhập admin bảo mật thật (mật khẩu hiện tại chỉ là khóa giao diện).
- Thống kê lượt xem của mọi khách, không chỉ trên một máy.
