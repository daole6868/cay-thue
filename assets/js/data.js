/* =========================================================
   DỮ LIỆU MẶC ĐỊNH
   - Trang web đọc dữ liệu từ trình duyệt (localStorage) nếu admin đã chỉnh sửa,
     nếu chưa thì dùng dữ liệu trong file này.
   - Khi đăng web: vào Quản trị > Sao lưu dữ liệu > "Tải file data.js"
     rồi thay file này bằng file vừa tải.
   ========================================================= */
(function () {
  // [Tên game, chữ viết tắt, màu, mô tả, [[Tên danh mục, [[tên gói, giá, giá gốc, thời gian, nhãn], ...]], ...]]
  var SEED = [
    ["Liên Quân Mobile", "LQ", "#d4940b", "MOBA 5v5 phổ biến nhất Việt Nam", [
      ["Cày rank", [
        ["Đồng → Bạc", 40000, 0, "1 ngày", ""],
        ["Bạc → Vàng", 60000, 0, "1 ngày", ""],
        ["Vàng → Bạch Kim", 90000, 110000, "1–2 ngày", "hot"],
        ["Bạch Kim → Kim Cương", 150000, 0, "2 ngày", ""],
        ["Kim Cương → Tinh Anh", 250000, 300000, "2–3 ngày", "hot"],
        ["Tinh Anh → Cao Thủ", 400000, 0, "3–4 ngày", ""],
        ["Cao Thủ → Chiến Tướng", 800000, 0, "5–7 ngày", ""],
        ["Chiến Tướng → Chiến Thần", 1500000, 0, "7–10 ngày", "new"]
      ]],
      ["Cày thông thạo tướng", [
        ["Thông thạo A → S", 50000, 0, "1 ngày", ""],
        ["Thông thạo S → S+", 120000, 0, "2 ngày", ""],
        ["Danh hiệu tướng cấp tỉnh", 350000, 0, "3–5 ngày", "hot"],
        ["Danh hiệu tướng cấp quốc gia", 900000, 0, "7–10 ngày", ""]
      ]],
      ["Hồi điểm uy tín", [
        ["Hồi 10 điểm uy tín", 30000, 0, "1 ngày", ""],
        ["Hồi về 100 điểm", 90000, 0, "3 ngày", ""]
      ]],
      ["Cày sự kiện", [
        ["Trọn gói sự kiện tuần", 70000, 0, "7 ngày", ""],
        ["Cày vé quay trang phục", 100000, 120000, "5 ngày", ""]
      ]],
      ["Cày cấp tài khoản", [
        ["Cấp 1 → 15", 60000, 0, "2 ngày", ""],
        ["Cấp 15 → 30", 150000, 0, "4 ngày", ""]
      ]],
      ["Bảng ngọc", [
        ["Bộ ngọc cấp 3 trọn bộ", 120000, 0, "3 ngày", ""]
      ]],
      ["Leo top máy chủ", [
        ["Top 50 tướng máy chủ", 900000, 0, "7–10 ngày", ""]
      ]]
    ]],
    ["Free Fire", "FF", "#ea6a1c", "Sinh tồn 50 người, trận 10 phút", [
      ["Rank tử chiến", [
        ["Vàng → Bạch Kim", 60000, 0, "1 ngày", ""],
        ["Bạch Kim → Kim Cương", 120000, 0, "2 ngày", ""],
        ["Kim Cương → Huyền Thoại", 280000, 320000, "3–4 ngày", "hot"],
        ["Huyền Thoại → Thách Đấu", 600000, 0, "5–7 ngày", ""]
      ]],
      ["Rank sinh tồn", [
        ["Bạch Kim → Kim Cương", 100000, 0, "2 ngày", ""],
        ["Kim Cương → Huyền Thoại", 250000, 0, "3–5 ngày", ""]
      ]],
      ["Cày sự kiện", [
        ["Nhiệm vụ sự kiện trọn gói", 50000, 0, "3 ngày", "new"],
        ["Cày điểm vòng quay", 80000, 0, "4 ngày", ""]
      ]]
    ]],
    ["PUBG Mobile", "PM", "#5b8c1f", "Sinh tồn chiến thuật 100 người", [
      ["Cày rank", [
        ["Vàng → Bạch Kim", 80000, 0, "1–2 ngày", ""],
        ["Bạch Kim → Kim Cương", 160000, 0, "2–3 ngày", ""],
        ["Kim Cương → Vương Giả", 350000, 400000, "4–5 ngày", "hot"],
        ["Vương Giả → Chiến Thần", 700000, 0, "6–8 ngày", ""]
      ]],
      ["Cày thành tựu", [
        ["Gói 500 điểm thành tựu", 90000, 0, "3 ngày", ""],
        ["Danh hiệu Thợ Săn", 150000, 0, "4 ngày", ""]
      ]],
      ["Royale Pass", [
        ["Hoàn thành nhiệm vụ RP mùa", 200000, 0, "10 ngày", ""]
      ]]
    ]],
    ["Genshin Impact", "GI", "#1b93c9", "Nhập vai thế giới mở", [
      ["La Hoàn Thâm Cảnh", [
        ["Full 36 sao", 150000, 0, "1–2 ngày", "hot"],
        ["Tầng 9–12 lấy nguyên thạch", 90000, 0, "1 ngày", ""]
      ]],
      ["Nhà Hát Tưởng Tượng", [
        ["Hoàn thành mùa chế độ khó", 100000, 0, "1–2 ngày", "new"]
      ]],
      ["Khám phá bản đồ", [
        ["Mở 100% một khu vực", 180000, 220000, "3–4 ngày", ""],
        ["Nhặt rương và thần đồng", 120000, 0, "2–3 ngày", ""],
        ["Mở tượng thất thiên và điểm dịch chuyển", 60000, 0, "1 ngày", ""]
      ]],
      ["Nhiệm vụ cốt truyện", [
        ["Một chương Ma Thần", 60000, 0, "1 ngày", ""],
        ["Nhiệm vụ truyền thuyết nhân vật", 40000, 0, "1 ngày", ""]
      ]],
      ["Farm nguyên liệu", [
        ["Nguyên liệu đột phá 1 nhân vật", 80000, 0, "2 ngày", ""],
        ["Farm thánh di vật 7 ngày nhựa", 140000, 0, "7 ngày", ""],
        ["Nguyên liệu thiên phú 1 nhân vật", 90000, 0, "3 ngày", ""]
      ]],
      ["Ủy thác hằng ngày", [
        ["Gói 30 ngày", 200000, 250000, "30 ngày", ""],
        ["Gói 7 ngày", 55000, 0, "7 ngày", ""]
      ]]
    ]],
    ["Đấu Trường Chân Lý", "ĐT", "#7c4ddb", "Cờ nhân phẩm của Riot Games", [
      ["Leo rank", [
        ["Bạch Kim → Lục Bảo", 120000, 0, "2 ngày", ""],
        ["Lục Bảo → Kim Cương", 220000, 0, "3 ngày", ""],
        ["Kim Cương → Cao Thủ", 450000, 500000, "4–6 ngày", "hot"]
      ]],
      ["Cày nhiệm vụ Pass", [
        ["Hoàn thành Pass mùa", 150000, 0, "7 ngày", ""]
      ]]
    ]],
    ["Valorant", "VL", "#e0474c", "Bắn súng chiến thuật 5v5", [
      ["Leo rank", [
        ["Sắt → Đồng", 80000, 0, "1 ngày", ""],
        ["Đồng → Bạc", 120000, 0, "2 ngày", ""],
        ["Bạc → Vàng", 180000, 0, "2–3 ngày", ""],
        ["Vàng → Bạch Kim", 280000, 0, "3–4 ngày", "hot"],
        ["Bạch Kim → Kim Cương", 450000, 0, "4–6 ngày", ""],
        ["Kim Cương → Siêu Việt", 800000, 0, "6–8 ngày", ""]
      ]],
      ["Placement đầu mùa", [
        ["5 trận xếp hạng đầu mùa", 150000, 0, "1 ngày", "new"]
      ]],
      ["Cày Battle Pass", [
        ["Hoàn thành Battle Pass", 250000, 0, "10 ngày", ""]
      ]]
    ]]
  ];

  function slug(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  var games = [], cats = [], prods = [], gi = 0, ci = 0, pi = 0;
  SEED.forEach(function (g) {
    var gid = "g" + (++gi);
    games.push({ id: gid, name: g[0], slug: slug(g[0]), initials: g[1], color: g[2], desc: g[3], visible: true });
    g[4].forEach(function (c) {
      var cid = "c" + (++ci);
      cats.push({ id: cid, gameId: gid, name: c[0], visible: true });
      c[1].forEach(function (p) {
        prods.push({
          id: "p" + (++pi), catId: cid, name: p[0], price: p[1], oldPrice: p[2],
          time: p[3], badge: p[4], desc: "", notes: "", visible: true
        });
      });
    });
  });

  window.DEFAULT_DATA = {
    version: 1,
    updatedAt: Date.UTC(2026, 8, 27, 3, 0, 0),
    settings: {
      siteName: "Cày Thuê 24h",
      tagline: "Bảng giá cày thuê minh bạch",
      heroTitle: "Xem giá cày thuê chỉ trong *3 bước*",
      heroText: "Chọn game, chọn danh mục, chọn gói. Giá niêm yết rõ ràng cho từng mức rank, cam kết hoàn tiền nếu không đạt.",
      announcementOn: true,
      announcement: "Mùa giải mới: giảm đến 20% các gói cày rank. Áp dụng đến hết 31/10.",
      zalo: "0900 000 000",
      phone: "0900 000 000",
      youtube: "",
      tiktok: "",
      instagram: "",
      telegram: "",
      discord: "",
      facebook: "https://facebook.com/",
      messenger: "https://m.me/",
      email: "lienhe@example.com",
      hours: "8:00 – 23:00 hằng ngày",
      statOrders: 12500,
      statBoosters: 48,
      statRating: 4.9,
      accent: "cobalt",
      defaultDesc: "Booster có kinh nghiệm chơi trực tiếp trên tài khoản của bạn, không dùng phần mềm thứ ba. Tiến độ được báo qua Zalo mỗi ngày. Nếu không đạt mức đã cam kết, bạn được hoàn tiền phần chưa hoàn thành.",
      defaultNotes: "Không đăng nhập trong thời gian cày.\nGiá có thể thay đổi.\nLiên hệ admin trước khi chuyển khoản để xác nhận.",
      maintenanceOn: false,
      maintenanceText: "Website đang cập nhật bảng giá. Vui lòng quay lại sau ít phút hoặc nhắn Zalo để được báo giá ngay.",
      passwordHash: "",

      // Chân trang
      footerAbout: "Bảng giá cày thuê minh bạch cho game thủ bận rộn. Chơi tay 100%, báo tiến độ mỗi ngày, hoàn tiền nếu không đạt.",
      footerSocial: true,
      footerCols: [
        { id: "fc1", type: "services", title: "Dịch vụ", visible: true, limit: 5, items: [] },
        { id: "fc2", type: "contact", title: "Liên hệ", visible: true, items: [] },
        { id: "fc3", type: "links", title: "Cộng đồng", visible: true, items: [
          { id: "fi1", icon: "facebook", name: "Fanpage Facebook", desc: "Cập nhật ưu đãi mới", url: "" },
          { id: "fi2", icon: "tiktok", name: "TikTok", desc: "Video kết quả cày thuê", url: "https://tiktok.com/" },
          { id: "fi3", icon: "discord", name: "Discord", desc: "Giao lưu và nhận quà", url: "https://discord.gg/" }
        ] }
      ],
      footerCopyright: "© {year} {site}. Giá có thể thay đổi theo mùa giải.",
      footerAdminLink: true,

      // Thanh liên hệ nhanh
      quick: {
        on: true,
        auto: true,
        autoSec: 2,
        side: "right",
        title: "Hỗ trợ nhanh",
        sub: "Phản hồi trong 5 phút",
        items: [
          { id: "q1", icon: "zalo", name: "Zalo", desc: "Tư vấn & báo giá nhanh", url: "", visible: true },
          { id: "q2", icon: "messenger", name: "Messenger", desc: "Nhắn tin qua Facebook", url: "", visible: true },
          { id: "q3", icon: "phone", name: "Gọi điện", desc: "", url: "", visible: true },
          { id: "q4", icon: "telegram", name: "Telegram", desc: "Nhận đơn 24/7", url: "https://t.me/", visible: false },
          { id: "q5", icon: "discord", name: "Discord", desc: "Cộng đồng game thủ", url: "https://discord.gg/", visible: false }
        ]
      }
    },
    games: games,
    cats: cats,
    prods: prods,
    faqs: [
      { id: "f1", visible: true, q: "Cày thuê có an toàn cho tài khoản không?", a: "Booster chơi thủ công, không dùng phần mềm hay hack. Tài khoản được đăng nhập từ Việt Nam để tránh bị khóa vì đổi vùng. Sau khi hoàn thành, bạn nên đổi mật khẩu." },
      { id: "f2", visible: true, q: "Tôi thanh toán như thế nào?", a: "Chuyển khoản ngân hàng hoặc ví điện tử sau khi shop xác nhận lịch. Gói trên 500.000đ có thể đặt cọc 50% và thanh toán phần còn lại khi hoàn thành." },
      { id: "f3", visible: true, q: "Nếu không đạt mức đã đặt thì sao?", a: "Shop hoàn tiền phần chưa hoàn thành theo tỷ lệ tiến độ. Ví dụ đặt 10 sao, mới cày được 6 sao thì hoàn 40% giá gói." },
      { id: "f4", visible: true, q: "Trong lúc cày tôi có được vào game không?", a: "Bạn không nên đăng nhập vì sẽ đẩy booster ra khỏi trận. Nếu cần chơi, hãy nhắn trước để shop tạm dừng." },
      { id: "f5", visible: true, q: "Bao lâu thì bắt đầu cày?", a: "Thường trong vòng 2 giờ sau khi xác nhận, trong khung giờ làm việc. Thời gian hoàn thành ghi ở từng gói." },
      { id: "f6", visible: true, q: "Giá trên web đã là giá cuối cùng chưa?", a: "Đây là giá niêm yết. Với yêu cầu đặc biệt như chọn tướng, giữ tỉ lệ thắng hoặc cày gấp, shop sẽ báo giá riêng qua Zalo." }
    ],
    reviews: [
      { id: "r1", visible: true, name: "Minh Khoa", game: "Liên Quân Mobile", stars: 5, text: "Đặt gói Kim Cương lên Tinh Anh, 2 ngày là xong. Ngày nào cũng được gửi ảnh tiến độ." },
      { id: "r2", visible: true, name: "Thu Hà", game: "Genshin Impact", stars: 5, text: "Nhờ làm La Hoàn full sao, giá rõ ràng ngay trên web nên không phải hỏi đi hỏi lại." },
      { id: "r3", visible: true, name: "Quốc Bảo", game: "Valorant", stars: 4, text: "Leo từ Vàng lên Bạch Kim đúng hẹn. Hơi chậm hơn dự kiến nửa ngày nhưng có báo trước." },
      { id: "r4", visible: true, name: "Lan Anh", game: "Free Fire", stars: 5, text: "Shop tư vấn nhiệt tình, cày xong còn hướng dẫn đổi mật khẩu cho an toàn." },
      { id: "r5", visible: true, name: "Đức Huy", game: "PUBG Mobile", stars: 5, text: "Lên Vương Giả trong 4 ngày, tỉ lệ thắng còn cao hơn lúc tự chơi." },
      { id: "r6", visible: true, name: "Hoàng Nam", game: "Đấu Trường Chân Lý", stars: 5, text: "Gói đang giảm giá nên rất hời. Sẽ quay lại mùa sau." }
    ]
  };
})();
