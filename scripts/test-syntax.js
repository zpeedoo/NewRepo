
    const APP_VER = "v28_Production_Auth_Restored";

    // --- Sound Effects ---
    const sfxSoftUI = new Audio('sounds/SoftUI.aac');
    const sfxRing = new Audio('sounds/Ring.aac');
    const sfxAchievement = new Audio('sounds/Achievement.aac');
    const sfxError = new Audio('sounds/Error.aac');
    sfxError.onerror = () => { sfxError.src = 'sounds/Error.mp3'; };

    function playSound(type) {
      try {
        if (type === 'soft') { sfxSoftUI.currentTime = 0; sfxSoftUI.play(); }
        else if (type === 'ring') { sfxRing.currentTime = 0; sfxRing.play(); }
        else if (type === 'achieve') { sfxAchievement.currentTime = 0; sfxAchievement.play(); }
        else if (type === 'error') { sfxError.currentTime = 0; sfxError.play(); }
      } catch(e) { console.warn('Sound error:', e); }
    }

    window.onerror = function (message, source, lineno, colno, error) { console.error("Global Error Caught:", message); return false; };

    const firebaseConfig = { apiKey: "AIzaSyD5_r_wBDjy1y6Pm0oOwLIMdHyITiknSSw", authDomain: "myexpenses-3b6f5.firebaseapp.com", projectId: "myexpenses-3b6f5", storageBucket: "myexpenses-3b6f5.firebasestorage.app", messagingSenderId: "321643278173", appId: "1:321643278173:web:5dfb1ae0c644e97fe842b4", measurementId: "G-MJZN5DXGRQ" };

    let db, auth;
    try { if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); db = firebase.database(); auth = firebase.auth(); } catch (e) { console.error("Firebase Init Error:", e); }

    let currentUserUID = null;

    // --- تفعيل شاشة تسجيل الدخول والمصادقة الحقيقية ---
    if (auth) {
      auth.onAuthStateChanged((user) => {
        if (user) {
          currentUserUID = user.uid;
          document.getElementById('auth-screen').style.display = 'none';

          // Fetch user name or email for greeting
          let displayName = user.email ? user.email.split('@')[0] : "صديقي";
          document.getElementById('user-greeting-name').textContent = displayName;
          document.title = `امسي | ${displayName}`;

          checkAndMigrateDataThenLoad(currentUserUID);
          setupNotifications();
        } else {
          currentUserUID = null;
          document.getElementById('auth-screen').style.display = 'flex';
          document.getElementById('global-loading').style.display = 'none';
        }
      });
    }

    function handleLogin() {
      const email = document.getElementById('auth-email').value.trim();
      const pass = document.getElementById('auth-password').value;
      if (!email || !pass) { toast('يرجى تعبئة الإيميل وكلمة المرور'); return; }

      const btn = document.getElementById('btn-login');
      btn.disabled = true; btn.textContent = "جاري الدخول...";

      auth.signInWithEmailAndPassword(email, pass).then(() => {
        toast('تم تسجيل الدخول بنجاح!');
        btn.disabled = false; btn.textContent = "تسجيل الدخول";
      }).catch(e => {
        toast('خطأ: تأكد من الإيميل أو كلمة المرور');
        btn.disabled = false; btn.textContent = "تسجيل الدخول";
        console.error(e);
      });
    }

    function handleSignUp() {
      const email = document.getElementById('auth-email').value.trim();
      const pass = document.getElementById('auth-password').value;
      if (!email || !pass) { toast('يرجى تعبئة الإيميل وكلمة المرور'); return; }

      const btn = document.getElementById('btn-signup');
      btn.disabled = true; btn.textContent = "جاري الإنشاء...";

      auth.createUserWithEmailAndPassword(email, pass).then(() => {
        toast('تم إنشاء الحساب بنجاح!');
        btn.disabled = false; btn.textContent = "إنشاء حساب جديد";
      }).catch(e => {
        toast('خطأ: ' + e.message);
        btn.disabled = false; btn.textContent = "إنشاء حساب جديد";
      });
    }

    function handleReset() {
      const email = document.getElementById('auth-email').value.trim();
      if (!email) { toast('أدخل بريدك الإلكتروني أولاً في الخانة المخصصة'); return; }
      auth.sendPasswordResetEmail(email).then(() => toast('تم إرسال رابط استعادة كلمة المرور لبريدك')).catch(e => toast('خطأ: ' + e.message));
    }

    function handleLogout() {
      if (confirm("هل تود تسجيل الخروج من حسابك؟")) {
        if (auth) auth.signOut();
      }
    }
    // ------------------------------------------------------------------------

    let state = {
      habits: [], history: {}, goals: [], books: [], readerBooks: [], zahaSessions: [], nextId: 1,
      journal: {}, settings: { notifTime: '20:00' }
    };

    let currentOpenBookId = null; let readerData = []; let currentFontSize = 17; window.rawFileContent = "";

    const dNow = new Date();
    const today = new Date(dNow.getTime() - (dNow.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    document.getElementById('hdr-day').textContent = dNow.getDate();
    const engDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const engMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('hdr-date-full').innerHTML = `${engDays[dNow.getDay()]},<br>${engMonths[dNow.getMonth()]}`;

    async function checkAndMigrateDataThenLoad(uid) {
      const userRef = db.ref(`users/${uid}/planner_state`);
      userRef.once('value', async (snap) => {
        let cloudData = snap.val();
        let shouldUpdateCloud = false;

        const localDataStr = localStorage.getItem('planner_state');
        let localData = null;
        if (localDataStr) {
          try { localData = JSON.parse(localDataStr); } catch (e) { }
        }

        if (!cloudData || (!cloudData.habits && !cloudData.goals && !cloudData.books && !cloudData.readerBooks)) {
          // محاولة استعادة البيانات القديمة
          const oldSnap = await db.ref('planner_state').once('value');
          if (oldSnap.exists()) {
            cloudData = Object.assign({}, cloudData || {}, oldSnap.val());
            shouldUpdateCloud = true;
          } else if (localData) {
            cloudData = Object.assign({}, cloudData || {}, localData);
            shouldUpdateCloud = true;
          }
        } else if (localData) {
          // دمج الكتب فقط إن كانت ناقصة
          if (localData.readerBooks && (!cloudData.readerBooks || cloudData.readerBooks.length < localData.readerBooks.length)) {
            cloudData.readerBooks = localData.readerBooks;
            shouldUpdateCloud = true;
          }
        }

        // استعادة محتوى الكتب إن كان مفقوداً في السحابة الخاصة بالمستخدم
        if (cloudData && cloudData.readerBooks) {
          for (let rb of cloudData.readerBooks) {
            const bRef = db.ref(`users/${uid}/book_contents/${rb.id}`);
            const bSnap = await bRef.once('value');
            if (!bSnap.exists()) {
              const oldBookSnap = await db.ref(`book_contents/${rb.id}`).once('value');
              if (oldBookSnap.exists()) {
                await bRef.set(oldBookSnap.val());
              }
            }
          }
        }

        if (shouldUpdateCloud && cloudData) {
          await userRef.set(cloudData);
        }
        loadState();
      });
    }

    let isInitialLoad = true;
    function loadState() {
      if (!currentUserUID) return;
      db.ref(`users/${currentUserUID}/planner_state`).on('value', (snapshot) => {
        const p = snapshot.val();
        if (p) {
          state.habits = p.habits ? Object.values(p.habits) : [];
          state.history = p.history || {};
          state.goals = p.goals ? Object.values(p.goals) : [];
          state.books = p.books ? Object.values(p.books) : [];
          state.readerBooks = p.readerBooks ? Object.values(p.readerBooks) : [];
          state.zahaSessions = p.zahaSessions ? Object.values(p.zahaSessions) : [];
          state.journal = p.journal || {};
          state.settings = p.settings || { notifTime: '20:00' };
          state.nextId = p.nextId || 1;
        }
        document.getElementById('syncDot').classList.add('on');
        if (!state.history[today]) state.history[today] = [];
        if (state.settings && state.settings.displayName) {
          document.getElementById('user-greeting-name').textContent = state.settings.displayName;
          document.title = `امسي | ${state.settings.displayName}`;
          updateAvatarUI();
        }
        if (isInitialLoad) {
          document.getElementById('m-hab-start').value = today;
          document.getElementById('m-zaha-date').value = today;
          isInitialLoad = false;
        }
        populateGlobalSelectors(); renderAll();
      }, (err) => { document.getElementById('syncDot').classList.remove('on'); });
    }

    
    function toggleSettingsPopup() {
      const popup = document.getElementById('settings-popup');
      if (popup.style.display === 'block') {
        popup.style.display = 'none';
      } else {
        document.getElementById('s-name').value = state.settings.displayName || "صديقي";
        document.getElementById('s-age').value = state.settings.age || "";
        popup.style.display = 'block';
      }
    }
    
    function saveAccountSettings() {
      const name = document.getElementById('s-name').value.trim();
      const age = document.getElementById('s-age').value.trim();
      if (name) {
        state.settings.displayName = name;
        document.getElementById('user-greeting-name').textContent = name;
        document.title = `امسي | ${name}`;
      }
      if (age) {
        state.settings.age = age;
      }
      
      finishSaveSettings();
    }

        function handleDirectPicUpload(fileInput) {
      if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = new Image();
          img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 150;
            let scaleSize = MAX_WIDTH / img.width;
            if(scaleSize > 1) scaleSize = 1;
            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            state.settings.profilePic = dataUrl;
            updateAvatarUI();
            saveState();
            toast('تم تحديث الصورة بنجاح 🖼️');
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(fileInput.files[0]);
      }
    }

    function finishSaveSettings() {
      saveState();
      document.getElementById('settings-popup').style.display = 'none';
      toast('تم حفظ الإعدادات بنجاح ✅');
    }

    function updateAvatarUI() {
      const iconDiv = document.getElementById('user-avatar-icon');
      if(iconDiv) {
        if(state.settings.profilePic) {
          iconDiv.innerHTML = `<img src="${state.settings.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
          iconDiv.style.background = 'transparent';
        } else {
          iconDiv.innerHTML = '👋';
          iconDiv.style.background = 'var(--black)';
        }
      }
    }
    
    // Close popup on outside click
    document.addEventListener('click', function(e) {
      const gearBtn = document.querySelector('[onclick="toggleSettingsPopup()"]');
      const popup = document.getElementById('settings-popup');
      if(popup && gearBtn && popup.style.display === 'block') {
        if(!gearBtn.contains(e.target)) {
          popup.style.display = 'none';
        }
      }
    });

    function changeUserName() {
      const currentName = document.getElementById('user-greeting-name').textContent;
      const newName = prompt("أدخل اسمك الجديد:", currentName);
      if (newName && newName.trim()) {
        state.settings.displayName = newName.trim();
        document.getElementById('user-greeting-name').textContent = state.settings.displayName;
        document.title = `امسي | ${state.settings.displayName}`;
        saveState();
      }
    }
    async function saveState() { if (!currentUserUID) return; try { await db.ref(`users/${currentUserUID}/planner_state`).set(state); document.getElementById('syncDot').classList.add('on'); } catch (e) { document.getElementById('syncDot').classList.remove('on'); } }

    function populateGlobalSelectors() {
      const gHtml = `<option value="">-- بدون هدف مرتبط --</option>` + state.goals.map(g => `<option value="${g.id}">🎯 ${g.title}</option>`).join('');
      if (document.getElementById('m-hab-goal')) document.getElementById('m-hab-goal').innerHTML = gHtml;
      const bHtml = `<option value="">-- بدون كتاب مرتبط --</option>` + state.books.map(b => `<option value="${b.id}">📖 ${b.title}</option>`).join('');
      if (document.getElementById('m-hab-book')) document.getElementById('m-hab-book').innerHTML = bHtml;
    }

    function goPage(el) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.bnav-item').forEach(n => n.classList.remove('active'));
      const name = el.dataset.page;
      document.querySelectorAll(`.nav-item[data-page="${name}"], .bnav-item[data-page="${name}"]`).forEach(n => n.classList.add('active'));
      document.getElementById('page-' + name).classList.add('active');
      document.getElementById('reader-progress-container').style.display = (name === 'reader' && currentOpenBookId) ? 'block' : 'none';
      if (name === 'reader' && !currentOpenBookId) switchReaderMode('library');
      renderAll();
    }
    function openModal(type, id = null) {
      if (type === 'notif') {
        document.getElementById('m-notif-time').value = state.settings.notifTime || '20:00';
        document.getElementById('modal-notif').classList.add('show'); return;
      }
      if (type === 'habit') {
        if (id) {
          const h = state.habits.find(x => x.id === id);
          if (!h) return;
          document.getElementById('m-hab-id').value = h.id; document.getElementById('m-hab-title-text').textContent = 'تعديل العادة ✎'; document.getElementById('m-hab-title').value = h.title; document.getElementById('m-hab-start').value = h.start || today; document.getElementById('m-hab-end').value = h.end || ''; document.getElementById('m-hab-goal').value = h.goalId || ''; document.getElementById('m-hab-book').value = h.bookId || ''; document.getElementById('m-hab-freq').value = h.freq || 'daily'; toggleHabitDays(h.freq || 'daily', 'm-hab-days-wrap'); document.querySelectorAll('#m-hab-days-wrap .day-btn').forEach(b => { if (h.days && h.days.includes(parseInt(b.dataset.day))) b.classList.add('active'); else b.classList.remove('active'); });
        } else { document.getElementById('m-hab-id').value = ''; document.getElementById('m-hab-title-text').textContent = 'إضافة عادة جديدة ✨'; document.getElementById('m-hab-title').value = ''; document.getElementById('m-hab-goal').value = ''; document.getElementById('m-hab-book').value = ''; }
      }
      else if (type === 'goal') { const endOfYear = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]; if (id) { const g = state.goals.find(x => x.id === id); if (!g) return; document.getElementById('m-goal-id').value = g.id; document.getElementById('m-goal-title-text').textContent = 'تعديل الهدف ✎'; document.getElementById('m-goal-title').value = g.title; document.getElementById('m-goal-end').value = g.endDate || endOfYear; } else { document.getElementById('m-goal-id').value = ''; document.getElementById('m-goal-title-text').textContent = 'إضافة هدف 🏆'; document.getElementById('m-goal-title').value = ''; document.getElementById('m-goal-end').value = endOfYear; } }
      else if (type === 'book') { if (id) { const b = state.books.find(x => x.id === id); if (!b) return; document.getElementById('m-book-id').value = b.id; document.getElementById('m-book-title-text').textContent = 'تعديل كتاب ✎'; document.getElementById('m-book-title').value = b.title; document.getElementById('m-book-total').value = b.totalPages; document.getElementById('m-book-read').value = b.readPages; } else { document.getElementById('m-book-id').value = ''; document.getElementById('m-book-title-text').textContent = 'إضافة كتاب 📚'; document.getElementById('m-book-title').value = ''; document.getElementById('m-book-total').value = '100'; document.getElementById('m-book-read').value = '0'; } }
      else if (type === 'zaha') { if (id) { const z = state.zahaSessions.find(x => x.id === id); if (!z) return; document.getElementById('m-zaha-id').value = z.id; document.getElementById('m-zaha-title-text').textContent = 'تعديل بيانات الحصة ✎'; document.getElementById('m-zaha-course').value = z.course; document.getElementById('m-zaha-date').value = z.date; document.getElementById('m-zaha-hours').value = z.hours; document.getElementById('m-zaha-summary').value = z.summary; } else { document.getElementById('m-zaha-id').value = ''; document.getElementById('m-zaha-title-text').textContent = 'توثيق حصة زها 🏛️'; document.getElementById('m-zaha-course').value = ''; document.getElementById('m-zaha-date').value = today; document.getElementById('m-zaha-hours').value = '2'; document.getElementById('m-zaha-summary').value = ''; } }
      document.getElementById(`modal-${type}`).classList.add('show');
    }
    function closeModal(id) { document.getElementById('modal-' + id).classList.remove('show'); }

    let toastTimeout;
    function toast(msg) { const t = document.getElementById('toast'); document.getElementById('toast-msg').textContent = msg; t.classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => t.classList.remove('show'), 2500); }

    function renderAll() {
      renderHabits();
      renderAllHabits();
      renderGoals();
      renderBooks();
      renderZaha();
      renderReaderLibrary();
      renderDashboard();
      if(typeof renderBreatheStatus === 'function') renderBreatheStatus();
      if(typeof populateReportSelector === 'function') populateReportSelector();
    }

    function getStreak(habitId) {
      const h = state.habits.find(x => x.id === habitId);
      if (!h || (h.freq !== 'daily' && h.freq !== 'specific')) return 0;
      let streak = 0; let d = new Date(today);
      for (let i = 0; i < 365; i++) {
        let dStr = d.toLocaleDateString('en-CA');
        if (h.start && dStr < h.start) break;
        let isScheduled = false;
        if (h.freq === 'daily') isScheduled = true;
        else if (h.freq === 'specific' && h.days.includes(d.getDay())) isScheduled = true;
        if (isScheduled) {
          let isDone = state.history[dStr] && state.history[dStr].includes(h.id);
          if (isDone) streak++; else { if (dStr !== today) break; }
        }
        d.setDate(d.getDate() - 1);
      }
      return streak;
    }

    function toggleHabitDays(val, wrapId) { document.getElementById(wrapId).style.display = val === 'specific' ? 'block' : 'none'; }
    function saveHabit() { const id = document.getElementById('m-hab-id').value; const title = document.getElementById('m-hab-title').value.trim(); if (!title) { toast('أدخل اسم العادة'); return; } const freq = document.getElementById('m-hab-freq').value; let days = []; if (freq === 'specific') { document.querySelectorAll('#m-hab-days-wrap .day-btn.active').forEach(b => days.push(parseInt(b.dataset.day))); if (!days.length) { toast('اختر يوم واحد على الأقل'); return; } } if (id) { const h = state.habits.find(x => x.id == id); if (h) { h.title = title; h.start = document.getElementById('m-hab-start').value || today; h.end = document.getElementById('m-hab-end').value; h.freq = freq; h.days = days; h.goalId = document.getElementById('m-hab-goal').value; h.bookId = document.getElementById('m-hab-book').value; } } else { state.habits.push({ id: state.nextId++, title, start: document.getElementById('m-hab-start').value || today, end: document.getElementById('m-hab-end').value, freq, days, goalId: document.getElementById('m-hab-goal').value, bookId: document.getElementById('m-hab-book').value }); } saveState(); renderAll(); closeModal('habit'); toast('تم الحفظ ✓'); }
    function delHabit(id) { if (confirm('تأكيد الحذف؟')) { state.habits = state.habits.filter(h => h.id != id); saveState(); renderAll(); } }
    function toggleHabit(id, bookId = null) { 
      if (!state.history[today]) state.history[today] = []; 
      if (state.history[today].includes(id)) { 
        state.history[today] = state.history[today].filter(x => x !== id); 
      } else { 
        if (bookId) { 
          const pagesInput = document.getElementById(`h-pages-${id}`); 
          const b = state.books.find(x => x.id == bookId); 
          if (pagesInput && pagesInput.value && b) { 
            b.readPages = Math.min(b.readPages + parseInt(pagesInput.value), b.totalPages); 
            toast(`تمت إضافة ${pagesInput.value} صفحة للكتاب ✓`); 
          } 
        } 
        state.history[today].push(id); 
        if(typeof playSound === 'function') playSound('soft');
        const active = getActiveHabitsForDate(today);
        const doneCount = active.filter(h => state.history[today].includes(h.id)).length;
        if (active.length > 0 && doneCount === active.length) {
          if(typeof playSound === 'function') playSound('achieve');
          toast('أتممت جميع عاداتك لليوم! عمل رائع! 🌟');
        }
      } 
      saveState(); 
      renderAll(); 
    }

    function getActiveHabitsForDate(dateStr) { const d = new Date(dateStr); const dayIdx = d.getDay(); return state.habits.filter(h => { if (h.start && dateStr < h.start) return false; if (h.end && dateStr > h.end) return false; if (h.freq === 'specific' && !h.days.includes(dayIdx)) return false; return true; }); }

    function renderHabits() {
      const activeToday = getActiveHabitsForDate(today);
      let html = activeToday.length ? activeToday.map(h => {
        const done = (state.history[today] || []).includes(h.id);
        const gInfo = state.goals.find(g => g.id == h.goalId); const bInfo = h.bookId ? state.books.find(b => b.id == h.bookId) : null;
        let bInput = (bInfo && !done) ? `<input type="number" id="h-pages-${h.id}" class="inp" placeholder="كم صفحة؟" style="width:90px; padding:4px 8px; font-size:11px; height: 28px; margin-inline-end: 8px;" min="1" onclick="event.stopPropagation()">` : (bInfo && done) ? `<span style="font-size:11px; color:var(--primary); margin-inline-end: 8px; font-weight:bold;">تم التحديث ✓</span>` : '';
        const streak = getStreak(h.id);
        const streakHtml = streak > 0 ? `<span class="badge streak-badge">🔥 ${streak}</span>` : '';
        return `<div class="list-item ${done ? 'done' : ''}" style="display:flex; align-items:center;"><div class="check-btn ${done ? 'active' : ''}" onclick="toggleHabit(${h.id}, ${h.bookId ? `'${h.bookId}'` : 'null'})">${done ? '✓' : ''}</div>${bInput}<div class="item-info" style="flex:1;"><div class="item-title">${h.title}</div><div class="item-meta">${streakHtml}${gInfo ? `<span class="badge goal-badge">🎯 ${gInfo.title}</span>` : ''}${bInfo ? `<span class="badge" style="background:#e0f2fe; color:#0284c7">📖 ${bInfo.title}</span>` : ''}</div></div><button class="del-btn" style="background:var(--surface2); margin-inline-start:10px; flex-shrink:0;" onclick="openModal('habit', ${h.id})" title="تعديل"><span style="font-size:14px;">⚙️</span></button></div>`;
      }).join('') : '';
      
      if (state.journal[today] && state.journal[today].breatheTime > 0) {
        const totalSecs = state.journal[today].breatheTime;
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        const timeText = (m > 0 ? `${m} دقيقة و ` : '') + `${s} ثانية`;
        html += `<div class="list-item done" style="border: 1px solid var(--primary);"><div class="check-btn active" style="background:var(--primary); color:white; border-color:var(--primary);">✓</div><div class="item-info"><div class="item-title">تمرين التنفس المنجز 🫁</div><div class="item-meta" style="color:var(--primary); font-weight:bold;">⏱ إجمالي الوقت: ${timeText}</div></div></div>`;
      }
      
      if (!html) html = '<div class="empty">لا يوجد مهام اليوم</div>';
            document.getElementById('habit-list').innerHTML = html;
      
      const dDone = activeToday.filter(h => (state.history[today] || []).includes(h.id)).length;
      const dPct = activeToday.length ? (dDone / activeToday.length * 100) : 0;
      const valEl = document.getElementById('daily-pg-val');
      const txtEl = document.getElementById('daily-pg-txt');
      if(valEl) valEl.textContent = `${dDone}/${activeToday.length}`;
      if(txtEl) txtEl.textContent = Math.round(dPct) + '%';
      updateCircle('daily-pg-circ', dPct);

      renderDailyMiniDash();
    }

    function renderDailyMiniDash() {
      const container = document.getElementById('mini-dash-content');
      if (!container) return;
      if (state.habits.length === 0) { container.innerHTML = `<div class="empty" style="padding: 20px; border: none; background: transparent;">لا يوجد عادات مجدولة</div>`; return; }
      let totalExpected = 0; let totalDone = 0; const activeWeeklyHabits = [];
      state.habits.forEach(h => {
        let expected = 0; let done = 0; let dStart = new Date(h.start || today); let dEnd = h.end ? new Date(Math.min(new Date(today), new Date(h.end))) : new Date(today);
        let fDate = new Date(today); fDate.setDate(fDate.getDate() - 6); if (dStart < fDate) dStart = fDate;
        if (dStart <= dEnd) {
          let cur = new Date(dStart); let daysInRange = 0;
          while (cur <= dEnd) {
            daysInRange++; if (h.freq === 'daily' || (h.freq === 'specific' && h.days.includes(cur.getDay()))) expected++;
            let dStr = cur.toLocaleDateString('en-CA'); if (state.history[dStr] && state.history[dStr].includes(h.id)) done++;
            cur.setDate(cur.getDate() + 1);
          }
          if (h.freq === 'weekly') expected = Math.ceil(daysInRange / 7); if (h.freq === 'monthly') expected = Math.ceil(daysInRange / 30); if (h.freq === 'yearly') expected = Math.ceil(daysInRange / 365);
        }
        if (expected > 0) { totalExpected += expected; totalDone += done; activeWeeklyHabits.push({ habit: h, expected, done }); }
      });

      if (activeWeeklyHabits.length === 0) { container.innerHTML = `<div class="empty" style="padding: 20px; border: none; background: transparent;">لا يوجد مهام مطلوبة هذا الأسبوع</div>`; return; }
      const dPct = totalExpected === 0 ? 0 : Math.min(Math.round((totalDone / totalExpected) * 100), 100);
      const itemsHtml = activeWeeklyHabits.map(item => {
        const h = item.habit; const expected = item.expected; const done = item.done; const isDone = done >= expected; const pct = Math.min(Math.round((done / expected) * 100), 100);
        const gInfo = state.goals.find(g => g.id == h.goalId); const icon = h.bookId ? '📖' : (gInfo ? '🎯' : '⚡');
        return `<div class="md-item"><div class="md-icon">${icon}</div><div class="md-info"><div style="display:flex; justify-content:space-between; align-items:center;"><div class="md-name" title="${h.title}">${h.title}</div><div class="md-status ${isDone ? 'done' : ''}">${pct}%</div></div><div class="md-bar-bg"><div class="md-bar-fill ${isDone ? 'done' : ''}" style="width: ${pct}%"></div></div></div></div>`;
      }).join('');
      const circleOffset = 188.4 - (dPct / 100 * 188.4);
      container.innerHTML = `<div class="md-header"><div class="md-title">تقدم الأسبوع <span style="font-size:11px; color:var(--text3); font-weight:normal;">(آخر 7 أيام)</span></div><div style="font-size: 18px; font-weight: 800; color: var(--primary); font-family: 'JetBrains Mono', monospace;">${dPct}%</div></div><div class="md-overall"><div class="circ-wrap" style="transform: scale(0.85); margin: 0; width: 60px; height: 60px;"><svg width="60" height="60" viewBox="0 0 70 70" style="overflow:visible;"><circle class="circ-bg" cx="35" cy="35" r="30" stroke-width="6"></circle><circle class="circ-val" cx="35" cy="35" r="30" stroke="var(--primary)" stroke-width="6" stroke-dasharray="188.4" stroke-dashoffset="${circleOffset}" style="transition: stroke-dashoffset 0.8s ease;"></circle></svg></div><div><div style="font-size: 12px; color: var(--text2); font-weight: 700;">المهام الأسبوعية المنجزة</div><div style="font-size: 18px; font-weight: 800; color: var(--black);"><span style="color: var(--primary)">${totalDone}</span> / ${totalExpected}</div></div></div><div class="md-list">${itemsHtml}</div>`;
    }

    function renderAllHabits() {
      const filterVal = document.getElementById('habit-stats-filter') ? document.getElementById('habit-stats-filter').value : '7';
      const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
      const html = state.habits.map(h => {
        let expected = 0; let done = 0; let dStart = new Date(h.start || today); let dEnd = h.end ? new Date(Math.min(new Date(today), new Date(h.end))) : new Date(today);
        if (filterVal !== 'all') { let fDate = new Date(today); fDate.setDate(fDate.getDate() - parseInt(filterVal) + 1); if (dStart < fDate) dStart = fDate; }
        if (dStart <= dEnd) {
          let cur = new Date(dStart); let daysInRange = 0;
          while (cur <= dEnd) {
            daysInRange++; if (h.freq === 'daily' || (h.freq === 'specific' && h.days.includes(cur.getDay()))) expected++;
            let dStr = cur.toLocaleDateString('en-CA'); if (state.history[dStr] && state.history[dStr].includes(h.id)) done++;
            cur.setDate(cur.getDate() + 1);
          }
          if (h.freq === 'weekly') expected = Math.ceil(daysInRange / 7); if (h.freq === 'monthly') expected = Math.ceil(daysInRange / 30); if (h.freq === 'yearly') expected = Math.ceil(daysInRange / 365);
        }
        const pct = expected === 0 ? 0 : Math.min((done / expected) * 100, 100);
        let freqLabel = 'يومياً'; if (h.freq === 'specific' && h.days && h.days.length > 0) freqLabel = h.days.map(d => dayNames[d]).join('، '); if (h.freq === 'weekly') freqLabel = 'أسبوعياً'; if (h.freq === 'monthly') freqLabel = 'شهرياً'; if (h.freq === 'yearly') freqLabel = 'سنوياً';
        let progressText = expected === 0 ? '💡 لا يوجد إنجاز مطلوب' : `الإنجاز الفعلي: <strong>${done}</strong> من <strong>${expected}</strong> مرات مطلوبة`;
        const streak = getStreak(h.id); const streakHtml = streak > 0 ? `<span class="badge streak-badge" style="margin-right: 10px;">🔥 ${streak} يوم متتالي</span>` : '';
        return `<div class="list-item" style="padding:20px; display:block"><div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center; flex-wrap:wrap; gap:10px;"><div style="display:flex; flex-direction:column; gap:4px;"><span style="font-size:16px; font-weight:800; color:var(--text)">${h.title}</span><div style="display:flex; align-items:center;"><span style="font-size:12px; color:var(--text2);">⏱ ${freqLabel}</span>${streakHtml}</div></div><div style="display:flex; align-items:center; gap: 10px;"><span style="font-size:18px; color:var(--primary); font-weight:800; font-family:'JetBrains Mono', monospace">${pct.toFixed(0)}%</span><button class="del-btn" style="background:var(--surface2);" onclick="openModal('habit', ${h.id})">✎</button><button class="del-btn" onclick="delHabit(${h.id})">✕</button></div></div><div class="prog-bg"><div class="prog-fill" style="background:var(--primary); width:${pct}%"></div></div><div class="item-meta" style="margin-top:12px">${progressText}</div></div>`;
      }).join('');
      const listEl = document.getElementById('all-habits-list'); if (listEl) listEl.innerHTML = html || '<div class="empty">لم تتم إضافة عادات بعد</div>';
    }



    function requestNotification() {
      if (!("Notification" in window)) { alert("متصفحك لا يدعم التنبيهات"); return; }
      Notification.requestPermission().then(permission => {
        if (permission === "granted") openModal('notif');
        else alert("يرجى السماح بالتنبيهات من إعدادات المتصفح أولاً.");
      });
    }

    function saveNotificationSettings() {
      const t = document.getElementById('m-notif-time').value;
      if (t) {
        state.settings.notifTime = t;
        saveState();
        closeModal('notif');
        toast(`تم تفعيل التنبيه اليومي الساعة ${t} 🔔`);
      }
    }

    function setupNotifications() {
      setInterval(() => {
        let now = new Date();
        let timeStr = now.toTimeString().substring(0, 5);
        if (state.settings && state.settings.notifTime === timeStr && state.lastNotified !== today) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("مخطط الحياة", { body: "حان الوقت لمراجعة عاداتك وإضافة يومياتك! 🚀", icon: "https://cdn-icons-png.flaticon.com/512/1000/1000074.png" });
            state.lastNotified = today;
            saveState();
          }
        }
      }, 60000);
    }

    function getGoalProgressInfo(goalId) { const goal = state.goals.find(g => g.id == goalId); const linked = state.habits.filter(h => h.goalId == goalId); if (linked.length === 0) return { isAuto: false, pct: null, habitsTotal: 0 }; let exTot = 0; let dnTot = 0; let goalEndD = goal.endDate ? new Date(goal.endDate) : new Date(new Date().getFullYear(), 11, 31); linked.forEach(h => { let ex = 0; let dn = 0; let startD = new Date(h.start || today); let endD = h.end ? new Date(Math.min(new Date(h.end), goalEndD)) : goalEndD; let cur = new Date(startD); cur.setHours(0, 0, 0, 0); endD.setHours(0, 0, 0, 0); let daysInRange = 0; while (cur <= endD) { daysInRange++; if (h.freq === 'daily' || (h.freq === 'specific' && h.days.includes(cur.getDay()))) { ex++; } cur.setDate(cur.getDate() + 1); } if (h.freq === 'weekly') ex = Math.ceil(daysInRange / 7); if (h.freq === 'monthly') ex = Math.ceil(daysInRange / 30); if (h.freq === 'yearly') ex = Math.ceil(daysInRange / 365); Object.keys(state.history).forEach(d => { let histDate = new Date(d); if (histDate >= startD && histDate <= endD && state.history[d].includes(h.id)) dn++; }); exTot += ex; dnTot += dn; }); let pct = exTot > 0 ? Math.round((dnTot / exTot) * 100) : 0; return { isAuto: true, pct: Math.min(pct, 100), habitsTotal: linked.length }; }
    function saveGoal() { const id = document.getElementById('m-goal-id').value; const title = document.getElementById('m-goal-title').value.trim(); const endDate = document.getElementById('m-goal-end').value; if (!title) { toast('أدخل اسم الهدف'); return; } if (id) { const g = state.goals.find(x => x.id == id); if (g) { g.title = title; g.endDate = endDate; } } else { state.goals.push({ id: state.nextId++, title, endDate, progress: 0 }); } saveState(); populateGlobalSelectors(); renderAll(); closeModal('goal'); toast('تم الحفظ 🎯'); }
    function delGoal(id) { if (confirm('تأكيد الحذف؟')) { state.goals = state.goals.filter(g => g.id != id); state.habits.forEach(h => { if (h.goalId == id) h.goalId = ""; }); saveState(); populateGlobalSelectors(); renderAll(); } }
    function updateGoalUI(id, val) { const g = state.goals.find(x => x.id === id); if (g && !getGoalProgressInfo(id).isAuto) { g.progress = parseInt(val); document.getElementById(`goal-pct-${id}`).textContent = g.progress + '%'; document.getElementById(`goal-fill-${id}`).style.width = g.progress + '%'; renderDashboard(); } }
    function saveGoalUI(id, val) { const g = state.goals.find(x => x.id === id); if (g && !getGoalProgressInfo(id).isAuto) { g.progress = parseInt(val); saveState(); renderDashboard(); } }
    function renderGoals() { document.getElementById('goal-list').innerHTML = state.goals.length ? state.goals.map(g => { const info = getGoalProgressInfo(g.id); const pct = info.isAuto ? info.pct : (g.progress || 0); const dateStr = g.endDate ? `📅 حتى: ${g.endDate}` : 'بدون تاريخ نهاية'; return `<div class="list-item" style="display:flex; flex-direction:column; align-items:stretch; padding: 20px; border-radius: 16px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;"><div style="display:flex; gap: 8px; align-items:center;"><button class="del-btn" style="width:32px; height:32px; border-radius:8px; background:var(--surface); border:1px solid var(--border-darker); font-size:12px;" onclick="delGoal(${g.id})">✕</button><button class="del-btn" style="width:32px; height:32px; border-radius:8px; background:var(--surface); border:1px solid var(--border-darker); font-size:12px;" onclick="openModal('goal', ${g.id})">✏️</button><div class="card-pct" style="margin:0; padding:6px 14px; font-size:14px; background:var(--primary-light); color:var(--primary); border-radius:20px; font-weight:800;">${pct}%</div></div><div style="text-align: right;"><div class="card-title" style="margin:0; font-size: 16px;">${g.title}</div></div></div><div class="prog-wrap" style="margin-top: 5px; margin-bottom: 8px;"><div class="prog-bg" style="height: 6px; background: var(--border-darker);"><div class="prog-fill" id="goal-fill-${g.id}" style="background:var(--primary); width:${pct}%;"></div></div></div><div style="display:flex; justify-content: space-between; align-items: center; margin-top: 8px;"><div style="font-size:10px; color:var(--text3); font-weight:700;">${dateStr}</div><div style="font-size:11px; color:var(--primary); font-weight:700;">${info.isAuto ? 'محسوبة تلقائياً 🔒' : 'تحديث يدوي ⚙️'}</div></div>${!info.isAuto ? `<input type="range" min="0" max="100" value="${pct}" style="width:100%; margin-top:15px;" oninput="updateGoalUI(${g.id}, this.value)" onchange="saveGoalUI(${g.id}, this.value)">` : ''}</div>`; }).join('') : '<div class="empty">لم تقم بإضافة أهداف</div>'; }
    function saveBook() { const id = document.getElementById('m-book-id').value; const title = document.getElementById('m-book-title').value.trim(); if (!title) { toast('أدخل اسم الكتاب'); return; } if (id) { const b = state.books.find(x => x.id == id); if (b) { b.title = title; b.totalPages = parseInt(document.getElementById('m-book-total').value) || 1; b.readPages = Math.min(parseInt(document.getElementById('m-book-read').value) || 0, b.totalPages); } } else { state.books.push({ id: state.nextId++, title, totalPages: parseInt(document.getElementById('m-book-total').value) || 1, readPages: Math.min(parseInt(document.getElementById('m-book-read').value) || 0, parseInt(document.getElementById('m-book-total').value) || 1) }); } saveState(); populateGlobalSelectors(); renderAll(); closeModal('book'); toast('تم حفظ الكتاب 📚'); }
    function delBook(id) { if (confirm('تأكيد الحذف؟')) { state.books = state.books.filter(b => b.id != id); state.habits.forEach(h => { if (h.bookId == id) h.bookId = ""; }); saveState(); populateGlobalSelectors(); renderAll(); } }
    function quickAddPagesInline(id) { const b = state.books.find(x => x.id === id); const val = parseInt(document.getElementById(`quick-add-book-${id}`).value); if (b && !isNaN(val) && val > 0) { b.readPages = Math.min(b.readPages + val, b.totalPages); saveState(); renderAll(); toast('تمت الإضافة ✓'); } }
    function renderBooks() { document.getElementById('books-list').innerHTML = state.books.length ? state.books.map(b => { const pct = Math.round((b.readPages / b.totalPages) * 100) || 0; const isDone = pct === 100; return `<div class="card-box"><div class="card-hdr"><div style="display:flex; align-items:center; gap:10px"><div style="font-size:24px">${isDone ? '🏆' : '📖'}</div><div><div class="card-title" style="text-decoration: ${isDone ? 'line-through' : 'none'}">${b.title}</div><div style="font-size:12px; color:var(--text3); font-family:'JetBrains Mono', monospace; margin-top:4px">${b.readPages} / ${b.totalPages} صفحة</div></div></div><div class="card-pct">${pct}%</div></div><div class="prog-wrap"><div class="prog-bg"><div class="prog-fill" style="background:var(--primary);width:${pct}%"></div></div></div><div style="display:flex; justify-content:space-between; margin-top:20px; border-top: 1px solid var(--border); padding-top:16px;"><div style="display:flex; align-items:center; gap:8px;"><input type="number" id="quick-add-book-${b.id}" class="inp" placeholder="كم صفحة؟" style="width:100px; padding:8px 12px;" min="1" ${isDone ? 'disabled' : ''}><button class="btn btn-dark" style="padding:8px 16px;" onclick="quickAddPagesInline(${b.id})" ${isDone ? 'disabled' : ''}>+</button></div><div style="display:flex; gap:6px;"><button class="btn" style="background:var(--zaha); color:white; padding:0 12px; border-radius:8px; font-size:12px; box-shadow:none; height:32px;" onclick="goToReaderTab()">قراءة 📖</button><button class="del-btn" onclick="openModal('book', ${b.id})">✎</button><button class="del-btn" onclick="delBook(${b.id})">✕</button></div></div></div>`; }).join('') : '<div class="empty">مكتبتك فارغة. أضف كتابك الأول للبدء!</div>'; }

    function saveZahaSession() {
      const id = document.getElementById('m-zaha-id').value;
      const course = document.getElementById('m-zaha-course').value.trim();
      const date = document.getElementById('m-zaha-date').value;
      const hours = parseInt(document.getElementById('m-zaha-hours').value) || 0;
      const summary = document.getElementById('m-zaha-summary').value.trim();

      if (!course) { toast('أدخل اسم الدورة / الفريق'); return; }

      if (id) {
        const z = state.zahaSessions.find(x => x.id == id);
        if (z) {
          z.course = course;
          z.date = date;
          z.hours = hours;
          z.summary = summary;
        }
      } else {
        state.zahaSessions.push({
          id: state.nextId++,
          course,
          date,
          hours,
          summary
        });
      }

      saveState();
      renderAll();
      closeModal('zaha');
      toast('تم حفظ الحصة بنجاح 🏛️');
    }

    function delZahaSession(id) {
      if (confirm('هل أنت متأكد من حذف هذه الحصة؟')) {
        state.zahaSessions = state.zahaSessions.filter(z => z.id != id);
        saveState();
        renderAll();
        toast('تم حذف الحصة');
      }
    }

    function renderZaha() {
      let totalHours = 0;

      const sortedSessions = [...state.zahaSessions].sort((a, b) => new Date(b.date) - new Date(a.date));

      const listEl = document.getElementById('zaha-list');
      if (listEl) {
        listEl.innerHTML = sortedSessions.length ? sortedSessions.map(z => {
          totalHours += z.hours;
          const formattedSummary = z.summary ? z.summary.split('\n').map(line => line.trim()).filter(line => line).map(line => `<div style="font-size:13px; color:var(--text2); margin-top:4px;">${line}</div>`).join('') : '';

          return `<div class="card-box zaha-card">
                    <div class="card-hdr" style="margin-bottom: 10px;">
                        <div style="display:flex; align-items:center; gap:10px">
                            <div style="font-size:24px">🏛️</div>
                            <div>
                                <div class="card-title" style="color:var(--zaha);">${z.course}</div>
                                <div style="font-size:12px; color:var(--text3); margin-top:4px">${z.date}</div>
                            </div>
                        </div>
                        <div class="card-pct" style="background:var(--zaha-light); color:var(--zaha); font-size:14px;">${z.hours} ساعات</div>
                    </div>
                    <div style="flex:1; margin-top:10px; margin-bottom:15px; padding-top:10px; border-top:1px dashed var(--border);">
                        ${formattedSummary || '<div style="font-size:13px; color:var(--text3);">لا يوجد تفاصيل</div>'}
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:6px;">
                        <button class="del-btn" onclick="openModal('zaha', ${z.id})">✎</button>
                        <button class="del-btn" onclick="delZahaSession(${z.id})">✕</button>
                    </div>
                </div>`;
        }).join('') : '<div class="empty" style="grid-column: 1 / -1;">لم تقم بتوثيق أي حصة بعد</div>';
      }

      const hoursEl = document.getElementById('z-val-hours');
      if (hoursEl) hoursEl.textContent = totalHours;

      const sessionsEl = document.getElementById('z-val-sessions');
      if (sessionsEl) sessionsEl.textContent = state.zahaSessions.length;
    }

    let dashChart = null;
    function updateCircle(id, pct) { const el = document.getElementById(id); if (el) el.style.strokeDashoffset = 188.4 - (pct / 100 * 188.4); }
    function renderDashboard() {
      const activeToday = getActiveHabitsForDate(today); const dDone = activeToday.filter(h => (state.history[today] || []).includes(h.id)).length; const dPct = activeToday.length ? (dDone / activeToday.length * 100) : 0;
      document.getElementById('dash-daily-val').textContent = `${dDone}/${activeToday.length}`; document.getElementById('circ-txt-daily').textContent = Math.round(dPct) + '%'; updateCircle('circ-daily', dPct);
      let totalP_manual = 0, readP_manual = 0; state.books.forEach(b => { totalP_manual += b.totalPages; readP_manual += b.readPages; }); const manualPct = totalP_manual > 0 ? (readP_manual / totalP_manual * 100) : 0;
      let totalP_smart = 0, readP_smart = 0; state.readerBooks.forEach(b => { totalP_smart += b.total; readP_smart += b.progress; }); const smartPct = totalP_smart > 0 ? (readP_smart / totalP_smart * 100) : 0;
      document.getElementById('dash-books-count').textContent = state.books.length + state.readerBooks.length;
      document.getElementById('circ-txt-books-smart').textContent = Math.round(smartPct) + '%'; updateCircle('circ-books-smart', smartPct);
      document.getElementById('circ-txt-books-manual').textContent = Math.round(manualPct) + '%'; updateCircle('circ-books-manual', manualPct);
      let gAvg = state.goals.length > 0 ? state.goals.reduce((s, g) => s + (getGoalProgressInfo(g.id).isAuto ? getGoalProgressInfo(g.id).pct : (g.progress || 0)), 0) / state.goals.length : 0;
      document.getElementById('dash-goals-val').textContent = Math.round(gAvg) + '%'; document.getElementById('circ-txt-goals').textContent = Math.round(gAvg) + '%'; updateCircle('circ-goals', gAvg);
      renderChart();
    }
    function renderChart() {
      const daysFilter = parseInt(document.getElementById('chart-filter').value) || 7; const labels = []; const habitsVals = []; const isDark = document.body.classList.contains('dark-theme');
      for (let i = daysFilter - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toLocaleDateString('en-CA');
        if (daysFilter <= 7) { labels.push(d.toLocaleDateString('ar-JO', { weekday: 'long' })); } else if (daysFilter <= 30) { labels.push(`${d.getMonth() + 1}/${d.getDate()}`); } else { labels.push(d.toLocaleDateString('ar-JO', { month: 'short', year: 'numeric' })); }
        const act = getActiveHabitsForDate(dateStr); const done = act.filter(h => (state.history[dateStr] || []).includes(h.id)).length; habitsVals.push(act.length ? (done / act.length * 100) : 0);
      }
      if (dashChart) dashChart.destroy(); const ctx = document.getElementById('productivityChart').getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 300); gradient.addColorStop(0, isDark ? 'rgba(255, 118, 105, 0.8)' : 'rgba(230, 92, 79, 0.8)'); gradient.addColorStop(1, isDark ? 'rgba(255, 118, 105, 0.05)' : 'rgba(230, 92, 79, 0.05)');
      dashChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ data: habitsVals, backgroundColor: gradient, borderRadius: 8, barThickness: daysFilter <= 7 ? 16 : (daysFilter <= 30 ? 8 : 'flex') }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: isDark ? '#333' : '#f3f4f6' }, ticks: { color: isDark ? '#a0a0a0' : '#9ca3af', maxTicksLimit: 10 } }, x: { grid: { display: false }, ticks: { color: isDark ? '#a0a0a0' : '#6b7280', maxTicksLimit: 15 } } } } });
    }

    // ═══════════════════════════════════════
    //  SMART READER LOGIC (PDF/DRIVE ADDED)
    // ═══════════════════════════════════════
    function switchReaderMode(m) {
      document.getElementById('reader-import-section').style.display = m === 'import' ? 'block' : 'none';
      document.getElementById('reader-reading-area').style.display = m === 'read' ? 'block' : 'none';
      document.getElementById('reader-library-section').style.display = m === 'library' ? 'block' : 'none';
      document.getElementById('rtab-import').classList.toggle('active', m === 'import');
      document.getElementById('rtab-read').classList.toggle('active', m === 'read');
      document.getElementById('rtab-lib').classList.toggle('active', m === 'library');
      document.getElementById('rtab-read').style.display = currentOpenBookId ? 'block' : 'none';
      document.getElementById('reader-progress-container').style.display = (m === 'read') ? 'block' : 'none';
      if (m === 'library') renderReaderLibrary();
    }

    function renderReaderLibrary() {
      const grid = document.getElementById('reader-library-grid');
      if (state.readerBooks.length === 0) { grid.innerHTML = `<div class="empty" style="grid-column: 1 / -1;">مكتبتك الذكية فارغة. ارفع كتاباً جديداً!</div>`; return; }
      grid.innerHTML = state.readerBooks.map(book => {
        const pct = Math.round((book.progress / book.total) * 100) || 0;
        const icon = book.type === 'pdf' ? '🔗' : '📘';
        return `<div class="reader-book-card" onclick="openReaderBook(${book.id})"><div class="rbc-actions"><div class="rbc-btn" style="color: var(--zaha);" onclick="renameReaderBook(event, ${book.id})" title="تعديل الاسم">✏️</div><div class="rbc-btn" style="color: #ef4444;" onclick="deleteReaderBook(event, ${book.id})" title="حذف الكتاب">✕</div></div><span class="rbc-icon">${icon}</span><div class="rbc-title" title="${book.title}">${book.title}</div><div style="font-size:11px; color:var(--text3); margin-bottom:8px;">${pct}% مُنجز</div><div class="rbc-prog-bg"><div class="rbc-prog-fill" style="width:${pct}%"></div></div></div>`;
      }).join('');
    }

    function renameReaderBook(event, id) { event.stopPropagation(); const bookMeta = state.readerBooks.find(b => b.id === id); if (!bookMeta) return; const card = event.target.closest('.reader-book-card'); const titleDiv = card.querySelector('.rbc-title'); if (titleDiv.querySelector('input')) return; const currentTitle = bookMeta.title; const input = document.createElement('input'); input.type = 'text'; input.value = currentTitle; input.className = 'inp'; input.style.width = '100%'; input.style.fontSize = '13px'; input.style.padding = '4px 8px'; input.style.textAlign = 'center'; titleDiv.innerHTML = ''; titleDiv.appendChild(input); input.focus(); input.addEventListener('click', (e) => e.stopPropagation()); function finishRename() { const newName = input.value.trim(); if (newName !== "" && newName !== currentTitle) { bookMeta.title = newName; saveState(); renderReaderLibrary(); toast('تم التعديل ✓'); } else { titleDiv.textContent = currentTitle; } } input.addEventListener('blur', finishRename); input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); else if (e.key === 'Escape') { input.value = currentTitle; input.blur(); } }); }
    function deleteReaderBook(event, id) { event.stopPropagation(); if (!confirm('حذف هذا الكتاب نهائياً؟')) return; state.readerBooks = state.readerBooks.filter(b => b.id !== id); db.ref(`users/${currentUserUID}/book_contents/${id}`).remove(); saveState(); if (currentOpenBookId === id) { currentOpenBookId = null; switchReaderMode('library'); } renderAll(); }

    function getPreviewUrl(url, pageNumber) {
      if (url.includes('drive.google.com/file/d/')) {
        return url.replace(/\/view.*/, '/preview');
      }
      if (!url.includes('#page=')) {
        return url + '#page=' + (pageNumber || 1);
      }
      return url.replace(/#page=\d+/, '#page=' + (pageNumber || 1));
    }

    async function openReaderBook(id) {
      currentOpenBookId = id;
      document.getElementById('global-loading').style.display = 'flex';
      const bookMeta = state.readerBooks.find(b => b.id === id);
      if (!bookMeta) { document.getElementById('global-loading').style.display = 'none'; return; }

      document.getElementById('current-reading-title').textContent = bookMeta.title;
      document.getElementById('reader-search').value = '';

      if (bookMeta.type === 'pdf') {
        document.getElementById('global-loading').style.display = 'none';
        document.getElementById('reader-text-view').style.display = 'none';
        document.getElementById('pdf-viewer-container').style.display = 'block';
        document.getElementById('reader-text-tools').style.display = 'none'; // hide zoom/search

        document.getElementById('pdf-iframe').removeAttribute('srcdoc');
        document.getElementById('pdf-iframe').src = getPreviewUrl(bookMeta.url, bookMeta.progress || 1);
        document.getElementById('pdf-total-pages').textContent = bookMeta.total;
        document.getElementById('pdf-current-page').value = bookMeta.progress;

        document.getElementById('btn-open-pdf').style.display = 'flex';
        // Set up explicit "Open in New Window" button
        document.getElementById('btn-open-pdf').onclick = function () {
          window.open(bookMeta.url, '_blank');
        };

        switchReaderMode('read');
      } else if (bookMeta.type === 'html') {
        try {
          const snap = await db.ref(`users/${currentUserUID}/book_contents/${id}`).once('value');
          const data = snap.val();

          document.getElementById('global-loading').style.display = 'none';
          document.getElementById('reader-text-view').style.display = 'none';
          document.getElementById('pdf-viewer-container').style.display = 'block';
          document.getElementById('reader-text-tools').style.display = 'none';

          document.getElementById('pdf-iframe').removeAttribute('src');
          document.getElementById('pdf-iframe').srcdoc = data ? data.rawHtml : "<h1>محتوى غير متوفر</h1>";

          document.getElementById('pdf-total-pages').textContent = bookMeta.total || 1;
          document.getElementById('pdf-current-page').value = bookMeta.progress || 0;

          document.getElementById('btn-open-pdf').style.display = 'none'; // hide for srcdoc

          switchReaderMode('read');
        } catch (e) {
          document.getElementById('global-loading').style.display = 'none'; alert("خطأ في التحميل.");
        }
      } else {
        document.getElementById('pdf-viewer-container').style.display = 'none';
        document.getElementById('reader-text-view').style.display = 'block';
        document.getElementById('reader-text-tools').style.display = 'flex';
        try {
          const snap = await db.ref(`users/${currentUserUID}/book_contents/${id}`).once('value');
          readerData = snap.val() || [];
          document.getElementById('global-loading').style.display = 'none';
          switchReaderMode('read');
          renderBookContent();
        } catch (e) {
          document.getElementById('global-loading').style.display = 'none'; alert("خطأ في التحميل.");
        }
      }
    }

    function updatePdfProgress() {
      if (!currentOpenBookId) return;
      const bookMeta = state.readerBooks.find(b => b.id === currentOpenBookId);
      if (!bookMeta || bookMeta.type !== 'pdf') return;

      let currentPage = parseInt(document.getElementById('pdf-current-page').value) || 0;
      if (currentPage > bookMeta.total) currentPage = bookMeta.total;
      if (currentPage < 0) currentPage = 0;

      document.getElementById('pdf-current-page').value = currentPage;
      bookMeta.progress = currentPage;
      saveState(); // sync
      renderDashboard(); // Update circles
      toast('تم حفظ تقدمك بنجاح ✓');
    }

    function handleFileSelect(input) { const file = input.files[0]; if (file) { document.getElementById('readerFileName').textContent = file.name; document.getElementById('saveReaderBtn').disabled = false; if (!document.getElementById('new-book-title').value) { document.getElementById('new-book-title').value = file.name.replace(/\.[^/.]+$/, ""); } const reader = new FileReader(); reader.onload = (e) => { window.rawFileContent = e.target.result; }; reader.onerror = () => { alert("خطأ أثناء قراءة الملف"); }; reader.readAsText(file); } }

    async function processAndSaveFile() {
      const titleInput = document.getElementById('new-book-title').value.trim();
      if (!window.rawFileContent || !titleInput) { alert("اختر الملف واكتب الاسم."); return; }
      if (!currentUserUID) return;
      document.getElementById('global-loading').style.display = 'flex';
      const fileName = document.getElementById('readerFileName').textContent.toLowerCase();

      const newBookId = Date.now();

      try {
        if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
          const newBookMeta = { id: newBookId, title: titleInput, type: 'html', progress: 0, total: 1 };
          await db.ref(`users/${currentUserUID}/book_contents/${newBookId}`).set({ rawHtml: window.rawFileContent });
          state.readerBooks.push(newBookMeta);
        } else {
          let textToParse = window.rawFileContent;
          if (textToParse.trim().toLowerCase().startsWith('<')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(textToParse, 'text/html');
            textToParse = doc.body.innerText;
          }
          const allParas = textToParse.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
          const arrangedData = [];
          for (let i = 0; i < allParas.length; i += 2) {
            arrangedData.push({ en: allParas[i] || "", ar: allParas[i + 1] || "...", read: false });
          }
          const newBookMeta = { id: newBookId, title: titleInput, type: 'text', progress: 0, total: arrangedData.length };
          await db.ref(`users/${currentUserUID}/book_contents/${newBookId}`).set(arrangedData);
          state.readerBooks.push(newBookMeta);
        }

        await saveState();
        document.getElementById('global-loading').style.display = 'none';
        alert("تم الحفظ ✓");
        document.getElementById('new-book-title').value = '';
        document.getElementById('readerFileName').textContent = 'اضغط هنا للاختيار';
        document.getElementById('saveReaderBtn').disabled = true;
        window.rawFileContent = '';
        openReaderBook(newBookId);
      } catch (e) {
        document.getElementById('global-loading').style.display = 'none'; alert("خطأ سحابي: " + e.message);
      }
    }

    async function savePdfBook() {
      const title = document.getElementById('pdf-book-title').value.trim();
      const url = document.getElementById('pdf-book-url').value.trim();
      const pages = parseInt(document.getElementById('pdf-book-pages').value) || 1;

      if (!title || !url) { alert("يرجى إدخال الاسم والرابط."); return; }

      const newBookId = Date.now();
      const newBookMeta = { id: newBookId, title: title, type: 'pdf', url: url, progress: 0, total: pages };

      document.getElementById('global-loading').style.display = 'flex';
      try {
        state.readerBooks.push(newBookMeta);
        await saveState();

        document.getElementById('pdf-book-title').value = '';
        document.getElementById('pdf-book-url').value = '';
        document.getElementById('pdf-book-pages').value = '';

        document.getElementById('global-loading').style.display = 'none';
        alert("تم الحفظ ✓");
        openReaderBook(newBookId);
      } catch (e) {
        document.getElementById('global-loading').style.display = 'none';
        alert("خطأ: " + e.message);
      }
    }

    function toggleReaderPara(index) { if (!currentUserUID || !readerData[index] || !currentOpenBookId) return; const newStatus = !readerData[index].read; readerData[index].read = newStatus; const block = document.getElementById(`r-block-${index}`); const btn = block.querySelector('.check-btn'); if (newStatus) { block.classList.add('read-done'); btn.classList.add('active'); } else { block.classList.remove('read-done'); btn.classList.remove('active'); } updateReaderStatsUI(); db.ref(`users/${currentUserUID}/book_contents/${currentOpenBookId}/${index}/read`).set(newStatus); const bookMeta = state.readerBooks.find(b => b.id === currentOpenBookId); if (bookMeta) { bookMeta.progress = readerData.filter(p => p.read).length; saveState(); } }
    function updateReaderStatsUI() { if (readerData.length === 0) return; const total = readerData.length; const readCount = readerData.filter(p => p.read).length; const pct = Math.round((readCount / total) * 100); const statEl = document.getElementById('reader-stats-summary'); if (statEl) { statEl.innerHTML = `<div class="rs-text">إنجاز الكتاب: ${readCount} من ${total} فقرة</div><div class="rs-pct">${pct}%</div>`; } }
    function jumpToLastRead() { if (readerData.length === 0) return; const firstUnreadIndex = readerData.findIndex(p => !p.read); if (firstUnreadIndex !== -1) { const el = document.getElementById(`r-block-${firstUnreadIndex}`); const mainContainer = document.getElementById('main'); if (el && mainContainer) { const targetY = el.offsetTop - 150; mainContainer.scrollTo({ top: targetY, behavior: 'smooth' }); } } else { toast('لقد أنهيت الكتاب بالكامل! 🏆'); } }
    function changeFontSize(delta) { currentFontSize += delta; if (currentFontSize < 12) currentFontSize = 12; if (currentFontSize > 30) currentFontSize = 30; document.querySelectorAll('.text-en, .text-ar').forEach(el => { el.style.fontSize = currentFontSize + 'px'; }); }
    function searchReaderBook(query) { const blocks = document.querySelectorAll('.paragraph-block-reader'); const q = query.toLowerCase(); blocks.forEach(block => { if (block.innerText.toLowerCase().includes(q)) { block.style.display = 'block'; } else { block.style.display = 'none'; } }); }

    function renderBookContent() {
      const area = document.getElementById('reader-content-blocks');
      if (!area) return;
      if (readerData.length === 0) { area.innerHTML = `<div style="text-align:center; padding:40px; color:#888;">الكتاب فارغ.</div>`; updateReaderStatsUI(); return; }
      area.innerHTML = readerData.map((block, index) => { const tsMatch = block.en.match(/\[(\d{2}:\d{2}:\d{2})\]/); const ts = tsMatch ? tsMatch[1] : null; const cleanEn = block.en.replace(/\[\d{2}:\d{2}:\d{2}\]/, ''); const isRead = block.read === true; return `<div class="paragraph-block-reader ${isRead ? 'read-done' : ''}" id="r-block-${index}"><div class="check-btn ${isRead ? 'active' : ''}" style="position:absolute; top:20px; right:20px; z-index:10;" onclick="toggleReaderPara(${index})">✓</div>${ts ? `<div class="timestamp-badge">${ts}</div>` : ''}<div class="text-en" style="padding-inline-start: 40px; font-size:${currentFontSize}px;">${cleanEn.replace(/\n/g, '<br>')}</div><div class="text-ar" style="padding-inline-start: 40px; font-size:${currentFontSize}px;">${block.ar.replace(/\n/g, '<br>')}</div></div>`; }).join(''); updateReaderStatsUI();
    }

    document.getElementById('main').addEventListener('scroll', function () {
      var mainEl = document.getElementById('main');
      var winScroll = mainEl.scrollTop;
      var height = mainEl.scrollHeight - mainEl.clientHeight;
      var scrolled = height > 0 ? (winScroll / height) * 100 : 0;

      // Progress bar for text books
      if (document.getElementById('page-reader').classList.contains('active') && currentOpenBookId) {
        const bookMeta = state.readerBooks.find(b => b.id === currentOpenBookId);
        if (bookMeta && bookMeta.type === 'text') {
          const progBar = document.getElementById("readingProgress");
          if (progBar && !isNaN(scrolled)) progBar.style.width = scrolled + "%";
        }
      }

      const topBtn = document.getElementById('scrollTopBtn');
      if (winScroll > 400) topBtn.style.display = 'flex';
      else topBtn.style.display = 'none';
    });

    function scrollToTop() { document.getElementById('main').scrollTo({ top: 0, behavior: 'smooth' }); }

    // --- Breathing Exercises Logic ---
    let breatheInterval;
    let breatheState = 0; // 0: stopped, 1: inhale, 2: hold, 3: exhale, 4: hold (for box)
    let breatheTimeLeft = 0;
    let currentBreathePhase = '';
    let breatheCycles = 0;
    let breatheConfig = { inhale: 4, hold1: 7, exhale: 8, hold2: 0 };
    let currentBreatheType = '478';

    function openBreatheModal() {
      document.getElementById('modal-breathe').classList.add('show');
      resetBreathe();
    }
    
    function closeBreatheModal() {
      document.getElementById('modal-breathe').classList.remove('show');
      stopBreathe();
    }
    
    function resetBreathe() {
      stopBreathe();
      breatheCycles = 0;
      document.getElementById('breathe-cycles').textContent = '0';
      const clockEl = document.getElementById('breathe-session-clock');
      if(clockEl) clockEl.textContent = '00:00';
      document.getElementById('breathe-text').textContent = 'مستعد؟';
      document.getElementById('breathe-timer').textContent = '--';
      const type = document.getElementById('breathe-type').value;
      currentBreatheType = type;
      if (type === '478') {
        breatheConfig = { inhale: 4, hold1: 7, exhale: 8, hold2: 0 };
        document.getElementById('breathe-desc').textContent = 'شهيق لـ 4 ثوانٍ، احبس لـ 7 ثوانٍ، زفير لـ 8 ثوانٍ.';
      } else if (type === 'box') {
        breatheConfig = { inhale: 4, hold1: 4, exhale: 4, hold2: 4 };
        document.getElementById('breathe-desc').textContent = 'شهيق لـ 4، احبس لـ 4، زفير لـ 4، احبس لـ 4.';
      } else if (type === 'wimhof') {
        breatheConfig = { inhale: 2, hold1: 0, exhale: 2, hold2: 15 };
        document.getElementById('breathe-desc').textContent = 'تنفس سريع (شهيق/زفير)، ثم حبس النفس بالنهاية.';
      }
      const circle = document.getElementById('breathe-circle');
      circle.className = 'breathe-flower';
      document.getElementById('breathe-wrap').style.setProperty('--dur', '0.5s');
      document.getElementById('btn-start-breathe').textContent = 'ابدأ ▶';
      document.getElementById('btn-start-breathe').onclick = startBreathe;
    }

    let breatheSessionStart = 0;
    let breatheSessionTimerInterval = null;

    function stopBreathe() {
      if (breatheInterval) clearInterval(breatheInterval);
      if (breatheSessionTimerInterval) clearInterval(breatheSessionTimerInterval);
      
      if (breatheState !== 0 && breatheSessionStart > 0) {
        let elapsed = Math.floor((Date.now() - breatheSessionStart) / 1000);
        if (elapsed > 0) {
          if (!state.journal[today]) state.journal[today] = {};
          state.journal[today].breatheTime = (state.journal[today].breatheTime || 0) + elapsed;
          saveState();
          renderHabits();
        }
      }
      
      breatheState = 0;
      breatheSessionStart = 0;
    }

    function startBreathe() {
      if (breatheState !== 0) {
        resetBreathe();
        return;
      }
            breatheSessionStart = Date.now();
      document.getElementById('btn-start-breathe').textContent = 'إيقاف ⏹';
      document.getElementById('btn-start-breathe').onclick = resetBreathe;
      
      document.getElementById('breathe-session-clock').textContent = '00:00';
      if(breatheSessionTimerInterval) clearInterval(breatheSessionTimerInterval);
      breatheSessionTimerInterval = setInterval(() => {
        let elapsed = Math.floor((Date.now() - breatheSessionStart) / 1000);
        let m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        let s = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('breathe-session-clock').textContent = `${m}:${s}`;
      }, 1000);

      runBreatheCycle();
    }

    function runBreatheCycle() {
      if (breatheState === 0) breatheState = 1; // start inhale
      
      const circle = document.getElementById('breathe-circle');
      const textEl = document.getElementById('breathe-text');
      const timerEl = document.getElementById('breathe-timer');
      
      let duration = 0;
      
      const wrap = document.getElementById('breathe-wrap');
      
      if (breatheState === 1) { // Inhale
        if(typeof playSound === 'function') playSound('ring');
        duration = breatheConfig.inhale;
        currentBreathePhase = 'شهيق...';
        wrap.style.setProperty('--dur', `${duration}s`);
        circle.className = 'breathe-flower inhale';
      } else if (breatheState === 2) { // Hold 1
        duration = breatheConfig.hold1;
        if (duration === 0) {
          breatheState = 3;
          return runBreatheCycle();
        }
        currentBreathePhase = 'احبس...';
        wrap.style.setProperty('--dur', `0.5s`);
        circle.className = 'breathe-flower hold';
      } else if (breatheState === 3) { // Exhale
        duration = breatheConfig.exhale;
        currentBreathePhase = 'زفير...';
        wrap.style.setProperty('--dur', `${duration}s`);
        circle.className = 'breathe-flower exhale';
      } else if (breatheState === 4) { // Hold 2
        duration = breatheConfig.hold2;
        if (duration === 0) {
          breatheState = 1;
          breatheCycles++;
          document.getElementById('breathe-cycles').textContent = breatheCycles;
          checkBreatheGoal();
          return runBreatheCycle();
        }
        currentBreathePhase = 'احبس...';
        wrap.style.setProperty('--dur', `0.5s`);
        circle.className = 'breathe-flower hold';
      }
      
      breatheTimeLeft = duration;
      textEl.textContent = currentBreathePhase;
      timerEl.textContent = breatheTimeLeft;
      
      if (breatheInterval) clearInterval(breatheInterval);
      breatheInterval = setInterval(() => {
        breatheTimeLeft--;
        if (breatheTimeLeft > 0) {
          timerEl.textContent = breatheTimeLeft;
        } else {
          clearInterval(breatheInterval);
          breatheState++;
          if (breatheState > 4) {
            breatheState = 1;
            breatheCycles++;
            document.getElementById('breathe-cycles').textContent = breatheCycles;
            checkBreatheGoal();
          }
          runBreatheCycle();
        }
      }, 1000);
    }
    
    function checkBreatheGoal() {
      // Mark as done for today if 4 cycles completed
      if (breatheCycles === 4) {
        if (!state.journal[today]) state.journal[today] = {};
        state.journal[today].breatheDone = true;
        saveState();
        renderBreatheStatus();
        if(typeof playSound === 'function') playSound('achieve');
        toast('رائع! لقد أتممت تمرين التنفس اليومي 🎉');
      }
    }
    
    function renderBreatheStatus() {
      const statusEl = document.getElementById('breathe-status');
      if (statusEl) {
        if (state.journal[today] && state.journal[today].breatheDone) {
          statusEl.style.display = 'block';
        } else {
          statusEl.style.display = 'none';
        }
      }
    }

    // --- FOCUS GYM LOGIC ---
    let focusTimer = null;
    let isFocusGameActive = false;
    let stroopScore = 0;
    let stroopTimeLeft = 60;
    let currentStroopColor = '';

    const focusColors = [
      { name: 'أحمر', hex: '#ef4444' },
      { name: 'أزرق', hex: '#3b82f6' },
      { name: 'أخضر', hex: '#22c55e' },
      { name: 'أصفر', hex: '#eab308' }
    ];

    function formatGameTime(seconds) {
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }

    function startStroopGame() {
      document.getElementById('focus-menu').style.display = 'none';
      document.getElementById('focus-visual-area').style.display = 'none';
      document.getElementById('focus-stroop-area').style.display = 'block';
      
      stroopScore = 0;
      stroopTimeLeft = 60;
      document.getElementById('stroop-score').textContent = stroopScore;
      document.getElementById('stroop-time').textContent = stroopTimeLeft;
      document.getElementById('stroop-bottom-timer').textContent = formatGameTime(stroopTimeLeft);
      
      nextStroopWord();
      
      if (focusTimer) clearInterval(focusTimer); isFocusGameActive = false;
    }

    function nextStroopWord() {
      const wordObj = focusColors[Math.floor(Math.random() * focusColors.length)];
      const colorObj = focusColors[Math.floor(Math.random() * focusColors.length)];
      
      const wordEl = document.getElementById('stroop-word');
      wordEl.textContent = wordObj.name;
      wordEl.style.color = colorObj.hex;
      currentStroopColor = colorObj.name;
    }

    function checkStroop(selectedColorName) {
      if (!isFocusGameActive) {
        isFocusGameActive = true;
        focusTimer = setInterval(() => {
          stroopTimeLeft--;
          document.getElementById('stroop-time').textContent = stroopTimeLeft;
          document.getElementById('stroop-bottom-timer').textContent = formatGameTime(stroopTimeLeft);
          if (stroopTimeLeft <= 0) {
            clearInterval(focusTimer);
            isFocusGameActive = false;
            alert(`انتهى الوقت! نقاطك: ${stroopScore}`);
            startStroopGame();
          }
        }, 1000);
      }
      if (stroopTimeLeft <= 0) return;
      if (selectedColorName === currentStroopColor) {
        stroopScore += 10;
        if(typeof playSound === 'function') playSound('soft');
      } else {
        stroopScore = Math.max(0, stroopScore - 5);
        if(typeof playSound === 'function') playSound('error');
        document.getElementById('stroop-word').style.transform = 'translateX(10px)';
        setTimeout(() => document.getElementById('stroop-word').style.transform = 'translateX(0)', 100);
      }
      document.getElementById('stroop-score').textContent = stroopScore;
      nextStroopWord();
    }

    // Visual Search Logic
    let visualLevel = 1;
    let visualTimeLeft = 15;
    
    const visualPairs = [
      { base: 'ب', target: 'ت' },
      { base: 'ح', target: 'خ' },
      { base: 'ص', target: 'ض' },
      { base: 'O', target: 'Q' },
      { base: '6', target: '9' },
      { base: '🙂', target: '🙃' }
    ];

    function startVisualSearchGame() {
      document.getElementById('focus-menu').style.display = 'none';
      document.getElementById('focus-stroop-area').style.display = 'none';
      document.getElementById('focus-visual-area').style.display = 'block';
      
      visualLevel = 1;
      visualTimeLeft = 15;
      isFocusGameActive = false;
      document.getElementById('visual-level').textContent = visualLevel;
      document.getElementById('visual-time').textContent = visualTimeLeft;
      document.getElementById('visual-bottom-timer').textContent = formatGameTime(visualTimeLeft);
      
      nextVisualLevel();
    }

    function nextVisualLevel() {
      if (focusTimer) clearInterval(focusTimer);
      
      const gridEl = document.getElementById('visual-grid');
      gridEl.innerHTML = '';
      
      // Determine grid size based on level
      let size = 25; // 5x5
      if (visualLevel > 3) size = 36; // 6x6
      if (visualLevel > 7) size = 49; // 7x7
      
      gridEl.style.gridTemplateColumns = `repeat(${Math.sqrt(size)}, 1fr)`;
      
      const pair = visualPairs[Math.floor(Math.random() * visualPairs.length)];
      const targetIndex = Math.floor(Math.random() * size);
      
      for (let i = 0; i < size; i++) {
        const div = document.createElement('div');
        div.style.background = 'var(--surface)';
        div.style.borderRadius = '8px';
        div.style.padding = '15px 0';
        div.style.cursor = 'pointer';
        div.style.border = '1px solid var(--border-darker)';
        
        if (i === targetIndex) {
          div.textContent = pair.target;
          div.onclick = () => {
          if (!isFocusGameActive) {
            isFocusGameActive = true;
            focusTimer = setInterval(() => {
              visualTimeLeft--;
              document.getElementById('visual-time').textContent = visualTimeLeft;
              document.getElementById('visual-bottom-timer').textContent = formatGameTime(visualTimeLeft);
              if (visualTimeLeft <= 0) {
                clearInterval(focusTimer);
                isFocusGameActive = false;
                alert(`انتهى الوقت! وصلت للمستوى: ${visualLevel}`);
                startVisualSearchGame();
              }
            }, 1000);
          }
            div.style.background = '#22c55e'; // Green
            div.style.color = 'white';
            if(typeof playSound === 'function') playSound('soft');
            setTimeout(() => {
              visualLevel++;
              visualTimeLeft = Math.max(5, 15 - Math.floor(visualLevel / 2));
              document.getElementById('visual-level').textContent = visualLevel;
              document.getElementById('visual-time').textContent = visualTimeLeft;
      document.getElementById('visual-bottom-timer').textContent = formatGameTime(visualTimeLeft);
              nextVisualLevel();
            }, 200);
          };
        } else {
          div.textContent = pair.base;
          div.onclick = () => {
          if (!isFocusGameActive) {
            isFocusGameActive = true;
            focusTimer = setInterval(() => {
              visualTimeLeft--;
              document.getElementById('visual-time').textContent = visualTimeLeft;
              document.getElementById('visual-bottom-timer').textContent = formatGameTime(visualTimeLeft);
              if (visualTimeLeft <= 0) {
                clearInterval(focusTimer);
                isFocusGameActive = false;
                alert(`انتهى الوقت! وصلت للمستوى: ${visualLevel}`);
                startVisualSearchGame();
              }
            }, 1000);
          }
            if(typeof playSound === 'function') playSound('error');
            div.style.background = '#ef4444'; // Red
            div.style.color = 'white';
            setTimeout(() => {
              div.style.background = 'var(--surface)';
              div.style.color = 'var(--text)';
            }, 300);
            visualTimeLeft = Math.max(0, visualTimeLeft - 2); // penalty
            document.getElementById('visual-time').textContent = visualTimeLeft;
      document.getElementById('visual-bottom-timer').textContent = formatGameTime(visualTimeLeft);
          };
        }
        gridEl.appendChild(div);
      }
      
      
    }

    // Slide Logic
    let slideMoves = 0;
    let slideTime = 0;
    let slideState = [];
    let slideTarget = [];
    let slideInterval = null;
    const slideColors = ['#ef4444', '#ef4444', '#3b82f6', '#3b82f6', '#22c55e', '#22c55e', '#eab308', '#eab308', null];

    function startSlideGame() {
      document.getElementById('focus-menu').style.display = 'none';
      document.getElementById('focus-stroop-area').style.display = 'none';
      document.getElementById('focus-visual-area').style.display = 'none';
      document.getElementById('focus-wordsearch-area').style.display = 'none';
      document.getElementById('focus-slide-area').style.display = 'block';

      slideMoves = 0;
      slideTime = 0;
      document.getElementById('slide-moves').textContent = slideMoves;
      document.getElementById('slide-time').textContent = "00:00";

      // Generate target
      slideTarget = [...slideColors].sort(() => Math.random() - 0.5);
      
      // Render target
      const targetEl = document.getElementById('slide-target');
      targetEl.innerHTML = '';
      slideTarget.forEach(c => {
        const div = document.createElement('div');
        div.style.width = '30px'; div.style.height = '30px'; div.style.borderRadius = '4px';
        if(c) div.style.background = c;
        else div.style.background = 'transparent';
        targetEl.appendChild(div);
      });

      // Generate solvable state by reverse moves from target
      slideState = [...slideTarget];
      let emptyIdx = slideState.indexOf(null);
      for(let i=0; i<100; i++) {
        const row = Math.floor(emptyIdx / 3);
        const col = emptyIdx % 3;
        const neighbors = [];
        if(row > 0) neighbors.push(emptyIdx - 3);
        if(row < 2) neighbors.push(emptyIdx + 3);
        if(col > 0) neighbors.push(emptyIdx - 1);
        if(col < 2) neighbors.push(emptyIdx + 1);
        const swapIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
        slideState[emptyIdx] = slideState[swapIdx];
        slideState[swapIdx] = null;
        emptyIdx = swapIdx;
      }

      renderSlideGrid();

      if(slideInterval) clearInterval(slideInterval); isFocusGameActive = false;
    }

    function renderSlideGrid() {
      const gridEl = document.getElementById('slide-grid');
      gridEl.innerHTML = '';
      slideState.forEach((c, idx) => {
        const div = document.createElement('div');
        div.style.width = '100%'; div.style.height = '100%';
        div.style.borderRadius = '50%'; div.style.cursor = 'pointer';
        div.style.transition = 'all 0.2s';
        if(c) {
          div.style.background = c;
          div.style.boxShadow = 'inset 0 -4px 0 rgba(0,0,0,0.2), 0 4px 6px rgba(0,0,0,0.1)';
        } else {
          div.style.background = 'transparent';
          div.style.cursor = 'default';
        }
        div.onclick = () => moveSlideTile(idx);
        gridEl.appendChild(div);
      });
    }

    function moveSlideTile(idx) {
      if (!isFocusGameActive) {
        isFocusGameActive = true;
        slideInterval = setInterval(() => {
          slideTime++;
          document.getElementById('slide-time').textContent = formatGameTime(slideTime);
          document.getElementById('slide-bottom-timer').textContent = formatGameTime(slideTime);
        }, 1000);
      }
      if(!slideState[idx]) return;
      const emptyIdx = slideState.indexOf(null);
      const r1 = Math.floor(idx / 3), c1 = idx % 3;
      const r2 = Math.floor(emptyIdx / 3), c2 = emptyIdx % 3;
      if(Math.abs(r1-r2) + Math.abs(c1-c2) === 1) { // adjacent
        slideState[emptyIdx] = slideState[idx];
        slideState[idx] = null;
        slideMoves++;
        document.getElementById('slide-moves').textContent = slideMoves;
        if(typeof playSound === 'function') playSound('soft');
        renderSlideGrid();
        checkSlideWin();
      } else {
        if(typeof playSound === 'function') playSound('error');
      }
    }

    function checkSlideWin() {
      if(JSON.stringify(slideState) === JSON.stringify(slideTarget)) {
        clearInterval(slideInterval);
        if(typeof playSound === 'function') playSound('achieve');
        setTimeout(() => {
          alert(`تهانينا! حليت اللغز بـ ${slideMoves} حركات خلال ${document.getElementById('slide-time').textContent}`);
          startSlideGame();
        }, 300);
      }
    }

    // Word Search Logic
    const ALL_WS_WORDS = [
      'حديقة','ممرضة','فلاح','زهرة','ورد','ناقة','دراجة','بيضة','تفاح','برتقال',
      'طبيب','مدرسة','جامعة','كتاب','قلم','دفتر','شمس','قمر','نجوم','كوكب',
      'سماء','أرض','بحر','نهر','جبل','شجرة','سيارة','طائرة','قطار','سفينة',
      'باب','نافذة','جدار','سقف','طاولة','كرسي','مصباح','هاتف','حاسوب','ساعة',
      'صلاة','قرآن','دعاء','مسجد','صيام','زكاة','حج','عمرة','صدقة','إيمان',
      'صبر','شكر','توكل','يقين','نجاح','أمل','طموح','إرادة','عزيمة','إصرار',
      'أسد','نمر','فهد','ذئب','ثعلب','غزال','زرافة','فيل','قرد','أرنب',
      'حمامة','عصفور','نسر','صقر','بومة','غراب','بطة','دجاجة','ديك','طاووس',
      'ذهب','فضة','نحاس','حديد','خشب','زجاج','ورق','قماش','حرير','قطن',
      'أبيض','أسود','أحمر','أزرق','أخضر','أصفر','برتقالي','بنفسجي','وردي','بني'
    ];
    const WS_PASSWORDS = ['انت بطل', 'استمر', 'عمل رائع', 'لا تستسلم', 'ممتاز', 'احسنت', 'تفكير سليم', 'تركيز عالي'];

    let wsWords = [];
    let wsPassword = "";
    let rawPassword = "";
    let wsPasswordCells = [];
    let wsGrid = [];
    let wsSize = 10;
    let wsFound = [];
    let wsTime = 0;
    const wsColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    let wsColorIndex = 0;
    let wsInterval = null;
    let isDragging = false;
    let startCell = null;
    let selectedCells = [];
    
    function startWordSearchGame() {
      document.getElementById('focus-menu').style.display = 'none';
      document.getElementById('focus-stroop-area').style.display = 'none';
      document.getElementById('focus-visual-area').style.display = 'none';
      document.getElementById('focus-slide-area').style.display = 'none';
      document.getElementById('focus-wordsearch-area').style.display = 'block';

      wsTime = 0;
      wsFound = [];
      document.getElementById('ws-remaining').textContent = 10; // We always pick 10 words
      document.getElementById('ws-time').textContent = "00:00";
      
      generateWordSearchGrid();
      renderWordSearch();

      if(wsInterval) clearInterval(wsInterval); isFocusGameActive = false;
    }

    function generateWordSearchGrid() {
      wsGrid = Array(wsSize).fill(null).map(() => Array(wsSize).fill(''));
      const letters = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
      
      const shuffledWords = [...ALL_WS_WORDS].sort(() => 0.5 - Math.random());
      wsWords = shuffledWords.slice(0, 10);
      
      rawPassword = WS_PASSWORDS[Math.floor(Math.random() * WS_PASSWORDS.length)];
      wsPassword = rawPassword.replace(/\s/g, ''); // Remove spaces
      wsPasswordCells = [];

      const DIRS = [
        [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];
      
      wsWords.forEach(word => {
        let placed = false;
        let attempts = 0;
        while(!placed && attempts < 200) {
          attempts++;
          const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
          const row = Math.floor(Math.random() * wsSize);
          const col = Math.floor(Math.random() * wsSize);
          let canPlace = true;
          
          for(let i=0; i<word.length; i++) {
            const r = row + (dir[0] * i);
            const c = col + (dir[1] * i);
            if(r < 0 || r >= wsSize || c < 0 || c >= wsSize || (wsGrid[r][c] !== '' && wsGrid[r][c] !== word[i])) {
              canPlace = false; break;
            }
          }
          
          if(canPlace) {
            for(let i=0; i<word.length; i++) {
              const r = row + (dir[0] * i);
              const c = col + (dir[1] * i);
              wsGrid[r][c] = word[i];
            }
            placed = true;
          }
        }
      });
      
      let emptyCells = [];
      for(let r=0; r<wsSize; r++) {
        for(let c=wsSize-1; c>=0; c--) {
          if(wsGrid[r][c] === '') emptyCells.push({r, c});
        }
      }
      
      if(emptyCells.length >= wsPassword.length) {
        const step = Math.floor(emptyCells.length / wsPassword.length);
        for(let i=0; i<wsPassword.length; i++) {
          const cell = emptyCells[i * step];
          wsGrid[cell.r][cell.c] = wsPassword[i];
          wsPasswordCells.push(cell);
        }
      }
      
      for(let r=0; r<wsSize; r++) {
        for(let c=0; c<wsSize; c++) {
          if(wsGrid[r][c] === '') wsGrid[r][c] = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }

    function renderWordSearch() {
      const gridEl = document.getElementById('ws-grid');
      gridEl.style.gridTemplateColumns = `repeat(${wsSize}, 30px)`;
      gridEl.style.gridTemplateRows = `repeat(${wsSize}, 30px)`;
      gridEl.innerHTML = '';
      
      for(let r=0; r<wsSize; r++) {
        for(let c=0; c<wsSize; c++) {
          const cell = document.createElement('div');
          cell.dataset.r = r; cell.dataset.c = c;
          cell.textContent = wsGrid[r][c];
          cell.style.display = 'flex'; cell.style.alignItems = 'center'; cell.style.justifyContent = 'center';
          cell.style.fontSize = '18px'; cell.style.fontWeight = 'bold'; cell.style.cursor = 'pointer';
          cell.style.borderRadius = '4px'; cell.style.background = 'var(--surface)';
          cell.style.transition = 'all 0.3s ease';
          cell.className = 'ws-cell';
          gridEl.appendChild(cell);
        }
      }

      gridEl.onmousedown = (e) => startWSDrag(e.target);
      gridEl.ontouchstart = (e) => {
        if(e.touches.length > 0) startWSDrag(document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY));
      };
      
      document.onmousemove = (e) => updateWSDrag(e.target);
      document.ontouchmove = (e) => {
        if(isDragging && e.cancelable) e.preventDefault();
        if(e.touches.length > 0) updateWSDrag(document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY));
      };
      
      document.onmouseup = endWSDrag;
      document.ontouchend = endWSDrag;

      const wordsEl = document.getElementById('ws-words');
      wordsEl.innerHTML = '';
      wsWords.forEach(w => {
        const div = document.createElement('div');
        div.textContent = w;
        div.id = `ws-word-${w}`;
        div.style.padding = '4px 8px'; div.style.background = 'var(--surface)'; div.style.borderRadius = '4px';
        if(wsFound.includes(w)) {
          div.style.textDecoration = 'line-through'; div.style.color = 'var(--text3)';
        }
        wordsEl.appendChild(div);
      });
    }

    function startWSDrag(el) {
      if(!el || !el.classList || !el.classList.contains('ws-cell')) return;
      isDragging = true;
      startCell = el;
      selectedCells = [el];
      highlightCells();
    }

    function updateWSDrag(el) {
      if(!isDragging || !el || !el.classList || !el.classList.contains('ws-cell') || !startCell) return;
      
      const r1 = parseInt(startCell.dataset.r), c1 = parseInt(startCell.dataset.c);
      const r2 = parseInt(el.dataset.r), c2 = parseInt(el.dataset.c);
      
      const dr = Math.sign(r2 - r1);
      const dc = Math.sign(c2 - c1);
      const dist = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
      
      if(dr === 0 || dc === 0 || Math.abs(r2-r1) === Math.abs(c2-c1)) {
        selectedCells = [];
        for(let i=0; i<=dist; i++) {
          const rr = r1 + dr * i;
          const cc = c1 + dc * i;
          const target = document.querySelector(`.ws-cell[data-r="${rr}"][data-c="${cc}"]`);
          if(target) selectedCells.push(target);
        }
        highlightCells();
      }
    }

    function endWSDrag() {
      if(!isDragging) return;
      isDragging = false;
      
      const word = selectedCells.map(c => c.textContent).join('');
      const wordRev = selectedCells.map(c => c.textContent).reverse().join('');
      
      let foundWord = null;
      if(wsWords.includes(word) && !wsFound.includes(word)) foundWord = word;
      else if(wsWords.includes(wordRev) && !wsFound.includes(wordRev)) foundWord = wordRev;
      
      if(foundWord) {
        wsFound.push(foundWord);
        const currentColor = wsColors[wsColorIndex % wsColors.length];
        selectedCells.forEach(c => {
          c.style.background = currentColor;
          c.style.color = 'white';
          c.classList.add('found');
        });
        wsColorIndex++;
        document.getElementById(`ws-word-${foundWord}`).style.textDecoration = 'line-through';
        document.getElementById(`ws-word-${foundWord}`).style.color = 'var(--text3)';
        document.getElementById('ws-remaining').textContent = wsWords.length - wsFound.length;
        if(typeof playSound === 'function') playSound('soft');
        
        if(wsFound.length === wsWords.length) {
          clearInterval(wsInterval);
          if(typeof playSound === 'function') playSound('achieve');
          
          document.querySelectorAll('.ws-cell').forEach(c => {
             const r = parseInt(c.dataset.r);
             const col = parseInt(c.dataset.c);
             const isPassword = wsPasswordCells.some(pc => pc.r === r && pc.c === col);
             if(isPassword) {
               c.style.background = '#f59e0b';
               c.style.color = 'white';
             } else {
               c.style.opacity = '0.1';
             }
          });

          setTimeout(() => {
            alert(`تهانينا! اكتشفت كلمة السر: "${rawPassword}"\nالوقت: ${document.getElementById('ws-time').textContent}`);
            startWordSearchGame();
          }, 2000);
        }
      } else {
        if(selectedCells.length > 1) {
          if(typeof playSound === 'function') playSound('error');
          selectedCells.forEach(c => {
            c.style.background = '#ef4444';
            c.style.color = 'white';
          });
          setTimeout(() => {
            selectedCells = [];
            highlightCells();
          }, 300);
          return;
        }
      }
      
      selectedCells = [];
      highlightCells();
    }

    function highlightCells() {
      document.querySelectorAll('.ws-cell:not(.found)').forEach(c => {
        c.style.background = 'var(--surface)'; c.style.color = 'var(--text)';
      });
      selectedCells.forEach(c => {
        if(!c.classList.contains('found')) {
          c.style.background = '#d1d5db';
        }
      });
    }

    // Infinity Path Logic
    let infTime = 0;
    let infLoops = 0;
    let infInterval = null;
    let infCurrentNode = 0;
    let infNodesData = [];
    
    // Path coordinates mapping roughly to the SVG infinity path (viewBox 0 0 100 50)
    const infPathCoords = [
      {x: 50, y: 25}, // Center
      {x: 65, y: 10},  // TR1
      {x: 82, y: 10},  // TR2
      {x: 95, y: 25}, // R
      {x: 82, y: 40}, // BR2
      {x: 65, y: 40}, // BR1
      {x: 50, y: 25}, // Center
      {x: 35, y: 40}, // BL1
      {x: 18, y: 40}, // BL2
      {x: 5,  y: 25}, // L
      {x: 18, y: 10},  // TL2
      {x: 35, y: 10}   // TL1
    ];

    function startInfinityGame() {
      document.getElementById('focus-menu').style.display = 'none';
      document.getElementById('focus-stroop-area').style.display = 'none';
      document.getElementById('focus-visual-area').style.display = 'none';
      document.getElementById('focus-slide-area').style.display = 'none';
      document.getElementById('focus-wordsearch-area').style.display = 'none';
      document.getElementById('focus-infinity-area').style.display = 'block';

      infTime = 0;
      infLoops = 0;
      infCurrentNode = 0;
      document.getElementById('inf-loops').textContent = "0 / 3";
      document.getElementById('inf-time').textContent = "00:00";
      
      generateInfinityPath();
      
      if(infInterval) clearInterval(infInterval); isFocusGameActive = false;
    }

    function generateInfinityPath() {
      const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'];
      infNodesData = [];
      const nodesEl = document.getElementById('inf-nodes');
      nodesEl.innerHTML = '';
      
      infPathCoords.forEach((coord, idx) => {
        const num = Math.floor(Math.random() * 6) + 1;
        const color = colors[Math.floor(Math.random() * colors.length)];
        infNodesData.push({num, color});
        
        const dot = document.createElement('div');
        dot.id = `inf-node-${idx}`;
        dot.textContent = num;
        dot.style.position = 'absolute';
        dot.style.left = `calc(${coord.x}% - 14px)`; 
        dot.style.top = `calc(${coord.y * 2}% - 14px)`; // Map Y 0-50 to 0-100%
        dot.style.width = '28px';
        dot.style.height = '28px';
        dot.style.borderRadius = '50%';
        dot.style.background = 'var(--surface)';
        dot.style.border = `3px solid ${color}`;
        dot.style.color = 'var(--text)';
        dot.style.display = 'flex';
        dot.style.alignItems = 'center';
        dot.style.justifyContent = 'center';
        dot.style.fontWeight = 'bold';
        dot.style.fontSize = '14px';
        dot.style.transition = 'all 0.2s ease';
        dot.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        nodesEl.appendChild(dot);
      });

      const diceEl = document.getElementById('inf-dice');
      diceEl.innerHTML = '';
      const diceChars = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
      for(let i=1; i<=6; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-dark';
        btn.style.background = 'var(--surface)';
        btn.style.color = 'var(--primary)';
        btn.style.border = '2px solid var(--border-darker)';
        btn.style.padding = '5px 10px';
        btn.style.display = 'flex';
        btn.style.flexDirection = 'column';
        btn.style.alignItems = 'center';
        
        btn.innerHTML = `<span style="font-size: 30px; line-height: 1;">${diceChars[i-1]}</span><span style="font-size:14px; font-weight:bold;">${i}</span>`;
        btn.onclick = () => handleInfClick(i);
        diceEl.appendChild(btn);
      }
      
      updateInfHighlight();
    }
    
    function updateInfHighlight() {
      infPathCoords.forEach((_, idx) => {
        const dot = document.getElementById(`inf-node-${idx}`);
        if(idx === infCurrentNode) {
          dot.style.background = infNodesData[idx].color;
          dot.style.color = 'white';
          dot.style.transform = 'scale(1.3)';
          dot.style.zIndex = '10';
        } else {
          dot.style.background = 'var(--surface)';
          dot.style.color = 'var(--text)';
          dot.style.transform = 'scale(1)';
          dot.style.zIndex = '1';
        }
      });
    }
    
    function handleInfClick(num) {
      if(infNodesData[infCurrentNode].num === num) {
        if(typeof playSound === 'function') playSound('soft');
        infCurrentNode++;
        if(infCurrentNode >= infPathCoords.length) {
          infCurrentNode = 0;
          infLoops++;
          document.getElementById('inf-loops').textContent = `${infLoops} / 3`;
          if(infLoops >= 3) {
            clearInterval(infInterval);
            if(typeof playSound === 'function') playSound('achieve');
            setTimeout(() => {
              alert(`تهانينا! أكملت 3 دورات في مسار الانتباه خلال ${document.getElementById('inf-time').textContent}`);
              startInfinityGame();
            }, 300);
            return;
          }
          // Regenerate colors and numbers for next loop to keep it challenging
          generateInfinityPath(); 
        } else {
          updateInfHighlight();
        }
      } else {
        infTime += 2; // Penalty
        if(typeof playSound === 'function') playSound('error');
        const m = Math.floor(infTime / 60).toString().padStart(2, '0');
        const s = (infTime % 60).toString().padStart(2, '0');
        document.getElementById('inf-time').textContent = `${m}:${s}`;
        document.getElementById('inf-bottom-timer').textContent = formatGameTime(infTime);
        
        const dot = document.getElementById(`inf-node-${infCurrentNode}`);
        dot.style.transform = 'scale(1.3) translateX(5px)';
        setTimeout(() => dot.style.transform = 'scale(1.3) translateX(0)', 150);
      }
    }

    // Memory Connect Logic
    const mcColors = {
      1: '#ef4444', 2: '#eab308', 3: '#22c55e', 4: '#f97316',
      5: '#a855f7', 6: '#06b6d4', 7: '#ec4899', 8: '#1d4ed8', 9: '#71717a'
    };
    let mcTime = 0;
    let mcInterval = null;
    let mcLevel = 1;
    let mcScore = 0;
    let mcSequence = [];
    let mcUserSequence = [];
    let mcNodesList = []; 
    
    function startMemoryConnectGame() {
      document.getElementById('focus-menu').style.display = 'none';
      document.getElementById('focus-stroop-area').style.display = 'none';
      document.getElementById('focus-visual-area').style.display = 'none';
      document.getElementById('focus-slide-area').style.display = 'none';
      document.getElementById('focus-wordsearch-area').style.display = 'none';
      document.getElementById('focus-infinity-area').style.display = 'none';
      document.getElementById('focus-memory-area').style.display = 'block';

      mcLevel = 1; mcScore = 0; mcTime = 0; document.getElementById('mc-bottom-timer').textContent = "00:00"; if(mcInterval) clearInterval(mcInterval);
      isFocusGameActive = false;
      updateMCScoreboard();
      generateMCLegend();
      nextMCLevel();
    }
    
    function updateMCScoreboard() {
      document.getElementById('mc-level').textContent = mcLevel;
      document.getElementById('mc-score').textContent = mcScore;
    }
    
    function generateMCLegend() {
      const legendEl = document.getElementById('mc-legend');
      legendEl.innerHTML = '';
      for(let i=1; i<=9; i++) {
        const item = document.createElement('div');
        item.style.display = 'flex'; item.style.alignItems = 'center'; item.style.gap = '4px';
        const circle = document.createElement('div');
        circle.style.width = '16px'; circle.style.height = '16px'; circle.style.borderRadius = '50%';
        circle.style.background = mcColors[i];
        const num = document.createElement('div');
        num.textContent = i; num.style.fontWeight = 'bold'; num.style.fontSize = '12px';
        num.style.color = 'var(--text)';
        item.appendChild(circle); item.appendChild(num);
        legendEl.appendChild(item);
      }
    }
    
    function nextMCLevel() {
      mcUserSequence = [];
      const nodesEl = document.getElementById('mc-nodes');
      nodesEl.innerHTML = '';
      document.getElementById('mc-lines').innerHTML = '';
      
      const radius = 100;
      const center = 125;
      mcNodesList = [];
      const nums = [1,2,3,4,5,6,7,8,9].sort(() => 0.5 - Math.random());
      
      for(let i=0; i<9; i++) {
        const angle = (i * 40 - 90) * (Math.PI / 180);
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const num = nums[i];
        mcNodesList.push({num, x, y});
        
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.left = `${x - 20}px`;
        dot.style.top = `${y - 20}px`;
        dot.style.width = '40px';
        dot.style.height = '40px';
        dot.style.borderRadius = '50%';
        dot.style.background = mcColors[num];
        dot.style.cursor = 'pointer';
        dot.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        dot.style.transition = 'transform 0.1s';
        dot.onclick = () => handleMCClick(num);
        nodesEl.appendChild(dot);
      }
      
      const seqLength = Math.min(4 + Math.floor(mcLevel / 2), 9);
      const possibleNums = [...nums].sort(() => 0.5 - Math.random());
      mcSequence = possibleNums.slice(0, seqLength);
      
      document.getElementById('mc-sequence').textContent = mcSequence.join(' - ');
    }
    
    function handleMCClick(num) {
      if(mcSequence[mcUserSequence.length] === num) {
        // Correct
        mcUserSequence.push(num);
        if(typeof playSound === 'function') playSound('soft');
        drawMCLines();
        
        if(mcUserSequence.length === mcSequence.length) {
          mcScore += mcLevel * 10;
          mcLevel++;
          updateMCScoreboard();
          if(typeof playSound === 'function') playSound('achieve');
          setTimeout(() => { nextMCLevel(); }, 800);
        }
      } else {
        // Wrong
        if(typeof playSound === 'function') playSound('error');
        mcUserSequence = [];
        drawMCLines();
        
        const seqEl = document.getElementById('mc-sequence');
        seqEl.style.transform = 'translateX(10px)';
        seqEl.style.color = '#ef4444';
        setTimeout(() => {
          seqEl.style.transform = 'translateX(-10px)';
          setTimeout(() => {
            seqEl.style.transform = 'translateX(0)';
            seqEl.style.color = 'var(--black)';
          }, 100);
        }, 100);
      }
    }
    
    function drawMCLines() {
      const svg = document.getElementById('mc-lines');
      svg.innerHTML = '';
      if(mcUserSequence.length < 2) return;
      
      let pathD = "";
      for(let i=0; i<mcUserSequence.length; i++) {
        const num = mcUserSequence[i];
        const node = mcNodesList.find(n => n.num === num);
        if(i === 0) pathD += `M ${node.x} ${node.y} `;
        else pathD += `L ${node.x} ${node.y} `;
      }
      
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathD);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "var(--text)");
      path.setAttribute("stroke-width", "3");
      path.setAttribute("stroke-dasharray", "5,5");
      svg.appendChild(path);
    }

    function quitFocusGame() {
      if(typeof mcInterval !== 'undefined' && mcInterval) clearInterval(mcInterval);
      if (focusTimer) clearInterval(focusTimer);
      if (slideInterval) clearInterval(slideInterval);
      if (wsInterval) clearInterval(wsInterval);
      if (infInterval) clearInterval(infInterval);
      document.getElementById('focus-stroop-area').style.display = 'none';
      document.getElementById('focus-visual-area').style.display = 'none';
      document.getElementById('focus-slide-area').style.display = 'none';
      document.getElementById('focus-wordsearch-area').style.display = 'none';
      document.getElementById('focus-infinity-area').style.display = 'none';
      document.getElementById('focus-memory-area').style.display = 'none';
      document.getElementById('focus-menu').style.display = 'block';
    }

    // --- Reports Logic ---
    function populateReportSelector() {
      const sel = document.getElementById('report-period');
      if (!sel || sel.options.length > 0) return; // already populated
      
      const options = [];
      const now = new Date();
      
      // Last 12 months individually
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const str = d.toLocaleDateString('ar-JO', { month: 'long', year: 'numeric' });
        options.push(`<option value="month_${y}_${m}">شهر ${m} / ${y} (${str})</option>`);
      }
      
      // Periods
      options.push('<option value="period_3">آخر 3 أشهر</option>');
      options.push('<option value="period_6">آخر 6 أشهر</option>');
      options.push('<option value="period_12">آخر سنة (12 شهر)</option>');
      
      sel.innerHTML = options.join('');
    }

    function generateReport() {
      const val = document.getElementById('report-period').value;
      let startD, endD;
      const now = new Date();
      
      if (val.startsWith('month_')) {
        const parts = val.split('_');
        const y = parseInt(parts[1]);
        const m = parseInt(parts[2]);
        startD = new Date(y, m - 1, 1);
        endD = new Date(y, m, 0); // last day of month
      } else if (val.startsWith('period_')) {
        const months = parseInt(val.split('_')[1]);
        startD = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
        endD = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      
      startD.setHours(0,0,0,0);
      endD.setHours(23,59,59,999);
      
      let totalExpected = 0;
      let totalDone = 0;
      const habitsReport = [];
      
      // 1. Calculate Habits
      state.habits.forEach(h => {
        let expected = 0;
        let done = 0;
        let hStart = new Date(h.start || today);
        let hEnd = h.end ? new Date(Math.min(endD, new Date(h.end))) : endD;
        
        let actualStart = new Date(Math.max(startD, hStart));
        
        if (actualStart <= hEnd) {
          let cur = new Date(actualStart);
          let daysInRange = 0;
          while (cur <= hEnd) {
            daysInRange++;
            let dStr = cur.toLocaleDateString('en-CA');
            if (h.freq === 'daily' || (h.freq === 'specific' && h.days.includes(cur.getDay()))) {
              expected++;
            }
            if (state.history[dStr] && state.history[dStr].includes(h.id)) {
              done++;
            }
            cur.setDate(cur.getDate() + 1);
          }
          if (h.freq === 'weekly') expected = Math.ceil(daysInRange / 7);
          if (h.freq === 'monthly') expected = Math.ceil(daysInRange / 30);
          if (h.freq === 'yearly') expected = Math.ceil(daysInRange / 365);
        }
        
        if (expected > 0) {
          totalExpected += expected;
          totalDone += done;
          habitsReport.push({
            title: h.title,
            expected: expected,
            done: done,
            pct: Math.min(Math.round((done / expected) * 100), 100)
          });
        }
      });
      
      const overallPct = totalExpected === 0 ? 0 : Math.round((totalDone / totalExpected) * 100);
      document.getElementById('rep-habits-pct').textContent = overallPct + '%';
      
      // 2. Calculate Zaha Hours
      let zahaHours = 0;
      state.zahaSessions.forEach(z => {
        const d = new Date(z.date);
        if (d >= startD && d <= endD) {
          zahaHours += z.hours;
        }
      });
      document.getElementById('rep-zaha-hours').textContent = zahaHours;
      
      // 3. Calculate Breathing Days
      let breatheDays = 0;
      for (const [dStr, jData] of Object.entries(state.journal)) {
        const d = new Date(dStr);
        if (d >= startD && d <= endD && jData.breatheDone) {
          breatheDays++;
        }
      }
      document.getElementById('rep-breathe-days').textContent = breatheDays;
      
      // 4. Render Habits List
      habitsReport.sort((a, b) => b.pct - a.pct); // Sort by percentage desc
      
      const listHtml = habitsReport.length ? habitsReport.map(h => {
        const isGood = h.pct >= 70;
        const isBad = h.pct <= 30;
        const color = isGood ? 'var(--primary)' : (isBad ? '#ef4444' : '#eab308');
        return `
          <div class="list-item" style="display:flex; flex-direction:column; padding: 15px 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="font-weight:800; color:var(--black); font-size:15px;">${h.title}</div>
              <div style="font-weight:800; color:${color}; font-family:'JetBrains Mono', monospace; font-size:16px;">${h.pct}%</div>
            </div>
            <div class="prog-bg" style="height:6px; margin-bottom:8px;"><div class="prog-fill" style="background:${color}; width:${h.pct}%"></div></div>
            <div style="font-size:12px; color:var(--text3);">الإنجاز: ${h.done} من أصل ${h.expected} مرات مطلوبة</div>
          </div>
        `;
      }).join('') : '<div class="empty">لا يوجد مهام مطلوبة في هذه الفترة</div>';
      
      document.getElementById('rep-habits-list').innerHTML = listHtml;
      
      // Show results
      document.getElementById('report-results').style.display = 'block';
      toast('تم استخراج التقرير بنجاح 📊');
    }

    function exportReportPDF() {
      const element = document.getElementById('report-results');
      const btn = document.getElementById('btn-export-pdf');
      if (btn) btn.style.display = 'none';
      
      const opt = {
        margin:       10,
        filename:     'تقرير_الإنجاز.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(element).toPdf().get('pdf').then(function(pdf) {
        if (btn) btn.style.display = 'block';
        const blob = pdf.output('bloburl');
        window.open(blob, '_blank');
        toast('تم تجهيز التقرير! يمكنك حفظه أو طباعته 📥');
      });
    }
  
    
    // --- Sum Match Game ---
    let smTarget = 0;
    let smPairsToFind = 12;
    let smPairsFound = 0;
    let smGrid = [];
    let smSelectedCell = null;
    let smTime = 0;
    let smInterval = null;

    function startSumMatchGame() {
      hideAllFocusGames();
      document.getElementById('focus-summatch-area').style.display = 'block';
      
      smTarget = Math.floor(Math.random() * 8) + 7; // 7 to 14
      document.getElementById('sm-target').textContent = smTarget;
      smPairsToFind = 15;
      smPairsFound = 0;
      smSelectedCell = null;
      document.getElementById('sm-remaining').textContent = smPairsToFind;
      
      generateSmGrid();
      renderSmGrid();
      
      smTime = 0;
      document.getElementById('sm-timer').textContent = '00:00';
      clearInterval(smInterval);
      smInterval = setInterval(() => {
        smTime++;
        const m = String(Math.floor(smTime / 60)).padStart(2, '0');
        const s = String(smTime % 60).padStart(2, '0');
        document.getElementById('sm-timer').textContent = `${m}:${s}`;
      }, 1000);
    }

    function generateSmGrid() {
      let success = false;
      while(!success) {
        smGrid = Array.from({length: 10}, () => Array(10).fill(0));
        // Center 2x2 hole
        smGrid[4][4] = -1; smGrid[4][5] = -1;
        smGrid[5][4] = -1; smGrid[5][5] = -1;
        
        let pairsPlaced = 0;
        let attempts = 0;
        while(pairsPlaced < smPairsToFind && attempts < 1000) {
          attempts++;
          let r = Math.floor(Math.random() * 10);
          let c = Math.floor(Math.random() * 10);
          if(smGrid[r][c] !== 0) continue;
          
          let neighbors = [];
          if(r > 0 && smGrid[r-1][c] === 0) neighbors.push([r-1, c]);
          if(r < 9 && smGrid[r+1][c] === 0) neighbors.push([r+1, c]);
          if(c > 0 && smGrid[r][c-1] === 0) neighbors.push([r, c-1]);
          if(c < 9 && smGrid[r][c+1] === 0) neighbors.push([r, c+1]);
          
          if(neighbors.length > 0) {
            let n = neighbors[Math.floor(Math.random() * neighbors.length)];
            let maxA = Math.min(9, smTarget - 1);
            let minA = Math.max(1, smTarget - 9);
            let a = Math.floor(Math.random() * (maxA - minA + 1)) + minA;
            let b = smTarget - a;
            smGrid[r][c] = a;
            smGrid[n[0]][n[1]] = b;
            pairsPlaced++;
          }
        }
        
        if(pairsPlaced === smPairsToFind) success = true;
      }
      
      // Fill remaining with noise
      for(let r=0; r<10; r++) {
        for(let c=0; c<10; c++) {
          if(smGrid[r][c] === 0) {
            let validNums = [];
            for(let n=1; n<=9; n++) {
              let safe = true;
              if(r > 0 && smGrid[r-1][c] > 0 && smGrid[r-1][c] + n === smTarget) safe = false;
              if(r < 9 && smGrid[r+1][c] > 0 && smGrid[r+1][c] + n === smTarget) safe = false;
              if(c > 0 && smGrid[r][c-1] > 0 && smGrid[r][c-1] + n === smTarget) safe = false;
              if(c < 9 && smGrid[r][c+1] > 0 && smGrid[r][c+1] + n === smTarget) safe = false;
              if(safe) validNums.push(n);
            }
            if(validNums.length === 0) {
              smGrid[r][c] = 1;
            } else {
              smGrid[r][c] = validNums[Math.floor(Math.random() * validNums.length)];
            }
          }
        }
      }
    }

    function renderSmGrid() {
      const gridEl = document.getElementById('sm-grid');
      gridEl.innerHTML = '';
      gridEl.style.gridTemplateColumns = 'repeat(10, 35px)';
      gridEl.style.gridTemplateRows = 'repeat(10, 35px)';
      
      let centerAdded = false;
      
      for(let r=0; r<10; r++) {
        for(let c=0; c<10; c++) {
          if(smGrid[r][c] === -1) {
            if(!centerAdded) {
              const centerEl = document.createElement('div');
              centerEl.className = 'sm-center-cell';
              centerEl.textContent = smTarget;
              gridEl.appendChild(centerEl);
              centerAdded = true;
            }
            continue;
          }
          
          const cell = document.createElement('div');
          cell.className = 'sm-cell';
          cell.dataset.r = r;
          cell.dataset.c = c;
          cell.textContent = smGrid[r][c];
          cell.onclick = () => handleSmClick(r, c, cell);
          gridEl.appendChild(cell);
        }
      }
    }

    function handleSmClick(r, c, el) {
      if(el.classList.contains('found')) return;
      
      if(!smSelectedCell) {
        smSelectedCell = {r, c, el};
        el.classList.add('selected');
      } else {
        if(smSelectedCell.r === r && smSelectedCell.c === c) {
          el.classList.remove('selected');
          smSelectedCell = null;
        } else {
          let dr = Math.abs(smSelectedCell.r - r);
          let dc = Math.abs(smSelectedCell.c - c);
          if((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
            let sum = smGrid[r][c] + smGrid[smSelectedCell.r][smSelectedCell.c];
            if(sum === smTarget) {
              el.classList.add('found');
              smSelectedCell.el.classList.remove('selected');
              smSelectedCell.el.classList.add('found');
              smPairsFound++;
              document.getElementById('sm-remaining').textContent = smPairsToFind - smPairsFound;
              smSelectedCell = null;
              
              if(smPairsFound === smPairsToFind) {
                clearInterval(smInterval);
                setTimeout(() => {
                  if(typeof playSound === 'function') playSound('achieve');
                  toast('عمل رائع! لقد وجدت كل الأزواج المتطابقة 🧮');
                  confetti({particleCount: 150, spread: 70});
                }, 300);
              }
            } else {
              smSelectedCell.el.classList.remove('selected');
              smSelectedCell = {r, c, el};
              el.classList.add('selected');
            }
          } else {
            smSelectedCell.el.classList.remove('selected');
            smSelectedCell = {r, c, el};
            el.classList.add('selected');
          }
        }
      }
    }
    
    // --- Shape Counter Game ---
    let scExpected = { circle: 0, square: 0, triangle: 0, rect: 0 };
    
    function startShapeCounterGame() {
      hideAllFocusGames();
      document.getElementById('focus-shapecounter-area').style.display = 'block';
      generateShapes();
      
      document.getElementById('sc-circle-count').value = '';
      document.getElementById('sc-square-count').value = '';
      document.getElementById('sc-triangle-count').value = '';
      document.getElementById('sc-rect-count').value = '';
    }
    
    function closeShapeCounter() {
      document.getElementById('focus-shapecounter-area').style.display = 'none';
      document.getElementById('focus-menu').style.display = 'block';
    }
    
    function generateShapes() {
      const svg = document.getElementById('sc-svg');
      svg.innerHTML = '';
      scExpected = { circle: 0, square: 0, triangle: 0, rect: 0 };
      
      const counts = {
        circle: Math.floor(Math.random() * 5) + 3,
        square: Math.floor(Math.random() * 5) + 3,
        triangle: Math.floor(Math.random() * 5) + 3,
        rect: Math.floor(Math.random() * 5) + 3
      };
      
      scExpected = counts;
      const shapes = [];
      
      for(let i=0; i<counts.circle; i++) shapes.push('circle');
      for(let i=0; i<counts.square; i++) shapes.push('square');
      for(let i=0; i<counts.triangle; i++) shapes.push('triangle');
      for(let i=0; i<counts.rect; i++) shapes.push('rect');
      
      // Shuffle
      shapes.sort(() => Math.random() - 0.5);
      
      shapes.forEach(type => {
        let el;
        const color = `hsl(${Math.random()*360}, 70%, 50%)`;
        const x = Math.random() * 240 + 30;
        const y = Math.random() * 240 + 30;
        
        if(type === 'circle') {
          el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          el.setAttribute("cx", x);
          el.setAttribute("cy", y);
          el.setAttribute("r", Math.random() * 15 + 10);
        } else if(type === 'square') {
          el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          const size = Math.random() * 20 + 20;
          el.setAttribute("x", x - size/2);
          el.setAttribute("y", y - size/2);
          el.setAttribute("width", size);
          el.setAttribute("height", size);
        } else if(type === 'rect') {
          el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          const w = Math.random() * 30 + 30;
          const h = Math.random() * 10 + 15;
          el.setAttribute("x", x - w/2);
          el.setAttribute("y", y - h/2);
          el.setAttribute("width", w);
          el.setAttribute("height", h);
        } else if(type === 'triangle') {
          el = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
          const size = Math.random() * 20 + 20;
          el.setAttribute("points", `${x},${y-size} ${x-size},${y+size} ${x+size},${y+size}`);
        }
        
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", color);
        el.setAttribute("stroke-width", "3");
        el.setAttribute("transform", `rotate(${Math.random()*360} ${x} ${y})`);
        svg.appendChild(el);
      });
    }
    
    function checkShapeCounter() {
      const c = parseInt(document.getElementById('sc-circle-count').value) || 0;
      const s = parseInt(document.getElementById('sc-square-count').value) || 0;
      const t = parseInt(document.getElementById('sc-triangle-count').value) || 0;
      const r = parseInt(document.getElementById('sc-rect-count').value) || 0;
      
      if(c === scExpected.circle && s === scExpected.square && t === scExpected.triangle && r === scExpected.rect) {
        if(typeof playSound === 'function') playSound('achieve');
        toast('أحسنت! إجابة صحيحة 💯');
        confetti({particleCount: 100, spread: 70});
        setTimeout(startShapeCounterGame, 2000);
      } else {
        toast('هناك خطأ في العد، حاول مرة أخرى!');
      }
    }

    // --- Pattern Copy Game ---
    let pcTarget = [];
    let pcPlayer = [];
    
    function startPatternCopyGame() {
      hideAllFocusGames();
      document.getElementById('focus-patterncopy-area').style.display = 'block';
      generatePatternCopy();
      resetPatternCopyPlayer();
    }
    
    function closePatternCopy() {
      document.getElementById('focus-patterncopy-area').style.display = 'none';
      document.getElementById('focus-menu').style.display = 'block';
    }
    
    function drawGridDots(containerId, isPlayer) {
      const container = document.getElementById(containerId);
      container.innerHTML = '';
      const step = 160 / 3;
      for(let r=0; r<4; r++) {
        for(let c=0; c<4; c++) {
          const dot = document.createElement('div');
          dot.className = isPlayer ? 'pc-dot pc-player-dot' : 'pc-dot';
          dot.style.left = `${c * step + 10}px`;
          dot.style.top = `${r * step + 10}px`;
          dot.dataset.id = r*4 + c;
          dot.dataset.r = r;
          dot.dataset.c = c;
          
          if(isPlayer) {
            dot.onclick = () => handlePcPlayerClick(parseInt(dot.dataset.id), dot);
          }
          container.appendChild(dot);
        }
      }
    }
    
    function generatePatternCopy() {
      drawGridDots('pc-target-grid', false);
      pcTarget = [];
      const pathLength = Math.floor(Math.random() * 3) + 5; // 5 to 7
      let curR = Math.floor(Math.random() * 4);
      let curC = Math.floor(Math.random() * 4);
      pcTarget.push(curR*4 + curC);
      
      for(let i=1; i<pathLength; i++) {
        let validNeighbors = [];
        const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        dirs.forEach(d => {
          let nr = curR + d[0]; let nc = curC + d[1];
          if(nr>=0 && nr<4 && nc>=0 && nc<4) {
            let nid = nr*4 + nc;
            if(!pcTarget.includes(nid)) validNeighbors.push(nid);
          }
        });
        if(validNeighbors.length === 0) break;
        let nextId = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        pcTarget.push(nextId);
        curR = Math.floor(nextId / 4);
        curC = nextId % 4;
      }
      
      drawPath('pc-target-grid', pcTarget, false);
    }
    
    function resetPatternCopyPlayer() {
      drawGridDots('pc-player-grid', true);
      pcPlayer = [];
    }
    
    function handlePcPlayerClick(id, el) {
      if(pcPlayer.includes(id)) return; // Already visited
      
      if(pcPlayer.length > 0) {
        let lastId = pcPlayer[pcPlayer.length-1];
        let lr = Math.floor(lastId/4); let lc = lastId%4;
        let cr = Math.floor(id/4); let cc = id%4;
        let dr = Math.abs(lr - cr); let dc = Math.abs(lc - cc);
        if(dr > 1 || dc > 1) {
           toast('يجب توصيل النقاط المتجاورة فقط!');
           return;
        }
      }
      
      pcPlayer.push(id);
      el.classList.add('active');
      drawPath('pc-player-grid', pcPlayer, true);
    }
    
    function drawPath(containerId, path, isPlayer) {
      const container = document.getElementById(containerId);
      // Remove old lines
      container.querySelectorAll('.pc-line').forEach(e => e.remove());
      
      const step = 160 / 3;
      for(let i=0; i<path.length-1; i++) {
        let id1 = path[i]; let id2 = path[i+1];
        let r1 = Math.floor(id1/4); let c1 = id1%4;
        let r2 = Math.floor(id2/4); let c2 = id2%4;
        
        let x1 = c1*step + 10; let y1 = r1*step + 10;
        let x2 = c2*step + 10; let y2 = r2*step + 10;
        
        let length = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
        let angle = Math.atan2(y2-y1, x2-x1) * 180 / Math.PI;
        
        const line = document.createElement('div');
        line.className = isPlayer ? 'pc-line pc-line-player' : 'pc-line';
        line.style.width = `${length}px`;
        line.style.left = `${x1}px`;
        line.style.top = `${y1 - 2}px`;
        line.style.transform = `rotate(${angle}deg)`;
        
        // Insert before dots
        container.insertBefore(line, container.firstChild);
      }
    }
    
    function checkPatternCopy() {
      if(pcPlayer.length !== pcTarget.length) {
        toast('المسار غير مكتمل أو غير متطابق!');
        return;
      }
      
      let isMatch = true;
      for(let i=0; i<pcTarget.length; i++) {
        if(pcTarget[i] !== pcPlayer[i]) isMatch = false;
      }
      
      // Also check reversed path
      let isRevMatch = true;
      let revTarget = [...pcTarget].reverse();
      for(let i=0; i<revTarget.length; i++) {
        if(revTarget[i] !== pcPlayer[i]) isRevMatch = false;
      }
      
      if(isMatch || isRevMatch) {
        if(typeof playSound === 'function') playSound('achieve');
        toast('ممتاز! مسار متطابق 💯');
        confetti({particleCount: 100, spread: 70});
        setTimeout(startPatternCopyGame, 2000);
      } else {
        toast('المسار غير متطابق، حاول مجدداً!');
      }
    }

    // --- Size Sorter Game ---
    let ssShapes = [];
    let ssSelectedIdx = -1;
    
    function startSizeSorterGame() {
      hideAllFocusGames();
      document.getElementById('focus-sizesorter-area').style.display = 'block';
      generateSizeSorter();
    }
    
    function closeSizeSorter() {
      document.getElementById('focus-sizesorter-area').style.display = 'none';
      document.getElementById('focus-menu').style.display = 'block';
    }
    
    function generateSizeSorter() {
      ssSelectedIdx = -1;
      const baseSizes = [20, 35, 50, 65, 80];
      ssShapes = baseSizes.map((size, index) => ({ id: index, size: size }));
      
      // Shuffle array
      for (let i = ssShapes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ssShapes[i], ssShapes[j]] = [ssShapes[j], ssShapes[i]];
      }
      
      renderSizeSorter();
    }
    
    function renderSizeSorter() {
      const container = document.getElementById('ss-container');
      container.innerHTML = '';
      
      const type = Math.random() > 0.5 ? 'circle' : 'rect';
      const color = `hsl(${Math.random()*360}, 70%, 50%)`;
      
      ssShapes.forEach((s, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'ss-shape-wrapper' + (ssSelectedIdx === i ? ' selected' : '');
        wrapper.style.width = '100px';
        wrapper.style.height = '100px';
        wrapper.onclick = () => handleSsClick(i);
        
        let svgHtml = `<svg width="100" height="100" viewBox="0 0 100 100">`;
        if(type === 'circle') {
          svgHtml += `<circle class="ss-shape" cx="50" cy="50" r="${s.size/2}" fill="${color}" />`;
        } else {
          svgHtml += `<rect class="ss-shape" x="${50 - s.size/2}" y="${50 - s.size/2}" width="${s.size}" height="${s.size}" rx="4" fill="${color}" />`;
        }
        svgHtml += `</svg>`;
        
        wrapper.innerHTML = svgHtml;
        container.appendChild(wrapper);
      });
      
      checkSizeSorterWin();
    }
    
    function handleSsClick(idx) {
      if(ssSelectedIdx === -1) {
        ssSelectedIdx = idx;
        renderSizeSorter();
      } else {
        if(ssSelectedIdx !== idx) {
          // Swap
          let temp = ssShapes[ssSelectedIdx];
          ssShapes[ssSelectedIdx] = ssShapes[idx];
          ssShapes[idx] = temp;
        }
        ssSelectedIdx = -1;
        renderSizeSorter();
      }
    }
    
    function checkSizeSorterWin() {
      let isSorted = true;
      for(let i=0; i<ssShapes.length-1; i++) {
        if(ssShapes[i].size > ssShapes[i+1].size) isSorted = false;
      }
      
      if(isSorted) {
        if(typeof playSound === 'function') playSound('achieve');
        toast('نجاح رائع! الترتيب صحيح 📏');
        confetti({particleCount: 100, spread: 70});
        setTimeout(startSizeSorterGame, 2000);
      }
    }

    function hideAllFocusGames() {
      document.getElementById('focus-menu').style.display = 'none';
      if(document.getElementById('focus-stroop-area')) document.getElementById('focus-stroop-area').style.display = 'none';
      if(document.getElementById('focus-visual-area')) document.getElementById('focus-visual-area').style.display = 'none';
      if(document.getElementById('focus-slide-area')) document.getElementById('focus-slide-area').style.display = 'none';
      if(document.getElementById('focus-wordsearch-area')) document.getElementById('focus-wordsearch-area').style.display = 'none';
      if(document.getElementById('focus-summatch-area')) document.getElementById('focus-summatch-area').style.display = 'none';
      if(document.getElementById('focus-shapecounter-area')) document.getElementById('focus-shapecounter-area').style.display = 'none';
      if(document.getElementById('focus-patterncopy-area')) document.getElementById('focus-patterncopy-area').style.display = 'none';
      if(document.getElementById('focus-sizesorter-area')) document.getElementById('focus-sizesorter-area').style.display = 'none';
    }

  