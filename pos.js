/**
 * PHARMA OS - POS FULL LOGIC (Tích hợp Database)
 */

let currentCart = [];
let currentOrderId = null;
let selectedPaymentMethod = null;

// Hàm load các thành phần UI từ file riêng
async function loadComponents() {
  const components = ["payment.html", "qr.html"];
  for (const file of components) {
    try {
      const response = await fetch(file);
      const html = await response.text();
      document.body.insertAdjacentHTML("beforeend", html);
    } catch (err) {
      console.error(`Lỗi tải file ${file}:`, err);
    }
  }
}
loadComponents();

const orderManager = {
  allProducts: [], // Biến lưu trữ toàn bộ sản phẩm từ DB

  async init() {
    // Tải dữ liệu từ database Dexie thay vì dùng mảng giả lập
    await this.loadInventory();
    this.setupSearch();
  },

  async loadInventory() {
    try {
      // Lấy toàn bộ sản phẩm thực tế đang có trong IndexedDB
      this.allProducts = await db.products.toArray();

      // Nếu Database trống (do bạn đã comment phần nạp mẫu),
      // thì allProducts sẽ là mảng rỗng [] -> Màn hình sẽ trắng tinh.
      this.renderInventory(this.allProducts);
    } catch (error) {
      console.error("Lỗi truy vấn Database:", error);
    }
  },

  setupSearch() {
    document.getElementById("search-input").addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      // Lọc trực tiếp trên mảng allProducts đã tải từ DB
      const filtered = this.allProducts.filter((i) =>
        i.name.toLowerCase().includes(term),
      );
      this.renderInventory(filtered);
    });
  },

  generateOrderNumber() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `A${year}T${month}-${randomDigits}`;
  },

  newOrder() {
    if (currentOrderId) {
      alert(`Đơn hàng ${currentOrderId} đang mở!`);
      return;
    }
    currentOrderId = this.generateOrderNumber();
    const orderLabel = document.getElementById("order-id");
    orderLabel.innerText = currentOrderId;
    orderLabel.classList.replace("text-gray-400", "text-green-600");
    orderLabel.classList.replace("bg-gray-100", "bg-green-50");
    document.getElementById("search-input").focus();
  },

  // 2. Hàm vẽ giao diện
  renderInventory(data) {
    const list = document.getElementById("inventory-list");
    if (!list) return;

    list.innerHTML = data
      .map((item) => {
        const itemId = item.id;
        // Xử lý tồn kho an toàn, không để hiện NaN
        const stock = Number(item.stock) || 0;

        // Logic màu sắc: 0 = Đỏ, <= 5 = Vàng, còn lại = Xanh
        let stockColorClass = "text-blue-500";
        if (stock === 0) {
          stockColorClass = "text-red-500 font-black";
        } else if (stock <= 5) {
          stockColorClass = "text-yellow-500 font-bold";
        }

        return `
      <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
          <td class="px-3 py-4">
              <p class="font-bold text-gray-700 uppercase text-[11px]">${item.name}</p>
                <p class="text-[9px] text-gray-400 font-semibold italic">
                 ${item.type || "Đơn vị"} | Tồn: <span class="${stockColorClass}">${stock}</span>
                </p>
          </td>
          <td class="px-3 py-4 text-center">
              <input type="number" id="qty-${itemId}" value="1" min="1" max="${stock}" 
                  class="w-16 text-center border border-gray-200 rounded-lg py-1.5 font-bold outline-none bg-white text-xs">
          </td>
          <td class="px-3 py-4 text-right">
              <button onclick="orderManager.addToCart(${itemId})" 
                  ${stock <= 0 ? "disabled" : ""}
                  class="bg-blue-600 text-white w-8 h-8 rounded-lg font-bold hover:bg-blue-700 shadow-sm ${stock <= 0 ? "opacity-30 cursor-not-allowed" : ""}">
                  +
              </button>
          </td>
      </tr>`;
      })
      .join("");
  },

  addToCart(id) {
    if (!currentOrderId) {
      alert("Vui lòng bấm 'TẠO ĐƠN MỚI'!");
      return;
    }

    // Tìm sản phẩm trong danh sách đã tải từ DB (ép kiểu id về số)
    const product = this.allProducts.find((p) => Number(p.id) === Number(id));
    if (!product) return;

    // Lấy số lượng từ input và ép kiểu
    const qtyInput = document.getElementById(`qty-${id}`);
    const qty = parseInt(qtyInput.value) || 0;

    if (qty <= 0) {
      alert("Số lượng phải lớn hơn 0!");
      return;
    }

    const currentStock = Number(product.stock) || 0;

    if (qty > currentStock) {
      alert("Kho không đủ số lượng!");
      return;
    }

    const exist = currentCart.find((c) => Number(c.id) === Number(id));
    if (exist) {
      // Kiểm tra xem tổng số lượng có vượt tồn kho không
      if (Number(exist.quantity) + qty > currentStock) {
        alert("Tổng số lượng trong giỏ vượt quá tồn kho!");
        return;
      }
      exist.quantity += qty;
    } else {
      // Đưa vào giỏ hàng, đặt tên trường là quantity để đồng bộ với code cũ của bạn
      currentCart.push({
        ...product,
        quantity: qty,
      });
    }

    this.renderCart();
  },

  renderCart() {
    let total = 0;
    const list = document.getElementById("cart-list");
    list.innerHTML = currentCart
      .map((item, idx) => {
        const sub = item.sell_price * item.quantity;
        total += sub;
        return `<tr class="p-4 block border-b border-gray-50">
                <td class="w-full flex justify-between items-center">
                    <div>
                        <p class="text-[11px] font-bold text-gray-700 uppercase">${item.name}</p>
                        <p class="text-[10px] text-blue-600 font-bold">${item.quantity} x ${item.sell_price.toLocaleString()}đ</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-black text-gray-800">${sub.toLocaleString()}đ</span>
                        <button onclick="orderManager.removeItem(${idx})" class="text-red-400 text-[10px] font-bold uppercase">Xóa</button>
                    </div>
                </td>
            </tr>`;
      })
      .join("");

    const formattedTotal = total.toLocaleString() + "đ";
    document.getElementById("total-price").innerText = formattedTotal;
    document.getElementById("grand-total").innerText = formattedTotal;
  },

  removeItem(idx) {
    currentCart.splice(idx, 1);
    this.renderCart();
  },

  clearOrder() {
    if (!currentOrderId) return;
    if (confirm("Bạn có chắc chắn muốn xóa đơn hàng này?")) {
      currentCart = [];
      currentOrderId = null;
      this.renderCart();
      const label = document.getElementById("order-id");
      label.innerText = "ĐỢI LỆNH";
      label.className =
        "text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded tracking-tight";
    }
  },

  // --- LOGIC THANH TOÁN ---

  openPaymentModal() {
    if (!currentOrderId || currentCart.length === 0) {
      alert("Chưa có sản phẩm trong giỏ hoặc chưa tạo đơn hàng!");
      return;
    }
    document.getElementById("modal-order-id").innerText = currentOrderId;
    document.getElementById("modal-total-amount").innerText =
      document.getElementById("grand-total").innerText;

    selectedPaymentMethod = null;
    this.updatePaymentUI();
    document.getElementById("payment-modal").classList.remove("hidden");
  },

  closePaymentModal() {
    document.getElementById("payment-modal").classList.add("hidden");
  },

  selectPayment(method) {
    if (selectedPaymentMethod === null) {
      selectedPaymentMethod = method;
    } else if (selectedPaymentMethod === method) {
      selectedPaymentMethod = null;
    } else {
      return; // Khóa chéo: Phải hủy cái cũ mới chọn cái mới
    }
    this.updatePaymentUI();
  },

  updatePaymentUI() {
    const btnCash = document.getElementById("btn-cash");
    const btnTransfer = document.getElementById("btn-transfer");
    const btnNoPrint = document.getElementById("btn-no-print");
    const btnPrint = document.getElementById("btn-print");

    if (!btnCash) return;

    // Reset Styles
    [btnCash, btnTransfer].forEach((btn) => {
      btn.className =
        "py-10 border-2 border-gray-100 rounded-[32px] font-bold text-lg uppercase transition-all flex flex-col items-center gap-3 bg-white text-gray-900 hover:bg-gray-50 cursor-pointer";
    });

    if (selectedPaymentMethod) {
      const activeBtn =
        selectedPaymentMethod === "cash" ? btnCash : btnTransfer;
      const inactiveBtn =
        selectedPaymentMethod === "cash" ? btnTransfer : btnCash;

      activeBtn.classList.replace("border-gray-100", "border-blue-600");
      activeBtn.classList.add("bg-blue-50", "text-blue-600");
      inactiveBtn.classList.add("opacity-10", "cursor-not-allowed");

      // Cập nhật nút tác vụ
      btnNoPrint.disabled = false;
      btnNoPrint.className =
        "flex-[1.8] bg-blue-600 text-white rounded-[32px] font-black text-2xl uppercase tracking-wider transition-all flex items-center justify-center text-center px-6 shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:bg-blue-700";

      btnPrint.disabled = false;
      btnPrint.className =
        "flex-1 bg-white border-2 border-gray-100 text-gray-700 rounded-[32px] font-black text-xl uppercase tracking-wider transition-all hover:bg-gray-50 flex items-center justify-center text-center px-6";
    } else {
      btnNoPrint.disabled = true;
      btnNoPrint.className =
        "flex-[1.8] bg-gray-800 text-white rounded-[32px] font-black text-2xl uppercase tracking-wider transition-all opacity-30 flex items-center justify-center text-center px-6";

      btnPrint.disabled = true;
      btnPrint.className =
        "flex-1 bg-gray-100 text-gray-400 rounded-[32px] font-black text-xl uppercase tracking-wider transition-all flex items-center justify-center text-center px-6";
    }
  },

  finishOrder(shouldPrint) {
    const totalAmountStr = document
      .getElementById("grand-total")
      .innerText.replace(/[^0-9]/g, "");
    const soTien = parseInt(totalAmountStr);

    if (selectedPaymentMethod === "transfer") {
      this.closePaymentModal();
      this.openQRModal(soTien);
      this.lastOrderShouldPrint = shouldPrint;
    } else {
      alert(shouldPrint ? "Đang in hóa đơn..." : "Đã thanh toán tiền mặt.");
      this.completeTransaction();
    }
  },

  openQRModal(soTien) {
    const qrImg = document.getElementById("qr-image");
    const qrLoading = document.getElementById("qr-loading");

    // Cấu hình link VietQR (Giữ nguyên cấu hình của bạn)
    const bankId = "970437";
    const accountNo = "045704070016757";
    const template = "compact2";
    const accountName = "BENH%20VIEN%20DA%20KHOA%20BUU%20DIEN";
    const description = "%20CK%20TIEN%20THUOC%20CS1";
    const tenKH = "KHACH HANG DEMO".replace(/ /g, "%20");

    const qrCodeUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${soTien}&addInfo=${tenKH}${description}&accountName=${accountName}`;

    qrImg.classList.add("opacity-0");
    qrLoading.classList.remove("hidden");
    document.getElementById("qr-amount-display").innerText =
      soTien.toLocaleString() + "đ";

    qrImg.src = qrCodeUrl;
    qrImg.onload = () => {
      qrImg.classList.replace("opacity-0", "opacity-100");
      qrLoading.classList.add("hidden");
    };

    document.getElementById("qr-modal").classList.remove("hidden");
  },

  closeQRModal() {
    // Đóng modal QR
    document.getElementById("qr-modal").classList.add("hidden");

    // Nếu trước đó người dùng chọn "In hóa đơn" rồi mới hiện QR
    if (this.lastOrderShouldPrint) {
      console.log("Đang in hóa đơn...");
      // Thực hiện lệnh in ở đây nếu có
    }

    // GỌI HÀM HOÀN TẤT ĐỂ TRỪ KHO
    this.completeTransaction();
  },

  backToPayment() {
    document.getElementById("qr-modal").classList.add("hidden");
    document.getElementById("payment-modal").classList.remove("hidden");
  },

  // Cập nhật hàm này trong pos.js
  async completeTransaction() {
    console.log("Đang hoàn tất đơn hàng và trừ kho...");
    try {
      // 1. Chạy vòng lặp trừ kho cho từng món trong giỏ
      for (const item of currentCart) {
        const productId = Number(item.id);
        const productFromDB = await db.products.get(productId);

        if (productFromDB) {
          const oldStock = Number(productFromDB.stock) || 0;
          const oldExport = Number(productFromDB.total_export) || 0;
          const soldQty = Number(item.quantity) || 0; // Lưu ý: dùng .quantity theo code của bạn

          await db.products.update(productId, {
            stock: oldStock - soldQty,
            total_export: oldExport + soldQty,
          });
        }
      }

      // 2. Reset giỏ hàng và UI
      currentCart = [];
      currentOrderId = null;
      await this.loadInventory(); // Cập nhật số lượng mới lên màn hình
      this.renderCart();

      // Đóng tất cả các Modal
      this.closePaymentModal();
      if (document.getElementById("qr-modal")) {
        document.getElementById("qr-modal").classList.add("hidden");
      }

      const label = document.getElementById("order-id");
      if (label) label.innerText = "ĐỢI LỆNH";
    } catch (error) {
      console.error("Lỗi workflow thanh toán:", error);
      alert("Lỗi: Không thể cập nhật kho hàng!");
    }
  },
};

// Khởi chạy sau khi tài liệu đã sẵn sàng để đảm bảo DB đã được nạp
window.addEventListener("DOMContentLoaded", () => {
  window.orderManager = orderManager;
  // Đợi 100ms để đảm bảo database.js initDB() tạo xong dữ liệu mẫu nếu chưa có
  setTimeout(() => {
    orderManager.init();
  }, 100);
});
