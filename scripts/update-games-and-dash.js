const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Remove the analytics card completely
html = html.replace(/\s*<!-- Moved Analytics Card -->\s*<div class="analytics-card">[\s\S]*?<canvas id="productivityChart"><\/canvas>\s*<\/div>\s*<\/div>/, '');

// 2. Fix requestNotification()
const reqNotifOld = /function requestNotification\(\)\s*\{\s*if \(!\("Notification" in window\)\) \{ alert\("المتصفح لا يدعم الإشعارات"\); return; \}\s*Notification\.requestPermission\(\)\.then\(permission => \{\s*if \(permission === "granted"\) openModal\('notif'\);\s*else alert\("يجب تفعيل الصلاحيات من إعدادات المتصفح أولاً\."\);\s*\}\);\s*\}/;
const reqNotifNew = `function requestNotification() {
      openModal('notif');
      if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }`;
html = html.replace(reqNotifOld, reqNotifNew);

// 3. Update renderDailyMiniDash()
const miniDashOld = /function renderDailyMiniDash\(\) \{[\s\S]*?const circleOffset = 188\.4 - \(dPct \/ 100 \* 188\.4\);\s*container\.innerHTML = `.*?`;\s*\}/;
const miniDashNew = `function renderDailyMiniDash() {
      const container = document.getElementById('mini-dash-content');
      if (!container) return;
      if (state.habits.length === 0) { container.innerHTML = \`<div class="empty" style="padding: 20px; border: none; background: transparent;">لا يوجد عادات مجدولة</div>\`; return; }
      
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
      
      if (activeWeeklyHabits.length === 0) { container.innerHTML = \`<div class="empty" style="padding: 20px; border: none; background: transparent;">لا يوجد مهام مطلوبة لهذه الفترة</div>\`; return; }
      
      const dPct = totalExpected === 0 ? 0 : Math.min(Math.round((totalDone / totalExpected) * 100), 100);
      const itemsHtml = activeWeeklyHabits.map(item => {
        const h = item.habit; const expected = item.expected; const done = item.done; const isDone = done >= expected; const pct = Math.min(Math.round((done / expected) * 100), 100);
        const gInfo = state.goals.find(g => g.id == h.goalId); const icon = h.bookId ? '📖' : (gInfo ? '🎯' : '⚡');
        return \`<div class="md-item"><div class="md-icon">\${icon}</div><div class="md-info"><div style="display:flex; justify-content:space-between; align-items:center;"><div class="md-name" title="\${h.title}">\${h.title}</div><div class="md-status \${isDone ? 'done' : ''}">\${pct}%</div></div><div class="md-bar-bg"><div class="md-bar-fill \${isDone ? 'done' : ''}" style="width: \${pct}%"></div></div></div></div>\`;
      }).join('');
      
      const circleOffset = 188.4 - (dPct / 100 * 188.4);
      let filterLabel = 'آخر ' + filterDays + ' أيام';
      if(filterDays===30) filterLabel='آخر شهر'; if(filterDays===90) filterLabel='آخر 3 أشهر'; if(filterDays===180) filterLabel='آخر 6 أشهر'; if(filterDays===365) filterLabel='آخر سنة';
      
      container.innerHTML = \`
        <div class="md-header" style="flex-direction:column; align-items:flex-start; gap:10px;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
             <div class="md-title" style="margin-bottom:0;">التقدم التراكمي</div>
             <select id="mini-dash-filter" onchange="renderDailyMiniDash()" style="font-size:12px; padding:2px 5px; border-radius:6px; border:1px solid var(--border); color:var(--text); background:var(--surface);">
               <option value="7" \${filterDays===7?'selected':''}>أسبوع</option>
               <option value="30" \${filterDays===30?'selected':''}>شهر</option>
               <option value="90" \${filterDays===90?'selected':''}>3 أشهر</option>
               <option value="180" \${filterDays===180?'selected':''}>6 أشهر</option>
               <option value="365" \${filterDays===365?'selected':''}>سنة</option>
             </select>
          </div>
        </div>
        <div class="md-overall" style="margin-top:10px;">
          <div class="circ-wrap" style="transform: scale(0.85); margin: 0; width: 60px; height: 60px;">
            <svg width="60" height="60" viewBox="0 0 70 70" style="overflow:visible;">
              <circle class="circ-bg" cx="35" cy="35" r="30" stroke-width="6"></circle>
              <circle class="circ-val" cx="35" cy="35" r="30" stroke="var(--primary)" stroke-width="6" stroke-dasharray="188.4" stroke-dashoffset="\${circleOffset}" style="transition: stroke-dashoffset 0.8s ease;"></circle>
            </svg>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--text2); font-weight: 700;">المهام المنجزة (\${filterLabel})</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--black);"><span style="color: var(--primary)">\${totalDone}</span> / \${totalExpected} <span style="font-size:14px; color:var(--text3); font-weight:normal;">(\${dPct}%)</span></div>
          </div>
        </div>
        <div class="md-list">\${itemsHtml}</div>
      \`;
    }`;
html = html.replace(miniDashOld, miniDashNew);

// 4. Add Mistakes Counter logic
// Inject global mistake UI to every game header.
// A common pattern in game headers is: <div style="display:flex; justify-content:space-between; margin-bottom: 20px;">
const headerPattern = /<div style="display:flex; justify-content:space-between; margin-bottom: 20px;">\s*<div style="font-weight: bold; color: var\(--text2\);">الوقت:/g;
html = html.replace(headerPattern, `<div style="display:flex; justify-content:space-between; margin-bottom: 20px;">
          <div style="font-weight: bold; color: var(--text2);">الوقت:`);

// Since that didn't inject anything (yet), I will manually inject a global floating mistakes counter!
// Or inject it inside <div id="focus-gym" ...>
// Let's create a global floating Mistakes Counter that only appears during active games.
if (!html.includes('id="global-mistake-counter"')) {
    html = html.replace('<!-- Focus Gym Menu -->', `<!-- Global Mistake Counter -->\n    <div id="global-mistake-counter" style="display:none; position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(239, 68, 68, 0.9); color:white; padding:8px 16px; border-radius:20px; font-weight:bold; z-index:10000; box-shadow:0 4px 10px rgba(239, 68, 68, 0.3);">الأخطاء: <span id="mistake-count">0</span></div>\n    <!-- Focus Gym Menu -->`);
}

// Add global variable let focusMistakes = 0;
if (!html.includes('let focusMistakes = 0;')) {
    html = html.replace('let isFocusGameActive = false;', 'let isFocusGameActive = false;\n    let focusMistakes = 0;');
}

// Update playSound('error') to increment mistakes
html = html.replace(/if\(typeof playSound === 'function'\) playSound\('error'\);/g, `if(typeof playSound === 'function') playSound('error'); focusMistakes++; document.getElementById('mistake-count').textContent = focusMistakes;`);

// Reset and show mistakes on game start
const gameStarts = ['startStroopGame()', 'startVisualSearchGame()', 'startSlideGame()', 'startSumMatchGame()', 'startShapeCounterGame()', 'startPatternCopyGame()', 'startSizeSorterGame()', 'startInfinityGame()', 'startWordSearchGame()'];

gameStarts.forEach(game => {
    const fnRegex = new RegExp(`function ${game.replace('()','')} *\\(\\) *\\{`);
    html = html.replace(fnRegex, (match) => {
        return `${match}\n      focusMistakes = 0; if(document.getElementById('mistake-count')) document.getElementById('mistake-count').textContent = 0; if(document.getElementById('global-mistake-counter')) document.getElementById('global-mistake-counter').style.display = 'block';`;
    });
});

// Hide mistakes counter when focus gym is closed (back to menu)
html = html.replace(/document.getElementById\('focus-menu'\).style.display = 'block';/g, `document.getElementById('focus-menu').style.display = 'block'; if(document.getElementById('global-mistake-counter')) document.getElementById('global-mistake-counter').style.display = 'none';`);

// Hide when modal is closed
html = html.replace(/document.getElementById\('modal-focus'\).classList.remove\('show'\);/g, `document.getElementById('modal-focus').classList.remove('show'); if(document.getElementById('global-mistake-counter')) document.getElementById('global-mistake-counter').style.display = 'none';`);

// BUMP SW CACHE to v16
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/مصاريفي-cache-v\d+/, 'مصاريفي-cache-v16');
fs.writeFileSync('sw.js', sw, 'utf8');

fs.writeFileSync('life-planner.html', html, 'utf8');
console.log('Update script executed successfully.');
