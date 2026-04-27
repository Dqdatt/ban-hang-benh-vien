import React, { useState, useEffect } from "react";
import { db } from "./db";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [totalProfit, setTotalProfit] = useState(0);

  const loadInventory = async () => {
    try {
      const data = await db.products.toArray();
      setProducts(data);

      // Tính tổng lợi nhuận dự tính
      let totalAllProfit = 0;
      data.forEach((item) => {
        const importPrice = item.import_price || 0;
        const sellPrice = item.sell_price || 0;
        const exported = item.total_export || 0;
        const profit = (sellPrice - importPrice) * exported;
        if (profit > 0) totalAllProfit += profit;
      });
      setTotalProfit(totalAllProfit);
    } catch (error) {
      console.error("Lỗi khi load kho:", error);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const updateSellPrice = async (id, currentPrice, name) => {
    const newPrice = window.prompt(
      `Cập nhật giá bán cho: ${name.toUpperCase()}`,
      currentPrice,
    );
    if (newPrice !== null && newPrice.trim() !== "") {
      const parsedPrice = parseInt(newPrice.replace(/[^0-9]/g, ""));
      if (!isNaN(parsedPrice)) {
        try {
          await db.products.update(Number(id), { sell_price: parsedPrice });
          loadInventory();
        } catch (error) {
          console.error("Lỗi khi cập nhật giá:", error);
        }
      } else {
        alert("Vui lòng nhập số hợp lệ!");
      }
    }
  };

  // Hàm cập nhật dùng chung cho các field khác
  const updateGeneralField = async (
    id,
    currentValue,
    name,
    dbField,
    labelTitle,
    isNumber = true,
  ) => {
    const newValue = window.prompt(
      `Cập nhật ${labelTitle} cho: ${name.toUpperCase()}`,
      currentValue || "",
    );
    if (newValue !== null && newValue.trim() !== "") {
      let finalValue = newValue;
      if (isNumber) {
        finalValue = parseInt(newValue.replace(/[^0-9]/g, ""));
        if (isNaN(finalValue)) {
          alert("Vui lòng nhập số hợp lệ!");
          return;
        }
      }
      try {
        await db.products.update(Number(id), { [dbField]: finalValue });
        loadInventory();
      } catch (error) {
        console.error(`Lỗi khi cập nhật ${dbField}:`, error);
      }
    }
  };

  return (
    <main className="flex-1 p-6 overflow-hidden flex flex-col">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden transition-all hover:shadow-md">
        <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-[32px] m-4 shadow-sm border border-gray-100">
          <div className="p-3 border-b border-gray-50 flex justify-between items-center">
            <h2 className="font-black text-gray-800 uppercase tracking-tighter text-xl ml-4">
              Báo cáo tổng kho
            </h2>
            <div className="bg-white p-4 px-6 rounded-2xl border border-gray-100 shadow-sm border-r-4 border-r-blue-400 min-w-[220px] text-right">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Tổng lợi nhuận dự tính
              </p>
              <div className="flex items-baseline justify-end gap-1">
                <p className="text-2xl font-black text-blue-600 tracking-tighter">
                  {totalProfit.toLocaleString()}
                </p>
                <span className="text-xs font-bold text-blue-400 uppercase">
                  vnđ
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="border-b border-gray-100">
                  <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase text-center">
                    STT
                  </th>
                  <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase">
                    Tên thuốc
                  </th>
                  <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase text-center">
                    ĐVT
                  </th>
                  <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase text-right">
                    Giá Nhập
                  </th>
                  <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase text-right">
                    Giá Bán
                  </th>
                  {/* Bỏ cột Tồn đầu cũ ở đây */}
                  <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase text-center">
                    Tổng Nhập
                  </th>
                  <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase text-center">
                    Tổng Xuất
                  </th>
                  <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase text-center">
                    Tồn Đầu
                  </th>
                  <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase text-right w-20">
                    Lợi Nhuận
                  </th>
                  <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase text-center">
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="py-20 text-center text-gray-400 font-bold uppercase text-xs"
                    >
                      Kho trống - Vui lòng nhập hàng
                    </td>
                  </tr>
                ) : (
                  products.map((item, index) => {
                    const importPrice = item.import_price || 0;
                    const sellPrice = item.sell_price || 0;
                    const exported = item.total_export || 0;
                    const profit = (sellPrice - importPrice) * exported;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/20 transition-colors border-b border-gray-50 group"
                      >
                        <td className="px-2 py-1.5 text-center text-[11px] font-medium text-gray-800">
                          {index + 1}
                        </td>
                        <td className="px-2 py-1.5">
                          <p className="font-semibold text-gray-800 uppercase text-[11px] leading-tight">
                            {item.name}
                          </p>
                        </td>
                        <td className="px-2 py-1.5 text-center text-gray-800 font-medium text-[11px]">
                          {item.type || "---"}
                        </td>

                        {/* Giá Nhập (Có nút sửa) */}
                        <td className="px-2 py-1.5 text-right font-medium text-gray-800 text-[11px]">
                          <div className="flex items-center justify-end gap-1.5">
                            <span>{importPrice.toLocaleString()}</span>
                            <button
                              onClick={() =>
                                updateGeneralField(
                                  item.id,
                                  importPrice,
                                  item.name,
                                  "import_price",
                                  "giá nhập",
                                  true,
                                )
                              }
                              className="p-1 bg-gray-50 hover:bg-gray-200 rounded-md text-gray-500 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                              title="Sửa giá nhập"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>

                        {/* Giá Bán (Giữ nguyên) */}
                        <td className="px-2 py-1.5 text-right font-bold text-blue-600 text-[11px]">
                          <div className="flex items-center justify-end gap-1.5">
                            <span>{sellPrice.toLocaleString()}</span>
                            <button
                              onClick={() =>
                                updateSellPrice(item.id, sellPrice, item.name)
                              }
                              className="p-1 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-500 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                              title="Sửa giá bán"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>

                        {/* Loại bỏ ô Tồn Đầu cũ ở đây */}
                        <td className="px-2 py-1.5 text-center font-bold text-green-500 text-[11px]">
                          {item.total_import || 0}
                        </td>
                        <td className="px-2 py-1.5 text-center font-medium text-gray-800 text-[11px]">
                          {exported}
                        </td>

                        {/* Tồn Đầu mới (Đổi tên từ Tồn kho và Có nút sửa) */}
                        <td className="px-2 py-1.5 text-center bg-gray-50/50">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-black text-red-500 text-[11px]">
                              {item.stock || 0}
                            </span>
                            <button
                              onClick={() =>
                                updateGeneralField(
                                  item.id,
                                  item.stock,
                                  item.name,
                                  "stock",
                                  "tồn đầu",
                                  true,
                                )
                              }
                              className="p-1 bg-red-50 hover:bg-red-100 rounded-md text-red-500 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                              title="Sửa tồn đầu"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>

                        <td className="px-2 py-1.5 text-right font-black text-green-600 text-[11px]">
                          {profit > 0 ? profit.toLocaleString() : "0"}đ
                        </td>

                        {/* Ghi chú (Có nút sửa) */}
                        <td className="px-2 py-1.5 text-[11px] italic text-gray-500 font-medium whitespace-nowrap">
                          <div className="flex items-center justify-start gap-1.5">
                            <span className="truncate max-w-[120px]">
                              {item.note || "---"}
                            </span>
                            <button
                              onClick={() =>
                                updateGeneralField(
                                  item.id,
                                  item.note,
                                  item.name,
                                  "note",
                                  "ghi chú",
                                  false,
                                )
                              }
                              className="p-1 bg-gray-50 hover:bg-gray-200 rounded-md text-gray-500 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                              title="Sửa ghi chú"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
