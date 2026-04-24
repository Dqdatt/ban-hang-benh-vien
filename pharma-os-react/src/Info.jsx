import React, { useState, useEffect } from "react";
import { db } from "./db";

export default function Info({ onBack }) {
  const [currentSession, setCurrentSession] = useState(null);

  // States cho Form Cá nhân
  const [pFullname, setPFullname] = useState("");
  const [pUsername, setPUsername] = useState("");
  const [pPassword, setPPassword] = useState("");

  // States cho Form Admin
  const [aUsername, setAUsername] = useState("");
  const [aPassword, setAPassword] = useState("");
  const [aFullname, setAFullname] = useState("");
  const [aRole, setARole] = useState("Dược sĩ");

  useEffect(() => {
    const sessionStr = localStorage.getItem("user_session");
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      setCurrentSession(session);
      setPFullname(session.full_name || "");
      setPUsername(session.username || "");
    }
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const updateData = { full_name: pFullname };
      if (pPassword) updateData.password = pPassword;

      await db.users.update(currentSession.id, updateData);

      // Cập nhật lại session
      const updatedSession = { ...currentSession, full_name: pFullname };
      localStorage.setItem("user_session", JSON.stringify(updatedSession));
      setCurrentSession(updatedSession);

      alert("✅ Đã cập nhật thông tin cá nhân!");
      window.location.reload(); // Reload nhẹ để cập nhật Sidebar Avatar
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      const exist = await db.users.where("username").equals(aUsername).first();
      if (exist) {
        alert("⚠️ Tên đăng nhập này đã có người sử dụng!");
        return;
      }

      await db.users.add({
        username: aUsername,
        password: aPassword,
        full_name: aFullname,
        role: aRole,
        status: "offline",
      });

      alert(`🎉 Thành công! Đã cấp quyền ${aRole} cho ${aFullname}`);
      setAUsername("");
      setAPassword("");
      setAFullname("");
      setARole("Dược sĩ");
    } catch (err) {
      alert("❌ Lỗi hệ thống: " + err.message);
    }
  };

  if (!currentSession) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8 w-full font-['Montserrat'] overflow-y-auto absolute inset-0 z-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
              Hệ thống nhân sự
            </h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
              Quản lý hồ sơ và tài khoản nội bộ
            </p>
          </div>
          <button
            onClick={onBack}
            className="bg-white px-6 py-3 rounded-2xl border border-gray-100 text-[11px] font-black text-blue-600 uppercase tracking-wider hover:bg-blue-50 transition-all shadow-sm"
          >
            ← Quay lại bán hàng
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CỘT TRÁI: HỒ SƠ CÁ NHÂN */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-sm">
                  <span>
                    {currentSession.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="font-black text-gray-800 uppercase text-sm leading-tight">
                    {currentSession.full_name}
                  </h2>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                    {currentSession.role}
                  </span>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">
                    Họ và tên thực
                  </label>
                  <input
                    type="text"
                    value={pFullname}
                    onChange={(e) => setPFullname(e.target.value)}
                    required
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">
                    Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    value={pUsername}
                    disabled
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-100 text-sm font-semibold text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={pPassword}
                    onChange={(e) => setPPassword(e.target.value)}
                    placeholder="Để trống nếu không đổi"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-lg active:scale-95 pt-6 mt-2"
                >
                  Cập nhật thông tin
                </button>
              </form>
            </div>
          </div>

          {/* CỘT PHẢI: QUẢN LÝ NHÂN SỰ (CHỈ ADMIN THẤY) */}
          {currentSession.role === "Admin" && (
            <div className="lg:col-span-2">
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm h-full">
                <h2 className="font-black text-gray-800 text-xl uppercase tracking-tighter mb-8">
                  Thêm nhân viên mới
                </h2>

                <form
                  onSubmit={handleAdminSubmit}
                  className="grid grid-cols-2 gap-6"
                >
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">
                      Tên tài khoản
                    </label>
                    <input
                      type="text"
                      value={aUsername}
                      onChange={(e) => setAUsername(e.target.value)}
                      required
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/30 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">
                      Mật khẩu
                    </label>
                    <input
                      type="password"
                      value={aPassword}
                      onChange={(e) => setAPassword(e.target.value)}
                      required
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/30 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">
                      Họ tên nhân viên
                    </label>
                    <input
                      type="text"
                      value={aFullname}
                      onChange={(e) => setAFullname(e.target.value)}
                      required
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/30 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">
                      Phân quyền
                    </label>
                    <select
                      value={aRole}
                      onChange={(e) => setARole(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/30 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Dược sĩ">Dược sĩ (Bán hàng)</option>
                      <option value="Admin">Quản trị viên (Toàn quyền)</option>
                    </select>
                  </div>
                  <div className="col-span-2 pt-4">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                    >
                      Khởi tạo tài khoản nhân viên
                    </button>
                  </div>
                </form>

                <div className="mt-12">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                    Lưu ý bảo mật
                  </h3>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                    Tài khoản được tạo sẽ có hiệu lực ngay lập tức. Nhân viên có
                    thể đăng nhập bằng mã tài khoản và mật khẩu bạn đã cấp. Hãy
                    nhắc nhở nhân viên đổi mật khẩu cá nhân sau khi nhận tài
                    khoản.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
