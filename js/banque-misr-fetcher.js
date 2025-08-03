// نظام جلب أسعار بنك مصر يومياً
class BanqueMisrDailyRates {
    constructor() {
        this.storageKey = 'banque_misr_daily_rates';
        this.lastUpdateKey = 'banque_misr_last_update';
        this.banqueMisrUrl = 'https://banquemisr.com/en/Home/CAPITAL-MARKETS/Exchange-Rates-and-Currencies';
    }

    // التحقق من الحاجة لتحديث البيانات
    needsUpdate() {
        const lastUpdate = localStorage.getItem(this.lastUpdateKey);
        if (!lastUpdate) return true;
        
        const lastUpdateDate = new Date(lastUpdate);
        const today = new Date();
        return today.toDateString() !== lastUpdateDate.toDateString();
    }

    // جلب الأسعار من بنك مصر
    async fetchBanqueMisrRates() {
        try {
            // استخدام proxy service للتغلب على CORS
            const response = await fetch('https://vercel-banque-misr-proxy.vercel.app/api/bm');
            const html = await response.text();
            if (html) {
                return this.parseBanqueMisrHTML(html);
            }
            throw new Error('No Banque Misr data received');
        } catch (error) {
            console.error('Error fetching Banque Misr rates:', error);
            return null;
        }
    }

    // تحليل HTML من موقع بنك مصر
    parseBanqueMisrHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rates = {};
        // Select the first table on the page
        const table = doc.querySelector("table");
        if (table) {
            const rows = table.querySelectorAll("tr");
            for (let row of rows) {
                const cells = row.querySelectorAll("td");
                // Each rate row has at least 6 cells: [flag, name, notes buy, notes sell, transfer buy, transfer sell]
                if (cells.length >= 6) {
                    // Currency name is in [1], buy in [2], sell in [3]
                    const currencyName = cells[1].innerText.trim().toUpperCase();
                    const buy = parseFloat(cells[2].innerText.trim().replace(",", ""));
                    const sell = parseFloat(cells[3].innerText.trim().replace(",", ""));
                    let code = null;
                    if (currencyName.includes("US DOLLAR")) code = "USD";
                    else if (currencyName.includes("EURO")) code = "EUR";
                    else if (currencyName.includes("STERLING")) code = "GBP";
                    else if (currencyName.includes("SAUDI")) code = "SAR";
                    else if (currencyName.includes("KUWAITI")) code = "KWD";
                    else if (currencyName.includes("UAE")) code = "AED";
                    else if (currencyName.includes("QATARI")) code = "QAR";
                    if (code && !isNaN(buy) && !isNaN(sell)) {
                        rates[code] = (buy + sell) / 2;
                    }
                }
            }
        }
        return rates;
    }

    // استخراج الأرقام من النص
    extractNumber(text) {
        const match = text.match(/[\d.,]+/);
        if (match) {
            const number = parseFloat(match[0].replace(',', ''));
            return isNaN(number) ? null : number;
        }
        return null;
    }

    // تحويل أسماء العملات للرموز المعيارية
    mapCurrencyName(name) {
        const nameLower = name.toLowerCase();
        
        if (nameLower.includes('usd') || nameLower.includes('dollar') || nameLower.includes('أمريكي')) {
            return 'USD';
        }
        if (nameLower.includes('eur') || nameLower.includes('euro') || nameLower.includes('يورو')) {
            return 'EUR';
        }
        if (nameLower.includes('gbp') || nameLower.includes('pound') || nameLower.includes('إسترليني')) {
            return 'GBP';
        }
        if (nameLower.includes('sar') || nameLower.includes('riyal') || nameLower.includes('سعودي')) {
            return 'SAR';
        }
        if (nameLower.includes('kwd') || nameLower.includes('dinar') || nameLower.includes('كويتي')) {
            return 'KWD';
        }
        if (nameLower.includes('aed') || nameLower.includes('dirham') || nameLower.includes('إماراتي')) {
            return 'AED';
        }
        if (nameLower.includes('qar') || nameLower.includes('qatari') || nameLower.includes('قطري')) {
            return 'QAR';
        }
        
        return null;
    }

    // تحليل هيكل بديل للصفحة
    parseAlternativeStructure(doc) {
        const rates = {};
        // البحث عن عناصر تحتوي على أسعار العملات
        const currencyElements = doc.querySelectorAll('.currency-item, .exchange-item, [class*="currency"], [class*="exchange"]');
        currencyElements.forEach(element => {
            const text = element.textContent;
            const currencyCode = this.extractCurrencyFromText(text);
            const rate = this.extractNumber(text);
            if (currencyCode && rate) {
                rates[currencyCode] = rate;
            }
        });
        return rates;
    }

    // استخراج رمز العملة من النص
    extractCurrencyFromText(text) {
        const currencies = ['USD', 'EUR', 'GBP', 'SAR', 'KWD', 'AED', 'QAR'];
        for (let currency of currencies) {
            if (text.toUpperCase().includes(currency)) {
                return currency;
            }
        }
        return this.mapCurrencyName(text);
    }

    // حفظ البيانات محلياً
    saveRates(rates) {
        if (rates && Object.keys(rates).length > 0) {
            localStorage.setItem(this.storageKey, JSON.stringify(rates));
            localStorage.setItem(this.lastUpdateKey, new Date().toISOString());
            console.log('✅ Banque Misr rates saved:', rates);
            return true;
        }
        return false;
    }

    // جلب البيانات المحفوظة
    getSavedRates() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : null;
    }

    // الدالة الرئيسية لجلب أو استخدام البيانات المحفوظة
    async getRates() {
        // إذا لم نحتج تحديث، استخدم البيانات المحفوظة
        if (!this.needsUpdate()) {
            const savedRates = this.getSavedRates();
            if (savedRates) {
                console.log('📁 Using saved Banque Misr rates');
                return savedRates;
            }
        }
        // جلب بيانات جديدة من بنك مصر
        console.log('🔄 Fetching fresh Banque Misr rates...');
        const freshRates = await this.fetchBanqueMisrRates();
        if (freshRates && this.saveRates(freshRates)) {
            return freshRates;
        }
        // إذا فشل، استخدم البيانات المحفوظة كـ fallback
        console.log('📁 Using cached Banque Misr rates as fallback');
        return this.getSavedRates();
    }
}
