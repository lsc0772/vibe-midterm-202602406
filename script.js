const MENU = [
  { id: "americano", name: "아메리카노", english: "AMERICANO", description: "고소하고 깔끔한 시그니처 블렌드", price: 4000, stock: 12, art: "#e9e9df", circle: "#d8ddce", cup: "" },
  { id: "latte", name: "카페라떼", english: "CAFE LATTE", description: "부드러운 우유와 진한 에스프레소", price: 4500, stock: 10, art: "#ede7de", circle: "#ded2c0", cup: "iced" },
  { id: "vanilla", name: "바닐라라떼", english: "VANILLA LATTE", description: "은은한 바닐라 향의 달콤한 한 잔", price: 5000, stock: 8, art: "#eee8dc", circle: "#e2d5c1", cup: "vanilla" },
  { id: "matcha", name: "말차라떼", english: "MATCHA LATTE", description: "산뜻한 말차와 포근한 우유", price: 5000, stock: 7, art: "#e8eadf", circle: "#d8ddc9", cup: "matcha" },
  { id: "tea", name: "자몽허니블랙티", english: "GRAPEFRUIT HONEY BLACK TEA", description: "자몽의 상큼함과 꿀의 달콤함", price: 4800, stock: 6, art: "#efe8dc", circle: "#e4d6bc", cup: "tea" }
];
const STORAGE_KEY = "morningbrew-cafe-state-v1";
const money = (amount) => `${amount.toLocaleString("ko-KR")}원`;
const $ = (selector) => document.querySelector(selector);
let toastTimer;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.cart) && Array.isArray(saved.orders) && saved.stock && typeof saved.stock === "object") {
      return { cart: saved.cart, orders: saved.orders, stock: saved.stock, nextOrder: Number.isInteger(saved.nextOrder) ? saved.nextOrder : 1 };
    }
  } catch (error) {
    console.warn("저장된 주문 데이터를 불러오지 못했습니다.", error);
  }
  return {
    cart: [],
    orders: [],
    stock: Object.fromEntries(MENU.map((item) => [item.id, item.stock])),
    nextOrder: 1
  };
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("주문 데이터를 저장하지 못했습니다.", error);
    showToast("변경사항을 저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.");
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function renderMenu() {
  $("#menu-grid").innerHTML = MENU.map((item) => {
    const stock = Math.max(0, Number(state.stock[item.id]) || 0);
    const soldOut = stock === 0;
    return `
      <article class="menu-card">
        <div class="drink-art" style="--art-bg:${item.art};--art-circle:${item.circle}">
          ${soldOut ? '<span class="sold-out-badge">SOLD OUT</span>' : ""}
          <div class="drink-cup ${item.cup}" aria-hidden="true"></div>
        </div>
        <div class="card-content">
          <div class="card-topline">
            <div><h3 class="card-title">${item.name}</h3><p class="card-subtitle">${item.english}</p></div>
            <span class="price">${money(item.price)}</span>
          </div>
          <p class="card-subtitle">${item.description}</p>
          <div class="options">
            <label class="option-label"><input type="checkbox" data-option="shot" ${soldOut ? "disabled" : ""}> 샷 추가 <span class="option-price">+500원</span></label>
            <label class="option-label"><input type="checkbox" data-option="syrup" ${soldOut ? "disabled" : ""}> 시럽 추가 <span class="option-price">+0원</span></label>
          </div>
          <button class="add-button" type="button" data-add="${item.id}" ${soldOut ? "disabled" : ""}>
            <span aria-hidden="true">${soldOut ? "−" : "+"}</span> ${soldOut ? "품절" : "장바구니 담기"}
          </button>
        </div>
      </article>`;
  }).join("");
}

function renderCart() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartTotal();
  $("#cart-count").textContent = count;
  $("#subtotal").textContent = money(total);
  $("#total").textContent = money(total);
  $("#checkout-button").disabled = count === 0;
  $("#cart-empty").classList.toggle("hidden", count !== 0);
  $("#cart-items").innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <div>
        <p class="cart-item-name">${item.name} <span style="color:#999">× ${item.quantity}</span></p>
        <div class="cart-item-options">${item.options.length ? item.options.join(" · ") : "기본"}<br>${money(item.price)} / 잔</div>
        <div class="cart-item-price">${money(item.price * item.quantity)}</div>
      </div>
      <button class="remove-button" type="button" data-remove="${item.key}" aria-label="${item.name} 삭제">×</button>
    </div>`).join("");
}

function renderAdmin() {
  const pending = state.orders.filter((order) => order.status === "제조 중").length;
  const completed = state.orders.filter((order) => order.status === "제조 완료").length;
  const sales = state.orders.reduce((sum, order) => sum + order.total, 0);
  $("#admin-date").textContent = new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(new Date());
  $("#stats-grid").innerHTML = `
    <article class="stat-card"><span class="stat-label">전체 주문</span><p class="stat-value">${state.orders.length}<span style="font-size:13px;font-weight:500">건</span></p><span class="stat-caption">누적 주문 건수</span></article>
    <article class="stat-card"><span class="stat-label">제조 대기</span><p class="stat-value">${pending}<span style="font-size:13px;font-weight:500">건</span></p><span class="stat-caption">확인 후 제조 완료 처리해주세요</span></article>
    <article class="stat-card"><span class="stat-label">누적 매출</span><p class="stat-value" style="font-size:21px">${money(sales)}</p><span class="stat-caption">현재 브라우저에 저장된 주문 기준</span></article>`;
  $("#orders-list").innerHTML = state.orders.length ? [...state.orders].reverse().map((order) => `
    <article class="order-row">
      <div><span class="order-id">${order.id}</span><span class="order-time">${order.time}</span></div>
      <div class="order-products">${order.items.map((item) => `${item.name} × ${item.quantity}${item.options.length ? ` (${item.options.join(", ")})` : ""}`).join("<br>")}</div>
      <span class="order-total">${money(order.total)}</span>
      <div class="order-actions"><span class="order-status ${order.status === "제조 완료" ? "completed" : ""}">${order.status}</span>
        <button class="complete-button" type="button" data-complete="${order.id}" ${order.status === "제조 완료" ? "disabled" : ""}>${order.status === "제조 완료" ? "완료됨" : "제조 완료 처리"}</button>
      </div>
    </article>`).join("") : '<div class="orders-empty">아직 들어온 주문이 없습니다. 새로운 주문을 기다리는 중이에요.</div>';
  $("#inventory-list").innerHTML = MENU.map((item) => {
    const stock = Math.max(0, Number(state.stock[item.id]) || 0);
    const status = stock === 0 ? "out" : stock <= 3 ? "low" : "";
    const statusText = stock === 0 ? "품절" : stock <= 3 ? "재고 부족" : "판매 중";
    return `<div class="inventory-row">
      <span class="inventory-name">${item.name}</span>
      <div class="stock-track" role="progressbar" aria-label="${item.name} 재고" aria-valuemin="0" aria-valuemax="${item.stock}" aria-valuenow="${stock}">
        <div class="stock-fill ${status}" style="width:${Math.min(100, stock / item.stock * 100)}%"></div>
      </div>
      <span class="stock-number">${stock}잔</span><span class="stock-status ${status}">${statusText}</span>
    </div>`;
  }).join("");
}

function renderAll() {
  renderMenu();
  renderCart();
  renderAdmin();
}

$("#menu-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  const menu = MENU.find((item) => item.id === button.dataset.add);
  if (!menu || Number(state.stock[menu.id]) < 1) {
    showToast("해당 메뉴는 현재 품절입니다.");
    renderMenu();
    return;
  }
  const card = button.closest(".menu-card");
  const options = [];
  let extra = 0;
  if (card.querySelector('[data-option="shot"]').checked) {
    options.push("샷 추가");
    extra += 500;
  }
  if (card.querySelector('[data-option="syrup"]').checked) options.push("시럽 추가");
  const key = `${menu.id}:${options.slice().sort().join(",")}`;
  const existing = state.cart.find((item) => item.key === key);
  if (existing) existing.quantity += 1;
  else state.cart.push({ key, menuId: menu.id, name: menu.name, options, price: menu.price + extra, quantity: 1 });
  saveState();
  renderCart();
  showToast(`${menu.name}을(를) 장바구니에 담았어요.`);
});

$("#cart-items").addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  state.cart = state.cart.filter((item) => item.key !== button.dataset.remove);
  saveState();
  renderCart();
  showToast("메뉴를 장바구니에서 삭제했어요.");
});

$("#checkout-button").addEventListener("click", () => {
  if (!state.cart.length) return;
  const unavailable = state.cart.find((item) => Number(state.stock[item.menuId]) < item.quantity);
  if (unavailable) {
    showToast(`${unavailable.name} 재고가 부족해 주문할 수 없습니다.`);
    renderAll();
    return;
  }
  const now = new Date();
  const order = {
    id: `MB-${String(state.nextOrder).padStart(4, "0")}`,
    time: new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(now),
    status: "제조 중",
    total: cartTotal(),
    items: state.cart.map(({ menuId, name, options, price, quantity }) => ({ menuId, name, options, price, quantity }))
  };
  for (const item of state.cart) state.stock[item.menuId] -= item.quantity;
  state.orders.push(order);
  state.nextOrder += 1;
  state.cart = [];
  saveState();
  renderAll();
  showToast(`주문이 접수되었습니다! 주문번호 ${order.id}`);
});

$("#admin-toggle").addEventListener("click", () => {
  const showAdmin = $("#customer-view").classList.toggle("hidden");
  $("#admin-view").classList.toggle("hidden", !showAdmin);
  $("#admin-toggle").setAttribute("aria-pressed", String(showAdmin));
  renderAdmin();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

$("#orders-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-complete]");
  if (!button) return;
  const order = state.orders.find((item) => item.id === button.dataset.complete);
  if (!order || order.status === "제조 완료") return;
  order.status = "제조 완료";
  saveState();
  renderAdmin();
  showToast(`${order.id} 주문을 제조 완료 처리했습니다.`);
});

renderAll();
