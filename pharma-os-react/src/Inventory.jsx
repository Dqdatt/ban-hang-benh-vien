import React, { useState, useEffect } from "react";
import { db } from "./db";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const loadInventory = async () => {
    try {
      const data = await db.products.toArray();
      setProducts(data);

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

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // --- HÀM TỰ ĐỘNG CẬP NHẬT TỒN KHO THEO CÔNG THỨC ---
  const syncStock = async (id) => {
    const p = await db.products.get(Number(id));
    if (p) {
      const newStock =
        (p.stock_initial || 0) + (p.total_import || 0) - (p.total_export || 0);
      await db.products.update(Number(id), { stock: newStock });
    }
  };

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

        // Tự động tính lại tồn kho nếu sửa các trường định lượng
        if (
          ["stock_initial", "total_import", "total_export"].includes(dbField)
        ) {
          await syncStock(id);
        }

        loadInventory();
      } catch (error) {
        console.error(`Lỗi khi cập nhật ${dbField}:`, error);
      }
    }
  };

  const resetToZero = async (id, name, dbField, labelTitle) => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn đưa ${labelTitle} của "${name.toUpperCase()}" về 0?`,
      )
    ) {
      try {
        await db.products.update(Number(id), { [dbField]: 0 });

        // Tự động tính lại tồn kho sau khi reset
        if (
          ["stock_initial", "total_import", "total_export"].includes(dbField)
        ) {
          await syncStock(id);
        }

        loadInventory();
      } catch (error) {
        console.error(`Lỗi khi reset ${dbField}:`, error);
      }
    }
  };

  return (
    <main className="flex-1 p-6 overflow-hidden flex flex-col">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden transition-all hover:shadow-md">
        <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-[32px] m-4 shadow-sm border border-gray-100">
          {/* Header & Search & Profit */}
          <div className="px-6 py-3 border-b border-gray-50 flex justify-between items-start">
            <div className="flex flex-col gap-3">
              <h2 className="font-black text-gray-800 uppercase tracking-tighter text-xl ml-1">
                Báo cáo tổng kho
              </h2>
              <div className="relative w-64 group">
                <input
                  type="text"
                  placeholder="Tìm tên thuốc..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold uppercase tracking-wider text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-300 placeholder:font-normal"
                />
                <svg
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="bg-white p-4 px-6 rounded-2xl border border-gray-100 shadow-sm border-r-4 border-r-blue-400 min-w-[200px] text-right">
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
                  <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase text-center w-12">
                    STT
                  </th>
                  <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase">
                    Tên thuốc
                  </th>
                  <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase text-center w-20">
                    ĐVT
                  </th>
                  <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase text-right">
                    Giá Nhập
                  </th>
                  <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase text-right">
                    Giá Bán
                  </th>
                  <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase text-center">
                    Tồn Đầu
                  </th>
                  <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase text-center">
                    Tổng Nhập
                  </th>
                  <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase text-center">
                    Tổng Xuất
                  </th>
                  <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase text-center">
                    Tồn Kho
                  </th>
                  <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase text-right w-24">
                    Lợi Nhuận
                  </th>
                  <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase text-center">
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="py-20 text-center text-gray-400 font-bold uppercase text-[10px]"
                    >
                      Trống
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((item, index) => {
                    const importPrice = item.import_price || 0;
                    const sellPrice = item.sell_price || 0;
                    const stockInitial = item.stock_initial || 0;
                    const totalImport = item.total_import || 0;
                    const totalExport = item.total_export || 0;
                    const stock = item.stock || 0;
                    const profit = (sellPrice - importPrice) * totalExport;

                    const EditIcon = () => (
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
                    );

                    const ResetIcon = () => (
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
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    );

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/20 transition-colors border-b border-gray-50 group"
                      >
                        <td className="px-2 py-2 text-center text-[11px] font-medium text-gray-400">
                          {index + 1}
                        </td>
                        <td className="px-2 py-2 font-semibold text-gray-800 uppercase text-[11px]">
                          {item.name}
                        </td>
                        <td className="px-2 py-2 text-center text-gray-800 font-medium text-[11px]">
                          {item.type || "---"}
                        </td>

                        {/* Giá Nhập */}
                        <td className="px-2 py-2 text-right font-medium text-gray-800 text-[11px]">
                          <div className="flex items-center justify-end gap-1">
                            <span>{importPrice.toLocaleString()}</span>
                            <button
                              onClick={() =>
                                updateGeneralField(
                                  item.id,
                                  importPrice,
                                  item.name,
                                  "import_price",
                                  "giá nhập",
                                )
                              }
                              className="p-1 hover:text-blue-500 opacity-0 group-hover:opacity-100"
                            >
                              <EditIcon />
                            </button>
                          </div>
                        </td>

                        {/* Giá Bán */}
                        <td className="px-2 py-2 text-right font-bold text-blue-600 text-[11px]">
                          <div className="flex items-center justify-end gap-1">
                            <span>{sellPrice.toLocaleString()}</span>
                            <button
                              onClick={() =>
                                updateSellPrice(item.id, sellPrice, item.name)
                              }
                              className="p-1 hover:text-blue-800 opacity-0 group-hover:opacity-100"
                            >
                              <EditIcon />
                            </button>
                          </div>
                        </td>

                        {/* Tồn Đầu */}
                        <td className="px-2 py-2 text-center text-[11px] font-medium text-gray-800">
                          <div className="flex items-center justify-center gap-1">
                            <span>{stockInitial}</span>
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  updateGeneralField(
                                    item.id,
                                    stockInitial,
                                    item.name,
                                    "stock_initial",
                                    "tồn đầu",
                                  )
                                }
                                className="p-0.5 hover:text-blue-500"
                              >
                                <EditIcon />
                              </button>
                              <button
                                onClick={() =>
                                  resetToZero(
                                    item.id,
                                    item.name,
                                    "stock_initial",
                                    "tồn đầu",
                                  )
                                }
                                className="p-0.5 hover:text-red-500 text-gray-300"
                              >
                                <ResetIcon />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Tổng Nhập */}
                        <td className="px-2 py-2 text-center text-[11px] font-bold text-green-500">
                          <div className="flex items-center justify-center gap-1">
                            <span>{totalImport}</span>
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  updateGeneralField(
                                    item.id,
                                    totalImport,
                                    item.name,
                                    "total_import",
                                    "tổng nhập",
                                  )
                                }
                                className="p-0.5 hover:text-blue-500"
                              >
                                <EditIcon />
                              </button>
                              <button
                                onClick={() =>
                                  resetToZero(
                                    item.id,
                                    item.name,
                                    "total_import",
                                    "tổng nhập",
                                  )
                                }
                                className="p-0.5 hover:text-red-500 text-gray-300"
                              >
                                <ResetIcon />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Tổng Xuất */}
                        <td className="px-2 py-2 text-center text-[11px] font-medium text-gray-800">
                          <div className="flex items-center justify-center gap-1">
                            <span>{totalExport}</span>
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  updateGeneralField(
                                    item.id,
                                    totalExport,
                                    item.name,
                                    "total_export",
                                    "tổng xuất",
                                  )
                                }
                                className="p-0.5 hover:text-blue-500"
                              >
                                <EditIcon />
                              </button>
                              <button
                                onClick={() =>
                                  resetToZero(
                                    item.id,
                                    item.name,
                                    "total_export",
                                    "tổng xuất",
                                  )
                                }
                                className="p-0.5 hover:text-red-500 text-gray-300"
                              >
                                <ResetIcon />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Tồn Kho */}
                        <td className="px-2 py-2 text-center text-[11px] font-black text-red-500 bg-gray-50/30">
                          <div className="flex items-center justify-center gap-1">
                            <span>{stock}</span>
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  updateGeneralField(
                                    item.id,
                                    stock,
                                    item.name,
                                    "stock",
                                    "tồn kho",
                                  )
                                }
                                className="p-0.5 hover:text-blue-500"
                              >
                                <EditIcon />
                              </button>
                              <button
                                onClick={() =>
                                  resetToZero(
                                    item.id,
                                    item.name,
                                    "stock",
                                    "tồn kho",
                                  )
                                }
                                className="p-0.5 hover:text-red-500 text-gray-300"
                              >
                                <ResetIcon />
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="px-2 py-2 text-right text-[11px] font-black text-green-600">
                          {profit > 0 ? profit.toLocaleString() : "0"}đ
                        </td>

                        <td className="px-2 py-2 text-[11px] italic text-gray-400 uppercase text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span>{item.note || "---"}</span>
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
                              className="opacity-0 group-hover:opacity-100"
                            >
                              <EditIcon />
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
