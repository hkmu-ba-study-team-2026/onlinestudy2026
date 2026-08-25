// ==================== Firebase & 頁面追蹤初始化 ====================
const pageStartTime = Date.now();
const MAX_BUDGET = 50.00;

let selectionSequence = [];
let cart = [];
let currentPID = "";

const ALL_ITEMS = Array.from({ length: 30 }, (_, i) => i + 1);

function getPID() {
    let pid = localStorage.getItem("participantID");
    if (!pid || pid.trim() === "") {
        pid = "Anonymous";
        localStorage.setItem("participantID", pid);
    }
    return pid.trim();
}

document.addEventListener('DOMContentLoaded', function(){
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
 * 追蹤選購次序與點擊來源
 */
function trackAddToCart(product, quantity = 1, sourceSection = "category") {
    const sequenceItem = {
        step: selectionSequence.length + 1,
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        sourceSection: sourceSection,
        timestamp: new Date().toISOString()
    };
    selectionSequence.push(sequenceItem);
}

function generateItemSequenceMap(seqArray) {
    const itemFirstOrder = {};
    if (Array.isArray(seqArray)) {
        seqArray.forEach((record) => {
            const pId = record.productId || record.id;
            const stepNum = record.step;
            if (pId && !itemFirstOrder.hasOwnProperty(pId)) {
                itemFirstOrder[pId] = `${stepNum} (${record.sourceSection || 'category'})`;
            }
        });
    }

    const resultMap = {};
    ALL_ITEMS.forEach(itemId => {
        resultMap[`Seq_Item_${itemId}`] = itemFirstOrder.hasOwnProperty(itemId)
            ? itemFirstOrder[itemId]
            : "";
    });
    return resultMap;
}

// ==================== 30 項商品資料庫（ID 1~5 為 Featured） ====================
const products = [
    // 1. Featured items (置頂 5 項，ID: 1 ~ 5)
    { id: 1, name: "Tomato Cherry", price: 2.97, isFeatured: true },
    { id: 2, name: "Chicken Drumsticks", price: 1.77, isFeatured: true },
    { id: 3, name: "Large Brown Eggs", price: 7.49, isFeatured: true },      // ★ 置頂 Eggs
    { id: 4, name: "Strawberries", price: 2.38, isFeatured: true },
    { id: 5, name: "Greek Yogurt", price: 4.99, isFeatured: true },

    // 2. Fresh Fruits (水果類，ID: 6 ~ 10)
    { id: 6, name: "Red Apple", price: 1.47, isFeatured: false },
    { id: 7, name: "Blueberries", price: 2.99, isFeatured: false },
    { id: 8, name: "Banana Bunch", price: 0.99, isFeatured: false },
    { id: 9, name: "Oranges", price: 4.99, isFeatured: false },
    { id: 10, name: "Lemon", price: 0.74, isFeatured: false },

    // 3. Fresh Vegetables (蔬菜類，ID: 11 ~ 15)
    { id: 11, name: "Avocado", price: 2.59, isFeatured: false },
    { id: 12, name: "Sweet Potato", price: 1.95, isFeatured: false },
    { id: 13, name: "Cucumber", price: 2.08, isFeatured: false },
    { id: 14, name: "Bi-Color Corn", price: 0.50, isFeatured: false },
    { id: 15, name: "Peeled Baby Carrots", price: 1.32, isFeatured: false },

    // 4. Fresh Meat (肉類，ID: 16 ~ 20)
    { id: 16, name: "Ground Beef", price: 6.99, isFeatured: false },
    { id: 17, name: "Chicken Breasts Fillets", price: 2.79, isFeatured: false },
    { id: 18, name: "Beef Sirloin Steaks", price: 15.24, isFeatured: false },
    { id: 19, name: "Pork Loin Chops", price: 7.38, isFeatured: false },
    { id: 20, name: "Ground Turkey Meat", price: 5.46, isFeatured: false },

    // 5. Seafood Market (海鮮類，ID: 21 ~ 25)
    { id: 21, name: "Smoked Salmon", price: 8.98, isFeatured: false },       // ★ 一般海鮮 Salmon
    { id: 22, name: "Raw Shrimp Pack", price: 7.64, isFeatured: false },
    { id: 23, name: "Cod Fillets", price: 13.78, isFeatured: false },
    { id: 24, name: "Breaded Fish Fillets", price: 7.99, isFeatured: false },
    { id: 25, name: "Tilapia Fillets", price: 5.99, isFeatured: false },

    // 6. Dairy, Cheese & Bread (乳品/雜貨類，ID: 26 ~ 30)
    { id: 26, name: "Whole Milk", price: 4.99, isFeatured: false },
    { id: 27, name: "Sourdough Bread", price: 5.49, isFeatured: false },
    { id: 28, name: "Cheddar Cheese", price: 1.65, isFeatured: false },
    { id: 29, name: "Unsalted Butter", price: 2.99, isFeatured: false },
    { id: 30, name: "Four Cheese Blend", price: 1.90, isFeatured: false }
];

let clickCount = parseInt(localStorage.getItem('siteClickCount')) || 0;
document.addEventListener('click', function () {
    clickCount++;
    localStorage.setItem('siteClickCount', clickCount);
});

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

function addToCart(product, sourceSection = "category") {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += 1;
        if (sourceSection === "featured") {
            existingItem.featuredQty = (existingItem.featuredQty || 0) + 1;
        } else {
            existingItem.categoryQty = (existingItem.categoryQty || 0) + 1;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            featuredQty: sourceSection === "featured" ? 1 : 0,
            categoryQty: sourceSection === "category" ? 1 : 0
        });
    }
    updateCart();
}

document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        const productId = parseInt(this.getAttribute('data-id'));
        const sourceSection = this.getAttribute('data-source') || "category";
        const product = products.find(p => p.id === productId);

        if (product) {
            let currentTotal = 0;
            cart.forEach(item => currentTotal += (item.price * item.quantity));

            if (currentTotal + product.price > MAX_BUDGET) {
                e.stopImmediatePropagation();
                e.preventDefault();
                if (typeof showBudgetModal === 'function') {
                    showBudgetModal(product.name, product.price, MAX_BUDGET - currentTotal, MAX_BUDGET);
                }
                return false;
            }

            addToCart(product, sourceSection);
            trackAddToCart(product, 1, sourceSection);
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

    if (delta > 0) {
        const product = products.find(p => p.id === id);
        if (product) {
            let currentTotal = 0;
            cart.forEach(i => currentTotal += (i.price * i.quantity));

            if (currentTotal + product.price > MAX_BUDGET) {
                if (typeof showBudgetModal === 'function') {
                    showBudgetModal(product.name, product.price, MAX_BUDGET - currentTotal, MAX_BUDGET);
                }
                return;
            }
            trackAddToCart(product, 1, "cart_increment");
            item.categoryQty = (item.categoryQty || 0) + 1;
        }
    } else if (delta < 0) {
        if (item.categoryQty > 0) {
            item.categoryQty -= 1;
        } else if (item.featuredQty > 0) {
            item.featuredQty -= 1;
        }
    }

    item.quantity += delta;

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

    const sourceBreakdownMap = {};
    ALL_ITEMS.forEach(id => {
        sourceBreakdownMap[`Item_${id}_From_Featured_Qty`] = 0;
        sourceBreakdownMap[`Item_${id}_From_Category_Qty`] = 0;
    });

    const itemsArr = cart.map(item => {
        total += item.price * item.quantity;
        const prod = products.find(p => p.id === item.id);
        if (prod && prod.isFeatured) featuredCnt += item.quantity;

        if (sourceBreakdownMap.hasOwnProperty(`Item_${item.id}_From_Featured_Qty`)) {
            sourceBreakdownMap[`Item_${item.id}_From_Featured_Qty`] += (item.featuredQty || 0);
            sourceBreakdownMap[`Item_${item.id}_From_Category_Qty`] += (item.categoryQty || 0);
        }

        return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            featuredQty: item.featuredQty || 0,
            categoryQty: item.categoryQty || 0,
            price: item.price
        };
    });

    const itemSequenceMap = generateItemSequenceMap(selectionSequence);

    const checkoutFirebaseData = {
        participantID: currentPID || getPID(),
        enterTime: new Date(pageStartTime).toLocaleString(),   // ★ 精準記錄進站時間
        leaveTime: new Date(pageEndTime).toLocaleString(),     // ★ 精準記錄離站時間
        checkoutTime: new Date(pageEndTime).toLocaleString(),
        aiNudgeText: localStorage.getItem('ai_nudge_text') || "",
        durationSeconds: durationInSeconds,
        formattedDuration: formattedDuration,
        finalCartItems: itemsArr,
        selectionSequence: selectionSequence,
        itemSequenceMap: itemSequenceMap,
        sourceBreakdown: sourceBreakdownMap,                   // ★ 記錄 1~30 各來源數量
        featuredProductCount: featuredCnt,
        orderTotal: total
    };

    try {
        if (typeof db !== 'undefined') {
            await db.ref('checkout_records').push(checkoutFirebaseData);
        }
    } catch (error) {
        console.error("Failed to save checkout to Firebase:", error);
    }

    cart = [];
    selectionSequence = [];
    updateCart();

    checkoutBtn.disabled = false;
    checkoutBtn.innerText = "Checkout";

    const completionModal = document.getElementById("checkoutCompletionModal");
    if (completionModal) {
        completionModal.style.display = "flex";
    }
});

function handleCheckoutModalConfirm() {
    window.location.href = 'post_survey.html';
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

updateCart();