import React, { useState, useEffect } from "react";
import { db } from "./db";

export default function Reports() {
  // === QUẢN LÝ TABS VÀ QUYỀN ===
  const [activeTab, setActiveTab] = useState("overview");
  const [isAdmin, setIsAdmin] = useState(false);

  // === STATES CHO DỮ LIỆU ===
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalRev: 0,
    totalOther: 0,
    ordersCount: 0,
    revDay: 0,
    revMonth: 0,
    revYear: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // === STATES CHO MODAL HÓA ĐƠN ===
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [isReQRModalOpen, setIsReQRModalOpen] = useState(false);
  const [reQRAmount, setReQRAmount] = useState(0);

  // === STATES CHO MODAL XUẤT CHUYỂN KHOẢN ===
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportOrders, setExportOrders] = useState([]);

  // === STATES CHO MODAL NHÂN VIÊN ===
  const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);
  const [isEditEmpModalOpen, setIsEditEmpModalOpen] = useState(false);
  const [isEmpDetailModalOpen, setIsEmpDetailModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState({
    id: null,
    code: "",
    name: "",
    role: "Nhân viên",
    username: "",
    password: "",
  });
  const [empDetail, setEmpDetail] = useState(null);
  const [empHistory, setEmpHistory] = useState([]);

  // === TẢI DỮ LIỆU TỔNG QUAN ===
  const loadData = async () => {
    try {
      // Check Admin
      const sessionStr = localStorage.getItem("user_session");
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        setIsAdmin(session.role === "Admin");
      }

      // Fetch Data
      const allOrders = await db.orders
        .orderBy("created_at")
        .reverse()
        .toArray();
      const allProducts = await db.products.toArray();
      const allUsers = await db.users.toArray();

      setOrders(allOrders);
      setProducts(allProducts);
      setUsers(allUsers);

      // Tính toán Dashboard Stats
      const now = new Date();
      let totalRev = 0,
        totalOther = 0,
        revDay = 0,
        revMonth = 0,
        revYear = 0;

      allOrders.forEach((o) => {
        const amt = Number(o.total_amount) || 0;
        const cost = Number(o.other_costs) || 0;
        const pureRev = amt - cost;

        totalRev += pureRev;
        totalOther += cost;

        const d = new Date(o.created_at);
        if (d.getFullYear() === now.getFullYear()) {
          revYear += pureRev;
          if (d.getMonth() === now.getMonth()) {
            revMonth += pureRev;
            if (d.getDate() === now.getDate()) revDay += pureRev;
          }
        }
      });

      setStats({
        totalRev,
        totalOther,
        ordersCount: allOrders.length,
        revDay,
        revMonth,
        revYear,
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // === LOGIC TAB HÓA ĐƠN ===
  const filteredOrders = orders.filter(
    (o) =>
      o.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_name &&
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const viewInvoice = async (order) => {
    try {
      const items = await db.order_items
        .where("order_id")
        .equals(order.order_id)
        .toArray();
      for (let it of items) {
        const product = await db.products.get(it.product_id);
        it.display_name = product ? product.name : "Sản phẩm đã xóa";
      }
      setSelectedInvoice(order);
      setInvoiceItems(items);
      setIsInvoiceModalOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const openExportModal = () => {
    const todayStr = new Date().toDateString();
    const filtered = orders.filter(
      (o) =>
        new Date(o.created_at).toDateString() === todayStr &&
        o.payment_type === "Chuyển khoản",
    );
    setExportOrders(filtered);
    setIsExportModalOpen(true);
  };

  // === LOGIC NHÂN VIÊN ===
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      const exist = await db.users
        .where("username")
        .equals(empForm.username)
        .first();
      if (exist && !empForm.id) return alert("Tên đăng nhập đã tồn tại!");
      if (exist && empForm.id && exist.id !== empForm.id)
        return alert("Tên đăng nhập đã tồn tại trên tài khoản khác!");

      if (empForm.id) {
        await db.users.update(empForm.id, {
          employee_code: empForm.code,
          role: empForm.role,
          full_name: empForm.name,
          username: empForm.username,
          password: empForm.password,
        });
        setIsEditEmpModalOpen(false);
      } else {
        await db.users.add({
          employee_code: empForm.code,
          role: empForm.role,
          full_name: empForm.name,
          username: empForm.username,
          password: empForm.password,
          status: "offline",
        });
        setIsAddEmpModalOpen(false);
      }
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const openEditEmployee = (user) => {
    setEmpForm({
      id: user.id,
      code: user.employee_code || "",
      name: user.full_name || "",
      role: user.role || "Nhân viên",
      username: user.username || "",
      password: user.password || "",
    });
    setIsEditEmpModalOpen(true);
  };

  const viewEmployeeDetail = async (user) => {
    setEmpDetail(user);
    try {
      const history = await db.login_history
        .where("user_id")
        .equals(user.id)
        .reverse()
        .toArray();
      setEmpHistory(history);
    } catch (err) {
      console.warn("Chưa index lịch sử", err);
      setEmpHistory([]);
    }
    setIsEmpDetailModalOpen(true);
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden relative">
      {/* HEADER BÁO CÁO */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-black text-gray-800 uppercase tracking-tighter">
            Trung tâm dữ liệu
          </h1>
          <div className="h-4 w-[1px] bg-gray-200"></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {/* NAVIGATION TABS */}
        <div className="flex gap-4 mb-8 bg-gray-100/50 p-1.5 rounded-[20px] w-fit">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "overview" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab("logistics")}
            className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "logistics" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
          >
            Kho vận
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "invoices" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
          >
            Hóa đơn
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("employees")}
              className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "employees" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
            >
              Nhân sự
            </button>
          )}
        </div>

        {/* ================= TAB 1: TỔNG QUAN ================= */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Tổng doanh thu
                </p>
                <p className="text-3xl font-black text-blue-600">
                  {stats.totalRev.toLocaleString()}đ
                </p>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Tổng chi phí khác
                </p>
                <p className="text-3xl font-black text-orange-500">
                  {stats.totalOther.toLocaleString()}đ
                </p>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Tổng hóa đơn
                </p>
                <p className="text-3xl font-black text-gray-800">
                  {stats.ordersCount} Đơn
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-blue-50/50 border-b border-gray-50 flex items-center gap-2">
                  <div className="w-1 h-3 bg-blue-600 rounded-full"></div>
                  <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-widest">
                    Doanh thu Ngày
                  </h4>
                </div>
                <div className="p-6 text-right">
                  <p className="text-3xl font-black text-blue-600">
                    {stats.revDay.toLocaleString()}đ
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-purple-50/50 border-b border-gray-50 flex items-center gap-2">
                  <div className="w-1 h-3 bg-purple-600 rounded-full"></div>
                  <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-widest">
                    Doanh thu Tháng
                  </h4>
                </div>
                <div className="p-6 text-right">
                  <p className="text-3xl font-black text-purple-600">
                    {stats.revMonth.toLocaleString()}đ
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-green-50/50 border-b border-gray-50 flex items-center gap-2">
                  <div className="w-1 h-3 bg-green-600 rounded-full"></div>
                  <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-widest">
                    Doanh thu Năm
                  </h4>
                </div>
                <div className="p-6 text-right">
                  <p className="text-3xl font-black text-green-600">
                    {stats.revYear.toLocaleString()}đ
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: KHO VẬN ================= */}
        {activeTab === "logistics" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                  <h3 className="font-black text-gray-800 uppercase text-sm tracking-widest">
                    Toàn bộ kho hàng
                  </h3>
                  <span className="px-4 py-3 bg-green-100 rounded-full text-[15px] font-black text-gray-500 uppercase">
                    {products.length} Loại
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-center w-16">
                          STT
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">
                          Tên thuốc
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-center">
                          Đơn vị
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">
                          Tồn kho
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p, i) => (
                        <tr
                          key={p.id}
                          className="hover:bg-gray-50/50 border-b border-gray-50 transition-all"
                        >
                          <td className="px-6 py-2 text-[11px] font-medium text-gray-400 text-center">
                            {i + 1}
                          </td>
                          <td className="px-6 py-2 text-[11px] font-black text-gray-800 uppercase">
                            {p.name}
                          </td>
                          <td className="px-6 py-2 text-[11px] font-bold text-gray-600 text-center">
                            {p.type}
                          </td>
                          <td className="px-6 py-2 text-right">
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-black text-[11px]">
                              {p.stock || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white rounded-[32px] border border-red-100 shadow-sm overflow-hidden">
                <div className="p-6 bg-red-50/50 border-b border-red-100">
                  <h3 className="font-black text-red-600 uppercase text-sm tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                    Sắp hết hàng
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      {products.filter((p) => (p.stock || 0) <= 5).length ===
                      0 ? (
                        <tr>
                          <td className="p-6 text-[10px] text-gray-400 text-center font-bold uppercase italic">
                            Kho hàng ổn định
                          </td>
                        </tr>
                      ) : (
                        products
                          .filter((p) => (p.stock || 0) <= 5)
                          .map((p) => (
                            <tr
                              key={p.id}
                              className="hover:bg-red-50/30 border-b border-gray-50 transition-all"
                            >
                              <td className="px-6 py-4 text-[11px] font-black text-gray-800 uppercase">
                                {p.name}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg font-black text-[11px]">
                                  {p.stock || 0}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: HÓA ĐƠN ================= */}
        {activeTab === "invoices" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <div className="relative w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="TÌM MÃ ĐƠN HOẶC TÊN KHÁCH..."
                  className="w-full bg-white border border-gray-100 px-4 py-2.5 rounded-2xl text-[10px] font-bold text-gray-800 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm transition-all"
                />
                <svg
                  className="w-4 h-4 text-gray-300 absolute right-4 top-2.5"
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
              <button
                onClick={openExportModal}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                Xuất HĐ Chuyển khoản
              </button>
            </div>
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-center w-16">
                      STT
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">
                      Mã đơn
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">
                      Tên khách
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">
                      Tổng tiền
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-center">
                      PTTT
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-center">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o, i) => (
                    <tr
                      key={o.order_id}
                      className="hover:bg-gray-50/50 border-b border-gray-50 transition-all"
                    >
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-400 text-center">
                        {i + 1}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-500">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-black text-gray-800 uppercase">
                        {o.order_id}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-gray-700">
                        {o.customer_name || "Khách lẻ"}
                      </td>
                      <td className="px-6 py-4 text-right text-[11px] font-black text-blue-600">
                        {Number(o.total_amount).toLocaleString()}đ
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 ${o.payment_type === "Chuyển khoản" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"} rounded-lg font-black text-[9px] uppercase tracking-tighter`}
                        >
                          {o.payment_type || "Tiền mặt"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => viewInvoice(o)}
                          className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: NHÂN SỰ ================= */}
        {activeTab === "employees" && isAdmin && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                Quản lý nhân sự
              </h2>
              <button
                onClick={() => {
                  setEmpForm({
                    id: null,
                    code: "",
                    name: "",
                    role: "Nhân viên",
                    username: "",
                    password: "",
                  });
                  setIsAddEmpModalOpen(true);
                }}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                + Thêm nhân viên
              </button>
            </div>
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase w-20">
                        Mã NV
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">
                        Nhân viên
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-center">
                        Vai trò
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-center">
                        Trạng thái
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">
                        Doanh thu ngày
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">
                        Tổng doanh thu
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-center">
                        Tài khoản
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const todayStr = new Date().toDateString();
                      let tRev = 0,
                        dRev = 0;
                      orders
                        .filter((o) => o.user_id === user.username)
                        .forEach((o) => {
                          const amt = Number(o.total_amount) || 0;
                          tRev += amt;
                          if (
                            new Date(o.created_at).toDateString() === todayStr
                          )
                            dRev += amt;
                        });

                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50/50 border-b border-gray-50 transition-all"
                        >
                          <td className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase">
                            {user.employee_code || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-[11px] font-black text-gray-800 uppercase">
                            {user.full_name}
                          </td>
                          <td className="px-6 py-4 text-[10px] font-bold text-center">
                            <span
                              className={`px-3 py-1 rounded-md ${user.role === "Admin" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-600"} uppercase`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[9px] text-center">
                            {user.status === "online" ? (
                              <span className="flex items-center justify-center gap-1.5 text-green-600 font-black">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>{" "}
                                ONLINE
                              </span>
                            ) : (
                              <span className="text-gray-400 font-bold">
                                OFFLINE
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-[11px] font-black text-blue-600">
                            {dRev.toLocaleString()}đ
                          </td>
                          <td className="px-6 py-4 text-right text-[11px] font-black text-gray-800">
                            {tRev.toLocaleString()}đ
                          </td>
                          <td className="px-6 py-4 text-center flex justify-center gap-1">
                            <button
                              onClick={() => viewEmployeeDetail(user)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase hover:bg-blue-100"
                            >
                              Chi tiết
                            </button>
                            <button
                              onClick={() => openEditEmployee(user)}
                              className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase hover:bg-amber-100"
                            >
                              Sửa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* MODAL: CHI TIẾT HÓA ĐƠN */}
      {isInvoiceModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Mã hóa đơn - Khách hàng
                  </p>
                  <h2 className="text-xl font-black text-gray-800 uppercase">
                    {selectedInvoice.order_id}{" "}
                    <span className="mx-2 text-gray-300">|</span>{" "}
                    <span className="text-blue-600">
                      {selectedInvoice.customer_name || "Khách lẻ"}
                    </span>
                  </h2>
                </div>
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    Người lập
                  </p>
                  <p className="text-[11px] font-bold text-gray-700 uppercase">
                    {selectedInvoice.user_id || "Hệ thống"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    Thời gian
                  </p>
                  <p className="text-[11px] font-bold text-gray-700">
                    {new Date(selectedInvoice.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-0 max-h-[300px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-[9px] font-bold text-gray-400 uppercase">
                      Sản phẩm
                    </th>
                    <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase text-center">
                      SL
                    </th>
                    <th className="px-6 py-3 text-[9px] font-bold text-gray-400 uppercase text-right">
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((it) => (
                    <tr key={it.id} className="border-b border-gray-50">
                      <td className="px-6 py-3">
                        <p className="text-[11px] font-bold text-gray-800 uppercase">
                          {it.display_name}
                        </p>
                        <p className="text-[9px] text-gray-400 italic">
                          {Number(it.price).toLocaleString()}đ
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-bold text-gray-600 text-center">
                        x{it.quantity}
                      </td>
                      <td className="px-6 py-3 text-[11px] font-bold text-gray-800 text-right">
                        {(it.price * it.quantity).toLocaleString()}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-white border-t border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Tổng cộng
                  </p>
                  <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tighter italic">
                    PTTT: {selectedInvoice.payment_type || "Tiền mặt"}
                  </p>
                </div>
                <p className="text-2xl font-black text-blue-600">
                  {Number(selectedInvoice.total_amount).toLocaleString()}đ
                </p>
              </div>
              <div className="flex gap-3">
                {selectedInvoice.payment_type === "Chuyển khoản" && (
                  <button
                    onClick={() => {
                      setReQRAmount(selectedInvoice.total_amount);
                      setIsReQRModalOpen(true);
                    }}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    Xem mã QR
                  </button>
                )}
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-gray-200 transition-all"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XEM LẠI MÃ QR */}
      {isReQRModalOpen && (
        <div
          className="fixed inset-0 z-[200] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setIsReQRModalOpen(false)}
        >
          <div
            className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-8 flex flex-col items-center animate-in zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-black text-gray-800 uppercase mb-6 tracking-widest">
              Quét mã thanh toán
            </h2>
            <div className="w-full aspect-square bg-gray-50 rounded-3xl mb-6 flex items-center justify-center border border-gray-100 overflow-hidden">
              <img
                src={`https://img.vietqr.io/image/970437-045704070016757-compact2.png?amount=${reQRAmount}&addInfo=KHACH%20HANG%20CK%20TIEN%20THUOC%20CS1&accountName=BENH%20VIEN%20DA%20KHOA%20BUU%20DIEN`}
                className="w-full h-full object-contain p-4"
                alt="QR"
              />
            </div>
            <div className="text-center mb-6 w-full bg-blue-50 py-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                Số tiền thu
              </p>
              <p className="text-2xl font-black text-blue-600">
                {reQRAmount.toLocaleString()}đ
              </p>
            </div>
            <button
              onClick={() => setIsReQRModalOpen(false)}
              className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-bold uppercase"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL: XUẤT HĐ CHUYỂN KHOẢN */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-4">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                Hóa Đơn Chuyển Khoản Trong Ngày
              </h2>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase w-12 text-center">
                      STT
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase">
                      Tên KH
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right">
                      Số tiền
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exportOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-4 py-6 text-center text-[10px] text-gray-400 font-bold uppercase italic"
                      >
                        Không có hóa đơn chuyển khoản nào trong ngày
                      </td>
                    </tr>
                  ) : (
                    exportOrders.map((o, i) => (
                      <tr
                        key={o.order_id}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-3 text-[10px] text-gray-400 font-bold text-center">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 text-[11px] font-bold text-gray-700">
                          {new Date(o.created_at).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 text-[11px] font-black text-gray-800 uppercase">
                          {o.customer_name || "Khách lẻ"}
                        </td>
                        <td className="px-4 py-3 text-[11px] font-black text-blue-600 text-right">
                          {(Number(o.total_amount) || 0).toLocaleString()}đ
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-100 bg-gray-50/30">
                    <td
                      colSpan="3"
                      className="px-4 py-4 text-[11px] font-black text-gray-800 uppercase text-right"
                    >
                      Tổng cộng:
                    </td>
                    <td className="px-4 py-4 text-[13px] font-black text-blue-600 text-right">
                      {exportOrders
                        .reduce(
                          (sum, o) => sum + (Number(o.total_amount) || 0),
                          0,
                        )
                        .toLocaleString()}
                      đ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="p-6 bg-white border-t border-gray-100 flex gap-3 shrink-0">
              <button
                onClick={() => alert("Đang kết nối máy in...")}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
              >
                In Báo Cáo
              </button>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-gray-200 transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM NHÂN VIÊN */}
      {isAddEmpModalOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                Thêm Nhân Viên Mới
              </h2>
              <button
                onClick={() => setIsAddEmpModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Mã NV
                  </label>
                  <input
                    type="text"
                    value={empForm.code}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, code: e.target.value })
                    }
                    required
                    className="w-full bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-[11px] font-bold text-gray-800 uppercase focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="VD: NV002"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Vai trò
                  </label>
                  <select
                    value={empForm.role}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, role: e.target.value })
                    }
                    className="w-full bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-[11px] font-bold text-gray-800 uppercase focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    <option value="Nhân viên">Nhân viên</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={empForm.name}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, name: e.target.value })
                  }
                  required
                  className="w-full bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-[11px] font-bold text-gray-800 uppercase focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div className="pt-4 border-t border-gray-50">
                <h3 className="text-[10px] font-black text-gray-800 uppercase mb-3">
                  Thông tin tài khoản
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={empForm.username}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, username: e.target.value })
                    }
                    required
                    placeholder="Tên đăng nhập"
                    className="w-full bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-[11px] font-bold text-gray-800 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                  <input
                    type="password"
                    value={empForm.password}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, password: e.target.value })
                    }
                    required
                    placeholder="Mật khẩu"
                    className="w-full bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-[11px] font-bold text-gray-800 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-700 shadow-md"
                >
                  Lưu nhân viên
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddEmpModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-gray-200"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SỬA NHÂN VIÊN */}
      {isEditEmpModalOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-50/50">
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                Sửa Nhân Viên
              </h2>
              <button
                onClick={() => setIsEditEmpModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Mã NV
                  </label>
                  <input
                    type="text"
                    value={empForm.code}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, code: e.target.value })
                    }
                    required
                    className="w-full bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-[11px] font-bold text-gray-800 uppercase focus:ring-2 focus:ring-amber-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Vai trò
                  </label>
                  <select
                    value={empForm.role}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, role: e.target.value })
                    }
                    className="w-full bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-[11px] font-bold text-gray-800 uppercase focus:ring-2 focus:ring-amber-100 outline-none"
                  >
                    <option value="Nhân viên">Nhân viên</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={empForm.name}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, name: e.target.value })
                  }
                  required
                  className="w-full bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-[11px] font-bold text-gray-800 uppercase focus:ring-2 focus:ring-amber-100 outline-none"
                />
              </div>
              <div className="pt-4 border-t border-gray-50">
                <h3 className="text-[10px] font-black text-gray-800 uppercase mb-3">
                  Thông tin tài khoản
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={empForm.username}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, username: e.target.value })
                    }
                    required
                    placeholder="Tên đăng nhập"
                    className="w-full bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-[11px] font-bold text-gray-800 focus:ring-2 focus:ring-amber-100 outline-none"
                  />
                  <input
                    type="text"
                    value={empForm.password}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, password: e.target.value })
                    }
                    required
                    placeholder="Mật khẩu"
                    className="w-full bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-[11px] font-bold text-gray-800 focus:ring-2 focus:ring-amber-100 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 text-white py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-amber-600 shadow-md transition-colors"
                >
                  Cập nhật
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditEmpModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHI TIẾT NHÂN VIÊN */}
      {isEmpDetailModalOpen && empDetail && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 shrink-0">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Mã NV: {empDetail.employee_code || "N/A"}
                </p>
                <h2 className="text-xl font-black text-gray-800 uppercase mt-1">
                  {empDetail.full_name}
                </h2>
              </div>
              <button
                onClick={() => setIsEmpDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">
                    Tài khoản cấp
                  </p>
                  <p className="text-sm font-black text-blue-600 mt-1">
                    {empDetail.username}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">
                    Phân quyền
                  </p>
                  <p className="text-xs font-black text-gray-800 uppercase mt-1">
                    {empDetail.role}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-[11px] font-black text-gray-800 uppercase mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-gray-800 rounded-full"></div>Lịch
                  sử Đăng nhập / Đăng xuất
                </h3>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase w-16 text-center">
                          STT
                        </th>
                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase">
                          Thời gian
                        </th>
                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase text-center">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {empHistory.length === 0 ? (
                        <tr>
                          <td
                            colSpan="3"
                            className="px-4 py-6 text-center text-[10px] text-gray-400 font-bold uppercase italic"
                          >
                            Chưa có lịch sử đăng nhập
                          </td>
                        </tr>
                      ) : (
                        empHistory.map((h, i) => (
                          <tr
                            key={h.id || i}
                            className="border-b border-gray-50 hover:bg-gray-50/50"
                          >
                            <td className="px-4 py-3 text-[10px] text-gray-400 font-bold text-center">
                              {i + 1}
                            </td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 font-bold">
                              {new Date(h.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-1 rounded text-[9px] font-black uppercase ${h.action === "login" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}
                              >
                                {h.action === "login"
                                  ? "ĐĂNG NHẬP (IN)"
                                  : "ĐĂNG XUẤT (OUT)"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
