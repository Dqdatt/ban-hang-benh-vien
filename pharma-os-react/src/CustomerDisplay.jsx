import React, { useState, useEffect } from "react";

export default function CustomerDisplay() {
  const [data, setData] = useState({
    cart: [],
    total: 0,
    isQRModalOpen: false,
    qrUrl: "",
  });

  useEffect(() => {
    document.title = "CUSTOMER | PharmaOS";
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

  useEffect(() => {
    const update = () => {
      const stored = localStorage.getItem("pos_customer_sync");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setData(parsed);
        } catch (e) {
          console.error("Lỗi dữ liệu:", e);
        }
      }
    };
    // Lắng nghe sự kiện storage từ tab App.jsx
    window.addEventListener("storage", update);
    update(); // Chạy ngay khi mount
    return () => window.removeEventListener("storage", update);
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-['Montserrat'] flex flex-col lg:flex-row p-4 lg:p-8 gap-6">
      {/* BÊN TRÁI: DANH SÁCH MÓN (TEXT SIZE NHỎ GỌN) */}
      <div className="flex-1 bg-white rounded-[32px] shadow-xl shadow-blue-900/5 p-8 flex flex-col border border-white">
        <div className="flex justify-between items-end mb-6 border-b border-gray-50 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">
              Chi tiết đơn hàng
            </h2>
          </div>
          <div className="text-right">
            <span className="bg-slate-50 text-slate-400 px-3 py-1 rounded-xl font-bold text-[12px] border border-slate-100">
              {data.cart.length} món
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {data.cart.length > 0 ? (
            data.cart.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex-1">
                  {/* Tên sản phẩm nhỏ lại (text-sm) */}
                  <p className="font-bold text-sm text-slate-700 leading-tight mb-0.5">
                    {item.name}
                  </p>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wide">
                    Số lượng:{" "}
                    <span className="text-blue-500">{Number(item.qty)}</span>{" "}
                    {item.type}
                  </p>
                </div>
                <div className="text-right ml-4">
                  {/* Thành tiền nhỏ lại (text-lg) */}
                  <p className="font-black text-lg text-slate-800 tabular-nums">
                    {(
                      Number(item.sell_price) * Number(item.qty)
                    ).toLocaleString()}
                    đ
                  </p>
                  <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.1em] -mt-1">
                    Thành tiền
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <p className="text-sm font-black uppercase tracking-[0.2em]">
                Đang chờ lên đơn...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BÊN PHẢI: THANH TOÁN (CARD NHỎ GỌN) */}
      <div className="w-full lg:w-[380px] flex flex-col gap-4">
        {/* Card Tổng Tiền (Hạ cỡ chữ) */}
        <div className="bg-slate-900 rounded-[28px] p-6 text-center shadow-xl shadow-slate-900/20">
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[9px] mb-1">
            Tổng cộng thanh toán
          </p>
          <p className="text-4xl font-black text-emerald-400 tabular-nums">
            {(Number(data.total) || 0).toLocaleString()}
            <span className="text-xl ml-0.5 font-bold ">đ</span>
          </p>
        </div>

        {/* Card QR Code */}
        <div className="flex-1 bg-white rounded-[32px] p-3 shadow-xl shadow-blue-900/5 flex flex-col items-center justify-center border border-white relative">
          {data.isQRModalOpen ? (
            /* Khi có lệnh: Bỏ toàn bộ text, QR to hết cỡ container */
            <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-500 bg-slate-50 rounded-[24px] p-1 shadow-inner overflow-hidden">
              {data.qrUrl ? (
                <img
                  src={data.qrUrl}
                  alt="QR Thanh Toán"
                  className="w-full h-full object-contain mix-blend-multiply"
                />
              ) : (
                <div className="text-slate-200">Không có mã QR</div>
              )}
            </div>
          ) : (
            /* Khi chờ lệnh: Hiện icon QR to và chữ mờ thay cho spinner */
            <div className="text-center opacity-50 flex flex-col items-center transition-all duration-500">
              <svg
                className="w-20 h-20 text-slate-300 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h3v3h-3v-3zm-3-3h3v3h-3v-3zm3 0h3v3h-3v-3zm0 3h-3v3h3v-3z"
                />
              </svg>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                Quét mã QR tại đây
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
