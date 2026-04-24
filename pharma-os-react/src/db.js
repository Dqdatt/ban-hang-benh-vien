import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
} from "firebase/firestore";

// === 1. ĐIỀN THÔNG TIN FIREBASE CỦA BẠN VÀO ĐÂY ===
const firebaseConfig = {
  apiKey: "AIzaSyC3BIjyI9STChrd8Gc5XIyQg7VfepyJyHo",
  authDomain: "banhangbenhvien-5b6ad.firebaseapp.com",
  databaseURL: "https://banhangbenhvien-5b6ad-default-rtdb.firebaseio.com",
  projectId: "banhangbenhvien-5b6ad",
  storageBucket: "banhangbenhvien-5b6ad.firebasestorage.app",
  messagingSenderId: "520295843269",
  appId: "1:520295843269:web:021efd5a533e76e404f7ac",
  measurementId: "G-4J0646WKHC",
};

const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app);

// === 2. GIẢ LẬP DEXIE API ĐỂ KHÔNG PHẢI SỬA CÁC FILE KHÁC ===
class DexieToFirebaseWrapper {
  constructor(collectionName) {
    this.name = collectionName;
    this.colRef = collection(firestoreDb, collectionName);
  }

  // Chuyển Data thành mảng, tự động parse ID sang số để khớp logic cũ
  async toArray() {
    const snap = await getDocs(this.colRef);
    return snap.docs.map((d) => ({ ...d.data(), id: Number(d.id) || d.id }));
  }

  // Tạo ID tự tăng giống ++id của Dexie
  async _getNextId() {
    const snap = await getDocs(this.colRef);
    if (snap.empty) return 1;
    let maxId = 0;
    snap.forEach((doc) => {
      const currentId = Number(doc.id);
      if (!isNaN(currentId) && currentId > maxId) maxId = currentId;
    });
    return maxId + 1;
  }

  async add(data) {
    const nextId = await this._getNextId();
    const docRef = doc(firestoreDb, this.name, String(nextId));
    await setDoc(docRef, { ...data, id: nextId });
    return nextId;
  }

  async bulkAdd(arr) {
    for (const item of arr) {
      await this.add(item);
    }
  }

  async get(id) {
    const docRef = doc(firestoreDb, this.name, String(id));
    const snap = await getDoc(docRef);
    return snap.exists() ? { ...snap.data(), id: Number(snap.id) } : undefined;
  }

  async update(id, data) {
    const docRef = doc(firestoreDb, this.name, String(id));
    await updateDoc(docRef, data);
    return 1;
  }

  async count() {
    const snap = await getDocs(this.colRef);
    return snap.size;
  }

  // Giả lập các câu lệnh query chuỗi (chaining) của Dexie
  where(field) {
    const self = this;
    return {
      equals: (val) => ({
        first: async () => {
          const q = query(self.colRef, where(field, "==", val), limit(1));
          const snap = await getDocs(q);
          if (snap.empty) return undefined;
          return { ...snap.docs[0].data(), id: Number(snap.docs[0].id) };
        },
        toArray: async () => {
          const q = query(self.colRef, where(field, "==", val));
          const snap = await getDocs(q);
          return snap.docs.map((d) => ({ ...d.data(), id: Number(d.id) }));
        },
        reverse: () => ({
          toArray: async () => {
            const q = query(self.colRef, where(field, "==", val));
            const snap = await getDocs(q);
            const results = snap.docs.map((d) => ({
              ...d.data(),
              id: Number(d.id),
            }));
            return results.reverse();
          },
        }),
      }),
    };
  }

  orderBy(field) {
    const self = this;
    return {
      reverse: () => ({
        toArray: async () => {
          // Kéo về và sort bằng JS để tránh lỗi thiếu Index trên Firebase
          const snap = await getDocs(self.colRef);
          let results = snap.docs.map((d) => ({
            ...d.data(),
            id: Number(d.id),
          }));
          results.sort((a, b) => (b[field] > a[field] ? 1 : -1));
          return results;
        },
        limit: (num) => ({
          toArray: async () => {
            const snap = await getDocs(self.colRef);
            let results = snap.docs.map((d) => ({
              ...d.data(),
              id: Number(d.id),
            }));
            results.sort((a, b) => (b[field] > a[field] ? 1 : -1));
            return results.slice(0, num);
          },
        }),
      }),
    };
  }
}

// === 3. XUẤT CÁC BẢNG DỮ LIỆU NHƯ CŨ ===
export const db = {
  users: new DexieToFirebaseWrapper("users"),
  products: new DexieToFirebaseWrapper("products"),
  orders: new DexieToFirebaseWrapper("orders"),
  order_items: new DexieToFirebaseWrapper("order_items"),
  import_history: new DexieToFirebaseWrapper("import_history"),
  login_history: new DexieToFirebaseWrapper("login_history"),

  // Giả lập hàm trigger on("ready") để chạy data seeding mẫu
  on: (event, callback) => {
    if (event === "ready") {
      setTimeout(callback, 2000);
    }
  },
};

// === 4. AUTH MANAGER - Giữ nguyên 100% logic của bạn ===
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
    window.location.reload();
  },

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

// === 5. SEEDING DỮ LIỆU MẪU - Giữ nguyên logic cũ ===
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
