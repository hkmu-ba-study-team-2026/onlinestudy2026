// ==================== Firebase & 頁面追蹤初始化 ====================
// 1. 紀錄頁面進入時間
const pageStartTime = Date.now();

// 2. 用於追蹤「加入購物車次序」的陣列
let selectionSequence = [];

// 全域變數
let cart = [];
let currentPID = "";

// 固定的 19 個商品清單（1 ~ 19）
const ALL_19_ITEMS = Array.from({ length: 19 }, (_, i) => i + 1);

// 取得 Participant ID
function getPID() {
    let pid = localStorage.getItem("participantID");
    if (!pid || pid.trim() === "") {
        pid = "Anonymous";
        localStorage.setItem("participantID", pid);
    }
    return pid.trim();
}

document.addEventListener('DOMContentLoaded', function(){
    // 點擊按鈕後關閉 Modal 並進入頁面
    const modal = document.getElementById('welcomeModal');
    const closeBtn = document.getElementById('closeModalBtn');
    currentPID = getPID();

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
});

/**
 * 每次使用者將商品加入購物車時呼叫此函式，統一追蹤選購順序
 */
function trackAddToCart(product, quantity = 1) {
    const sequenceItem = {
        step: selectionSequence.length + 1,
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        timestamp: new Date().toISOString()
    };

    selectionSequence.push(sequenceItem);
    console.log("當前選購次序紀錄:", selectionSequence);
}

/**
 * 將點擊歷史轉換為 19 個商品的第一次購買順序地圖
 * 重複購買以第一個為準，未買留空 ""
 */
function generateItemSequenceMap(seqArray) {
    const itemFirstOrder = {};

    if (Array.isArray(seqArray)) {
        seqArray.forEach((record) => {
            const pId = record.productId || record.id;
            const stepNum = record.step;

            if (pId && !itemFirstOrder.hasOwnProperty(pId)) {
                itemFirstOrder[pId] = stepNum;
            }
        });
    }

    const resultMap = {};
    ALL_19_ITEMS.forEach(itemId => {
        resultMap[`Seq_Item_${itemId}`] = itemFirstOrder.hasOwnProperty(itemId)
            ? itemFirstOrder[itemId]
            : "";
    });

    return resultMap;
}

// ==================== 商品資料庫 ====================
const products = [
    // 1. Featured items (精選商品區) - id: 1 ~ 5
    { id: 1, name: "Red Fuji Apple", price: 3.99, isFeatured: true },
    { id: 2, name: "Whole Milk", price: 4.29, isFeatured: true },
    { id: 3, name: "Whole Wheat Bread", price: 3.49, isFeatured: true },
    { id: 4, name: "Organic Chicken Legs", price: 5.99, isFeatured: true },
    { id: 5, name: "Fresh Avocado", price: 2.49, isFeatured: true },

    // 2. Fresh Fruits (水果類) - id: 6 ~ 8
    { id: 6, name: "Green Apple Pack", price: 3.49, isFeatured: false },
    { id: 7, name: "Organic Banana Bunch", price: 1.99, isFeatured: false },
    { id: 8, name: "Fresh Lemon Bag", price: 2.99, isFeatured: false },

    // 3. Fresh Vegetables (蔬菜類) - id: 9 ~ 10
    { id: 9, name: "Roma Tomato Box", price: 2.99, isFeatured: false },
    { id: 10, name: "Fresh Cucumber", price: 0.99, isFeatured: false },

    // 4. Fresh Meat (肉類) - id: 11 ~ 13
    { id: 11, name: "Fresh Beef", price: 14.99, isFeatured: false },
    { id: 12, name: "Premium Pork Chops", price: 8.99, isFeatured: false },
    { id: 13, name: "Ground Turkey", price: 5.49, isFeatured: false },

    // 5. Seafood Market (海鮮類) - id: 14 ~ 16
    { id: 14, name: "Salmon Fillet", price: 13.99, isFeatured: false },
    { id: 15, name: "Frozen Shrimp Pack", price: 9.99, isFeatured: false },
    { id: 16, name: "Cod Fish Fillets", price: 11.99, isFeatured: false },

    // 6. Pantry & Dairy Staples (其他食品/雜貨類) - id: 17 ~ 19
    { id: 17, name: "Farm Eggs", price: 4.49, isFeatured: false },
    { id: 18, name: "Long Grain Rice", price: 4.99, isFeatured: false },
    { id: 19, name: "Greek Yogurt", price: 1.49, isFeatured: false }
];

// 本地數據初始化
let clickCount = parseInt(localStorage.getItem('siteClickCount')) || 0;

// 全局點擊統計
document.addEventListener('click', function () {
    clickCount++;
    localStorage.setItem('siteClickCount', clickCount);
});

// 頁面關閉前寫入離場日誌
const visitStart = new Date();
window.addEventListener('beforeunload', function () {
    const end = new Date();
    const ms = end - visitStart;
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    const duration = `${min} 分 ${s} 秒`;

    const logObj = {
        participantID: currentPID || getPID(),
        enter: visitStart.toLocaleString(),
        leave: end.toLocaleString(),
        totalSecond: sec,
        showTime: duration
    };

    if (typeof db !== 'undefined') {
        db.ref('visit_logs').push(logObj);
    }
});

// ==================== UI 與 分類篩選 ====================
document.querySelectorAll('.cate-filter').forEach(item => {
    item.addEventListener('click', function () {
        const type = this.dataset.type;
        document.querySelectorAll('.product-card').forEach(card => {
            if (type === 'all' || card.dataset.type === type) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// ==================== 購物車邏輯 ====================
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    updateCart();
}

// 按下商品的 Add to Cart 按鈕
document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const productId = parseInt(this.getAttribute('data-id'));
        const product = products.find(p => p.id === productId);

        if (product) {
            addToCart(product);
            trackAddToCart(product, 1); // 紀錄選購順序
        } else {
            console.error(`找不到 ID 為 ${productId} 的商品，請確認 HTML 的 data-id 設定`);
        }
    });
});

function updateCart() {
    const cartCountEl = document.getElementById('cart-count');
    const cartItemsEl = document.getElementById('cart-items');
    const subTotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');

    let totalNum = 0;
    cart.forEach(i => totalNum += i.quantity);
    if (cartCountEl) cartCountEl.textContent = totalNum;

    if (!cartItemsEl) return;

    if (cart.length === 0) {
        cartItemsEl.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
    } else {
        cartItemsEl.innerHTML = '';
        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <span>${item.name}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
                <div class="item-controls">
                    <button onclick="changeQty(${item.id},-1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQty(${item.id},1)">+</button>
                    <button onclick="removeItem(${item.id})">Remove</button>
                </div>
            `;
            cartItemsEl.appendChild(div);
        });
    }

    let sum = 0;
    cart.forEach(i => sum += i.price * i.quantity);
    if (subTotalEl) subTotalEl.textContent = `$${sum.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${sum.toFixed(2)}`;
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    item.quantity += delta;

    if (delta > 0) {
        const product = products.find(p => p.id === id);
        if (product) trackAddToCart(product, 1);
    }

    if (item.quantity <= 0) {
        removeItem(id);
    } else {
        updateCart();
    }
}

function removeItem(id) {
    const tempCart = [...cart];
    cart = cart.filter(i => i.id !== id);
    if (cart.length === 0 && tempCart.length > 0) {
        recordAbandon(tempCart);
    }
    updateCart();
}

function recordAbandon(cartData) {
    let sum = 0;
    cartData.forEach(i => sum += i.price * i.quantity);
    const items = cartData.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price }));
    const log = {
        participantID: currentPID || getPID(),
        abandonTime: new Date().toLocaleString(),
        cartItems: items,
        cartTotal: sum
    };

    if (typeof db !== 'undefined') {
        db.ref('abandon_carts').push(log);
    }
}

document.getElementById('clear-cart')?.addEventListener('click', function () {
    if (cart.length > 0) recordAbandon([...cart]);
    cart = [];
    updateCart();
});

// ==================== Checkout 結帳 & Firebase 資料上傳 ====================
document.getElementById('checkout-btn')?.addEventListener('click', async function () {
    if (cart.length === 0) {
        alert("Your cart is empty, cannot checkout");
        return;
    }

    const checkoutBtn = this;
    checkoutBtn.disabled = true;
    checkoutBtn.innerText = "Processing Checkout...";

    const pageEndTime = Date.now();
    const durationInSeconds = Math.floor((pageEndTime - pageStartTime) / 1000);
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    const formattedDuration = `${minutes}m ${seconds}s (${durationInSeconds} seconds)`;

    let total = 0;
    let featuredCnt = 0;

    const itemsArr = cart.map(item => {
        total += item.price * item.quantity;
        const prod = products.find(p => p.id === item.id);
        if (prod && prod.isFeatured) featuredCnt += item.quantity;

        return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
        };
    });

    // 生成 19 個商品的順序地圖 (Seq_Item_1 ~ Seq_Item_19)
    const itemSequenceMap = generateItemSequenceMap(selectionSequence);

    const checkoutFirebaseData = {
        participantID: currentPID || getPID(),
        checkoutTime: new Date().toLocaleString(),
        aiNudgeText: localStorage.getItem('ai_nudge_text') || "",
        durationSeconds: durationInSeconds,
        formattedDuration: formattedDuration,
        finalCartItems: itemsArr,
        selectionSequence: selectionSequence,
        itemSequenceMap: itemSequenceMap, // 寫入資料庫
        featuredProductCount: featuredCnt,
        orderTotal: total
    };

    try {
        if (typeof db !== 'undefined') {
            await db.ref('checkout_records').push(checkoutFirebaseData);
            console.log("Checkout record saved to Firebase successfully!");
        }
    } catch (error) {
        console.error("Failed to save checkout to Firebase:", error);
    }

    alert(`Checkout Success!\nTotal: $${total.toFixed(2)}`);
    cart = [];
    selectionSequence = [];
    updateCart();

    checkoutBtn.disabled = false;
    checkoutBtn.innerText = "Checkout";
});

// Tab 切換 UI
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// 初始化購物車 UI
updateCart();