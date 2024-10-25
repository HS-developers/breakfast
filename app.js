// تأكد من استيراد المكتبات بشكل صحيح
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";

// إعداد Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCAfqTFd9ugNgg_zLMivyCh-u0919vTClw",
    authDomain: "foodorder-5f2a5.firebaseapp.com",
    projectId: "foodorder-5f2a5",
    storageBucket: "foodorder-5f2a5.appspot.com",
    messagingSenderId: "107748720639",
    appId: "1:107748720639:web:8b90e830890aef5d07b1ca",
    measurementId: "G-Y4ETW4WTDP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Initialize Firestore
const auth = getAuth(app); // Initialize Firebase Authentication

// Function to handle login
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            console.log('User logged in:', user);
            alert("تم تسجيل الدخول بنجاح!");
            // إظهار قسم الطلبات بعد تسجيل الدخول
            document.getElementById("loginSection").style.display = "none";
            document.getElementById("orderSection").style.display = "block";
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Error logging in:', errorCode, errorMessage);
            alert("خطأ في تسجيل الدخول: " + errorMessage);
        });
}

async function submitOrder() {
    const name = document.getElementById("nameInput").value;
    if (!name) {
        alert("يرجى إدخال اسمك قبل إرسال الطلب.");
        return;
    }
    const ful = document.getElementById("foulInput").value || 0;
    const taamiya = document.getElementById("ta3miyaInput").value || 0;
    const potatoTawae = document.getElementById("batatisTawabi3Input").value || 0;
    const chipsy = document.getElementById("batatisShibsyInput").value || 0;
    const taamiyaMahshiya = document.getElementById("ta3miyaMahshyInput").value || 0;
    const mashedPotato = document.getElementById("batatisMahrousaInput").value || 0;
    const musaqaa = document.getElementById("musaqaBadhinjanInput").value || 0;
    const pickles = document.getElementById("makhalilInput").value || 0;

    // إضافة الطلب إلى Firestore
    try {
        await addDoc(collection(db, "orders"), {
            name,
            ful,
            taamiya,
            taamiyaMahshiya,
            chipsy,
            potatoTawae,
            mashedPotato,
            musaqaa,
            pickles
        });
        alert("تم إرسال الطلب بنجاح!"); // إظهار رسالة النجاح
        displayOrders(); // تحديث عرض الطلبات
    } catch (e) {
        console.error("Error adding document: ", e);
    }

    // مسح المدخلات
    clearInputs();
}

function clearInputs() {
    document.getElementById("nameInput").value = '';
    document.getElementById("foulInput").value = '';         
    document.getElementById("ta3miyaInput").value = '';
    document.getElementById("batatisTawabi3Input").value = '';   
    document.getElementById("batatisShibsyInput").value = '';
    document.getElementById("ta3miyaMahshyInput").value = '';
    document.getElementById("batatisMahrousaInput").value = '';
    document.getElementById("musaqaBadhinjanInput").value = '';
    document.getElementById("makhalilInput").value = '';
}

// استدعاء clearInputs لمسح القيم الافتراضية عند تحميل الصفحة
clearInputs();

async function displayOrders() {
    const ordersTableBody = document.getElementById("ordersTableBody");
    ordersTableBody.innerHTML = ''; // مسح المحتوى القديم
    const totalQuantities = {
        ful: 0,
        taamiya: 0,
        taamiyaMahshiya: 0,
        chipsy: 0,
        potatoTawae: 0,
        mashedPotato: 0,
        musaqaa: 0,
        pickles: 0
    };

    const querySnapshot = await getDocs(collection(db, "orders"));
    if (querySnapshot.empty) {
        ordersTableBody.innerHTML = '<tr><td colspan="2">لا توجد طلبات حالياً.</td></tr>';
        return;
    }

    // تجميع الكميات الإجمالية لكل صنف
    querySnapshot.forEach(doc => {
        const order = doc.data();
        totalQuantities.ful += parseInt(order.ful);
        totalQuantities.taamiya += parseInt(order.taamiya);
        totalQuantities.potatoTawae += parseInt(order.potatoTawae);
        totalQuantities.chipsy += parseInt(order.chipsy);
        totalQuantities.taamiyaMahshiya += parseInt(order.taamiyaMahshiya);
        totalQuantities.mashedPotato += parseInt(order.mashedPotato);
        totalQuantities.musaqaa += parseInt(order.musaqaa);
        totalQuantities.pickles += parseInt(order.pickles);
    });

    // عرض البيانات في الجدول
    const arabicNames = {
        ful: 'فول',
        taamiya: 'طعمية',
        potatoTawae: 'بطاطس صوابع',
        chipsy: 'بطاطس شيبسي',
        taamiyaMahshiya: 'طعمية محشية',
        mashedPotato: 'بطاطس مهروسة',
        musaqaa: 'مسقعة',
        pickles: 'مخلل'
    };

    for (const [key, value] of Object.entries(totalQuantities)) {
        if (value > 0) {
            const row = document.createElement("tr");
            const itemCell = document.createElement("td");
            itemCell.textContent = arabicNames[key];
            const quantityCell = document.createElement("td");
            quantityCell.textContent = value;
            row.appendChild(itemCell);
            row.appendChild(quantityCell);
            ordersTableBody.appendChild(row);
        }
    }

    // عرض قسم الطلبات
    document.getElementById("ordersSection").style.display = "block";
}

// ربط زر تسجيل الدخول
document.getElementById("loginButton").addEventListener("click", login);

// ربط زر إرسال الطلب
document.getElementById("submitOrderButton").addEventListener("click", submitOrder);

// ربط زر عرض الطلبات
document.getElementById("viewOrdersButton").addEventListener("click", displayOrders);

// ربط زر إلغاء جميع الطلبات
document.getElementById("clearAllOrdersButton").addEventListener("click", async () => {
    const querySnapshot = await getDocs(collection(db, "orders"));
    querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
    });
    alert("تم إلغاء جميع الطلبات.");
    displayOrders(); // تحديث عرض الطلبات بعد الإلغاء
});

