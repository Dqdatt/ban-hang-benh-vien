import React, { useState, useEffect, useRef } from "react";
import { db } from "./db";

export default function Import() {
  const [history, setHistory] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);

  // States cho Form nhập liệu
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [qty, setQty] = useState(1);
  const [imPrice, setImPrice] = useState("");
  const [selPrice, setSelPrice] = useState("");
  const [note, setNote] = useState("");

  // States cho Autocomplete (Gợi ý thuốc)
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const qtyInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    loadData();

    // Click ra ngoài để ẩn gợi ý
    const handleClickOutside = (event) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const prods = await db.products.toArray();
      setDbProducts(prods);

      const hist = await db.import_history
        .orderBy("id")
        .reverse()
        .limit(50)
        .toArray();
      setHistory(hist);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
    }
  };

  // --- LOGIC AUTOCOMPLETE ---
  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    setSelectedIndex(-1);

    if (!val) {
      setShowSuggestions(false);
      return;
    }

    const matches = dbProducts.filter((p) =>
      p.name.toUpperCase().includes(val.toUpperCase()),
    );
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + suggestions.length) % suggestions.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex > -1) selectProduct(suggestions[selectedIndex]);
    }
  };

  const selectProduct = (p) => {
    setName(p.name);
    setUnit(p.type || "");
    // Auto fill giá nhập và giá bán (nếu có)
    // Chuyển số thành chuỗi định dạng có dấu phẩy để đồng bộ với hàm formatPrice
    setImPrice(p.import_price ? p.import_price.toLocaleString() : "");
    setSelPrice(p.sell_price ? p.sell_price.toLocaleString() : "");
    setShowSuggestions(false);
    setSelectedIndex(-1);

    // Tự động focus sang ô Số lượng
    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
    }, 10);
  };

  // --- LOGIC FORMAT FORMATTER ---
  const formatPrice = (value, setter) => {
    let num = value.replace(/[^0-9]/g, "");
    setter(num ? parseInt(num).toLocaleString() : "");
  };

  const handleUnitChange = (e) => {
    let val = e.target.value;
    if (val.length > 0) val = val.charAt(0).toUpperCase() + val.slice(1);
    setUnit(val);
  };

  // --- LOGIC LƯU DB ---
  const handleImport = async () => {
    const importVal = parseInt(imPrice.replace(/,/g, "")) || 0;
    const sellVal = parseInt(selPrice.replace(/,/g, "")) || 0;
    const qtyVal = parseInt(qty) || 0;

    if (!name.trim() || qtyVal <= 0 || importVal <= 0) {
      return alert("Vui lòng điền đủ thông tin (Tên, Số lượng, Giá nhập)!");
    }

    try {
      // 1. Cập nhật tồn kho
      const existing = await db.products
        .where("name")
        .equals(name.trim())
        .first();
      if (existing) {
        await db.products.update(existing.id, {
          stock: (existing.stock || 0) + qtyVal,
          total_import: (existing.total_import || 0) + qtyVal,
          import_price: importVal,
          sell_price: sellVal,
          type: unit.trim(),
        });
      } else {
        await db.products.add({
          name: name.trim(),
          type: unit.trim(),
          stock: qtyVal,
          stock_initial: 0,
          total_import: qtyVal,
          total_export: 0,
          import_price: importVal,
          sell_price: sellVal,
          status: "Đủ hàng",
        });
      }

      // 2. Tạo lịch sử
      const now = new Date();
      const timeStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      const sessionStr = localStorage.getItem("user_session");
      const user = sessionStr ? JSON.parse(sessionStr).username : "Admin";

      await db.import_history.add({
        name: name.trim(),
        unit: unit.trim(),
        qty: qtyVal,
        imPrice: importVal,
        selPrice: sellVal,
        note: note,
        time: timeStr,
        total: qtyVal * importVal,
        user_id: user,
      });

      // 3. Reset & Refresh
      await loadData();
      setName("");
      setUnit("");
      setQty(1);
      setImPrice("");
      setSelPrice("");
      setNote("");
    } catch (err) {
      console.error("Lỗi khi xử lý nhập kho:", err);
    }
  };

  return (
    <main className="flex-1 p-6 overflow-hidden flex flex-col">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden transition-all hover:shadow-md">
        <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-[32px] m-4 shadow-sm border border-gray-100">
          {/* Header & Form nhập */}
          <div className="p-6 border-b border-gray-50 bg-gray-50/30 relative z-20">
            <h2 className="font-black text-gray-800 uppercase tracking-tighter text-xl mb-5">
              THÔNG TIN NHẬP HÀNG
            </h2>

            <div className="flex items-end gap-3 w-full">
              {/* Cột Tên Thuốc (Có Autocomplete) */}
              <div
                className="flex-1 min-w-[100px] relative"
                ref={autocompleteRef}
              >
                <label className="block text-[9px] font-bold text-gray-800 uppercase tracking-wider mb-1 ml-1">
                  Tên thuốc
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Tìm tên hoặc nhập mới..."
                  autoComplete="off"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-[13px] font-medium text-gray-700 uppercase bg-white placeholder:font-normal placeholder:text-[10px] placeholder:text-gray-300"
                />

                {/* Dropdown Gợi ý */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-[250px] overflow-y-auto custom-scrollbar">
                    {suggestions.map((p, index) => (
                      <div
                        key={p.id}
                        onClick={() => selectProduct(p)}
                        className={`px-4 py-3 text-[11px] font-bold uppercase cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${index === selectedIndex ? "bg-blue-50 text-blue-600" : "hover:bg-blue-50 hover:text-blue-600"}`}
                      >
                        {p.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-[100px]">
                <label className="block text-[9px] font-bold text-gray-800 uppercase tracking-wider mb-1 ml-1">
                  ĐVT
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={handleUnitChange}
                  className="w-full px-1 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-[13px] font-medium text-center text-gray-700 bg-white"
                />
              </div>

              <div className="w-[100px]">
                <label className="block text-[9px] font-bold text-gray-800 uppercase tracking-wider mb-1 ml-1">
                  Số lượng
                </label>
                <input
                  type="number"
                  ref={qtyInputRef}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  min="1"
                  className="w-full px-1 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-[13px] font-medium text-blue-600 text-center bg-white"
                />
              </div>

              <div className="w-[170px]">
                <label className="block text-[9px] font-bold text-gray-800 uppercase tracking-wider mb-1 ml-1">
                  Giá nhập
                </label>
                <input
                  type="text"
                  value={imPrice}
                  onChange={(e) => formatPrice(e.target.value, setImPrice)}
                  placeholder="VNĐ"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-[13px] font-medium text-gray-800 text-right bg-white"
                />
              </div>

              <div className="w-[170px]">
                <label className="block text-[9px] font-bold text-gray-800 uppercase tracking-wider mb-1 ml-1">
                  Giá bán
                </label>
                <input
                  type="text"
                  value={selPrice}
                  onChange={(e) => formatPrice(e.target.value, setSelPrice)}
                  placeholder="VNĐ"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-[13px] font-medium text-gray-800 text-right bg-white"
                />
              </div>

              <div className="w-[190px]">
                <label className="block text-[9px] font-bold text-gray-800 uppercase tracking-wider mb-1 ml-1">
                  Công nợ
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-[13px] font-medium text-gray-700 bg-white"
                />
              </div>

              <div className="w-[150px]">
                <button
                  onClick={handleImport}
                  className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase text-[16px] tracking-widest active:scale-95"
                >
                  NHẬP HÀNG
                </button>
              </div>
            </div>
          </div>

          {/* Bảng Lịch sử */}
          <div className="flex-1 overflow-auto custom-scrollbar bg-white z-10">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="border-b border-gray-100">
                  <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase text-center w-12">
                    STT
                  </th>
                  <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase">
                    Tên thuốc
                  </th>
                  <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase text-center w-24">
                    ĐVT
                  </th>
                  <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase text-center w-20">
                    SL
                  </th>
                  <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase text-right w-32">
                    Giá nhập
                  </th>
                  <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase text-right w-32">
                    Giá bán
                  </th>
                  <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase text-right w-32">
                    Thành tiền
                  </th>
                  <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase text-center w-32">
                    Thời gian
                  </th>
                  <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase">
                    Công nợ
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="py-20 text-center text-gray-400 font-bold uppercase text-[10px]"
                    >
                      Chưa có dữ liệu nhập hàng
                    </td>
                  </tr>
                ) : (
                  history.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/20 border-b border-gray-50 transition-all group"
                    >
                      <td className="px-2 py-2.5 text-center text-[11px] font-medium text-gray-400">
                        {index + 1}
                      </td>
                      <td className="px-2 py-2.5 font-semibold text-gray-800 uppercase text-[11px]">
                        {item.name}
                      </td>
                      <td className="px-2 py-2.5 text-center text-gray-800 font-medium text-[11px]">
                        {item.unit}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-gray-800 text-[11px] bg-gray-50/50">
                        {item.qty}
                      </td>
                      <td className="px-2 py-2.5 text-right font-medium text-gray-800 text-[11px]">
                        {(item.imPrice || 0).toLocaleString()}
                      </td>
                      <td className="px-2 py-2.5 text-right font-medium text-gray-800 text-[11px]">
                        {(item.selPrice || 0).toLocaleString()}
                      </td>
                      <td className="px-2 py-2.5 text-right font-bold text-gray-800 text-[11px]">
                        {(item.total || 0).toLocaleString()}đ
                      </td>
                      <td className="px-2 py-2.5 text-center text-gray-800 font-medium text-[11px] uppercase whitespace-nowrap">
                        {item.time}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] italic text-gray-800 font-medium">
                        {item.note || ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
