
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
      } catch (e) { console.warn('Sound error:', e); }
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
          document.title = `مُبين | ${displayName}`;
          checkAndMigrateDataThenLoad(currentUserUID);
          setupNotifications();
        } else {
          currentUserUID = null;
          document.getElementById('auth-screen').style.display = 'flex';
          document.getElementById('global-loading').style.display = 'none';
        }
      });
    }
    
    
    
    
    // ------------------------------------------------------------------------
    let state = {
      habits: [], history: {}, goals: [], readerBooks: [], zahaSessions: [], nextId: 1,
      journal: {}, settings: { notifTime: '20:00' }
    };
    let currentOpenBookId = null; let readerData = []; let currentFontSize = 17; window.rawFileContent = "";
    const dNow = new Date();
    const today = new Date(dNow.getTime() - (dNow.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('hdr-day').textContent = dNow.getDate();
    const engDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const engMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('hdr-date-full').innerHTML = `${engDays[dNow.getDay()]},<br>${engMonths[dNow.getMonth()]}`;
    async function checkAndMigrateDataThenLoad() {
  loadState();
}
    let isInitialLoad = true;
    function loadState() {
  const saved = localStorage.getItem('planner_state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
      if (typeof state.habits === 'string') state.habits = [];
      if (!state.journal) state.journal = {};
      if (!state.library) state.library = [];
      if (!state.goals) state.goals = [];
    } catch(e) {
      console.error('Error loading state', e);
    }
  }
  
  populateGlobalSelectors();
  goPage('page-daily');
  renderAll();
  setupNotifications();
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
        document.title = `مُبين | ${name}`;
      }
      if (age) {
        state.settings.age = age;
      }
      finishSaveSettings();
    }
    function handleDirectPicUpload(fileInput) {
      if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const img = new Image();
          img.onload = function () {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 150;
            let scaleSize = MAX_WIDTH / img.width;
            if (scaleSize > 1) scaleSize = 1;
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
    function saveAccountSettingsM() {
      const name = document.getElementById('s-name-m').value.trim();
      const age = document.getElementById('s-age-m').value.trim();
      if (name) {
        state.settings.displayName = name;
        document.getElementById('user-greeting-name').textContent = name;
        document.title = `مُبين | ${name}`;
      }
      if (age) state.settings.age = age;
      saveState();
      closeModal('settings');
      toast('تم حفظ الإعدادات بنجاح ✅');
    }
    function finishSaveSettings() {
      saveState();
      document.getElementById('settings-popup').style.display = 'none';
      toast('تم حفظ الإعدادات بنجاح ✅');
    }
    function updateAvatarUI() {
      const iconDiv = document.getElementById('user-avatar-icon');
      if (iconDiv) {
        if (state.settings.profilePic) {
          iconDiv.innerHTML = `<img src="${state.settings.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
          iconDiv.style.background = 'transparent';
        } else {
          iconDiv.innerHTML = '👋';
          iconDiv.style.background = 'var(--black)';
        }
      }
    }
    // Close popup on outside click
    document.addEventListener('click', function (e) {
      const gearBtn = document.querySelector(`[onclick="openModal('settings')"]`);
      const popup = document.getElementById('settings-popup');
      if (popup && gearBtn && popup.style.display === 'block') {
        if (!gearBtn.contains(e.target)) {
          popup.style.display = 'none';
        }
      }
    });
    function saveState() {
  localStorage.setItem('planner_state', JSON.stringify(state));
}
    function populateGlobalSelectors() {
      const gHtml = `<option value="">-- بدون هدف مرتبط --</option>` + state.goals.map(g => `<option value="${g.id}">🎯 ${g.title}</option>`).join('');
      if (document.getElementById('m-hab-goal')) document.getElementById('m-hab-goal').innerHTML = gHtml;
    }
    function goPage(el) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.bnav-item').forEach(n => n.classList.remove('active'));
      const name = el.dataset.page;
      document.querySelectorAll(`.nav-item[data-page="${name}"], .bnav-item[data-page="${name}"]`).forEach(n => n.classList.add('active'));
      document.getElementById('page-' + name).classList.add('active');
      renderAll();
    }
    function openModal(type, id = null) {
      if (type === 'settings') {
        document.getElementById('s-name-m').value = state.settings.displayName || "صديقي";
        document.getElementById('s-age-m').value = state.settings.age || "";
        document.getElementById('modal-settings').classList.add('show'); return;
      }
      if (type === 'notif') {
        document.getElementById('m-notif-time').value = state.settings.notifTime || '20:00';
        document.getElementById('modal-notif').classList.add('show'); return;
      }
      if (type === 'habit') {
        if (id) {
          const h = state.habits.find(x => x.id === id);
          if (!h) return;
          document.getElementById('m-hab-id').value = h.id; document.getElementById('m-hab-title-text').textContent = 'تعديل العادة ✎'; document.getElementById('m-hab-title').value = h.title; document.getElementById('m-hab-start').value = h.start || today; document.getElementById('m-hab-end').value = h.end || ''; document.getElementById('m-hab-goal').value = h.goalId || ''; document.getElementById('m-hab-freq').value = h.freq || 'daily'; toggleHabitDays(h.freq || 'daily', 'm-hab-days-wrap'); document.querySelectorAll('#m-hab-days-wrap .day-btn').forEach(b => { if (h.days && h.days.includes(parseInt(b.dataset.day))) b.classList.add('active'); else b.classList.remove('active'); });
        } else { document.getElementById('m-hab-id').value = ''; document.getElementById('m-hab-title-text').textContent = 'إضافة عادة جديدة ✨'; document.getElementById('m-hab-title').value = ''; document.getElementById('m-hab-goal').value = ''; }
      }
      else if (type === 'goal') { const endOfYear = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]; if (id) { const g = state.goals.find(x => x.id === id); if (!g) return; document.getElementById('m-goal-id').value = g.id; document.getElementById('m-goal-title-text').textContent = 'تعديل الهدف ✎'; document.getElementById('m-goal-title').value = g.title; document.getElementById('m-goal-end').value = g.endDate || endOfYear; } else { document.getElementById('m-goal-id').value = ''; document.getElementById('m-goal-title-text').textContent = 'إضافة هدف 🏆'; document.getElementById('m-goal-title').value = ''; document.getElementById('m-goal-end').value = endOfYear; } }

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
      renderZaha();
      renderLibrary();
      renderDashboard();
      if (typeof renderBreatheStatus === 'function') renderBreatheStatus();
      if (typeof updateHighScores === 'function') updateHighScores();
    }
    function updateHighScores() {
      if (!state.highScores) state.highScores = {};
      const g = ['stroop', 'slide', 'summatch', 'shapecounter', 'wordsearch', 'infinity', 'memoryconnect', 'direction'];
      g.forEach(id => {
        if (document.getElementById('hs-' + id)) {
          document.getElementById('hs-' + id).textContent = '🏆 ' + (state.highScores[id] || 0);
        }
      });
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
    function saveHabit() { const id = document.getElementById('m-hab-id').value; const title = document.getElementById('m-hab-title').value.trim(); if (!title) { toast('أدخل اسم العادة'); return; } const freq = document.getElementById('m-hab-freq').value; let days = []; if (freq === 'specific') { document.querySelectorAll('#m-hab-days-wrap .day-btn.active').forEach(b => days.push(parseInt(b.dataset.day))); if (!days.length) { toast('اختر يوم واحد على الأقل'); return; } } if (id) { const h = state.habits.find(x => x.id == id); if (h) { h.title = title; h.start = document.getElementById('m-hab-start').value || today; h.end = document.getElementById('m-hab-end').value; h.freq = freq; h.days = days; h.goalId = document.getElementById('m-hab-goal').value; } } else { state.habits.push({ id: state.nextId++, title, start: document.getElementById('m-hab-start').value || today, end: document.getElementById('m-hab-end').value, freq, days, goalId: document.getElementById('m-hab-goal').value }); } saveState(); renderAll(); closeModal('habit'); toast('تم الحفظ ✓'); }
    function delHabit(id) { state.habits = state.habits.filter(h => h.id != id); saveState(); renderAll(); toast('تم حذف العادة ✓'); }
    function toggleHabit(id) {
      if (!state.history[today]) state.history[today] = [];
      if (state.history[today].includes(id)) {
        state.history[today] = state.history[today].filter(x => x !== id);
      } else {
        state.history[today].push(id);
        playSound('soft');
        const active = getActiveHabitsForDate(today);
        const doneCount = active.filter(h => state.history[today].includes(h.id)).length;
        if (active.length > 0 && doneCount === active.length) {
          playSound('achieve');
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
        const gInfo = state.goals.find(g => g.id == h.goalId);
        const streak = getStreak(h.id);
        const streakHtml = streak > 0 ? `<span class="badge streak-badge">🔥 ${streak}</span>` : '';
        return `<div class="list-item ${done ? 'done' : ''}" style="display:flex; align-items:center;"><div class="check-btn ${done ? 'active' : ''}" onclick="toggleHabit(${h.id})">${done ? '✓' : ''}</div><div class="item-info" style="flex:1;"><div class="item-title">${h.title}</div><div class="item-meta">${streakHtml}${gInfo ? `<span class="badge goal-badge">🎯 ${gInfo.title}</span>` : ''}</div></div><button class="del-btn" style="background:var(--surface2); margin-inline-start:10px; flex-shrink:0;" onclick="openModal('habit', ${h.id})" title="تعديل"><span style="font-size:14px;">⚙️</span></button><button class="del-btn" style="margin-inline-start:6px; flex-shrink:0;" onclick="delHabit(${h.id})" title="حذف">✕</button></div>`;
      }).join('') : '';
      if (state.journal[today] && state.journal[today].breatheTime > 0) {
        const totalSecs = state.journal[today].breatheTime;
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        const timeText = (m > 0 ? `${m} دقيقة و ` : '') + `${s} ثانية`;
        html += `<div class="list-item done" style="border: 1px solid var(--primary);"><div class="check-btn active" style="background:var(--primary); color:white; border-color:var(--primary);">✓</div><div class="item-info"><div class="item-title">تمرين التنفس 🫁</div><div class="item-meta" style="color:var(--primary); font-weight:bold;">⏱ ${timeText}</div></div></div>`;
      }
      if (!html) html = '<div class="empty">لا يوجد مهام اليوم</div>';
      document.getElementById('habit-list').innerHTML = html;
      const dDone = activeToday.filter(h => (state.history[today] || []).includes(h.id)).length;
      const dPct = activeToday.length ? (dDone / activeToday.length * 100) : 0;
      const valEl = document.getElementById('daily-pg-val');
      const txtEl = document.getElementById('daily-pg-txt');
      if (valEl) valEl.textContent = `${dDone}/${activeToday.length}`;
      if (txtEl) txtEl.textContent = Math.round(dPct) + '%';
      updateCircle('daily-pg-circ', dPct);
      renderDailyMiniDash();
    }
    function renderDailyMiniDash() {
      const container = document.getElementById('mini-dash-content');
      if (!container) return;
      if (state.habits.length === 0) { container.innerHTML = `<div class="empty" style="padding: 20px; border: none; background: transparent;">لا يوجد عادات مجدولة</div>`; return; }

      const filterDays = document.getElementById('mini-dash-filter') ? parseInt(document.getElementById('mini-dash-filter').value) : 7;
      let totalExpected = 0; let totalDone = 0; const activeWeeklyHabits = [];

      state.habits.forEach(h => {
        let expected = 0; let done = 0; let dStart = new Date(h.start || today); let dEnd = h.end ? new Date(Math.min(new Date(today), new Date(h.end))) : new Date(today);
        let fDate = new Date(today); fDate.setDate(fDate.getDate() - filterDays + 1); if (dStart < fDate) dStart = fDate;

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

      // إضافة تمرين التنفس
      let breatheDoneCount = 0;
      const fDateB = new Date(today); fDateB.setDate(fDateB.getDate() - filterDays + 1);
      Object.keys(state.journal || {}).forEach(dStr => {
        const d = new Date(dStr);
        if (d >= fDateB && state.journal[dStr] && state.journal[dStr].breatheDone) breatheDoneCount++;
      });
      const breatheGoalId = state.settings && state.settings.breatheGoalId;
      totalExpected += filterDays; totalDone += breatheDoneCount;
      activeWeeklyHabits.push({ habit: { id: 'breathe', title: 'تمرين التنفس 🫁', goalId: breatheGoalId }, expected: filterDays, done: breatheDoneCount });

      if (activeWeeklyHabits.length === 0) { container.innerHTML = `<div class="empty" style="padding: 20px; border: none; background: transparent;">لا يوجد مهام مطلوبة لهذه الفترة</div>`; return; }

      const dPct = totalExpected === 0 ? 0 : Math.min(Math.round((totalDone / totalExpected) * 100), 100);
      const itemsHtml = activeWeeklyHabits.map(item => {
        const h = item.habit; const expected = item.expected; const done = item.done; const isDone = done >= expected; const pct = Math.min(Math.round((done / expected) * 100), 100);
        const gInfo = state.goals.find(g => g.id == h.goalId); const icon = h.id === 'breathe' ? '🫁' : (gInfo ? '🎯' : '⚡');
        const editBtn = h.id === 'breathe' ? '' : (!isDone ? `<button onclick="openModal('habit', ${h.id})" style="background:none; border:none; cursor:pointer; font-size:14px; opacity:0.7; padding:0;" title="تعديل">✏️</button>` : '');
        return `<div class="md-item"><div class="md-icon">${icon}</div><div class="md-info"><div style="display:flex; justify-content:space-between; align-items:center;"><div style="display:flex; align-items:center; gap:8px;"><div class="md-name" title="${h.title}">${h.title}</div>${editBtn}</div><div class="md-status ${isDone ? 'done' : ''}">${pct}%</div></div><div class="md-bar-bg"><div class="md-bar-fill ${isDone ? 'done' : ''}" style="width: ${pct}%"></div></div></div></div>`;
      }).join('');

      const circleOffset = 188.4 - (dPct / 100 * 188.4);
      let filterLabel = 'آخر ' + filterDays + ' أيام';
      if (filterDays === 30) filterLabel = 'آخر شهر'; if (filterDays === 90) filterLabel = 'آخر 3 أشهر'; if (filterDays === 180) filterLabel = 'آخر 6 أشهر'; if (filterDays === 365) filterLabel = 'آخر سنة';

      container.innerHTML = `
        <div class="card-hdr" style="flex-direction:column; align-items:flex-start; gap:10px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
             <div class="card-title" style="margin-bottom:0;">التقدم التراكمي</div>
             <select id="mini-dash-filter" onchange="renderDailyMiniDash()" style="font-size:12px; padding:2px 5px; border-radius:6px; border:1px solid var(--border); color:var(--text); background:var(--surface);">
               <option value="7" ${filterDays === 7 ? 'selected' : ''}>أسبوع</option>
               <option value="30" ${filterDays === 30 ? 'selected' : ''}>شهر</option>
               <option value="90" ${filterDays === 90 ? 'selected' : ''}>3 أشهر</option>
               <option value="180" ${filterDays === 180 ? 'selected' : ''}>6 أشهر</option>
               <option value="365" ${filterDays === 365 ? 'selected' : ''}>سنة</option>
             </select>
          </div>
        </div>
        <div class="md-overall" style="margin-top:10px;">
          <div class="circ-wrap" style="transform: scale(0.85); margin: 0; width: 60px; height: 60px;">
            <svg width="60" height="60" viewBox="0 0 70 70" style="overflow:visible;">
              <circle class="circ-bg" cx="35" cy="35" r="30" stroke-width="6"></circle>
              <circle class="circ-val" cx="35" cy="35" r="30" stroke="var(--primary)" stroke-width="6" stroke-dasharray="188.4" stroke-dashoffset="${circleOffset}" style="transition: stroke-dashoffset 0.8s ease;"></circle>
            </svg>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--text2); font-weight: 700;">المهام المنجزة (${filterLabel})</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--black);"><span style="color: var(--primary)">${totalDone}</span> / ${totalExpected} <span style="font-size:14px; color:var(--text3); font-weight:normal;">(${dPct}%)</span></div>
          </div>
        </div>
        <div class="md-list">${itemsHtml}</div>
      `;
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
      if (document.getElementById('dash-daily-val')) document.getElementById('dash-daily-val').textContent = `${dDone}/${activeToday.length}`;
      if (document.getElementById('circ-txt-daily')) document.getElementById('circ-txt-daily').textContent = Math.round(dPct) + '%';
      updateCircle('circ-daily', dPct);

      let totalP = 0, readP = 0; (state.readerBooks || []).forEach(b => { totalP += (b.total || 0); readP += (b.progress || 0); }); const booksPct = totalP > 0 ? (readP / totalP * 100) : 0;
      const booksCount = (state.readerBooks || []).length;
      if (document.getElementById('dash-books-val')) document.getElementById('dash-books-val').textContent = Math.round(booksPct) + '%';
      if (document.getElementById('dash-books-sub')) document.getElementById('dash-books-sub').textContent = booksCount + ' كتاب';
      if (document.getElementById('circ-txt-books')) document.getElementById('circ-txt-books').textContent = Math.round(booksPct) + '%';
      updateCircle('circ-books', booksPct);

      let gAvg = state.goals.length > 0 ? state.goals.reduce((s, g) => s + (getGoalProgressInfo(g.id).isAuto ? getGoalProgressInfo(g.id).pct : (g.progress || 0)), 0) / state.goals.length : 0;
      if (document.getElementById('dash-goals-val')) document.getElementById('dash-goals-val').textContent = Math.round(gAvg) + '%';
      if (document.getElementById('circ-txt-goals')) document.getElementById('circ-txt-goals').textContent = Math.round(gAvg) + '%';
      updateCircle('circ-goals', gAvg);

      if (typeof renderChart === 'function' && document.getElementById('productivityChart')) renderChart();
    }
    function renderChart() {}
    // --- Library Logic ---
    let currentLibBookId = null;
    function renderLibrary() {
      const grid = document.getElementById('library-grid');
      if (!grid) return;
      const books = state.readerBooks || [];
      if (!books.length) { grid.innerHTML = '<div class="empty">مكتبتك فارغة — أضف كتابك الأول!</div>'; return; }
      grid.innerHTML = books.map(b => {
        const pct = b.total > 0 ? Math.round((b.progress / b.total) * 100) : 0;
        return `<div class="card-box" style="margin-bottom:14px;">
          <div class="card-hdr" style="cursor:pointer;" onclick="openLibBook(${b.id})">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="font-size:26px;">📄</div>
              <div class="card-title">${b.title}</div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <span style="font-size:13px; font-weight:800; color:var(--primary); font-family:'JetBrains Mono',monospace;">${pct}%</span>
              <button class="del-btn" onclick="event.stopPropagation(); delLibBook(${b.id})" title="حذف">✕</button>
            </div>
          </div>
          <div class="prog-wrap" style="margin-top:8px;">
            <div class="prog-bg"><div class="prog-fill" style="background:var(--primary);width:${pct}%"></div></div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; margin-top:10px;" onclick="event.stopPropagation()">
            <input type="number" value="${b.progress || 0}" min="0" id="card-cur-${b.id}" class="inp" style="width:70px; padding:6px 8px; font-size:13px; text-align:center;" placeholder="0" onchange="saveLibCardProgress(${b.id})">
            <span style="color:var(--text3);">/</span>
            <input type="number" value="${b.total || 0}" min="1" id="card-tot-${b.id}" class="inp" style="width:70px; padding:6px 8px; font-size:13px; text-align:center;" placeholder="100" onchange="saveLibCardProgress(${b.id})">
            <span style="font-size:12px; color:var(--text3);">صفحة</span>
          </div>
        </div>`;
      }).join('');
    }
    function openAddBookForm() { document.getElementById('lib-add-form').style.display = 'block'; }
    function closeAddBookForm() {
      document.getElementById('lib-add-form').style.display = 'none';
      ['lib-new-title','lib-new-url','lib-new-pages'].forEach(id => document.getElementById(id).value = '');
    }
    function saveLibBook() {
      const title = document.getElementById('lib-new-title').value.trim();
      const url = document.getElementById('lib-new-url').value.trim();
      const pages = parseInt(document.getElementById('lib-new-pages').value) || 1;
      if (!title) { toast('أدخل اسم الكتاب'); return; }
      if (!state.readerBooks) state.readerBooks = [];
      state.readerBooks.push({ id: Date.now(), title, url, progress: 0, total: pages, notes: '' });
      saveState();
      closeAddBookForm();
      renderLibrary();
      toast('تمت الإضافة 📚');
    }
    function saveLibCardProgress(id) {
      const b = (state.readerBooks || []).find(x => x.id === id);
      if (!b) return;
      const total = parseInt(document.getElementById('card-tot-' + id).value) || 1;
      const cur = Math.min(parseInt(document.getElementById('card-cur-' + id).value) || 0, total);
      b.total = total; b.progress = cur;
      saveState(); renderLibrary(); renderDashboard();
    }
    function delLibBook(id) {
      state.readerBooks = (state.readerBooks || []).filter(b => b.id !== id);
      if (currentLibBookId === id) closeLibReadView();
      saveState();
      renderLibrary();
      toast('تم الحذف ✓');
    }
    function openLibBook(id) {
      const b = (state.readerBooks || []).find(x => x.id === id);
      if (!b) return;
      currentLibBookId = id;
      document.getElementById('lib-grid-view').style.display = 'none';
      document.getElementById('lib-read-view').style.display = 'block';
      document.getElementById('lib-read-title').textContent = b.title;
      document.getElementById('lib-notes').value = b.notes || '';
      const openBtn = document.getElementById('lib-open-btn');
      if (openBtn) openBtn.style.display = b.url ? 'flex' : 'none';
    }
    function closeLibReadView() {
      document.getElementById('lib-read-view').style.display = 'none';
      document.getElementById('lib-grid-view').style.display = 'block';
      currentLibBookId = null;
    }
    function saveLibNotes() {
      if (!currentLibBookId) return;
      const b = (state.readerBooks || []).find(x => x.id === currentLibBookId);
      if (!b) return;
      b.notes = document.getElementById('lib-notes').value;
      saveState();
      toast('تم حفظ الملاحظات ✓');
    }
    function openLibPdf() {
      const b = (state.readerBooks || []).find(x => x.id === currentLibBookId);
      if (b && b.url) window.open(b.url, '_blank');
    }
    document.getElementById('main').addEventListener('scroll', function () {
      var mainEl = document.getElementById('main');
      var winScroll = mainEl.scrollTop;
      var height = mainEl.scrollHeight - mainEl.clientHeight;
      var scrolled = height > 0 ? (winScroll / height) * 100 : 0;
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
      if (clockEl) clockEl.textContent = '00:00';
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
      if (breatheSessionTimerInterval) clearInterval(breatheSessionTimerInterval);
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
        playSound('ring');
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
        renderHabits();
        renderDailyMiniDash();
        playSound('achieve');
        toast('رائع! لقد أتممت تمرين التنفس اليومي 🎉');
      }
    }
    function deleteBreatheToday() {
      if (!state.journal[today]) return;
      delete state.journal[today].breatheTime;
      delete state.journal[today].breatheDone;
      saveState();
      renderHabits();
      renderBreatheStatus();
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
    let focusMistakes = 0;
    let stroopScore = 0;
    let stroopTimeLeft = 60;
    let currentStroopColor = '';
    const focusColors = [
      { name: 'أحمر', hex: '#ef4444' },
      { name: 'أزرق', hex: '#3b82f6' },
      { name: 'أخضر', hex: '#22c55e' },
      { name: 'أصفر', hex: '#eab308' }
    ];
    

        
    
    
    
    // Slide Logic
    let slideMoves = 0;
    let slideTimeLeft = 120;
    let slideState = [];
    let slideTarget = [];
    let slideInterval = null;
    const slideColors = ['#ef4444', '#ef4444', '#3b82f6', '#3b82f6', '#22c55e', '#22c55e', '#eab308', '#eab308', null];
    
    
    
    
    // Word Search Logic
    const ALL_WS_WORDS = [
      'حديقة', 'ممرضة', 'فلاح', 'زهرة', 'ورد', 'ناقة', 'دراجة', 'بيضة', 'تفاح', 'برتقال',
      'طبيب', 'مدرسة', 'جامعة', 'كتاب', 'قلم', 'دفتر', 'شمس', 'قمر', 'نجوم', 'كوكب',
      'سماء', 'أرض', 'بحر', 'نهر', 'جبل', 'شجرة', 'سيارة', 'طائرة', 'قطار', 'سفينة',
      'باب', 'نافذة', 'جدار', 'سقف', 'طاولة', 'كرسي', 'مصباح', 'هاتف', 'حاسوب', 'ساعة',
      'صلاة', 'قرآن', 'دعاء', 'مسجد', 'صيام', 'زكاة', 'حج', 'عمرة', 'صدقة', 'إيمان',
      'صبر', 'شكر', 'توكل', 'يقين', 'نجاح', 'أمل', 'طموح', 'إرادة', 'عزيمة', 'إصرار',
      'أسد', 'نمر', 'فهد', 'ذئب', 'ثعلب', 'غزال', 'زرافة', 'فيل', 'قرد', 'أرنب',
      'حمامة', 'عصفور', 'نسر', 'صقر', 'بومة', 'غراب', 'بطة', 'دجاجة', 'ديك', 'طاووس',
      'ذهب', 'فضة', 'نحاس', 'حديد', 'خشب', 'زجاج', 'ورق', 'قماش', 'حرير', 'قطن',
      'أبيض', 'أسود', 'أحمر', 'أزرق', 'أخضر', 'أصفر', 'برتقالي', 'بنفسجي', 'وردي', 'بني'
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
    const wsColors = ['#ef4444', '#3b82f6', '#10b981', 'var(--primary)', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    let wsColorIndex = 0;
    let wsInterval = null;
    let isDragging = false;
    let startCell = null;
    let selectedCells = [];
    
    
    
    
    
    
    
    // Infinity Path Logic
    let infTime = 0;
    let infLoops = 0;
    let infInterval = null;
    let infCurrentNode = 0;
    let infNodesData = [];
    // Path coordinates mapping roughly to the SVG infinity path (viewBox 0 0 100 50)
    const infPathCoords = [
      { x: 50, y: 25 }, // Center
      { x: 65, y: 10 },  // TR1
      { x: 82, y: 10 },  // TR2
      { x: 95, y: 25 }, // R
      { x: 82, y: 40 }, // BR2
      { x: 65, y: 40 }, // BR1
      { x: 50, y: 25 }, // Center
      { x: 35, y: 40 }, // BL1
      { x: 18, y: 40 }, // BL2
      { x: 5, y: 25 }, // L
      { x: 18, y: 10 },  // TL2
      { x: 35, y: 10 }   // TL1
    ];
    
    
    
    
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
      startD.setHours(0, 0, 0, 0);
      endD.setHours(23, 59, 59, 999);
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
    
    // --- Sum Match Game ---
    let smTarget = 0;
    let smPairsToFind = 12;
    let smPairsFound = 0;
    let smGrid = [];
    let smSelectedCell = null;
    let smTime = 0;
    let smInterval = null;
    
    
    
    
    // --- Shape Counter Game ---
    let scExpected = { circle: 0, square: 0, triangle: 0, rect: 0 };
    
    
    
    
    // --- Pattern Copy Game ---
    let pcTarget = [];
    let pcPlayer = [];
    
    
    
    
    
    
    
    
    // --- Size Sorter Game ---
    let ssShapes = [];
    let ssSelectedIdx = -1;
    
    
    
    
    
    
    

    

    

    

    

    

    

    

  function exportReportPDF() {
  window.print();
}

document.addEventListener('DOMContentLoaded', () => {
  
  loadState();
});
