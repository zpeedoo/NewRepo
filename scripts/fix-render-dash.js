const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

const dashOld = /function renderDashboard\(\) \{[\s\S]*?renderChart\(\);\s*\}/;

const dashNew = `function renderDashboard() {
      const activeToday = getActiveHabitsForDate(today); const dDone = activeToday.filter(h => (state.history[today] || []).includes(h.id)).length; const dPct = activeToday.length ? (dDone / activeToday.length * 100) : 0;
      if (document.getElementById('dash-daily-val')) document.getElementById('dash-daily-val').textContent = \`\${dDone}/\${activeToday.length}\`; 
      if (document.getElementById('circ-txt-daily')) document.getElementById('circ-txt-daily').textContent = Math.round(dPct) + '%'; 
      updateCircle('circ-daily', dPct);
      
      let totalP_manual = 0, readP_manual = 0; state.books.forEach(b => { totalP_manual += b.totalPages; readP_manual += b.readPages; }); const manualPct = totalP_manual > 0 ? (readP_manual / totalP_manual * 100) : 0;
      let totalP_smart = 0, readP_smart = 0; state.readerBooks.forEach(b => { totalP_smart += b.total; readP_smart += b.progress; }); const smartPct = totalP_smart > 0 ? (readP_smart / totalP_smart * 100) : 0;
      
      if (document.getElementById('dash-books-count')) document.getElementById('dash-books-count').textContent = state.books.length + state.readerBooks.length;
      if (document.getElementById('circ-txt-books-smart')) document.getElementById('circ-txt-books-smart').textContent = Math.round(smartPct) + '%'; updateCircle('circ-books-smart', smartPct);
      if (document.getElementById('circ-txt-books-manual')) document.getElementById('circ-txt-books-manual').textContent = Math.round(manualPct) + '%'; updateCircle('circ-books-manual', manualPct);
      
      let gAvg = state.goals.length > 0 ? state.goals.reduce((s, g) => s + (getGoalProgressInfo(g.id).isAuto ? getGoalProgressInfo(g.id).pct : (g.progress || 0)), 0) / state.goals.length : 0;
      if (document.getElementById('dash-goals-val')) document.getElementById('dash-goals-val').textContent = Math.round(gAvg) + '%'; 
      if (document.getElementById('circ-txt-goals')) document.getElementById('circ-txt-goals').textContent = Math.round(gAvg) + '%'; 
      updateCircle('circ-goals', gAvg);
      
      if (typeof renderChart === 'function' && document.getElementById('productivityChart')) renderChart();
    }`;

html = html.replace(dashOld, dashNew);

// Delete renderChart entirely
html = html.replace(/function renderChart\(\) \{[\s\S]*?\}\s*function getGoalProgressInfo/m, 'function getGoalProgressInfo');

// BUMP SW CACHE to v17
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/مصاريفي-cache-v\d+/, 'مصاريفي-cache-v17');
fs.writeFileSync('sw.js', sw, 'utf8');

fs.writeFileSync('life-planner.html', html, 'utf8');
console.log('Fixed renderDashboard null references.');
