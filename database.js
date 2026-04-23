/**
 * PHARMA OS - DATABASE & SESSION MANAGEMENT
 */
const db = new Dexie("PharmaOS_DB");

// DB version 2: Bảng login_history và các trường nhân sự
db.version(2).stores({
  users: "++id, username, password, full_name, role, employee_code, status",
  products:
    "++id, name, type, import_price, sell_price, stock_initial, total_export, total_import, stock, status",
  orders: "order_id, created_at, user_id, total_amount, payment_type",
  order_items: "++id, order_id, product_id, quantity, price",
  import_history: "++id, name, time, user_id",
  login_history: "++id, user_id, action, timestamp",
});

const AuthManager = {
  // Xử lý đăng nhập
  async login(username, password) {
    const user = await db.users.where("username").equals(username).first();
    if (user && user.password === password) {
      const now = new Date().getTime();
      const session = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        loginTime: now,
      };
      localStorage.setItem("user_session", JSON.stringify(session));

      // Cập nhật trạng thái và lưu lịch sử
      await db.users.update(user.id, { status: "online" });
      await db.login_history.add({
        user_id: user.id,
        action: "login",
        timestamp: now,
      });

      return true;
    }
    return false;
  },

  // Đăng xuất và xóa session
  async logout() {
    const sessionStr = localStorage.getItem("user_session");
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      // Cập nhật trạng thái và lưu lịch sử
      await db.users.update(session.id, { status: "offline" });
      await db.login_history.add({
        user_id: session.id,
        action: "logout",
        timestamp: new Date().getTime(),
      });
    }

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

    // 3. TỰ ĐỘNG ĐIỀN THÔNG TIN USER VÀO SIDEBAR
    setTimeout(() => {
      const nameEl = document.getElementById("user-name-display");
      const roleEl = document.getElementById("user-role-display");
      const avatarEl = document.getElementById("user-avatar");

      if (nameEl) nameEl.innerText = session.full_name;
      if (roleEl) roleEl.innerText = session.role;
      if (avatarEl)
        avatarEl.innerText = session.full_name.charAt(0).toUpperCase();

      this.setupUIListeners();
    }, 50);

    return session;
  },

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

db.on("ready", async () => {
  const userCount = await db.users.count();
  if (userCount === 0) {
    console.log("Database trống, đang nạp dữ liệu mẫu...");
    await db.users.add({
      username: "admin",
      password: "123",
      full_name: "Admin System",
      role: "Admin",
      employee_code: "NV001",
      status: "offline",
    });

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
});

async function initDB() {
  await db.open();
}

document.addEventListener("DOMContentLoaded", () => {
  initDB();
  AuthManager.checkSession();
});
