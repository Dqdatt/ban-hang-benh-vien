import React, { useState, useEffect } from "react";
import { db, AuthManager } from "./db";
import Inventory from "./Inventory";
import Reports from "./Reports";
import Import from "./Import";
import Login from "./Login";
import Info from "./Info";

function App() {
  // === STATE QUẢN LÝ AUTH (ĐĂNG NHẬP) ===
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // === STATE ĐIỀU HƯỚNG HỆ THỐNG ===
  const [currentView, setCurrentView] = useState("POS"); // 'POS' | 'INVENTORY' | 'REPORTS' | 'IMPORT' | 'INFO'
  const [isInvDropOpen, setIsInvDropOpen] = useState(false);

  // === STATES CHO GIAO DIỆN VÀ DỮ LIỆU POS ===
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // === STATES CHO THÔNG TIN NGÂN HÀNG (VIETQR) ===
  const [bankInfo, setBankInfo] = useState({
    bankId: "970437",
    accountNo: "045704070016757",
    accountName: "BENH VIEN DA KHOA BUU DIEN",
    description: " CK TIEN THUOC CS1",
  });

  // STATE: QUẢN LÝ SỐ LƯỢNG NHẬP Ở BẢNG CHỌN THUỐC
  const [inputQuantities, setInputQuantities] = useState({});

  // STATES CHO ORDER & THANH TOÁN
  const [orderId, setOrderId] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null); // 'cash' | 'transfer'
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // === 0. CÀI ĐẶT TAB TITLE VÀ ICON TRÌNH DUYỆT ===
  useEffect(() => {
    document.title = "POS | PharmaOS";
    let icon = document.querySelector("link[rel~='icon']");
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.type = "image/svg+xml";
    icon.href =
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563eb'><path d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z'/></svg>";
  }, []);

  // === 1. TẢI DỮ LIỆU KHI VÀO TRANG ===
  useEffect(() => {
    const initApp = async () => {
      const session = AuthManager.checkSession();
      if (session) {
        setCurrentUser(session);
        setIsAuthenticated(true);
        try {
          const data = await db.products.toArray();
          setProducts(data);
        } catch (error) {
          console.error("Lỗi tải dữ liệu sản phẩm:", error);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsAuthChecking(false);

      // Tải cấu hình ngân hàng từ localStorage
      const savedBankInfo = localStorage.getItem("bank_info");
      if (savedBankInfo) {
        setBankInfo(JSON.parse(savedBankInfo));
      }
    };
    initApp();

    // Lắng nghe sự thay đổi của bank_info từ tab khác (tab Reports)
    const handleStorageChange = (e) => {
      if (e.key === "bank_info" && e.newValue) {
        setBankInfo(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (currentView === "POS" && isAuthenticated) {
      db.products.toArray().then(setProducts).catch(console.error);
    }
  }, [currentView, isAuthenticated]);

  // === HÀM HỖ TRỢ TẠO LINK QR ĐỘNG ===
  const formatQRText = (str) => {
    if (!str) return "";
    let result = str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Bỏ dấu tiếng Việt
    result = result.replace(/đ/g, "d").replace(/Đ/g, "D"); // Sửa lỗi chữ Đ
    result = result.toUpperCase(); // In hoa
    result = result.replace(/\s+/g, "%20"); // Thay space = %20
    return result;
  };

  // === ÂM THANH ===
  const playCashSound = () => {
    // Đảm bảo file cash_1.mp3 nằm trong thư mục public
    const audio = new Audio("/cash_1.mp3");
    audio.play().catch((e) => console.log("Không thể phát âm thanh:", e));
  };

  const getDynamicQRUrl = (amount) => {
    const formattedAccountName = formatQRText(bankInfo.accountName);
    const formattedDescription = formatQRText(bankInfo.description);
    const safeDesc = formattedDescription.startsWith("%20")
      ? formattedDescription
      : `%20${formattedDescription}`;
    const formattedCustomer = formatQRText(customerName || "KHACH HANG");

    return `https://img.vietqr.io/image/${bankInfo.bankId}-${bankInfo.accountNo}-compact2.png?amount=${amount}&addInfo=${formattedCustomer}${safeDesc}&accountName=${formattedAccountName}`;
  };

  // === LOGIC ĐỒNG BỘ MÀN HÌNH KHÁCH ===
  useEffect(() => {
    const finalTotal =
      typeof calculateTotal === "function" ? calculateTotal() : 0;

    const syncData = {
      // Ép kiểu Number để hiển thị đúng số lượng và thành tiền
      cart: cart.map((item) => ({
        name: item.name,
        qty: Number(item.quantity) || 0, // <--- SỬA item.qty THÀNH item.quantity Ở DÒNG NÀY
        sell_price: Number(item.sell_price) || 0,
        type: item.type || "",
      })),
      total: finalTotal,
      isQRModalOpen: isQRModalOpen || false,
      qrUrl: getDynamicQRUrl(finalTotal),
    };

    localStorage.setItem("pos_customer_sync", JSON.stringify(syncData));
    // Kích hoạt sự kiện để màn hình khách cập nhật tức thì
    window.dispatchEvent(new Event("storage"));
  }, [cart, isQRModalOpen, otherCosts]);

  // === 2. LOGIC POS ===
  const generateOrderNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `A${year}T${month}-${randomDigits}`;
  };

  const newOrder = () => {
    if (orderId) {
      alert(`Đơn hàng ${orderId} đang mở!`);
      return;
    }
    setOrderId(generateOrderNumber());
  };

  const clearOrder = () => {
    if (!orderId) return;
    if (window.confirm("Bạn có chắc chắn muốn xóa đơn hàng này?")) {
      setCart([]);
      setOrderId(null);
      setCustomerName("");
      setOtherCosts("");
    }
  };

  const addToCart = (product) => {
    if (!orderId) {
      alert("Vui lòng bấm 'Tạo đơn mới' trước khi chọn sản phẩm!");
      return;
    }

    const currentStock = Number(product.stock) || 0;
    if (currentStock <= 0) {
      alert("Sản phẩm đã hết hàng trong kho!");
      return;
    }

    const qtyToAdd = parseInt(inputQuantities[product.id]) || 1;

    if (qtyToAdd <= 0) {
      alert("Số lượng phải lớn hơn 0!");
      return;
    }

    if (qtyToAdd > currentStock) {
      alert("Kho không đủ số lượng!");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.quantity + qtyToAdd > currentStock) {
          alert("Tổng số lượng trong giỏ vượt quá tồn kho!");
          return prev;
        }
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + qtyToAdd } : i,
        );
      }
      return [...prev, { ...product, quantity: qtyToAdd }];
    });

    setInputQuantities((prev) => ({ ...prev, [product.id]: 1 }));
  };

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((item) => item.id !== id));

  const calculateSubtotal = () =>
    cart.reduce((sum, item) => sum + (item.sell_price || 0) * item.quantity, 0);
  const calculateTotal = () => calculateSubtotal() + Number(otherCosts || 0);

  // === LOGIC MODAL THANH TOÁN ===
  const openPaymentModal = () => {
    if (!orderId || cart.length === 0) {
      alert("Chưa có sản phẩm trong giỏ hoặc chưa tạo đơn hàng!");
      return;
    }
    setPaymentMethod(null);
    setIsPaymentModalOpen(true);
  };

  // Logic Khóa chéo PTTT
  const handleSelectPayment = (method) => {
    if (paymentMethod === null) {
      setPaymentMethod(method);
    } else if (paymentMethod === method) {
      setPaymentMethod(null); // Nhấn lại chính nó thì bỏ chọn
    }
    // Nếu khác method đang chọn thì không làm gì (khóa chéo)
  };

  const processPayment = (shouldPrint) => {
    if (paymentMethod === "transfer") {
      setIsPaymentModalOpen(false);
      setIsQRModalOpen(true);
    } else {
      completeTransaction(shouldPrint);
    }
  };

  const completeTransaction = async (shouldPrint = false) => {
    try {
      if (typeof playCashSound === "function") {
        playCashSound();
      }

      const sessionStr = localStorage.getItem("user_session");
      let cashierName = "Nhân viên";
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        cashierName = session.full_name || "Nhân viên";
      }

      const totalAmount = calculateTotal();
      const pType = paymentMethod === "transfer" ? "Chuyển khoản" : "Tiền mặt";

      await db.orders.add({
        order_id: orderId,
        created_at: Date.now(),
        user_id: cashierName,
        customer_name: customerName.trim(),
        other_costs: Number(otherCosts) || 0,
        total_amount: totalAmount,
        payment_type: pType,
      });

      for (const item of cart) {
        await db.order_items.add({
          order_id: orderId,
          product_id: Number(item.id),
          quantity: Number(item.quantity),
          price: Number(item.sell_price),
        });

        const productFromDB = await db.products.get(Number(item.id));
        if (productFromDB) {
          await db.products.update(Number(item.id), {
            stock: (productFromDB.stock || 0) - Number(item.quantity),
            total_export:
              (productFromDB.total_export || 0) + Number(item.quantity),
          });
        }
      }

      setProducts(await db.products.toArray());
      setIsPaymentModalOpen(false);
      setIsQRModalOpen(false);
      setCart([]);
      setOrderId(null);
      setCustomerName("");
      setOtherCosts("");

      // Delay alert 1 chút để âm thanh kịp kêu mượt mà
      setTimeout(() => {
        alert(
          shouldPrint
            ? "Thanh toán thành công. Đang in hóa đơn..."
            : "Thanh toán thành công!",
        );
      }, 100);
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi khi lưu đơn hàng!");
    }
  };

  // KIỂM TRA ĐĂNG NHẬP
  if (isAuthChecking) return null;
  if (!isAuthenticated) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
          body { font-family: "Montserrat", sans-serif; }
        `}</style>
        <Login onLoginSuccess={() => window.location.reload()} />
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        .pos-body { font-family: "Montserrat", sans-serif; background-color: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .sidebar-item-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 14px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; transition: all 0.2s; border-right: 3px solid transparent; }
        .sidebar-item-btn.active { background-color: #eff6ff; color: #2563eb; border-right-color: #2563eb; }
        .sidebar-item-btn:not(.active) { color: #94a3b8; }
        .sidebar-item-btn:not(.active):hover { background-color: #f8fafc; color: #64748b; }
      `}</style>

      {/* RENDER TRANG INFO ĐÈ LÊN GIAO DIỆN CHÍNH */}
      {currentView === "INFO" && <Info onBack={() => setCurrentView("POS")} />}

      {/* GIAO DIỆN CHÍNH BỊ ẨN NẾU ĐANG XEM TRANG INFO ĐỂ GIỮ NGUYÊN CART STATE */}
      <div
        className={`pos-body h-screen flex overflow-hidden ${currentView === "INFO" ? "hidden" : ""}`}
      >
        {/* SIDEBAR DÙNG CHUNG */}
        <aside className="w-44 bg-white border-r border-gray-100 flex flex-col shadow-sm relative z-40">
          <div className="p-4 mb-2">
            <div className="flex items-center gap-2 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
              <span className="font-extrabold tracking-tighter text-base text-gray-800">
                PHARMA<span className="text-blue-600">OS</span>
              </span>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            <button
              onClick={() => setCurrentView("POS")}
              className={`sidebar-item-btn ${currentView === "POS" ? "active" : ""}`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>{" "}
              BÁN HÀNG
            </button>

            <div className="w-full">
              <button
                onClick={() => setIsInvDropOpen(!isInvDropOpen)}
                className={`sidebar-item-btn flex justify-between w-full ${currentView === "INVENTORY" || currentView === "IMPORT" ? "active bg-blue-50 text-blue-600 border-r-blue-600" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>{" "}
                  KHO THUỐC
                </div>
                <svg
                  className={`w-3 h-3 transition-transform duration-300 ${!isInvDropOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isInvDropOpen && (
                <div className="bg-blue-50/30 overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => setCurrentView("INVENTORY")}
                    className={`w-full flex items-center gap-2 pl-11 py-3 text-[9px] uppercase transition-all ${currentView === "INVENTORY" ? "font-black text-blue-700 bg-blue-50" : "font-bold text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}
                  >
                    <span
                      className={`w-1 h-1 rounded-full ${currentView === "INVENTORY" ? "bg-blue-600" : "bg-gray-300"}`}
                    ></span>{" "}
                    TỔNG KHO
                  </button>
                  <button
                    onClick={() => setCurrentView("IMPORT")}
                    className={`w-full flex items-center gap-2 pl-11 py-3 text-[9px] uppercase transition-all ${currentView === "IMPORT" ? "font-black text-blue-700 bg-blue-50" : "font-bold text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}
                  >
                    <span
                      className={`w-1 h-1 rounded-full ${currentView === "IMPORT" ? "bg-blue-600" : "bg-gray-300"}`}
                    ></span>{" "}
                    NHẬP HÀNG
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setCurrentView("REPORTS")}
              className={`sidebar-item-btn ${currentView === "REPORTS" ? "active" : ""}`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>{" "}
              BÁO CÁO
            </button>

            <button
              onClick={() =>
                window.open(
                  window.location.origin + "?customer_screen=true",
                  "_blank",
                )
              }
              className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all font-bold border border-indigo-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Màn hình khách
            </button>
          </nav>

          <div className="p-4 border-t border-gray-50 mt-auto bg-white relative">
            <div
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors"
            >
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {currentUser?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold text-gray-800 truncate uppercase">
                  {currentUser?.full_name || "Nhân viên"}
                </p>
                <p className="text-[7px] font-semibold text-gray-400 uppercase tracking-tighter">
                  {currentUser?.role || "Bán hàng"}
                </p>
              </div>
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            {isUserMenuOpen && (
              <div className="absolute bottom-[110%] left-4 right-4 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden z-50">
                <button
                  onClick={() => {
                    setCurrentView("INFO");
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50 uppercase border-b border-gray-50 transition-colors"
                >
                  Thông tin
                </button>
                <button
                  onClick={() => {
                    AuthManager.logout();
                    setIsAuthenticated(false);
                    setCurrentUser(null);
                  }}
                  className="w-full text-left px-4 py-3.5 text-[10px] font-bold text-red-500 hover:bg-red-50 uppercase transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* NỘI DUNG THAY ĐỔI THEO VIEW */}
        {currentView === "POS" && (
          <main className="flex-1 flex overflow-hidden p-4 gap-4 relative z-0">
            {/* CỘT 1: CHỌN THUỐC */}
            <section className="w-[42%] flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={newOrder}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-[10px] uppercase hover:bg-blue-700 transition-all shadow-md"
                  >
                    Tạo đơn mới
                  </button>
                  <button
                    onClick={clearOrder}
                    className="flex-1 border border-red-100 text-red-500 py-2.5 rounded-xl font-bold text-[10px] uppercase hover:bg-red-50 transition-all"
                  >
                    Xóa đơn hiện tại
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tên khách hàng..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-1/3 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                  />
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Tìm tên thuốc..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                    />
                    <svg
                      className="h-5 w-5 absolute left-4 top-3.5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <table className="w-full text-left">
                  <thead className="text-[9px] font-bold text-gray-400 uppercase border-b border-gray-50 italic tracking-widest sticky top-0 bg-white">
                    <tr>
                      <th className="px-3 py-2">Sản phẩm</th>
                      <th className="px-3 py-2 w-20 text-center">Số lượng</th>
                      <th className="px-3 py-2 text-right">Thêm</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {products
                      .filter((p) =>
                        p.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()),
                      )
                      .map((product) => {
                        const stock = Number(product.stock) || 0;
                        const stockColorClass =
                          stock === 0
                            ? "text-red-500 font-black"
                            : stock <= 5
                              ? "text-yellow-500 font-bold"
                              : "text-blue-500";

                        return (
                          <tr
                            key={product.id}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-3 py-4">
                              <p className="font-bold text-gray-700 uppercase text-[12px]">
                                {product.name}
                              </p>
                              <p className="text-[10px] text-gray-400 font-semibold italic">
                                {product.type || "Đơn vị"} | Tồn:{" "}
                                <span className={stockColorClass}>{stock}</span>
                              </p>
                            </td>
                            <td className="px-3 py-4 text-center">
                              <input
                                type="number"
                                min="1"
                                max={stock}
                                value={inputQuantities[product.id] || 1}
                                onChange={(e) =>
                                  setInputQuantities((prev) => ({
                                    ...prev,
                                    [product.id]: e.target.value,
                                  }))
                                }
                                className="w-16 text-center border border-gray-200 rounded-lg py-1.5 font-bold outline-none bg-white text-xs"
                              />
                            </td>
                            <td className="px-3 py-4 text-right">
                              <button
                                onClick={() => addToCart(product)}
                                disabled={stock <= 0}
                                className={`bg-blue-600 text-white w-8 h-8 rounded-lg font-bold hover:bg-blue-700 shadow-sm ${stock <= 0 ? "opacity-30 cursor-not-allowed" : ""}`}
                              >
                                +
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* CỘT 2: GIỎ HÀNG */}
            <section className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                <h3 className="font-bold text-gray-800 text-xs uppercase tracking-widest">
                  Giỏ hàng hiện tại
                </h3>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded transition-all tracking-tight ${orderId ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}
                >
                  {orderId || "ĐỢI LỆNH"}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-50">
                    {cart.length === 0 ? (
                      <tr>
                        <td className="text-center py-10 text-gray-400 text-xs italic font-semibold">
                          Chưa có sản phẩm
                        </td>
                      </tr>
                    ) : (
                      cart.map((item) => (
                        <tr
                          key={item.id}
                          className="p-4 block border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="w-full flex justify-between items-center">
                            <div>
                              <p className="text-[11px] font-bold text-gray-700 uppercase">
                                {item.name}
                              </p>
                              <p className="text-[10px] text-blue-600 font-bold">
                                {item.quantity} x{" "}
                                {(item.sell_price || 0).toLocaleString()}đ
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-gray-800 w-20 text-right">
                                {(
                                  (item.sell_price || 0) * item.quantity
                                ).toLocaleString()}
                                đ
                              </span>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-400 text-[10px] font-bold uppercase hover:text-red-600"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* CỘT 3: TỔNG TIỀN */}
            <section className="w-1/4 flex flex-col gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>Tạm tính</span>
                  <span className="text-gray-800 font-black text-sm">
                    {calculateSubtotal().toLocaleString()}đ
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                  <span>Chi phí khác</span>
                  <input
                    type="text"
                    value={
                      otherCosts
                        ? Number(otherCosts).toLocaleString("en-US")
                        : ""
                    }
                    onChange={(e) =>
                      setOtherCosts(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="0"
                    className="w-24 text-right bg-gray-50 border border-gray-200 rounded-lg py-1 px-2 outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-black text-sm"
                  />
                </div>
                <div className="border-t border-dashed border-gray-200 pt-4 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                    Tổng thu
                  </span>
                  <span className="text-3xl font-extrabold text-blue-600 tracking-tighter">
                    {calculateTotal().toLocaleString()}đ
                  </span>
                </div>
              </div>
              <button
                onClick={openPaymentModal}
                className="w-full flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-2xl shadow-lg shadow-blue-100 uppercase transition-all flex items-center justify-center active:scale-[0.98]"
              >
                Thanh toán
              </button>
            </section>
          </main>
        )}

        {/* CÁC VIEW KHÁC */}
        {currentView === "INVENTORY" && <Inventory />}
        {currentView === "IMPORT" && <Import />}
        {currentView === "REPORTS" && <Reports />}
      </div>

      {/* ======================= CÁC MODALS ======================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row p-4 gap-4 animate-in zoom-in duration-200">
            <div className="flex-[1.2] p-8 flex flex-col justify-between">
              <div>
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-6">
                  Xác nhận thanh toán
                </h1>
                <div className="flex justify-between items-end mb-10 pb-6 border-b border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Mã hóa đơn
                    </p>
                    <p className="text-lg font-normal text-gray-500">
                      {orderId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Thành tiền
                    </p>
                    <p className="text-3xl font-black text-blue-600">
                      {calculateTotal().toLocaleString()}đ
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSelectPayment("cash")}
                    className={`py-10 border-2 rounded-[32px] font-bold text-lg uppercase transition-all flex flex-col items-center gap-3 ${paymentMethod === "cash" ? "border-blue-600 bg-blue-50 text-blue-600" : paymentMethod === "transfer" ? "opacity-10 cursor-not-allowed border-gray-100 bg-white text-gray-900" : "border-gray-100 bg-white hover:bg-gray-50 text-gray-900"}`}
                  >
                    <span className="text-3xl">💵</span> Tiền mặt
                  </button>
                  <button
                    onClick={() => handleSelectPayment("transfer")}
                    className={`py-10 border-2 rounded-[32px] font-bold text-lg uppercase transition-all flex flex-col items-center gap-3 ${paymentMethod === "transfer" ? "border-blue-600 bg-blue-50 text-blue-600" : paymentMethod === "cash" ? "opacity-10 cursor-not-allowed border-gray-100 bg-white text-gray-900" : "border-gray-100 bg-white hover:bg-gray-50 text-gray-900"}`}
                  >
                    <span className="text-3xl">🏦</span> Chuyển khoản
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-[11px] font-bold text-gray-400 uppercase hover:text-red-500 transition-colors mt-8 self-start"
              >
                ✕ Quay lại
              </button>
            </div>
            <div className="flex-1 flex flex-col gap-4 p-2">
              <button
                disabled={!paymentMethod}
                onClick={() => processPayment(true)}
                className={`flex-1 rounded-[32px] font-black text-xl uppercase transition-all ${paymentMethod ? "bg-white border-2 border-gray-100 text-gray-700 hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              >
                In hoá đơn
              </button>
              <button
                disabled={!paymentMethod}
                onClick={() => processPayment(false)}
                className={`flex-[1.8] rounded-[32px] font-black text-2xl uppercase transition-all ${paymentMethod ? "bg-blue-600 text-white shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:bg-blue-700" : "bg-gray-800 text-white opacity-30 cursor-not-allowed"}`}
              >
                Không in hoá đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {isQRModalOpen && (
        <div className="fixed inset-0 z-[110] bg-gray-900/80 backdrop-blur-lg flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-md overflow-hidden p-8 flex flex-col items-center animate-in zoom-in duration-300">
            <h2 className="text-xl font-black text-gray-800 uppercase mb-2">
              Quét mã thanh toán
            </h2>
            <p className="text-xs text-gray-400 font-bold mb-6 tracking-widest uppercase">
              VietQR - Chuyển khoản nhanh 24/7
            </p>
            <div className="relative w-full aspect-square bg-gray-50 rounded-[32px] border-4 border-blue-50 flex items-center justify-center overflow-hidden mb-6 shadow-inner">
              <img
                src={getDynamicQRUrl(calculateTotal())}
                alt="VietQR"
                className="w-full h-full object-contain p-4"
                onLoad={(e) => {
                  e.target.style.opacity = 1;
                  document.getElementById("qr-loader").style.display = "none";
                }}
                style={{ opacity: 0 }}
              />
              <div
                id="qr-loader"
                className="absolute inset-0 flex items-center justify-center bg-gray-50"
              >
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <div className="text-center mb-8 w-full bg-blue-50/50 py-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Số tiền cần thu
              </p>
              <p className="text-3xl font-black text-blue-600">
                {calculateTotal().toLocaleString()}đ
              </p>
            </div>
            <button
              onClick={() => completeTransaction(false)}
              className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-lg uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
            >
              Xác nhận đã nhận tiền
            </button>
            <button
              onClick={() => {
                setIsQRModalOpen(false);
                setIsPaymentModalOpen(true);
              }}
              className="mt-4 text-[10px] font-bold text-gray-400 uppercase hover:text-blue-600 transition-colors"
            >
              ← Quay lại thay đổi phương thức
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
