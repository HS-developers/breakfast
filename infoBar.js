// شريط معلومات ديناميكي: العملات، الطقس، مواقيت الصلاة مع عداد تنازلي

// ====== 1. أسعار العملات ======
async function updateCurrencyRates() {
  try {
    const API_KEY = "89d70dc10d4ab027c3a3cd04"; // مفتاحك
    const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/EGP`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.result !== "success") throw new Error("API Error");

    // أسعار الجنيه مقابل العملات الأخرى
    const usd = 1 / data.conversion_rates.USD;
    const eur = 1 / data.conversion_rates.EUR;
    const sar = 1 / data.conversion_rates.SAR;
    const aed = 1 / data.conversion_rates.AED;
    const kwd = 1 / data.conversion_rates.KWD;
    const qar = 1 / data.conversion_rates.QAR;

    // المحتوى الأساسي (الدولار فقط + زر المزيد + نافذة العملات)
    document.getElementById('currencyLive').innerHTML =
      `<span>الدولار: <b>${usd.toFixed(2)}</b> جنيه</span>
       <button id="showMoreCurrencies" style="
         margin-right:12px;
         background:#1565c0;
         color:#fff;
         border-radius:8px;
         border:none;
         padding:4px 14px;
         cursor:pointer;
         font-size:14px;
         font-weight:600;
       ">المزيد</button>
       <div id="moreCurrencies" style="
         display:none;
         position:absolute;
         right:0;
         top:40px;
         background:#fff;
         box-shadow:0 4px 16px #b5c99a55;
         border-radius:12px;
         padding:10px 16px;
         z-index:9999;
         min-width:180px;
         font-size:16px;
       ">
         <span>اليورو: <b>${eur.toFixed(2)}</b> جنيه</span><br>
         <span>﷼ سعودي: <b>${sar.toFixed(2)}</b> جنيه</span><br>
         <span>درهم اماراتي: <b>${aed.toFixed(2)}</b> جنيه</span><br>
         <span>دينار كويتي: <b>${kwd.toFixed(2)}</b> جنيه</span><br>
         <span>ريال قطري: <b>${qar.toFixed(2)}</b> جنيه</span>
       </div>`;

    // زر المزيد لإظهار العملات الأخرى
    document.getElementById('showMoreCurrencies').onclick = function(e) {
      const moreDiv = document.getElementById('moreCurrencies');
      if (moreDiv.style.display === "none") {
        moreDiv.style.display = "block";
        this.textContent = "إخفاء";
        // تفعيل مستمع النقر لإغلاق النافذة عند الضغط بالخارج
        setTimeout(() => {
          document.addEventListener('mousedown', hideOnClickOutside);
        }, 0);
      } else {
        moreDiv.style.display = "none";
        this.textContent = "المزيد";
        document.removeEventListener('mousedown', hideOnClickOutside);
      }
      e.stopPropagation();
    };

    // دالة لإخفاء النافذة عند الضغط خارجها
    function hideOnClickOutside(event) {
      const moreDiv = document.getElementById('moreCurrencies');
      const btn = document.getElementById('showMoreCurrencies');
      if (moreDiv.style.display === "block" &&
          !moreDiv.contains(event.target) &&
          !btn.contains(event.target)
      ) {
        moreDiv.style.display = "none";
        btn.textContent = "المزيد";
        document.removeEventListener('mousedown', hideOnClickOutside);
      }
    }
  } catch {
    document.getElementById('currencyLive').textContent = 'تعذر جلب أسعار العملات';
  }
}

// ====== 2. الطقس في القاهرة ======
const WEATHER_API_KEY = "7510143ffde743d520303604ed5ac07f"; // استخدم مفتاح مجاني من openweathermap.org
async function updateWeather() {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=Cairo,EG&appid=${WEATHER_API_KEY}&units=metric&lang=ar`;
    const res = await fetch(url);
    const data = await res.json();
    const temp = Math.round(data.main.temp);
    const desc = data.weather[0].description;
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;
    document.getElementById('weatherLive').innerHTML =
      `<img src="${iconUrl}" alt="طقس" style="vertical-align:middle;width:28px;"> 
      ${desc} <b>${temp}°</b>`;
  } catch {
    document.getElementById('weatherLive').textContent = 'تعذر جلب الطقس';
  }
}

// ====== 3. مواقيت الصلاة مع عداد تنازلي ======
let prayerTimes = null;
let nextPrayerName = '';
let nextPrayerTime = '';
let countdownInterval = null;

async function updatePrayerTimes() {
  try {
    // Aladhan API مجاني
    const url = "https://api.aladhan.com/v1/timingsByCity?city=Cairo&country=Egypt&method=5";
    const res = await fetch(url);
    const data = await res.json();
    prayerTimes = data.data.timings;
    // ترتيب الصلوات
    const prayers = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
    let html = '';
    prayers.forEach(prayer => {
      html += `${getArabicPrayerName(prayer)}: <b>${prayerTimes[prayer]}</b> &nbsp; `;
    });
    document.getElementById('prayerLive').innerHTML = html;
  } catch {
    document.getElementById('prayerLive').textContent = 'تعذر جلب مواقيت الصلاة';
  }
}

// عند الضغط على أيقونة الصلاة، إظهار العد التنازلي
document.getElementById('prayerSection').onclick = function() {
  if (!prayerTimes) return;
  showCountdownModal();
};

function showCountdownModal() {
  // تحديد أقرب صلاة قادمة
  const prayers = [
    {key: 'Fajr', name: 'الفجر'},
    {key: 'Dhuhr', name: 'الظهر'},
    {key: 'Asr', name: 'العصر'},
    {key: 'Maghrib', name: 'المغرب'},
    {key: 'Isha', name: 'العشاء'}
  ];
  const now = new Date();
  let found = false;
  let nextTime, nextName;
  for (const prayer of prayers) {
    let timeStr = prayerTimes[prayer.key];
    let [h, m] = timeStr.split(':');
    let prayerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    if (prayerDate > now) {
      nextTime = prayerDate;
      nextName = prayer.name;
      found = true;
      break;
    }
  }
  // إذا انتهت كل الصلوات اليوم، الفجر غداً
  if (!found) {
    let [h, m] = prayerTimes['Fajr'].split(':');
    let tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    nextTime = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), h, m, 0);
    nextName = "الفجر (غداً)";
  }
  nextPrayerName = nextName;
  nextPrayerTime = `${nextTime.getHours().toString().padStart(2,'0')}:${nextTime.getMinutes().toString().padStart(2,'0')}`;

  document.getElementById('nextPrayerName').textContent = `أقرب صلاة: ${nextPrayerName}`;
  document.getElementById('nextPrayerTime').textContent = `الوقت: ${nextPrayerTime}`;
  updateCountdownDisplay(nextTime);

  document.getElementById('prayerCountdownModal').style.display = 'flex';
  // عداد تنازلي كل ثانية
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(()=> {
    updateCountdownDisplay(nextTime);
  }, 1000);
}

// إغلاق نافذة العد عند النقر على زر الإغلاق
document.getElementById('closeCountdownModal').onclick = function() {
  document.getElementById('prayerCountdownModal').style.display = 'none';
  if (countdownInterval) clearInterval(countdownInterval);
};

function updateCountdownDisplay(nextTime) {
  const now = new Date();
  let diff = Math.floor((nextTime - now) / 1000);
  if (diff < 0) diff = 0;
  let h = Math.floor(diff / 3600);
  let m = Math.floor((diff % 3600) / 60);
  let s = diff % 60;
  document.getElementById('prayerCountdown').textContent =
    `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// ترجمة اسم الصلاة
function getArabicPrayerName(key) {
  switch(key) {
    case 'Fajr': return 'الفجر';
    case 'Dhuhr': return 'الظهر';
    case 'Asr': return 'العصر';
    case 'Maghrib': return 'المغرب';
    case 'Isha': return 'العشاء';
    default: return key;
  }
}

// تحديث تلقائي كل دقيقة أو أقل
setInterval(updateCurrencyRates, 60*1000);
setInterval(updateWeather, 60*1000);
setInterval(updatePrayerTimes, 5*60*1000);

// أول تحميل
updateCurrencyRates();
updateWeather();
updatePrayerTimes();