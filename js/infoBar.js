// شريط أسعار العملات - نسخة بنك مصر
let previousRates = {};
const banqueMisrRates = new BanqueMisrDailyRates();

// تحويل رموز العملات للأسماء العربية
const currencyMapping = {
    'USD': 'الدولار الأمريكي',
    'EUR': 'اليورو', 
    'GBP': 'الجنيه الإسترليني',
    'SAR': 'الريال السعودي',
    'KWD': 'الدينار الكويتي',
    'AED': 'الدرهم الإماراتي',
    'QAR': 'الريال القطري'
};

// أعلام العملات
const currencyFlags = {
    'USD': 'https://flagcdn.com/us.svg',
    'EUR': 'https://flagcdn.com/eu.svg',
    'GBP': 'https://flagcdn.com/gb.svg',
    'SAR': 'https://flagcdn.com/sa.svg',
    'KWD': 'https://flagcdn.com/kw.svg',
    'AED': 'https://flagcdn.com/ae.svg',
    'QAR': 'https://flagcdn.com/qa.svg'
};

function formatNumber(num) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadCurrenciesFromBanqueMisr() {
    try {
        // جلب أسعار بنك مصر
        const banqueMisrData = await banqueMisrRates.getRates();
        
        if (banqueMisrData && Object.keys(banqueMisrData).length > 0) {
            let html = '';
            
            // تحويل بيانات بنك مصر للعرض
            for (let currencyCode in currencyMapping) {
                if (banqueMisrData[currencyCode]) {
                    const arabicName = currencyMapping[currencyCode];
                    const rate = banqueMisrData[currencyCode];
                    const flag = currencyFlags[currencyCode];
                    
                    const old = previousRates[arabicName] || rate;
                    const trend = rate >= old ? 'up' : 'down';
                    
                    html += `<span class="${trend}"><img src="${flag}" alt="${arabicName}">${arabicName}: ${formatNumber(rate)} ج.م</span>`;
                    previousRates[arabicName] = rate;
                }
            }
            
            if (html) {
                const scrollElement = document.querySelector('#currency-ticker .scroll');
                if (scrollElement) {
                    scrollElement.innerHTML = html;
                }
                console.log('✅ Banque Misr rates loaded successfully');
                return;
            }
        }
        
        // إذا فشل بنك مصر، استخدم API احتياطي
        console.log('⚠️ Banque Misr data insufficient, using fallback API');
        await loadCurrenciesFallback();
        
    } catch (error) {
        console.error('Error loading Banque Misr currencies:', error);
        await loadCurrenciesFallback();
    }
}

// API احتياطي في حالة فشل بنك مصر
async function loadCurrenciesFallback() {
    console.log('🔄 Loading fallback API rates...');
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        
        if (!data.rates || !data.rates.EGP) {
            throw new Error('Invalid API response');
        }

        const usdToEgp = data.rates.EGP;
        const rates = {
            "الدولار الأمريكي": {rate: usdToEgp, flag: "https://flagcdn.com/us.svg"},
            "اليورو": {rate: data.rates.EGP / data.rates.EUR, flag: "https://flagcdn.com/eu.svg"},
            "الجنيه الإسترليني": {rate: data.rates.EGP / data.rates.GBP, flag: "https://flagcdn.com/gb.svg"},
            "الريال السعودي": {rate: data.rates.EGP / data.rates.SAR, flag: "https://flagcdn.com/sa.svg"},
            "الدينار الكويتي": {rate: data.rates.EGP / data.rates.KWD, flag: "https://flagcdn.com/kw.svg"},
            "الدرهم الإماراتي": {rate: data.rates.EGP / data.rates.AED, flag: "https://flagcdn.com/ae.svg"},
            "الريال القطري": {rate: data.rates.EGP / data.rates.QAR, flag: "https://flagcdn.com/qa.svg"}
        };

        let html = '';
        for (let currency in rates) {
            const current = rates[currency].rate;
            const old = previousRates[currency] || current;
            const trend = current >= old ? 'up' : 'down';
            html += `<span class="${trend}"><img src="${rates[currency].flag}" alt="${currency}">${currency}: ${formatNumber(current)} ج.م</span>`;
            previousRates[currency] = current;
        }

        const scrollElement = document.querySelector('#currency-ticker .scroll');
        if (scrollElement) {
            scrollElement.innerHTML = html;
        }
        console.log('✅ Fallback API rates loaded');
        
    } catch (fallbackError) {
        console.error('❌ Fallback API also failed:', fallbackError);
        const scrollElement = document.querySelector('#currency-ticker .scroll');
        if (scrollElement) {
            scrollElement.innerHTML = '<span style="color: #ff4444;">🏦 بنك مصر: تعذر تحميل أسعار العملات حالياً</span>';
        }
    }
}

// تشغيل الشريط
function initCurrencyTicker() {
    loadCurrenciesFromBanqueMisr();
    
    // تحديث كل 6 ساعات (بنك مصر يحدث عدة مرات يومياً)
    setInterval(loadCurrenciesFromBanqueMisr, 21600000); // 6 ساعات

    // إيقاف الحركة عند مرور الماوس
    const ticker = document.getElementById('currency-ticker');
    if (ticker) {
        ticker.addEventListener('mouseenter', () => ticker.classList.add('paused'));
        ticker.addEventListener('mouseleave', () => ticker.classList.remove('paused'));
    }
}

// تشغيل الشريط عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initCurrencyTicker);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCurrencyTicker);
} else {
    initCurrencyTicker();
}
