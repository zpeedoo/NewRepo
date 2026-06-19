# دليل هيكلية كود تطبيق مُبين (Life Planner)
**الإصدار الموثَّق:** `v28_Production_Auth_Restored`  
**آخر تحديث للوثيقة:** 2026-06-19

بناءً على مبادئ **Ponytail Rules (الكسل الذكي)**، يهدف هذا الدليل إلى تفصيل بنية ملف `life-planner.html` لتسهيل فهمه وإجراء التعديلات عليه مستقبلاً بسرعة دون الحاجة لقراءة الكود بالكامل.

---

## 1. التقنيات والمكتبات المستخدمة (Dependencies)
- **الأساس:** HTML, CSS, Vanilla JavaScript (ملف واحد، بدون أطر عمل)
- **قواعد البيانات والمصادقة:** Firebase Auth + Realtime Database
- **المكتبات الخارجية:**
  - `Chart.js` — الرسوم البيانية في التقارير
  - `html2pdf.js` — تصدير التقارير بصيغة PDF
  - `canvas-confetti` — تأثير الاحتفال عند إنجاز الألعاب
- **المؤثرات الصوتية (ملفات محلية):**
  - `sounds/SoftUI.aac` — نجاح عادة أو خطوة في اللعبة
  - `sounds/Ring.aac` — بدء دورة التنفس
  - `sounds/Achievement.aac` — إنجاز كامل (كل العادات / الألعاب)
  - `sounds/Error.aac` — خطأ في الإجابة

---

## 2. بنية واجهة المستخدم (HTML & Layout Structure)
تطبيق SPA كامل داخل ملف واحد. التنقل عبر إخفاء/إظهار العناصر بصنف `.page.active`.

### الصفحات الرئيسية
| الـ ID | الاسم | الوصف |
|---|---|---|
| `#page-daily` | عاداتي اليومية | لوحة التحكم: العادات، التنفس، ملخص الأهداف والكتب، Mini-Dash |
| `#page-all-habits` | إدارة العادات | كل العادات مع إحصائياتها وفلتر الفترة الزمنية |
| `#page-goals` | أهداف السنة | إدارة الأهداف (التقدم آلي عبر العادات المرتبطة فقط) |
| `#page-reader` | القراءة | مكتبة الكتب اليدوية وتتبع الصفحات |
| `#page-focus` | نادي التركيز | قائمة الألعاب الذهنية الثمانية |
| `#page-reports` | التقارير | تقارير بتاريخ مخصص + تصدير PDF |
| `#page-account` | حسابي | إعدادات WhatsApp-style: الملف الشخصي، اللغة، الثيم، التنبيهات، الأمان |
| `#page-security` | الحساب والأمان | البريد الإلكتروني، تنبيهات الأمان، 2FA (قيد التطوير) |

### النوافذ المنبثقة (Modals)
| الـ ID | الغرض |
|---|---|
| `#modal-habit` | إضافة / تعديل عادة |
| `#modal-goal` | إضافة / تعديل هدف |
| `#modal-book` | إضافة / تعديل كتاب |
| `#modal-book-notes` | ملاحظات الكتاب |
| `#modal-confirm` | تأكيد الحذف أو الخروج (مركزية) |
| `#modal-notif` | ضبط وقت التنبيه اليومي |
| `#modal-language` | تغيير اللغة (placeholder) |
| `#modal-theme` | تغيير الثيم (placeholder) |
| `#modal-breathe` | تمارين التنفس التفاعلية |
| `#modal-game-alert` | نتائج الألعاب |
| `#modal-search` | البحث الشامل (عادات + أهداف + كتب) |
| `#modal-settings` | تعديل الاسم والعمر (يُستدعى من الـ Sidebar) |

### التنقل
- **Desktop:** Sidebar جانبي عرضه 240px
- **Mobile:** Bottom Nav عائم بيضاوي (5 عناصر: عاداتي، أهدافي، القراءة، التركيز، حسابي)
- **الأيقونات:** كلها SVG بـ `stroke="currentColor"` (متوافقة مع Dark Mode)

---

## 3. إدارة الحالة والبيانات (State Management)

```javascript
let state = {
  habits: [],         // مصفوفة العادات
  history: {},        // سجل الإنجاز اليومي { "2026-01-01": [id1, id2] }
  goals: [],          // مصفوفة الأهداف
  books: [],          // الكتب اليدوية (بالصفحات)
  readerBooks: [],    // كتب المكتبة الذكية (PDF / HTML / Text)
  zahaSessions: [],   // جلسات نادي التركيز (legacy)
  journal: {},        // يومية اليوم { breatheDone, breatheTime }
  settings: {         // إعدادات المستخدم
    notifTime: '20:00',
    displayName: '',
    age: '',
    profilePic: ''    // base64 string (مصغّر لـ 150px)
  },
  highScores: {       // أعلى نقطة لكل لعبة
    stroop: 0,
    direction: 0,
    // slide, summatch, shapecounter, wordsearch, infinity, memoryconnect
  },
  gameHistory: {},    // { "2026-01-01": { stroop: [10, 20], direction: [30] } }
  nextId: 1           // عداد المعرفات الفريدة
}
```

### دوال المزامنة والتحميل
- `checkAndMigrateDataThenLoad(uid)` — يُستدعى عند تسجيل الدخول، يدمج البيانات القديمة (migration) ثم يستدعي `loadState()`
- `loadState()` — يستمع لـ Firebase بـ `.on('value')` لتحديث الواجهة فور أي تغيير سحابي
- `saveState()` — يحفظ `state` كاملاً إلى `users/{uid}/planner_state`

---

## 4. خريطة الدوال البرمجية (JS Functions Map)

### التنقل والواجهة
| الدالة | الغرض |
|---|---|
| `goPage(el)` | التنقل بين الصفحات عبر `data-page` |
| `openModal(type, id)` | فتح نافذة منبثقة (تملأ الحقول إن كان id موجوداً) |
| `closeModal(id)` | إغلاق نافذة |
| `toast(msg)` | رسالة تنبيه سريعة (2.5 ثانية) |
| `customConfirm(text, callback)` | تأكيد مركزي قبل الحذف أو الخروج |
| `performSearch()` | بحث لحظي عبر العادات والأهداف والكتب |

### دوال العرض (Render)
| الدالة | الغرض |
|---|---|
| `renderAll()` | تُعيد رسم كل العناصر (تُستدعى بعد كل تغيير) |
| `renderHabits()` | قائمة عادات اليوم + نسبة الإنجاز |
| `renderAllHabits()` | صفحة إدارة العادات مع الإحصائيات |
| `renderDailyMiniDash()` | ملخص التقدم التراكمي في الـ Sidebar (مع فلتر 7/30/90/180/365 يوم) |
| `renderGoals()` | قائمة الأهداف مع التقدم الآلي |
| `renderBooks()` | قائمة الكتب اليدوية مع لوحة الإحصاء |
| `renderReaderLibrary()` | شبكة كتب المكتبة الذكية |
| `renderDashboard()` | تحديث الدوائر والأرقام في لوحة التحكم |
| `renderBreatheStatus()` | إظهار شارة "تم إنجاز تمرين اليوم" |
| `updateHighScores()` | تحديث عرض أعلى نقطة في قائمة الألعاب |
| `updateCircle(id, pct)` | تحريك دائرة SVG بناءً على النسبة |
| `updateAvatarUI()` | تحديث الصورة الشخصية في الـ Sidebar وصفحة الحساب |

### دوال CRUD
**المصادقة:** `handleLogin()`, `handleSignUp()`, `handleReset()`, `logout()`  
**العادات:** `saveHabit()`, `delHabit(id)`, `toggleHabit(id, bookId)`, `getActiveHabitsForDate(dateStr)`, `getStreak(habitId)`  
**الأهداف:** `saveGoal()`, `delGoal(id)`, `getGoalProgressInfo(goalId)`  
**الكتب اليدوية:** `saveBook()`, `delBook(id)`, `updateBookPagesInline(id, val)`, `openBookNotes(id)`, `saveBookNotes()`  
**الملف الشخصي:** `saveAccountSettings()`, `saveAccountSettingsM()`, `handleDirectPicUpload(fileInput)`

### دوال تمارين التنفس
| الدالة | الغرض |
|---|---|
| `openBreatheModal()` | فتح النافذة |
| `startBreathe()` | بدء الجلسة (يبدأ عداد الجلسة الكلي) |
| `resetBreathe()` | إعادة الضبط + إيقاف العداد وحفظ الوقت المنقضي |
| `stopBreathe()` | إيقاف + تراكم `breatheTime` في `state.journal[today]` |
| `runBreatheCycle()` | حلقة تكرارية لمراحل: شهيق → حبس → زفير → حبس |
| `checkBreatheGoal()` | تعليم "منجز" عند إتمام 4 دورات |

**الأنواع المتاحة:** 4-7-8 / التنفس المربع / Wim Hof

---

## 5. نادي التركيز — الألعاب الثمانية

| اللعبة | الدالة | المتغيرات الرئيسية |
|---|---|---|
| Stroop | `startStroopGame()`, `checkStroop(color)` | `stroopScore`, `stroopTimeLeft`, `currentStroopColor` |
| لغز الألوان المنزلق | `startSlideGame()`, `moveSlideTile(idx)` | `slideState[]`, `slideTarget[]`, `slideMoves` |
| تطابق المجموع | `startSumMatchGame()`, `handleSmClick(r,c,el)` | `smGrid[][]`, `smTarget`, `smPairsFound` |
| حصر الأشكال | `startShapeCounterGame()`, `checkShapeCounter()` | `scExpected{}`, SVG مُولَّد عشوائياً |
| البحث عن الكلمات | `startWordSearchGame()`, `generateWordSearchGrid()` | `wsGrid[][]`, `wsWords[]`, `wsPassword` (كلمة سر مخفية) |
| مسار الانتباه | `startInfinityGame()`, `handleInfClick(num)` | `infPathCoords[]`, `infCurrentNode`, `infLoops` |
| خريطة الألوان | `startMemoryConnectGame()`, `handleMCClick(num)` | `mcSequence[]`, `mcUserSequence[]`, `mcNodesList[]` |
| الحركة والاتجاه | `startDirectionGame()`, `handleDirectionInput(dir)` | `dirRule` (moving/pointing), `dirMove`, `dirPoint`, `dirArrows[]` |

**خصائص مشتركة بين الألعاب:**
- `hideAllFocusGames()` — تخفي جميع مناطق الألعاب
- `quitFocusGame()` — إنهاء أي لعبة والعودة للقائمة
- `adjustGameTime(game, amount)` — تعديل الوقت المتبقي أثناء اللعب
- `recordGameScore(gameId, score)` — تسجيل النتيجة في `state.gameHistory`
- `focusMistakes` + `resetFocusMistakes()` — عداد الأخطاء الموحَّد
- `playSound(type)` — تشغيل المؤثر الصوتي المناسب

**لعبة الاتجاه (Direction) — تفاصيل إضافية:**
- تعتمد على Swipe (يمين/يسار/أعلى/أسفل) بالماوس أو اللمس
- تُظهر سرباً من أوراق SVG متحركة تتحرك في اتجاه معين
- قاعدتان تتبادلان: "في أي اتجاه تشير الأوراق؟" أو "في أي اتجاه تتحرك؟"
- تتبع أعلى نقطة في `state.highScores.direction`

---

## 6. نظام التحقق من الهوية (Auth Flow)

```
تحميل الصفحة
    ↓
auth.onAuthStateChanged()
    ├── مسجّل → checkAndMigrateDataThenLoad(uid)
    │               ↓
    │           دمج بيانات قديمة إن وُجدت (migration)
    │               ↓
    │           loadState() → Firebase .on('value') → renderAll()
    │
    └── غير مسجّل → إظهار #auth-screen
```

---

## 7. توافق مبادئ Ponytail Rules

- **ملف واحد:** لا bundlers، يعمل كملف محلي أو PWA
- **`customConfirm` مركزي:** بدلاً من `window.confirm` أو نوافذ مكررة
- **SVG بـ `currentColor`:** متوافق مع Dark Mode دون تغييرات إضافية
- **`renderAll()` موحَّد:** نقطة دخول واحدة لتحديث كل الواجهة
- **Migration فردي:** `checkAndMigrateDataThenLoad` يُشغَّل مرة عند الدخول فقط

---

## 8. سجل التحديثات (بالترتيب — الأحدث أولاً)

### v28 — Production Auth Restored (الحالي)
- **بحث شامل:** زر بحث في الـ Header يفتح `#modal-search` ويبحث فورياً عبر العادات والأهداف والكتب مع رابط مباشر لكل نتيجة
- **لعبة الاتجاه والحركة:** لعبة ثامنة تعتمد على Swipe بدلاً من الضغط، مع سرب أوراق SVG متحرك وقاعدتين متبادلتين
- **نظام المؤثرات الصوتية:** ملفات `.aac` محلية (SoftUI / Ring / Achievement / Error) تُشغَّل عبر `playSound(type)`
- **نظام أعلى نقطة:** `state.highScores` لألعاب Stroop والاتجاه، يُعرض في قائمة الألعاب
- **سجل نتائج الألعاب:** `state.gameHistory[date][gameId]` لحفظ جميع النتائج
- **عداد الأخطاء الموحَّد:** `focusMistakes` يظهر في أعلى صفحة نادي التركيز

### تحديثات سابقة موثَّقة
- **صفحة الحساب (Account Page):** بنمط WhatsApp مع صورة شخصية قابلة للرفع (تُصغَّر لـ 150px وتُحفظ base64)
- **صفحة الأمان:** `#page-security` منفصلة مع عرض البريد الإلكتروني و 2FA placeholder
- **نافذة تأكيد مركزية:** `customConfirm()` موحَّدة لكل عمليات الحذف وتسجيل الخروج
- **إزالة التحديث اليدوي للأهداف:** التقدم يُحسب آلياً من العادات المرتبطة فقط
- **تبسيط تكرار العادة:** حُذفت خيارات أسبوعي/شهري/سنوي من النموذج (يومي + أيام محددة فقط)
- **أيقونات SVG:** استبدال كل الإيموجيز في الـ Nav والداش بورد والألعاب بأيقونات SVG
- **Mini-Dash مع فلتر:** فلتر الفترة الزمنية (7/30/90/180/365 يوم) في ملخص اليومية
- **عداد وقت جلسة التنفس:** عداد تراكمي للوقت الكلي يُحفظ يومياً في `state.journal[today].breatheTime`
- **Migration البيانات:** `checkAndMigrateDataThenLoad` يدمج البيانات القديمة والمحلية تلقائياً عند أول دخول
