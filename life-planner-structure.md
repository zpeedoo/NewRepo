# دليل هيكلية كود تطبيق مُبين (Life Planner)
**الإصدار الموثَّق:** `v29_Firebase_Architecture_Optimized`  
**آخر تحديث للوثيقة:** 2026-06-20

بناءً على مبادئ **Ponytail Rules (الكسل الذكي)**، يهدف هذا الدليل إلى تفصيل بنية ملف `life-planner.html` لتسهيل فهمه وإجراء التعديلات عليه مستقبلاً بسرعة دون الحاجة لقراءة الكود بالكامل.

---

## 1. التقنيات والمكتبات المستخدمة (Dependencies)
- **الأساس:** HTML, CSS, Vanilla JavaScript (ملف واحد، بدون أطر عمل)
- **قواعد البيانات والمصادقة:** Firebase Auth + Realtime Database + Firebase Storage
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
  history: {},        // سجل الإنجاز اليومي { "2026-01-01": [id1, id2] } (يتم تحميله ومزامنته بشكل منفصل)
  goals: [],          // مصفوفة الأهداف
  books: [],          // الكتب اليدوية (بالصفحات)
  readerBooks: [],    // كتب المكتبة الذكية (PDF / HTML / Text)
  zahaSessions: [],   // جلسات نادي التركيز (legacy)
  journal: {},        // يومية اليوم { breatheDone, breatheTime }
  settings: {         // إعدادات المستخدم
    notifTime: '20:00',
    displayName: '',
    age: '',
    profilePic: ''    // رابط الصورة في Firebase Storage (أو base64 في حال الفشل)
  },
  highScores: {       // أعلى نقطة لكل لعبة
    stroop: 0,
    direction: 0,
    // slide, summatch, shapecounter, wordsearch, infinity, memoryconnect
  },
  gameHistory: {}     // { "2026-01-01": { stroop: [10, 20], direction: [30] } }
  // ملاحظة: تم إزالة nextId ويتم استخدام Date.now() بدلاً منه لتجنب التضارب
}
```

### دوال المزامنة والتحميل (تم تحسينها معمارياً)
- `checkAndMigrateDataThenLoad(uid)` — يُستدعى عند تسجيل الدخول. يقوم بدمج `history` المنفصل من السحابة إلى الكائن المحلي، ثم يستدعي `loadState()`.
- `loadState()` — يستمع لـ `planner_state` و `history` بـ `.on('value')` عبر مستمعين منفصلين لضمان عدم استهلاك البيانات.
- `saveState()` — يحفظ `state` كاملاً إلى `users/{uid}/planner_state`، **مع استبعاد `history`** لتقليل حجم الرفع. يتم حفظ `history` بشكل مباشر ومنفصل عند تحديد عادة بـ `db.ref(users/.../history/today).set(...)`.

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
**الكتب اليدوية:** `saveBook()`, `delBook(id)` (بإستخدام `await db.ref().remove()`), `updateBookPagesInline(id, val)`, `openBookNotes(id)`, `saveBookNotes()`  
**الملف الشخصي:** `saveAccountSettings()`, `saveAccountSettingsM()`, `handleDirectPicUpload(fileInput)` (ترفع الصورة إلى Firebase Storage)

---

## 5. التحديثات المعمارية الجوهرية (Architecture Improvements)
- **IDs مبنية على الوقت (`Date.now()`):** تم إزالة `nextId++` بالكامل لمنع التضارب بين الأجهزة (Collisions).
- **فصل الـ History (Decoupling):** يتم حفظ الـ `history` يومياً بشكل منفصل في العقدة `users/{uid}/history/{date}`. في حال تحديد العادة يتم الرفع للعقدة الخاصة باليوم فقط، وهذا يقلل حجم البيانات المرسلة بنسبة هائلة (>95%).
- **استخدام Firebase Storage:** الصور الشخصية تُرفع السحابة كـ Blob، مما يمنع تضخم ملف `planner_state` بسبب نصوص الـ base64، مع وجود Local Fallback للحفظ محلياً في حال فشل الرفع السحابي.

---

## 6. نادي التركيز — الألعاب الثمانية

| اللعبة | المتغيرات الرئيسية |
|---|---|
| Stroop | `stroopScore`, `stroopTimeLeft`, `currentStroopColor` |
| لغز الألوان المنزلق | `slideState[]`, `slideTarget[]`, `slideMoves` |
| تطابق المجموع | `smGrid[][]`, `smTarget`, `smPairsFound` |
| حصر الأشكال | `scExpected{}`, SVG مُولَّد عشوائياً |
| البحث عن الكلمات | `wsGrid[][]`, `wsWords[]`, `wsPassword` (كلمة سر مخفية) |
| مسار الانتباه | `infPathCoords[]`, `infCurrentNode`, `infLoops` |
| خريطة الألوان | `mcSequence[]`, `mcUserSequence[]`, `mcNodesList[]` |
| الحركة والاتجاه | `dirRule` (moving/pointing), `dirMove`, `dirPoint`, `dirArrows[]` |

**خصائص مشتركة بين الألعاب:**
- `hideAllFocusGames()` — تخفي جميع مناطق الألعاب
- `quitFocusGame()` — إنهاء أي لعبة والعودة للقائمة
- `adjustGameTime(game, amount)` — تعديل الوقت المتبقي أثناء اللعب
- `recordGameScore(gameId, score)` — تسجيل النتيجة في `state.gameHistory`
- `focusMistakes` + `resetFocusMistakes()` — عداد الأخطاء الموحَّد
- `playSound(type)` — تشغيل المؤثر الصوتي المناسب

---

## 7. نظام التحقق من الهوية (Auth Flow)

```
تحميل الصفحة
    ↓
auth.onAuthStateChanged()
    ├── مسجّل → checkAndMigrateDataThenLoad(uid)
    │               ↓
    │           دمج history السحابي مع local state
    │               ↓
    │           loadState() → Firebase .on('value') → renderAll()
    │
    └── غير مسجّل → إظهار #auth-screen
```

---

## 8. سجل التحديثات (بالترتيب — الأحدث أولاً)

### v29 — Firebase Architecture Optimized (الحالي)
- **فصل سجل العادات (History Decoupling):** أصبحت `history` تُحفظ كمسار منفصل في Firebase لتسريع المزامنة وتقليل البيانات المستهلكة.
- **معرفات مبنية على `Date.now()`:** منع حالات التضارب (Collisions).
- **التكامل مع Firebase Storage:** تحويل صورة الحساب إلى ملفات في Storage لتخفيف العبء على الـ Realtime Database.
- **التأكيد السحابي القوي:** استخدام `await` عند حذف الكيانات الكبيرة كمسودات الكتب لضمان عدم حذفها محلياً فقط وقت انقطاع الإنترنت.

### v28 — Production Auth Restored
- **بحث شامل:** زر بحث في الـ Header يفتح `#modal-search` ويبحث فورياً عبر العادات والأهداف والكتب مع رابط مباشر لكل نتيجة
- **لعبة الاتجاه والحركة:** لعبة ثامنة تعتمد على Swipe بدلاً من الضغط
- **نظام المؤثرات الصوتية:** ملفات `.aac` محلية تُشغَّل عبر `playSound(type)`
- **نظام أعلى نقطة:** `state.highScores` لألعاب Stroop والاتجاه
- **سجل نتائج الألعاب:** `state.gameHistory[date][gameId]` لحفظ جميع النتائج

### تحديثات سابقة موثَّقة
- **صفحة الحساب (Account Page):** بنمط WhatsApp وتعديل الإعدادات الشخصية
- **نافذة تأكيد مركزية:** `customConfirm()`
- **إزالة التحديث اليدوي للأهداف:** التقدم يُحسب آلياً من العادات المرتبطة فقط
- **تبسيط تكرار العادة:** يومي + أيام محددة فقط
- **أيقونات SVG بدلاً من الإيموجيز**
