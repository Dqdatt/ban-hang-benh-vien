import Dexie from "dexie";

export const db = new Dexie("PharmaOS_DB");

db.version(2).stores({
  users: "++id, username, password, full_name, role, employee_code, status",
  products:
    "++id, name, type, import_price, sell_price, stock_initial, total_export, total_import, stock, status, note",
  orders:
    "order_id, created_at, user_id, customer_name, other_costs, total_amount, payment_type",
  order_items: "++id, order_id, product_id, quantity, price",
  import_history:
    "++id, name, unit, qty, imPrice, selPrice, total, note, time, user_id",
  login_history: "++id, user_id, action, timestamp",
});

export const AuthManager = {
  async login(username, password) {
    const user = await db.users.where("username").equals(username).first();
    if (user && user.password === password) {
      await db.users.update(user.id, { status: "online" });
      await db.login_history.add({
        user_id: user.id,
        action: "login",
        timestamp: Date.now(),
      });
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

  async logout() {
    const sessionStr = localStorage.getItem("user_session");
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      await db.users.update(session.id, { status: "offline" });
      await db.login_history.add({
        user_id: session.id,
        action: "logout",
        timestamp: Date.now(),
      });
    }
    localStorage.removeItem("user_session");
    window.location.reload(); // Reload lại React App thay vì trỏ tới login.html
  },

  // Đã bỏ các đoạn chuyển hướng window.location gây trắng trang
  checkSession() {
    const sessionStr = localStorage.getItem("user_session");
    if (!sessionStr) return null;

    const session = JSON.parse(sessionStr);
    const now = new Date().getTime();
    if ((now - session.loginTime) / (1000 * 60 * 60) >= 20) {
      this.logout();
      return null;
    }
    return session;
  },
};

// Seeding: Nạp dữ liệu mẫu
db.on("ready", async () => {
  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.add({
      employee_code: "NV001",
      username: "admin",
      password: "123",
      full_name: "Quản Trị Viên",
      role: "Admin",
      status: "offline",
    });
  }

  const productCount = await db.products.count();
  if (productCount === 0) {
    const sampleProducts = [
      {
        name: "Amoxicillin 500mg",
        type: "Viên",
        import_price: 800,
        sell_price: 1500,
        stock_initial: 0,
        total_import: 500,
        total_export: 0,
        stock: 500,
        status: "Đủ hàng",
        note: "Kháng sinh",
      },
      {
        name: "Panadol Extra",
        type: "Vỉ",
        import_price: 12000,
        sell_price: 15000,
        stock_initial: 0,
        total_import: 200,
        total_export: 0,
        stock: 200,
        status: "Đủ hàng",
        note: "Giảm đau, hạ sốt",
      },
      {
        name: "Vitamin C 1000mg",
        type: "Hộp",
        import_price: 45000,
        sell_price: 60000,
        stock_initial: 0,
        total_import: 50,
        total_export: 0,
        stock: 50,
        status: "Đủ hàng",
        note: "Tăng đề kháng",
      },
      {
        name: "Efferangal 500mg",
        type: "Viên sủi",
        import_price: 3000,
        sell_price: 5000,
        stock_initial: 0,
        total_import: 1000,
        total_export: 0,
        stock: 1000,
        status: "Đủ hàng",
        note: "Hạ sốt nhanh",
      },
      {
        name: "Oresol Cam",
        type: "Gói",
        import_price: 2500,
        sell_price: 4000,
        stock_initial: 0,
        total_import: 300,
        total_export: 0,
        stock: 300,
        status: "Đủ hàng",
        note: "Bù nước",
      },
    ];
    await db.products.bulkAdd(sampleProducts);
  }
});
