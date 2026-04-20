/**
 * PHARMA OS - POS FULL LOGIC CẬP NHẬT
 */

let currentCart = [];
let currentOrderId = null;
let selectedPaymentMethod = null; // Lưu trạng thái chọn phương thức

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

const inventoryData = [
  {
    id: 1,
    name: "Amoxicillin 500mg",
    type: "Hộp 10 vỉ",
    stock: 450,
    price: 120000,
  },
  {
    id: 2,
    name: "Paracetamol 500mg",
    type: "Hộp 10 vỉ",
    stock: 124,
    price: 45000,
  },
  { id: 3, name: "Panadol Extra", type: "Vỉ 10 viên", stock: 50, price: 15000 },
  {
    id: 4,
    name: "Vitamin C 1000mg",
    type: "Tuýp 20 viên",
    stock: 300,
    price: 65000,
  },
];

const orderManager = {
  init() {
    this.renderInventory(inventoryData);
    this.setupSearch();
  },

  setupSearch() {
    document.getElementById("search-input").addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = inventoryData.filter((i) =>
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

  renderInventory(data) {
    const list = document.getElementById("inventory-list");
    list.innerHTML = data
      .map(
        (item) => `
        <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <td class="px-3 py-4">
                <p class="font-bold text-gray-700 uppercase text-[11px]">${item.name}</p>
                <p class="text-[9px] text-gray-400 font-semibold italic">${item.type} | Tồn: <span class="text-blue-500">${item.stock}</span></p>
            </td>
            <td class="px-3 py-4 text-center">
                <input type="number" id="qty-${item.id}" value="1" min="1" max="${item.stock}" 
                    class="w-16 text-center border border-gray-200 rounded-lg py-1.5 font-bold outline-none bg-white">
            </td>
            <td class="px-3 py-4 text-right">
                <button onclick="orderManager.addToCart(${item.id})" class="bg-blue-600 text-white w-8 h-8 rounded-lg font-bold hover:bg-blue-700 shadow-sm">+</button>
            </td>
        </tr>`,
      )
      .join("");
  },

  addToCart(id) {
    if (!currentOrderId) {
      alert("Vui lòng bấm 'TẠO ĐƠN MỚI'!");
      return;
    }
    const product = inventoryData.find((p) => p.id === id);
    const qty = parseInt(document.getElementById(`qty-${id}`).value);
    if (qty > product.stock) {
      alert("Kho không đủ!");
      return;
    }
    const exist = currentCart.find((c) => c.id === id);
    if (exist) exist.quantity += qty;
    else currentCart.push({ ...product, quantity: qty });
    this.renderCart();
  },

  renderCart() {
    let total = 0;
    const list = document.getElementById("cart-list");
    list.innerHTML = currentCart
      .map((item, idx) => {
        const sub = item.price * item.quantity;
        total += sub;
        return `<tr class="p-4 block border-b border-gray-50">
                <td class="w-full flex justify-between items-center">
                    <div>
                        <p class="text-[11px] font-bold text-gray-700 uppercase">${item.name}</p>
                        <p class="text-[10px] text-blue-600 font-bold">${item.quantity} x ${item.price.toLocaleString()}đ</p>
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
    if (confirm("Xóa đơn hàng này?")) this.resetSystem();
  },

  // --- LOGIC THANH TOÁN MỚI ---

  openPaymentModal() {
    if (!currentOrderId || currentCart.length === 0) {
      alert("Chưa có sản phẩm hoặc đơn hàng chưa được tạo!");
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

      // Cập nhật nút tác vụ (Không in nổi bật hơn In)
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
      // Bạn có thể lưu biến shouldPrint để in hóa đơn sau khi đóng QR modal
      this.lastOrderShouldPrint = shouldPrint;
    } else {
      alert(shouldPrint ? "Đang in hóa đơn..." : "Đã thanh toán tiền mặt.");
      this.completeTransaction();
    }
  },

  openQRModal(soTien) {
    const qrImg = document.getElementById("qr-image");
    const qrLoading = document.getElementById("qr-loading");

    // Cấu hình link VietQR
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
    document.getElementById("qr-modal").classList.add("hidden");
    if (this.lastOrderShouldPrint) alert("Đang in hóa đơn...");
    this.completeTransaction();
  },

  backToPayment() {
    document.getElementById("qr-modal").classList.add("hidden");
    document.getElementById("payment-modal").classList.remove("hidden");
  },

  completeTransaction() {
    // Reset giỏ hàng và ID đơn hàng
    currentCart = [];
    currentOrderId = null;
    this.renderCart();

    const label = document.getElementById("order-id");
    label.innerText = "ĐỢI LỆNH";
    label.className =
      "text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded";

    this.closePaymentModal();
  },
};

window.orderManager = orderManager;
orderManager.init();
