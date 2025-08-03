// شريط أسعار العملات المتحرك

let previousRates = {};

function formatNumber(num) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadCurrencies() {
    try {
        const response = await fetch('https://ta3weem.com/api/v1/egp.json'); // مصدر مصري
        const data = await response.json();
        const rates = {
            "الدولار الأمريكي": {buy: parseFloat(data.USD.buy), sell: parseFloat(data.USD.sell), flag: "https://flagcdn.com/us.svg"},
            "اليورو": {buy: parseFloat(data.EUR.buy), sell: parseFloat(data.EUR.sell), flag: "https://flagcdn.com/eu.svg"},
            "الجنيه الإسترليني": {buy: parseFloat(data.GBP.buy), sell: parseFloat(data.GBP.sell), flag: "https://flagcdn.com/gb.svg"},
            "الريال السعودي": {buy: parseFloat(data.SAR.buy), sell: parseFloat(data.SAR.sell), flag: "https://flagcdn.com/sa.svg"},
            "الدينار الكويتي": {buy: parseFloat(data.KWD.buy), sell: parseFloat(data.KWD.sell), flag: "https://flagcdn.com/kw.svg"},
            "الدرهم الإماراتي": {buy: parseFloat(data.AED.buy), sell: parseFloat(data.AED.sell), flag: "https://flagcdn.com/ae.svg"},
            "الريال القطري": {buy: parseFloat(data.QAR.buy), sell: parseFloat(data.QAR.sell), flag: "https://flagcdn.com/qa.svg"}
        }; 

        let html = '';
        for (let currency in rates) {
            const current = rates[currency].buy;
            const old = previousRates[currency] || current;
            const trend = current >= old ? 'up' : 'down';
            html += `<span class="${trend}">${currency}: شراء ${formatNumber(rates[currency].buy)} / بيع ${formatNumber(rates[currency].sell)} ج.م <img src="${rates[currency].flag}"></span>`;
            previousRates[currency] = current;
        } 

        const scrollElement = document.querySelector('#currency-ticker .scroll');
        if (scrollElement) {
            scrollElement.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading currencies:', error);
        const scrollElement = document.querySelector('#currency-ticker .scroll');
        if (scrollElement) {
            scrollElement.innerHTML = '<span>تعذر تحميل أسعار العملات</span>';
        }
    }
}

// تشغيل الشريط
function initCurrencyTicker() {
    loadCurrencies();
    setInterval(loadCurrencies, 60000); // تحديث كل دقيقة 

    // إيقاف الحركة عند مرور الماوس
    const ticker = document.getElementById('currency-ticker');
    if (ticker) {
        ticker.addEventListener('mouseenter', () => ticker.classList.add('paused'));
        ticker.addEventListener('mouseleave', () => ticker.classList.remove('paused'));
    }
}

// تشغيل الشريط عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initCurrencyTicker);

// للتأكد من التشغيل حتى لو تم استدعاؤه من ملف آخر
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCurrencyTicker);
} else {
    initCurrencyTicker();
}
