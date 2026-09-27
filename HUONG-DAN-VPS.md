# Hướng dẫn đưa website lên VPS

Áp dụng cho VPS **Ubuntu 22.04 / 24.04** (Debian làm tương tự). Mỗi khối lệnh chép nguyên vào terminal.

Kết quả sau khi làm xong:
- Web chạy bằng `node server.js`, được **PM2** giữ chạy 24/7 và tự bật lại khi VPS khởi động lại.
- **Nginx** đứng trước, gắn tên miền và **HTTPS** miễn phí (Let's Encrypt).
- Dữ liệu bảng giá, mật khẩu, lượt xem nằm trong thư mục `data/` trên VPS. Sửa ở trang quản trị là mọi khách đều thấy.

---

## Bước 0. Chuẩn bị
- Địa chỉ IP VPS và tài khoản `root` (hoặc user có quyền `sudo`).
- (Nên có) một tên miền. Vào trang quản lý tên miền, tạo **bản ghi A** trỏ `@` và `www` về IP VPS.

Đăng nhập VPS từ máy tính (Windows dùng PowerShell hoặc PuTTY):
```bash
ssh root@IP_VPS
```

## Bước 1. Cài Node.js 20, Git, Nginx
```bash
apt update && apt -y upgrade
apt -y install curl git nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt -y install nodejs
npm install -g pm2
node -v    # phải ra v20.x
```

## Bước 2. Tải code về VPS
```bash
mkdir -p /var/www && cd /var/www
git clone -b claude/stoic-ptolemy-oflfvm https://github.com/daole6868/cay-thue.git bang-gia
cd bang-gia
```
Nếu repo đang để **Private**, GitHub sẽ hỏi tài khoản:
- Username: tên GitHub của bạn.
- Password: dán **Personal access token**. Tạo ở GitHub › Settings › Developer settings › Personal access tokens › Fine-grained tokens, chọn repo `cay-thue`, quyền *Contents: Read-only*.

## Bước 3. Chạy thử
```bash
cd /var/www/bang-gia
ADMIN_PASSWORD='MatKhauManh123' node server.js
```
- `ADMIN_PASSWORD` là mật khẩu quản trị **lần đầu**. Không đặt thì mật khẩu là `admin123`.
- Mở trình duyệt: `http://IP_VPS:3000` (trang khách) và `http://IP_VPS:3000/admin` (quản trị).
- Nếu không vào được, mở tạm cổng: `ufw allow 3000`.
- Thấy chạy đúng thì bấm **Ctrl + C** để dừng, sang bước 4.

## Bước 4. Chạy nền 24/7 bằng PM2
```bash
cd /var/www/bang-gia
HOST=127.0.0.1 pm2 start server.js --name bang-gia
pm2 save
pm2 startup     # chạy thêm dòng lệnh mà nó in ra (nếu có)
```
`HOST=127.0.0.1` nghĩa là chỉ Nginx gọi được vào cổng 3000, người ngoài không vào thẳng được.

Các lệnh hay dùng:
```bash
pm2 status              # xem trạng thái
pm2 logs bang-gia       # xem nhật ký (đăng nhập, lỗi...)
pm2 restart bang-gia    # khởi động lại
```

## Bước 5. Gắn tên miền bằng Nginx
```bash
cp /var/www/bang-gia/deploy/nginx.conf /etc/nginx/sites-available/bang-gia
nano /etc/nginx/sites-available/bang-gia     # sửa ten-mien-cua-ban.vn thành tên miền thật, Ctrl+O Enter để lưu, Ctrl+X để thoát
ln -s /etc/nginx/sites-available/bang-gia /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```
Chưa có tên miền? Trong file nginx để `server_name _;` rồi vào bằng `http://IP_VPS`.

## Bước 6. Bật HTTPS (bắt buộc nên làm để đăng nhập an toàn)
```bash
apt -y install certbot python3-certbot-nginx
certbot --nginx -d ten-mien-cua-ban.vn -d www.ten-mien-cua-ban.vn
```
Certbot tự gia hạn chứng chỉ, bạn không cần làm gì thêm.

## Bước 7. Tường lửa
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw delete allow 3000 2>/dev/null
ufw enable
```

---

## Cập nhật code khi có bản mới
```bash
cd /var/www/bang-gia
git pull
pm2 restart bang-gia
```
Thư mục `data/` không nằm trong git nên **cập nhật code không làm mất bảng giá**.

## Dữ liệu và sao lưu
| File | Nội dung |
|---|---|
| `data/db.json` | Toàn bộ game, danh mục, sản phẩm, cài đặt |
| `data/auth.json` | Mật khẩu quản trị (đã mã hóa) |
| `data/views.json` | Lượt xem từng gói |
| `data/uploads/` | Ảnh đã tải lên (ảnh xem trước khi gửi link) |
| `data/backups/` | Server tự sao lưu `db.json` trước khi ghi (tối đa 10 phút một bản, giữ 60 bản gần nhất) |

Nên tải bản sao lưu về máy định kỳ: trong **Quản trị › Sao lưu dữ liệu › Tải bản sao lưu (.json)**.

Khôi phục một bản sao lưu cũ trên VPS:
```bash
cd /var/www/bang-gia/data
ls backups/
cp backups/db-2026-....json db.json
pm2 restart bang-gia
```

## Quên mật khẩu quản trị
```bash
cd /var/www/bang-gia
node server.js --set-password MatKhauMoi123
pm2 restart bang-gia
```

## Chuyển dữ liệu đang có trên máy tính lên VPS
Nếu trước đây bạn đã sửa giá khi mở file trên máy (dữ liệu nằm trong trình duyệt):
1. Trên máy: mở `admin.html` › Sao lưu dữ liệu › **Tải bản sao lưu (.json)**.
2. Trên web VPS: đăng nhập `/admin` › Sao lưu dữ liệu › **kéo thả file .json** vừa tải.

## Kiểm tra nhanh khi có sự cố
| Hiện tượng | Cách xử lý |
|---|---|
| Vào web báo 502 Bad Gateway | `pm2 status` xem server có chạy không, `pm2 logs bang-gia` xem lỗi |
| Sửa giá báo "Chưa lưu được lên máy chủ" | Phiên đăng nhập hết hạn (12 giờ), đăng nhập lại |
| Báo "Sai mật khẩu quá nhiều lần" | Chờ 15 phút, hoặc đổi mật khẩu bằng lệnh ở trên |
| Báo `Cổng 3000 đang có chương trình khác dùng` (EADDRINUSE) | Cổng đã bị web khác chiếm. Xem bằng `ss -ltnp \| grep :3000`, hoặc chạy cổng khác: `PORT=3100 node server.js` |
| Đổi cổng khác 3000 | `PORT=4000 HOST=127.0.0.1 pm2 start server.js --name bang-gia`, sửa `proxy_pass` trong nginx cho khớp |
