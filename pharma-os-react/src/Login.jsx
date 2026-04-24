import React, { useState } from "react";
import { AuthManager } from "./db";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!AuthManager) {
      alert("Hệ thống đang khởi tạo, vui lòng thử lại sau 1 giây...");
      return;
    }

    try {
      const success = await AuthManager.login(username, password);
      if (success) {
        onLoginSuccess(); // Kích hoạt sự kiện đăng nhập thành công để App.jsx chuyển màn hình
      } else {
        alert("Sai tài khoản hoặc mật khẩu!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối cơ sở dữ liệu!");
    }
  };

  return (
    <div className="bg-[#f8fafc] flex items-center justify-center min-h-screen w-full font-['Montserrat']">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-gray-100 animate-in zoom-in duration-300">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-full mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
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
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            HỆ THỐNG NHÀ THUỐC
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-medium uppercase tracking-wider">
            Quản lý lưu hành nội bộ
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Tên đăng nhập
            </label>
            <input
              type="text"
              id="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-600 font-medium"
              placeholder="Nhập tài khoản..."
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700"
              >
                Mật khẩu
              </label>
              <a
                href="#"
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Quên mật khẩu?
              </a>
            </div>
            <input
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-600 font-medium"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="remember"
              className="ml-2 text-sm text-gray-600 cursor-pointer select-none"
            >
              Ghi nhớ phiên đăng nhập
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-[0_10px_20px_rgba(37,99,235,0.2)] transition-all duration-200 transform active:scale-[0.98] tracking-widest"
          >
            ĐĂNG NHẬP
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-50 text-center">
          <p className="text-[11px] text-gray-400 font-medium tracking-tight">
            © 2026 BENH VIEN DA KHOA BUU DIEN. <br />
            Hệ thống vận hành cục bộ.
          </p>
        </div>
      </div>
    </div>
  );
}
