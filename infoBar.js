// شريط أسعار العملات المتحرك

let previousRates = {};

function formatNumber(num) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadCurrencies() {
    try {
        // استخدام API أكثر موثوقية
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        
        if (!data.rates || !data.rates.EGP) {
            throw new Error('Invalid API response');
        }

        // حساب الأسعار بشكل صحيح - كم جنيه مصري يساوي وحدة واحدة من كل عملة
        const usdToEgp = data.rates.EGP; // الدولار مقابل الجنيه
        const eurToEgp = data.rates.EGP / data.rates.EUR; // اليورو مقابل الجنيه
        const gbpToEgp = data.rates.EGP / data.rates.GBP; // الجنيه الإسترليني مقابل الجنيه المصري
        const sarToEgp = data.rates.EGP / data.rates.SAR; // الريال السعودي مقابل الجنيه
        const kwdToEgp = data.rates.EGP / data.rates.KWD; // الدينار الكويتي مقابل الجنيه
        const aedToEgp = data.rates.EGP / data.rates.AED; // الدرهم الإماراتي مقابل الجنيه
        const qarToEgp = data.rates.EGP / data.rates.QAR; // الريال القطري مقابل الجنيه

        const rates = {
            "الدولار الأمريكي": {rate: usdToEgp, flag: "https://flagcdn.com/us.svg"},
            "اليورو": {rate: eurToEgp, flag: "https://flagcdn.com/eu.svg"},
            "الجنيه الإسترليني": {rate: gbpToEgp, flag: "https://flagcdn.com/gb.svg"},
            "الريال السعودي": {rate: sarToEgp, flag: "https://flagcdn.com/sa.svg"},
            "الدينار الكويتي": {rate: kwdToEgp, flag: "https://flagcdn.com/kw.svg"},
            "الدرهم الإماراتي": {rate: aedToEgp, flag: "https://flagcdn.com/ae.svg"},
            "الريال القطري": {rate: qarToEgp, flag: "https://flagcdn.com/qa.svg"}
        }; 

        let html = '';
        for (let currency in rates) {
            const current = rates[currency].rate;
            const old = previousRates[currency] || current;
            const trend = current >= old ? 'up' : 'down';
            html += `<span class="${trend}">${currency}: ${formatNumber(current)} ج.م <img src="${rates[currency].flag}" alt="${currency}"></span>`;
            previousRates[currency] = current;
        } 

        const scrollElement = document.querySelector('#currency-ticker .scroll');
        if (scrollElement) {
            scrollElement.innerHTML = html;
        }

        // طباعة البيانات للتأكد من صحة الحسابات
        console.log('Currency rates:', {
            USD_EGP: usdToEgp,
            EUR_EGP: eurToEgp,
            GBP_EGP: gbpToEgp,
            SAR_EGP: sarToEgp,
            KWD_EGP: kwdToEgp,
            AED_EGP: aedToEgp,
            QAR_EGP: qarToEgp
        });

    } catch (error) {
        console.error('Error loading currencies:', error);
        
        // محاولة بديلة مع API آخر مجاني - جميع العملات كالموقع الأول
        try {
            const fallbackResponse = await fetch('https://open.er-api.com/v6/latest/USD');
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackData.rates && fallbackData.rates.EGP) {
                const usdToEgp = fallbackData.rates.EGP;
                const eurToEgp = fallbackData.rates.EGP / fallbackData.rates.EUR;
                const gbpToEgp = fallbackData.rates.EGP / fallbackData.rates.GBP;
                const sarToEgp = fallbackData.rates.EGP / fallbackData.rates.SAR;
                const kwdToEgp = fallbackData.rates.EGP / fallbackData.rates.KWD;
                const aedToEgp = fallbackData.rates.EGP / fallbackData.rates.AED;
                const qarToEgp = fallbackData.rates.EGP / fallbackData.rates.QAR;
                
                const rates = {
                    "الدولار الأمريكي": {rate: usdToEgp, flag: "https://flagcdn.com/us.svg"},
                    "اليورو": {rate: eurToEgp, flag: "https://flagcdn.com/eu.svg"},
                    "الجنيه الإسترليني": {rate: gbpToEgp, flag: "https://flagcdn.com/gb.svg"},
                    "الريال السعودي": {rate: sarToEgp, flag: "https://flagcdn.com/sa.svg"},
                    "الدينار الكويتي": {rate: kwdToEgp, flag: "https://flagcdn.com/kw.svg"},
                    "الدرهم الإماراتي": {rate: aedToEgp, flag: "https://flagcdn.com/ae.svg"},
                    "الريال القطري": {rate: qarToEgp, flag: "https://flagcdn.com/qa.svg"}
                };
                
                let html = '';
                for (let currency in rates) {
                    html += `<span class="up">${currency}: ${formatNumber(rates[currency].rate)} ج.م <img src="${rates[currency].flag}" alt="${currency}"></span>`;
                }
                
                const scrollElement = document.querySelector('#currency-ticker .scroll');
                if (scrollElement) {
                    scrollElement.innerHTML = html;
                }
            } else {
                throw new Error('Fallback API also failed');
            }
        } catch (fallbackError) {
            console.error('Fallback API also failed:', fallbackError);
            
            // عرض رسالة خطأ فقط
            const scrollElement = document.querySelector('#currency-ticker .scroll');
            if (scrollElement) {
                scrollElement.innerHTML = '<span style="color: #ff4444;">تعذر تحميل أسعار العملات حالياً</span>';
            }
        }
    }
}

// تشغيل الشريط
function initCurrencyTicker() {
    loadCurrencies();
    setInterval(loadCurrencies, 28800000); // تحديث كل 8 ساعات (8 * 60 * 60 * 1000 = 28800000 milliseconds)

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
