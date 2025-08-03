
// Firebase استيراد مكتبات 
import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAvc4WrwcSlsCqR-U4ZUwztP-ObGhepUrU",
  authDomain: "new-fttarney.firebaseapp.com",
  projectId: "new-fttarney",
  storageBucket: "new-fttarney.firebasestorage.app",
  messagingSenderId: "359653399547",
  appId: "1:359653399547:web:e5ed1f751ccb134032c95e",
  measurementId: "G-057417KGW6"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// بريد الأدمن الأساسي
const ADMIN_EMAIL = "hussein@new.fttarney77.com";

// قائمة الأصناف الافتراضية
const fallbackItems = [
    {name: 'بطاطس سلطه وطحينه', id: 'potato_salata_tahina', price: 14},
    {name: 'بطاطس توابل  سادة', id: 'potato_tawabel_plain', price: 14},
    {name: 'بطاطس توابل وطحينه', id: 'potato_tawabel_tahina', price: 14},
    {name: 'بطاطس رومي', id: 'potato_romi', price: 25},
    {name: 'فول حار', id: 'foul_hot', price: 12},
    {name: 'فول ساده', id: 'foul_plain', price: 10},
    {name: 'فول سلطه', id: 'foul_salata', price: 10},
    {name: 'فول اسكندراني', id: 'foul_iskandrani', price: 12},
    {name: 'طعميه', id: 'ta3miya', price: 10},
    {name: 'طعميه محشيه', id: 'ta3miya_ma7shya', price: 12},
    {name: 'قرص طعمية محشيه ', id: 'koras_ma7shya', price: 5},
    {name: 'بابا غنوج', id: 'baba_ganoug', price: 12},
    {name: 'خدمة توصيل', id: 'delivery', price: 22, disabled: true}
];

// ============ دوال uuid & ربط الطلب بالمستخدم ============
function getOrCreateUserUUID() {
    let uuid = localStorage.getItem("fattarney_order_uuid");
    if (!uuid) {
        uuid = crypto.randomUUID();
        localStorage.setItem("fattarney_order_uuid", uuid);
    }
    return uuid;
}

// دالة قفل أو فتح إدخال الاسم
function toggleNameInput(disable) {
    const nameInput = document.getElementById('nameInput');
    const nameLockMsg = document.getElementById('nameLockMsg');
    nameInput.disabled = disable;
    if (disable) {
        nameInput.style.background = "#eee";
        if (nameLockMsg) nameLockMsg.style.display = 'inline';
    } else {
        nameInput.style.background = "";
        if (nameLockMsg) nameLockMsg.style.display = 'none';
    }
}

// البحث عن طلب المستخدم الحالي في قاعدة البيانات
let userOrderDocId = null;
async function loadUserOrderFromDB() {
    const uuid = getOrCreateUserUUID();
    const querySnapshot = await getDocs(collection(db, "orders"));
    let foundDoc = null;
    querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.uuid === uuid && !data.archived) {
            foundDoc = { id: docSnap.id, data };
        }
    });
    if (foundDoc) {
        userOrderDocId = foundDoc.id;
        currentOrder = [];
        itemsList.forEach(item => {
            const qty = foundDoc.data[item.id];
            const price = foundDoc.data[`${item.id}_price`] || item.price;
            if (qty && qty > 0) {
                currentOrder.push({
                    id: item.id,
                    name: item.name,
                    quantity: qty,
                    price: price
                });
            }
        });
        document.getElementById('nameInput').value = foundDoc.data.name;
        toggleNameInput(true); // قفل الاسم
        showCurrentOrder();
    } else {
        userOrderDocId = null;
        currentOrder = [];
        toggleNameInput(false); // فك قفل الاسم
        showCurrentOrder();
    }
}

// ============ دالة الأرشفة التلقائية باستخدام توقيت مصر ============
function getEgyptDateString() {
    const now = new Date();
    const egyptOffset = 2 * 60; // 2 hours in minutes
    const egyptTime = new Date(now.getTime() + (egyptOffset - now.getTimezoneOffset()) * 60000);
    return egyptTime.toISOString().split('T')[0];
}

async function autoArchiveOldOrders() {
    const today = getEgyptDateString();
    const querySnapshot = await getDocs(collection(db, "orders"));
    for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        if (!data.createdAt) continue;
        const d = new Date(data.createdAt);
        const egyptOffset = 2 * 60;
        const egyptTime = new Date(d.getTime() + (egyptOffset - d.getTimezoneOffset()) * 60000);
        const orderDate = egyptTime.toISOString().split('T')[0];
        if (orderDate !== today && !data.archived) {
            try {
                await updateDoc(docSnap.ref, { archived: true });
            } catch (e) {}
        }
    }
}

// تحميل الأصناف
let itemsList = [];
async function loadItems() {
    try {
        const q = query(collection(db, "items"), orderBy("name"));
        const itemsSnapshot = await getDocs(q);
        itemsList = [];
        itemsSnapshot.forEach(docSnap => {
            let data = docSnap.data();
            if (typeof data.price === "undefined") data.price = 0;
            itemsList.push({ id: docSnap.id, ...data, __docId: docSnap.id });
        });
        if (itemsList.length === 0) itemsList = fallbackItems;
    } catch (e) {
        itemsList = fallbackItems;
    }
    fillItemsSelect();
    renderAdminItemsList();
}

function fillItemsSelect() {
    const select = document.getElementById('itemSelect');
    select.innerHTML = `<option disabled selected value="">اختر الصنف</option>`;
    itemsList.forEach(item => {
        if (item.id === 'delivery' || item.disabled) {
            select.innerHTML += `<option value="${item.id}" data-price="${item.price}" disabled style="color:#888;">${item.name} (${item.price} جنيه) - غير متاح للاختيار</option>`;
        } else {
            select.innerHTML += `<option value="${item.id}" data-price="${item.price}">${item.name} (${item.price} جنيه)</option>`;
        }
    });
}

// الطلب الحالي وعمليات التعديل
let currentOrder = [];
let editingIndex = null;

function updateOrderItemsList() {
    const list = document.getElementById('orderItemsList');
    if (!list) return;
    list.innerHTML = '';
    currentOrder.forEach((item, i) => {
        const li = document.createElement('li');
        li.innerHTML = `${item.name} - ${item.quantity} × ${item.price} جنيه = <strong>${item.quantity * item.price} جنيه</strong>
            <button class="edit-item" onclick="window.editOrderItem(${i})">تعديل</button>
            <button class="delete-item" onclick="window.deleteOrderItem(${i})">حذف</button>
        `;
        list.appendChild(li);
    });
}

window.editOrderItem = function(index) {
    const item = currentOrder[index];
    document.getElementById('itemSelect').value = item.id;
    document.getElementById('quantityInput').value = item.quantity;
    editingIndex = index;
    currentOrder.splice(index, 1);
    showCurrentOrder();
};

window.deleteOrderItem = async function(index) {
    if (!confirm("هل أنت متأكد أنك تريد حذف هذا الصنف من طلبك؟")) return;
    const removed = currentOrder.splice(index, 1)[0];
    showCurrentOrder();
    if (userOrderDocId) {
        const docRef = doc(db, "orders", userOrderDocId);
        const updateObj = {};
        updateObj[removed.id] = 0;
        updateObj[`${removed.id}_price`] = removed.price;
        await updateDoc(docRef, updateObj);
    }
};

function showCurrentOrder() {
    const section = document.getElementById('currentOrder');
    if (currentOrder.length > 0) {
        updateOrderItemsList();
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

function isNameValid() {
    const nameInput = document.getElementById('nameInput');
    const nameMsg = document.getElementById('nameRequiredMsg');
    if (!nameInput.value.trim()) {
        nameMsg.style.display = 'block';
        nameInput.classList.add('name-error');
        nameInput.focus();
        return false;
    } else {
        nameMsg.style.display = 'none';
        nameInput.classList.remove('name-error');
        return true;
    }
}

// إضافة صنف واحد للطلب (الطريقة القديمة)
document.getElementById('addItemButton').onclick = async function() {
    if (!isNameValid()) return;
    const select = document.getElementById('itemSelect');
    const quantityInput = document.getElementById('quantityInput');
    const itemId = select.value;
    const quantity = parseInt(quantityInput.value);

    if (!itemId) {
        alert("يرجى اختيار الصنف أولاً");
        return;
    }
    if (itemId === 'delivery') {
        alert("لا يمكنك اختيار خدمة التوصيل بشكل مباشر.");
        return;
    }
    if (!quantity || quantity < 1) {
        alert("يرجى إدخال كمية صحيحة (لا تقل عن 1)");
        return;
    }
    const itemObj = itemsList.find(x => x.id === itemId);

    if (editingIndex === null && currentOrder.find(x => x.id === itemId)) {
        alert("تمت إضافة هذا الصنف بالفعل! يمكنك تعديله من ملخص الطلب.");
        return;
    }

    const orderItem = {
        id: itemId,
        name: itemObj ? itemObj.name : itemId,
        quantity: quantity,
        price: itemObj ? itemObj.price : 0
    };

    if (editingIndex !== null) {
        currentOrder.splice(editingIndex, 0, orderItem);
        editingIndex = null;
    } else {
        currentOrder.push(orderItem);
    }

    document.getElementById('itemSelect').selectedIndex = 0;
    document.getElementById('quantityInput').value = '';
    showCurrentOrder();

    if (userOrderDocId) {
        await saveOrderToFirestore();
    }
};

// ========== واجهة الاختيار المتعدد ==========
function showMultiSelectSection() {
    if (!isNameValid()) return;
    const section = document.getElementById('multiSelectSection');
    const tbody = document.getElementById('multiSelectItems');
    tbody.innerHTML = '';
    itemsList.forEach(item => {
        if (item.id === 'delivery' || item.disabled) return;
        const alreadyAdded = currentOrder.some(x => x.id === item.id);
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>
                    <input type="number" min="0" value="" id="multiQty_${item.id}" ${alreadyAdded ? 'disabled style="background:#f9f9f9;color:#888;"' : ''}>
                    ${alreadyAdded ? '<span style="font-size:12px;color:#e91e63;">مضاف بالفعل</span>' : ''}
                </td>
                <td>${item.price} جنيه</td>
            </tr>
        `;
    });
    section.style.display = 'block';
    document.getElementById('orderForm').style.display = 'none';
}

// زر إظهار واجهة الاختيار المتعدد
document.getElementById('showMultiSelectBtn').onclick = showMultiSelectSection;

// زر إلغاء واجهة الاختيار المتعدد
document.getElementById('cancelMultiSelectBtn').onclick = function() {
    document.getElementById('multiSelectSection').style.display = 'none';
    document.getElementById('orderForm').style.display = 'flex';
};

// إضافة جميع الأصناف المختارة دفعة واحدة
document.getElementById('addMultiItemsButton').onclick = async function() {
    if (!isNameValid()) return;
    let added = false;
    itemsList.forEach(item => {
        if (item.id === 'delivery' || item.disabled) return;
        if (currentOrder.find(x => x.id === item.id)) return;
        const qtyInput = document.getElementById(`multiQty_${item.id}`);
        if (!qtyInput || qtyInput.disabled) return;
        const qty = parseInt(qtyInput.value || '0');
        if (qty > 0) {
            currentOrder.push({
                id: item.id,
                name: item.name,
                quantity: qty,
                price: item.price
            });
            added = true;
        }
    });
    if (added) {
        showCurrentOrder();
        document.getElementById('multiSelectSection').style.display = 'none';
        document.getElementById('orderForm').style.display = 'flex';
        if (userOrderDocId) {
            await saveOrderToFirestore();
        }
    } else {
        alert("يرجى إدخال كميات للأصناف المطلوبة.");
    }
};

document.getElementById('submitOrderButton').onclick = function() {
    if (!isNameValid()) return;
    if (currentOrder.length === 0) {
        alert("يرجى إضافة صنف واحد على الأقل.");
        return;
    }
    showSummary();
};

function showSummary() {
    const summarySection = document.getElementById('orderSummary');
    const summaryList = document.getElementById('summaryList');
    summaryList.innerHTML = '';
    let total = 0;
    currentOrder.forEach(item => {
        const row = document.createElement('tr');
        let rowTotal = item.quantity * item.price;
        total += rowTotal;
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.price}</td>
            <td>${rowTotal}</td>
        `;
        summaryList.appendChild(row);
    });
    document.getElementById('orderTotal').textContent = total;
    summarySection.style.display = 'block';
    document.getElementById('currentOrder').style.display = 'none';
}

document.getElementById('editSummaryButton').onclick = function() {
    document.getElementById('orderSummary').style.display = 'none';
    showCurrentOrder();
};

document.getElementById('confirmOrderButton').onclick = submitOrder;

// ============ إرسال أو تحديث الطلب في قاعدة البيانات ===========
async function submitOrder() {
    if (!isNameValid()) return;
    const name = document.getElementById("nameInput").value.trim();
    if (!name) {
        document.getElementById('nameRequiredMsg').style.display = 'block';
        document.getElementById('nameInput').focus();
        return;
    }
    if (currentOrder.length === 0) {
        alert("الطلب فارغ. أضف أصناف أولاً.");
        return;
    }
    await saveOrderToFirestore(true);
}

async function saveOrderToFirestore(showAlertAfter = false) {
    const name = document.getElementById("nameInput").value.trim();
    let orderObj = { name };
    currentOrder.forEach(item => {
        orderObj[item.id] = item.quantity;
        orderObj[`${item.id}_price`] = item.price;
    });
    orderObj["orderTotal"] = currentOrder.reduce((acc, item) => acc + item.price * item.quantity, 0);
    orderObj["createdAt"] = new Date().toISOString();
    const uuid = getOrCreateUserUUID();
    orderObj["uuid"] = uuid;

    try {
        if (userOrderDocId) {
            const docRef = doc(db, "orders", userOrderDocId);
            await updateDoc(docRef, orderObj);
            if (showAlertAfter) alert("تم تحديث الطلب بنجاح!");
        } else {
            const docRef = await addDoc(collection(db, "orders"), orderObj);
            userOrderDocId = docRef.id;
            if (showAlertAfter) alert("تم إرسال الطلب بنجاح!");
        }
        toggleNameInput(true);
        await loadUserOrderFromDB();
        document.getElementById('orderSummary').style.display = 'none';
        clearInputs();
    } catch (e) {
        alert("حدث خطأ أثناء إرسال الطلب.");
    }
}

document.getElementById('itemSelect').onchange = function() {
    const select = document.getElementById('itemSelect');
    const unitPriceHint = document.getElementById('unitPriceHint');
    const price = select.options[select.selectedIndex]?.getAttribute('data-price');
    if (price && price !== "undefined") {
        unitPriceHint.textContent = `سعر الوحدة: ${price} جنيه`;
    } else {
        unitPriceHint.textContent = "";
    }
}

document.getElementById('nameInput').addEventListener('input', function() {
    isNameValid();
});

function clearInputs() {
    document.getElementById('itemSelect').selectedIndex = 0;
    document.getElementById('quantityInput').value = '';
    document.getElementById('unitPriceHint').textContent = '';
    document.getElementById('nameRequiredMsg').style.display = 'none';
    document.getElementById('nameInput').classList.remove('name-error');
}

// =========== دالة تنسيق الأرقام ===========
function formatNumber(num) {
    if (Number.isInteger(num)) return num;
    return Number(num).toFixed(2).replace(/\.?0+$/, '');
}

// ============ عرض الطلبات المجمع والفردي وباقي المميزات ============
async function displayOrders() {
    const ordersTableBody = document.getElementById("ordersTableBody");
    ordersTableBody.innerHTML = '';
    let totalQuantities = {};
    let totalValues = {};
    let totalSum = 0;
    let totalSandwiches = 0;
    let customersCount = 0;

    itemsList.forEach(item => {
        totalQuantities[item.id] = 0;
        totalValues[item.id] = 0;
    });

    const querySnapshot = await getDocs(collection(db, "orders"));
    let found = false;
    const today = getEgyptDateString();
    querySnapshot.forEach(doc => {
        const order = doc.data();
        if (order.archived) return;
        if (!order.createdAt) return;
        const d = new Date(order.createdAt);
        const egyptOffset = 2 * 60;
        const egyptTime = new Date(d.getTime() + (egyptOffset - d.getTimezoneOffset()) * 60000);
        const orderDate = egyptTime.toISOString().split('T')[0];
        if (orderDate !== today) return;
        found = true;
        customersCount++;
        itemsList.forEach(item => {
            const q = parseInt(order[item.id] || 0);
            if (!isNaN(q) && q > 0) {
                totalQuantities[item.id] += q;
                totalValues[item.id] += q * (order[`${item.id}_price`] || item.price || 0);
                if (item.id !== 'delivery') totalSandwiches += q;
            }
        });
    });

    if (!found) {
        ordersTableBody.innerHTML = '<tr><td colspan="4">لا توجد طلبات حالياً.</td></tr>';
        document.getElementById("totalOrderValueRow")?.remove();
        document.getElementById("totalQuantityRow")?.remove();
        return;
    }

    itemsList.forEach(item => {
        if (totalQuantities[item.id] > 0) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${totalQuantities[item.id]}</td>
                <td>${item.price} جنيه</td>
                <td>${totalValues[item.id]} جنيه</td>
            `;
            ordersTableBody.appendChild(row);
            if (item.id !== 'delivery')
                totalSum += totalValues[item.id];
        }
    });

    let deliveryTotal = 0;
    const deliveryItem = itemsList.find(x => x.id === 'delivery');
    if (deliveryItem && deliveryItem.price && totalSandwiches > 0) {
        deliveryTotal = deliveryItem.price;
        totalSum += deliveryTotal;
        const deliveryRow = document.createElement("tr");
        deliveryRow.innerHTML = `
            <td>خدمة توصيل</td>
            <td colspan="2"></td>
            <td>${deliveryTotal} جنيه</td>
        `;
        ordersTableBody.appendChild(deliveryRow);
    }

    let totalQuantity = 0;
    itemsList.forEach(item => {
        if (item.id !== 'delivery') {
            totalQuantity += totalQuantities[item.id];
        }
    });

    let totalQuantityRow = document.getElementById("totalQuantityRow");
    if (!totalQuantityRow) {
        totalQuantityRow = document.createElement("tr");
        totalQuantityRow.id = "totalQuantityRow";
        ordersTableBody.parentElement.appendChild(totalQuantityRow);
    }
    totalQuantityRow.innerHTML = `
    <td style="font-weight:bold; text-align:right;">إجمالي الكمية</td>
    <td style="font-weight:bold; color:#8a2be2; text-align:center;">${totalQuantity}</td>
    <td></td>
    <td></td>
    `;

    let totalRow = document.getElementById("totalOrderValueRow");
    if (!totalRow) {
        totalRow = document.createElement("tr");
        totalRow.id = "totalOrderValueRow";
        ordersTableBody.parentElement.appendChild(totalRow);
    }
    totalRow.innerHTML = `
        <td colspan="3" style="font-weight:bold; text-align:right;">الإجمالي الكلي المطلوب دفعه${customersCount > 1 ? " (" + customersCount + " عملاء)" : ""}:</td>
        <td style="font-weight:bold; color:#1a7b3e;">${totalSum} جنيه</td>
    `;

    if (totalRow && totalQuantityRow) {
        const tbody = ordersTableBody.parentElement;
        if (totalQuantityRow.parentElement === tbody) tbody.removeChild(totalQuantityRow);
        if (totalRow.parentElement === tbody) tbody.removeChild(totalRow);
        tbody.appendChild(totalQuantityRow);
        tbody.appendChild(totalRow);
    }

    const usersOutput = document.getElementById("usersOutput");
    usersOutput.innerHTML = '';
    querySnapshot.forEach(doc => {
        const order = doc.data();
        if (order.archived) return;
        if (!order.createdAt) return;
        const d = new Date(order.createdAt);
        const egyptOffset = 2 * 60;
        const egyptTime = new Date(d.getTime() + (egyptOffset - d.getTimezoneOffset()) * 60000);
        const orderDate = egyptTime.toISOString().split('T')[0];
        if (orderDate !== today) return;
        const userDiv = document.createElement("div");
        userDiv.textContent = order.name;
        usersOutput.appendChild(userDiv);
    });
}

// =========== عرض الطلبات الفردية مع الإجماليات بدون كسور ===========
async function displayIndividualOrders() {
    const individualOrdersOutput = document.getElementById("individualOrdersOutput");
    individualOrdersOutput.innerHTML = '';

    const querySnapshot = await getDocs(collection(db, "orders"));
    if (querySnapshot.empty) {
        individualOrdersOutput.innerHTML = '<p>لا توجد طلبات حالياً.</p>';
        return;
    }

    let userOrders = {};
    let users = [];
    const today = getEgyptDateString();
    querySnapshot.forEach(doc => {
        const order = doc.data();
        if (order.archived) return;
        if (!order.createdAt) return;
        const d = new Date(order.createdAt);
        const egyptOffset = 2 * 60;
        const egyptTime = new Date(d.getTime() + (egyptOffset - d.getTimezoneOffset()) * 60000);
        const orderDate = egyptTime.toISOString().split('T')[0];
        if (orderDate !== today) return;
        const name = order.name;
        if (!userOrders[name]) {
            userOrders[name] = [];
            users.push(name);
        }
        userOrders[name].push(order);
    });

    let mergedUserOrders = {};
    let userLastOrderDate = {};
    users.forEach(name => {
        let merged = {};
        let maxDate = null;
        userOrders[name].forEach(order => {
            if(order.createdAt){
                let dt = new Date(order.createdAt);
                if (!maxDate || dt > maxDate) {
                    maxDate = dt;
                }
            }
            for (let key in order) {
                if (key === "name" || key === "createdAt" || key === "archived" || key === "orderTotal" || key === "uuid") continue;
                if (key.endsWith("_price")) {
                    merged[key] = order[key];
                } else {
                    merged[key] = (merged[key] || 0) + Number(order[key] || 0);
                }
            }
        });
        mergedUserOrders[name] = merged;
        if (maxDate) userLastOrderDate[name] = maxDate;
    });

let userSandwichCount = {};
let totalSandwiches = 0;
users.forEach(name => {
    let sandwichCount = 0;
    const merged = mergedUserOrders[name];
    itemsList.forEach(item => {
        if (item.id !== 'delivery' && merged[item.id]) {
            sandwichCount += Number(merged[item.id]) || 0;
        }
    });
    userSandwichCount[name] = sandwichCount;
    totalSandwiches += sandwichCount;
});

const deliveryItem = itemsList.find(x => x.id === 'delivery');
const deliveryValue = deliveryItem ? deliveryItem.price : 0;

    let deliveryDistribution = {};
    if (totalSandwiches > 0) {
        users.forEach(name => {
            const userCount = userSandwichCount[name] || 0;
            const share = Math.round((userCount / totalSandwiches) * deliveryValue * 100) / 100;
            deliveryDistribution[name] = share;
        });
    }

    let table = document.createElement('table');
    table.className = "delivery-table";
    table.innerHTML = `
        <colgroup>
            <col class="name-col">
            <col class="details-col">
            <col class="count-col">
            <col class="share-col">
            <col class="total-col">
        </colgroup>
        <thead>
            <tr>
                <th>الاسم</th>
                <th>تفاصيل الطلب</th>
                <th>عدد السندوتشات</th>
                <th>نصيبه من التوصيل (جنيه)</th>
                <th>الإجمالي بعد التوصيل (جنيه)</th>
            </tr>
        </thead>
        <tbody id="individualOrdersTableBody"></tbody>
    `;
    individualOrdersOutput.appendChild(table);

    const tbody = document.getElementById("individualOrdersTableBody");
    users.forEach(name => {
        const merged = mergedUserOrders[name];
        let orderDetails = '';
        let orderTotal = 0;
        let sandwichCount = 0;
        let latestCreatedAtStr = '';
        if (userLastOrderDate[name]) {
            latestCreatedAtStr = userLastOrderDate[name].toLocaleString("ar-EG", { hour12: false });
        }
        itemsList.forEach(item => {
            if (merged[item.id] > 0) {
                let price = merged[`${item.id}_price`] || item.price || 0;
                let quantity = merged[item.id];
                orderTotal += price * quantity;
                if (item.id !== 'delivery') sandwichCount += quantity;
                orderDetails += `<div>${item.name}: ${quantity} × ${price} = <b>${quantity * price}</b> جنيه</div>`;
            }
        });
        let delivery = 0;
        if (deliveryDistribution && typeof deliveryDistribution[name] !== "undefined") {
            delivery = deliveryDistribution[name];
            orderDetails += `<div style="color:#125d99;"><b>خدمة توصيل:</b> ${formatNumber(delivery)} جنيه</div>`;
            orderTotal += delivery;
        }
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${name}
                ${latestCreatedAtStr ? `<br><span style="font-size:13px;color:#666;">آخر طلب: ${latestCreatedAtStr}</span>` : ""}
            </td>
            <td>${orderDetails}</td>
            <td style="text-align:center;">${formatNumber(sandwichCount)}</td>
            <td style="text-align:center;">${formatNumber(delivery)}</td>
            <td style="font-weight:bold;text-align:center;color:#1a7b3e;">${formatNumber(orderTotal)}</td>
        `;
        tbody.appendChild(tr);
    });

    let totalDelivery = 0;
    let grandTotal = 0;
    users.forEach(name => {
        const merged = mergedUserOrders[name];
        let orderTotal = 0;
        itemsList.forEach(item => {
            if (merged[item.id] > 0) {
                let price = merged[`${item.id}_price`] || item.price || 0;
                let quantity = merged[item.id];
                orderTotal += price * quantity;
            }
        });
        let delivery = deliveryDistribution[name] || 0;
        totalDelivery += delivery;
        grandTotal += orderTotal + delivery;
    });
    let tfoot = document.createElement('tfoot');
    tfoot.innerHTML = `
        <tr>
            <td colspan="2" style="text-align:right;font-weight:bold;">المجموع الكلي بخدمة التوصيل</td>
            <td style="text-align:center;font-weight:bold;">${Math.round(totalSandwiches)}</td>
            <td style="text-align:center;font-weight:bold;">${Math.round(totalDelivery)}</td>
            <td style="text-align:center;font-weight:bold;">${Math.round(grandTotal)}</td>
        </tr>
    `;
    table.appendChild(tfoot);
}

function toggleSections(sectionToShow) {
    const sections = ["ordersSection", "individualOrdersSection"];
    sections.forEach(section => {
        document.getElementById(section).style.display = (section === sectionToShow) ? 'block' : 'none';
    });
}

document.getElementById("viewOrdersButton").onclick = () => {
    toggleSections("ordersSection");
    displayOrders();
};
document.getElementById("viewIndividualOrdersButton").onclick = () => {
    toggleSections("individualOrdersSection");
    displayIndividualOrders();
};
// ========== واجهة الأدمن ==========
function renderAdminItemsList() {
    // يمكن لاحقًا إضافة قائمة أصناف متقدمة للأدمن هنا
}

function updateAdminUI(user) {
    const addBtn = document.getElementById('openAddItemModal');
    const loginBtn = document.getElementById('adminLoginBtn');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    const viewOrdersBtn = document.getElementById('viewOrdersButton');
    const clearBtn = document.getElementById('clearAllOrdersButton');
    const editItemsBtn = document.getElementById('editItemsBtn');

    viewOrdersBtn.style.display = 'inline-block';
    if (user && user.email === ADMIN_EMAIL) {
        addBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'inline-block';
        loginBtn.style.display = 'none';
        clearBtn.style.display = 'inline-block';
        editItemsBtn.style.display = 'inline-block';
        deleteOldOrdersBtn.style.display = 'inline-block';
    } else {
        addBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
        loginBtn.style.display = 'inline-block';
        clearBtn.style.display = 'none';
        editItemsBtn.style.display = 'none';
        deleteOldOrdersBtn.style.display = 'none';
    }
}

onAuthStateChanged(auth, (user) => {
    updateAdminUI(user);
});

// =============== نافذة تعديل الأسعار (جديدة) ===============
document.getElementById('editItemsBtn').onclick = function() {
    showItemsEditModal();
};

document.getElementById('closeItemsEditModal').onclick = function() {
    document.getElementById('itemsEditModal').style.display = 'none';
};

async function showItemsEditModal() {
    const modal = document.getElementById('itemsEditModal');
    const listDiv = document.getElementById('itemsEditList');
    listDiv.innerHTML = "";
    itemsList.forEach(item => {
        const row = document.createElement('div');
        row.style.margin = "7px 0";
        row.innerHTML = `
            <span>${item.name}</span>
            <input type="number" value="${item.price}" min="0" id="editModalPrice_${item.id}" style="width:70px;margin:0 7px;">
            <button class="savePriceBtnModal" data-id="${item.id}" style="padding:2px 10px;">حفظ</button>
            <span class="saveMsg" id="saveMsgModal_${item.id}" style="margin-right:10px;color:green;font-size:13px;"></span>
        `;
        listDiv.appendChild(row);
    });

    listDiv.querySelectorAll('.savePriceBtnModal').forEach(btn => {
        btn.onclick = async (e) => {
            const itemId = btn.getAttribute('data-id');
            const priceInput = document.getElementById(`editModalPrice_${itemId}`);
            const msgSpan = document.getElementById(`saveMsgModal_${itemId}`);
            const newPrice = Number(priceInput.value);
            if (isNaN(newPrice) || newPrice < 0) {
                msgSpan.style.color = "red";
                msgSpan.textContent = "سعر غير صحيح";
                return;
            }
            try {
                const item = itemsList.find(x => x.id === itemId);
                if (!item || !item.__docId) throw new Error("DocId not found!");
                await updateDoc(doc(db, "items", item.__docId), { price: newPrice });
                msgSpan.style.color = "green";
                msgSpan.textContent = "تم الحفظ!";
                await loadItems();
                setTimeout(()=>{msgSpan.textContent="";}, 1200);
            } catch {
                msgSpan.style.color = "red";
                msgSpan.textContent = "فشل في الحفظ!";
            }
        };
    });

    modal.style.display = 'flex';
}

// =============== نهاية نافذة تعديل الأسعار ===============

// ======== أحداث واجهة الأدمن وبداية التطبيق ========
window.onload = async function() {
    document.getElementById('adminLoginBtn').onclick = function() {
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminLoginMsg').textContent = '';
        document.getElementById('adminLoginModal').style.display = 'flex';
    };
    document.getElementById('adminLoginCancelBtn').onclick = function() {
        document.getElementById('adminLoginModal').style.display = 'none';
    };
    document.getElementById('adminLoginConfirmBtn').onclick = async function() {
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;
        const msg = document.getElementById('adminLoginMsg');
        msg.textContent = '';
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            if (cred.user.email !== ADMIN_EMAIL) {
                await signOut(auth);
                msg.textContent = 'ليس لديك صلاحية الأدمن!';
            } else {
                document.getElementById('adminLoginModal').style.display = 'none';
            }
        } catch (e) {
            msg.textContent = 'بيانات الدخول خطأ!';
        }
    };
    document.getElementById('adminLogoutBtn').onclick = function() {
        signOut(auth);
    };

    document.getElementById('openAddItemModal').onclick = function() {
        document.getElementById('modalItemName').value = '';
        document.getElementById('modalItemPrice').value = '';
        document.getElementById('modalAddItemMsg').textContent = '';
        document.getElementById('addItemModal').style.display = 'flex';
    };
    document.getElementById('closeAddItemModal').onclick = function() {
        document.getElementById('addItemModal').style.display = 'none';
    };

    document.getElementById('confirmAddItem').onclick = async function() {
        const name = document.getElementById('modalItemName').value.trim();
        const price = parseFloat(document.getElementById('modalItemPrice').value);
        const msg = document.getElementById('modalAddItemMsg');
        msg.style.color = "red";
        if (!name || isNaN(price) || price < 1) {
            msg.textContent = 'أدخل اسم وسعر صحيحين';
            return;
        }
        const normalized = (s) => s.replace(/\s+/g,'').toLowerCase();
        if (
          itemsList.some(i => normalized(i.name) === normalized(name)) ||
          fallbackItems.some(i => normalized(i.name) === normalized(name))
        ) {
            msg.textContent = 'الصنف موجود بالفعل';
            return;
        }
        try {
            await addDoc(collection(db, "items"), { name, price });
            msg.style.color = 'green';
            msg.textContent = 'تمت إضافة الصنف بنجاح';
            await loadItems();
            setTimeout(()=>{
                document.getElementById('addItemModal').style.display = 'none';
                msg.style.color = 'red';
            }, 900);
        } catch (e) {
            msg.style.color = 'red';
            msg.textContent = 'حدث خطأ أثناء الإضافة!';
        }
    };

    document.getElementById('clearAllOrdersButton').onclick = async function() {
        if (!confirm("هل أنت متأكد أنك تريد حذف جميع الطلبات بشكل يدوي؟ لا يمكن التراجع!")) return;
        const password = prompt("يرجى إدخال كلمة السر للتأكيد:");
        if (password !== "king777") {
            alert("كلمة السر غير صحيحة.");
            return;
        }
        const querySnapshot = await getDocs(collection(db, "orders"));
        let count = 0;
        for (const docu of querySnapshot.docs) {
            try {
                await deleteDoc(docu.ref);
                count++;
            } catch(e){}
        }
        alert("تم حذف جميع الطلبات (" + count + ") بنجاح.");
        displayOrders();
        displayIndividualOrders();
        document.getElementById("usersOutput").innerHTML = '';
    };

    document.getElementById('deleteOldOrdersBtn').onclick = async function() {
        if (!confirm("هل أنت متأكد أنك تريد حذف كل الطلبات ما عدا طلبات اليوم الحالي؟ لا يمكن التراجع!")) return;
        const password = prompt("يرجى إدخال كلمة السر للأمان:");
        if (password !== "king777") {
            alert("كلمة السر غير صحيحة.");
            return;
        }
        const today = getEgyptDateString();
        const querySnapshot = await getDocs(collection(db, "orders"));
        let deletedCount = 0;
        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            if (!data.createdAt) continue;
            const d = new Date(data.createdAt);
            const egyptOffset = 2 * 60;
            const egyptTime = new Date(d.getTime() + (egyptOffset - d.getTimezoneOffset()) * 60000);
            const orderDate = egyptTime.toISOString().split('T')[0];
            if (orderDate !== today) {
                try {
                    await deleteDoc(docSnap.ref);
                    deletedCount++;
                } catch (e) {}
            }
        }
        alert("تم حذف جميع الطلبات السابقة (" + deletedCount + ") بنجاح.");
        displayOrders();
        displayIndividualOrders();
        document.getElementById("usersOutput").innerHTML = '';
    };

    await autoArchiveOldOrders();
    await loadItems();
    await loadUserOrderFromDB();
    clearInputs();
    showCurrentOrder();
};
window.bulkAddItems = async function(items){
  for (const item of items) {
    await addDoc(collection(db, "items"), item);
  }
  alert("تمت الإضافة!");
}

// ========== زر تصدير الطلبات الفردية للإكسيل ==========
document.getElementById('exportExcelButton').onclick = async function() {
    const XLSX = window.XLSX;
    if (!XLSX) {
        alert("مكتبة التصدير غير محملة");
        return;
    }

    // جلب البيانات كما في جدول الطلبيات الفردية
    const querySnapshot = await getDocs(collection(db, "orders"));
    let userOrders = {};
    let users = [];
    const today = getEgyptDateString();
    querySnapshot.forEach(doc => {
        const order = doc.data();
        if (order.archived) return;
        if (!order.createdAt) return;
        const d = new Date(order.createdAt);
        const egyptOffset = 2 * 60;
        const egyptTime = new Date(d.getTime() + (egyptOffset - d.getTimezoneOffset()) * 60000);
        const orderDate = egyptTime.toISOString().split('T')[0];
        if (orderDate !== today) return;
        const name = order.name;
        if (!userOrders[name]) {
            userOrders[name] = [];
            users.push(name);
        }
        userOrders[name].push(order);
    });

    let mergedUserOrders = {};
    let userLastOrderDate = {};
    users.forEach(name => {
        let merged = {};
        let maxDate = null;
        userOrders[name].forEach(order => {
            if(order.createdAt){
                let dt = new Date(order.createdAt);
                if (!maxDate || dt > maxDate) {
                    maxDate = dt;
                }
            }
            for (let key in order) {
                if (key === "name" || key === "createdAt" || key === "archived" || key === "orderTotal" || key === "uuid") continue;
                if (key.endsWith("_price")) {
                    merged[key] = order[key];
                } else {
                    merged[key] = (merged[key] || 0) + Number(order[key] || 0);
                }
            }
        });
        mergedUserOrders[name] = merged;
        if (maxDate) userLastOrderDate[name] = maxDate;
    });

    let userSandwichCount = {};
    let totalSandwiches = 0;
    users.forEach(name => {
        let sandwichCount = 0;
        const merged = mergedUserOrders[name];
        itemsList.forEach(item => {
            if (item.id !== 'delivery' && merged[item.id]) {
                sandwichCount += Number(merged[item.id]) || 0;
            }
        });
        userSandwichCount[name] = sandwichCount;
        totalSandwiches += sandwichCount;
    });

    const deliveryItem = itemsList.find(x => x.id === 'delivery');
    const deliveryValue = deliveryItem ? deliveryItem.price : 0;

    let deliveryDistribution = {};
    if (totalSandwiches > 0) {
        users.forEach(name => {
            const userCount = userSandwichCount[name] || 0;
            const share = Math.round((userCount / totalSandwiches) * deliveryValue * 100) / 100;
            deliveryDistribution[name] = share;
        });
    }

    // تجهيز بيانات الإكسيل
    let rows = [];
    // العناوين
    rows.push([
        "الاسم", 
        "تفاصيل الطلب", 
        "عدد السندوتشات", 
        "نصيبه من التوصيل (جنيه)", 
        "الإجمالي بعد التوصيل (جنيه)"
    ]);

    users.forEach(name => {
        const merged = mergedUserOrders[name];
        let orderDetails = '';
        let orderTotal = 0;
        let sandwichCount = 0;
        let latestCreatedAtStr = '';
        if (userLastOrderDate[name]) {
            latestCreatedAtStr = userLastOrderDate[name].toLocaleString("ar-EG", { hour12: false });
        }
        itemsList.forEach(item => {
            if (merged[item.id] > 0) {
                let price = merged[`${item.id}_price`] || item.price || 0;
                let quantity = merged[item.id];
                orderTotal += price * quantity;
                if (item.id !== 'delivery') sandwichCount += quantity;
                orderDetails += `${item.name}: ${quantity} × ${price} = ${quantity * price} جنيه\n`;
            }
        });
        let delivery = 0;
        if (deliveryDistribution && typeof deliveryDistribution[name] !== "undefined") {
            delivery = deliveryDistribution[name];
            orderDetails += `خدمة توصيل: ${delivery} جنيه\n`;
            orderTotal += delivery;
        }
        let displayName = name;
        if (latestCreatedAtStr) {
            displayName += `\nآخر طلب: ${latestCreatedAtStr}`;
        }
        rows.push([
            displayName,
            orderDetails.trim(),
            sandwichCount,
            delivery,
            orderTotal
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
        {wch: 24}, // الاسم
        {wch: 35}, // تفاصيل الطلب
        {wch: 13}, // عدد السندوتشات
        {wch: 18}, // نصيب التوصيل
        {wch: 19}  // الإجمالي
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلبيات الفردية");

    XLSX.writeFile(wb, "individual_orders_full.xlsx", { bookType: "xlsx", type: "binary", cellStyles: true, cellDates: true, bom: true });
};

