/**
 * PHARMA OS - DATABASE & SESSION MANAGEMENT
 */
const db = new Dexie("PharmaOS_DB");

db.version(1).stores({
  users: "++id, username, password, full_name, role",
  products:
    "++id, name, type, import_price, sell_price, stock_initial, total_export, total_import, stock, status",
  orders: "order_id, created_at, user_id, total_amount, payment_type",
  order_items: "++id, order_id, product_id, quantity, price",
  import_history: "++id, name, time, user_id",
});

const AuthManager = {
  // Xử lý đăng nhập
  async login(username, password) {
    const user = await db.users.where("username").equals(username).first();
    if (user && user.password === password) {
      const session = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        loginTime: new Date().getTime(),
      };
      localStorage.setItem("user_session", JSON.stringify(session));
      return true;
    }
    return false;
  },

  // Đăng xuất và xóa session
  logout() {
    localStorage.removeItem("user_session");
    window.location.href = "login.html";
  },

  // Kiểm tra quyền truy cập
  checkSession() {
    const isLoginPage = window.location.href.includes("login.html");
    const sessionStr = localStorage.getItem("user_session");

    if (!sessionStr) {
      if (!isLoginPage) window.location.href = "login.html";
      return null;
    }

    const session = JSON.parse(sessionStr);
    const now = new Date().getTime();
    const hoursDiff = (now - session.loginTime) / (1000 * 60 * 60);

    // 1. Kiểm tra hết hạn (20 giờ)
    if (hoursDiff >= 20) {
      this.logout();
      return null;
    }

    // 2. Nếu đang ở login mà đã có session -> vào pos.html
    if (isLoginPage) {
      window.location.href = "pos.html";
    }

    // 3. TỰ ĐỘNG ĐIỀN THÔNG TIN USER VÀO SIDEBAR (Dùng cho mọi trang)
    // Dùng setTimeout để đảm bảo HTML đã load xong các thẻ ID
    setTimeout(() => {
      const nameEl = document.getElementById("user-name-display");
      const roleEl = document.getElementById("user-role-display");
      const avatarEl = document.getElementById("user-avatar");

      if (nameEl) nameEl.innerText = session.full_name;
      if (roleEl) roleEl.innerText = session.role;
      if (avatarEl)
        avatarEl.innerText = session.full_name.charAt(0).toUpperCase();

      // Kích hoạt menu dropdown nếu có
      this.setupUIListeners();
    }, 50);

    return session;
  },

  // Hàm này giúp nút Avatar có thể click được ở bất kỳ trang nào
  setupUIListeners() {
    const menuBtn = document.getElementById("user-menu-btn");
    const dropdown = document.getElementById("user-dropdown");
    if (menuBtn && dropdown) {
      menuBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("hidden");
      };
      document.addEventListener("click", () => {
        if (dropdown) dropdown.classList.add("hidden");
      });
    }
  },
};

// =============================
// KHỞI TẠO DỮ LIỆU MẪU
// =============================
db.on("ready", async () => {
  const userCount = await db.users.count();
  if (userCount === 0) {
    console.log("Database trống, đang nạp dữ liệu mẫu...");
    // Nạp User admin mặc định
    await db.users.add({
      username: "admin",
      password: "123",
      full_name: "Dat Doan",
      role: "Admin",
    });

    // Nạp Products mẫu (Chỉ nạp khi thực sự trống)
    await db.products.bulkAdd([
      {
        name: "Amoxicillin 500mg",
        type: "Viên",
        import_price: 80000,
        sell_price: 120000,
        stock_initial: 100,
        total_import: 0,
        total_export: 0,
        stock: 100,
        status: "active",
        note: "",
      },
    ]);
  }

  // TỰ ĐỘNG CẬP NHẬT SIDEBAR SAU KHI DB READY
  const sessionStr = localStorage.getItem("user_session");
  if (sessionStr) {
    const session = JSON.parse(sessionStr);
    const user = await db.users.get(session.id);
    if (user) {
      const userNameEl = document.getElementById("user-name-display");
      const userRoleEl = document.getElementById("user-role-display");
      const avatarEl = document.getElementById("user-avatar");

      if (userNameEl) userNameEl.innerText = user.full_name;
      if (userRoleEl) userRoleEl.innerText = user.role;
      if (avatarEl) avatarEl.innerText = user.full_name.charAt(0).toUpperCase();
    }
  }

  const menuBtn = document.getElementById("user-menu-btn");
  const dropdown = document.getElementById("user-dropdown");
  if (menuBtn && dropdown) {
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("hidden");
    };
  }
});

// =============================
// FIX QUAN TRỌNG: GÁN RA WINDOW
// =============================
window.db = db;
window.AuthManager = AuthManager;

// =============================
// CHẠY AUTH CHECK KHI LOAD TRANG
// =============================
document.addEventListener("DOMContentLoaded", () => {
  AuthManager.checkSession();
});
