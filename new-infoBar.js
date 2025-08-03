<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>شريط أسعار العملات</title>
<style>
    body {margin:0; padding:0; font-family: Tahoma, sans-serif;}
    #currency-ticker {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 9999;
        background: #111;
        color: #fff;
        font-size: 18px;
        padding: 10px 0;
        overflow: hidden;
        white-space: nowrap;
        box-shadow: 0 2px 5px rgba(0,0,0,0.6);
    }
    #currency-ticker .scroll {
        display: inline-block;
        padding-left: 100%;
        animation: scroll 40s linear infinite;
    }
    #currency-ticker.paused .scroll {
        animation-play-state: paused;
    }
    #currency-ticker span {
        display: inline-flex;
        align-items: center;
        margin: 0 30px;
    }
    #currency-ticker img {
        width: 20px;
        height: 14px;
        margin-left: 6px;
        border: 1px solid #ccc;
    }
    @keyframes scroll {
        0% {transform: translateX(0);}
        100% {transform: translateX(-100%);}
    }
    .up { color: #00ff88; }
    .down { color: #ff4444; } 

    /* --- تحسين للموبايل --- */
    @media (max-width: 768px) {
        #currency-ticker {
            font-size: 14px;
            padding: 6px 0;
        }
        #currency-ticker span {
            margin: 0 15px;
        }
        #currency-ticker img {
            width: 18px;
            height: 12px;
        }
        #currency-ticker .scroll {
            animation: scroll 55s linear infinite; /* إبطاء الحركة */
        }
    }
    @media (max-width: 480px) { /* شاشات صغيرة جدا */
        #currency-ticker {
            font-size: 12px;
            padding: 4px 0;
        }
        #currency-ticker span {
            margin: 0 10px;
        }
        #currency-ticker img {
            width: 16px;
            height: 10px;
        }
        #currency-ticker .scroll {
            animation: scroll 65s linear infinite; /* إبطاء أكتر */
        }
    }
</style>
</head>
<body style="padding-top:60px;"> 

<div id="currency-ticker"><div class="scroll">جارٍ تحميل الأسعار...</div></div> 

<script>
    let previousRates = {};
    function formatNumber(num) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } 

    async function loadCurrencies() {
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

        document.querySelector('#currency-ticker .scroll').innerHTML = html;
    }
    loadCurrencies();
    setInterval(loadCurrencies, 60000); // تحديث كل دقيقة 

    // إيقاف الحركة عند مرور الماوس
    const ticker = document.getElementById('currency-ticker');
    ticker.addEventListener('mouseenter', () => ticker.classList.add('paused'));
    ticker.addEventListener('mouseleave', () => ticker.classList.remove('paused'));
</script> 

</body>
</html>
