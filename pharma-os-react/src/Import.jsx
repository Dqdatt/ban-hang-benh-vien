import React, { useState, useEffect, useRef } from "react";
import { db } from "./db";
import { X, ShoppingCart, Trash2, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Import() {
  const [history, setHistory] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);

  // States form gốc[cite: 3]
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [qty, setQty] = useState(1);
  const [imPrice, setImPrice] = useState("");
  const [selPrice, setSelPrice] = useState("");

  // State Ghi chú cho toàn bộ phiếu nhập
  const [note, setNote] = useState("");

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const qtyInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    loadData();
    const handleClickOutside = (e) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target)
      )
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = async () => {
    const prods = await db.products.toArray();
    setDbProducts(prods);
    const hist = await db.import_history
      .orderBy("id")
      .reverse()
      .limit(50)
      .toArray();
    setHistory(hist);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
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

  const selectProduct = (p) => {
    setName(p.name);
    setUnit(p.type || "");
    setImPrice(p.import_price ? p.import_price.toLocaleString() : "");
    setSelPrice(p.sell_price ? p.sell_price.toLocaleString() : "");
    setShowSuggestions(false);
    setTimeout(() => qtyInputRef.current?.focus(), 10);
  };

  const formatPrice = (value, setter) => {
    let num = value.replace(/[^0-9]/g, "");
    setter(num ? parseInt(num).toLocaleString() : "");
  };

  const addPendingItem = () => {
    const importVal = parseInt(imPrice.replace(/,/g, "")) || 0;
    const sellVal = parseInt(selPrice.replace(/,/g, "")) || 0;
    const qtyVal = parseInt(qty) || 0;
    if (!name.trim() || qtyVal <= 0 || importVal <= 0)
      return alert("Vui lòng điền đủ thông tin!");

    const newItem = {
      id: Date.now(),
      name: name.trim(),
      unit,
      qty: qtyVal,
      imPrice: importVal,
      selPrice: sellVal,
      total: qtyVal * importVal,
    };
    setPendingItems([newItem, ...pendingItems]);
    setName("");
    setUnit("");
    setQty(1);
    setImPrice("");
    setSelPrice("");
  };

  const handleFinalImport = async () => {
    const now = new Date();
    const timeStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    for (const item of pendingItems) {
      const existing = await db.products
        .where("name")
        .equals(item.name)
        .first();
      if (existing) {
        await db.products.update(existing.id, {
          total_import: (existing.total_import || 0) + item.qty,
          import_price: item.imPrice,
          sell_price: item.selPrice,
          type: item.unit,
        });
      } else {
        await db.products.add({
          name: item.name,
          type: item.unit,
          total_import: item.qty,
          total_export: 0,
          import_price: item.imPrice,
          sell_price: item.selPrice,
          status: "Đủ hàng",
        });
      }
      // Lưu vào lịch sử kèm ghi chú chung của phiếu[cite: 3, 4]
      await db.import_history.add({ ...item, time: timeStr, note: note });
    }
    loadData();
    setPendingItems([]);
    setNote(""); // Reset ghi chú sau khi lưu
    setIsModalOpen(false);
  };

  return (
    <main className="flex-1 p-6 overflow-hidden flex flex-col">
      {/* UI Bảng lịch sử gốc 100%[cite: 3] */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden transition-all hover:shadow-md">
        <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-[32px] m-4 shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
            <h2 className="font-black text-gray-800 uppercase tracking-tighter text-xl">
              LỊCH SỬ NHẬP HÀNG
            </h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 uppercase text-[16px] tracking-widest active:scale-95"
            >
              NHẬP HÀNG MỚI
            </button>
          </div>

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
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
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
                    <td className="px-2 py-2.5 text-center text-gray-800 font-medium text-[11px] uppercase">
                      {item.time}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] italic text-gray-800 font-medium">
                      {item.note || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white z-[60] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <h2 className="font-black text-gray-800 uppercase tracking-tighter text-xl">
                  THÔNG TIN NHẬP HÀNG
                </h2>
                <X
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer text-gray-400 hover:text-red-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Form ngang gốc[cite: 3] */}
                <div className="flex items-end gap-3 w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
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
                      placeholder="Tìm tên hoặc nhập mới..."
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-[13px] font-medium text-gray-700 uppercase"
                    />
                    {showSuggestions && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-[200px] overflow-y-auto">
                        {suggestions.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => selectProduct(p)}
                            className="px-4 py-3 text-[11px] font-bold uppercase hover:bg-blue-50 cursor-pointer"
                          >
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-[80px]">
                    <label className="block text-[9px] font-bold text-gray-800 uppercase tracking-wider mb-1 ml-1">
                      ĐVT
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-center"
                    />
                  </div>
                  <div className="w-[80px]">
                    <label className="block text-[9px] font-bold text-gray-800 uppercase tracking-wider mb-1 ml-1">
                      SL
                    </label>
                    <input
                      type="number"
                      ref={qtyInputRef}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="w-full px-1 py-2.5 rounded-xl border border-blue-500 text-[13px] font-bold text-blue-600 text-center"
                    />
                  </div>
                  <div className="w-[130px]">
                    <label className="block text-[9px] font-bold text-gray-800 uppercase tracking-wider mb-1 ml-1">
                      Giá nhập
                    </label>
                    <input
                      type="text"
                      value={imPrice}
                      onChange={(e) => formatPrice(e.target.value, setImPrice)}
                      placeholder="VNĐ"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-right"
                    />
                  </div>
                  <div className="w-[130px]">
                    <label className="block text-[9px] font-bold text-gray-800 uppercase tracking-wider mb-1 ml-1">
                      Giá bán
                    </label>
                    <input
                      type="text"
                      value={selPrice}
                      onChange={(e) => formatPrice(e.target.value, setSelPrice)}
                      placeholder="VNĐ"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-right"
                    />
                  </div>
                  <button
                    onClick={addPendingItem}
                    className="bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl uppercase text-[12px] tracking-widest active:scale-95"
                  >
                    THÊM
                  </button>
                </div>

                {/* Danh sách chờ nhập */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2">
                    <Package size={14} /> MẶT HÀNG CHỜ NHẬP (
                    {pendingItems.length})
                  </h3>
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/50 border-b border-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase">
                            Tên thuốc
                          </th>
                          <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase text-center">
                            SL
                          </th>
                          <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase text-right">
                            Thành tiền
                          </th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pendingItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-[11px] font-bold uppercase text-gray-800">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-[11px] font-bold text-center text-blue-600">
                              {item.qty} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-[11px] font-black text-right">
                              {item.total.toLocaleString()}đ
                            </td>
                            <td className="px-4 py-3">
                              <Trash2
                                size={14}
                                className="text-gray-300 hover:text-red-500 cursor-pointer"
                                onClick={() =>
                                  setPendingItems(
                                    pendingItems.filter(
                                      (i) => i.id !== item.id,
                                    ),
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer Modal với ô Ghi chú mới[cite: 4] */}
              <footer className="p-6 border-t border-gray-50 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Ô Ghi chú */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Ghi chú phiếu nhập
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Nhập ghi chú hoặc công nợ cho phiếu này..."
                      className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-[13px] font-medium text-gray-700 resize-none h-[60px] transition-all"
                    />
                  </div>
                  {/* Tổng cộng */}
                  <div className="flex flex-col justify-center items-end">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      TỔNG CỘNG PHIẾU NHẬP
                    </span>
                    <span className="text-3xl font-black text-blue-600 italic">
                      {pendingItems
                        .reduce((s, i) => s + i.total, 0)
                        .toLocaleString()}
                      <span className="text-sm ml-1">đ</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleFinalImport}
                  disabled={pendingItems.length === 0}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl uppercase text-[16px] tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  XÁC NHẬN NHẬP KHO
                </button>
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
