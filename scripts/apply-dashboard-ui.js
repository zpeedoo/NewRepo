const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Inject Dashboard Button in focus-menu
const dashButton = `
        <div class="card-box" style="margin-bottom: 20px; cursor: pointer; border-right: 4px solid #f59e0b; background: linear-gradient(135deg, #fffbeb, #fef3c7);" onclick="openFocusDashboard()">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;">
            <h3 style="margin: 0; color: #92400e;">⚡ مؤشر الأداء الذهني (LPI)</h3>
            <span style="font-size:16px;">📊</span>
          </div>
          <p style="font-size: 13px; color: #b45309;">تتبع تطور مهاراتك الذهنية عبر الوقت من خلال ألعاب التركيز.</p>
        </div>
`;
html = html.replace('<div id="focus-menu">', '<div id="focus-menu">\n' + dashButton);

// 2. Inject Dashboard UI
const dashboardUI = `
      <!-- Focus Dashboard Area -->
      <div id="focus-dashboard-area" style="display: none;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
          <h2 style="margin:0; font-weight:800; color:var(--black);">مؤشر الأداء الذهني ⚡</h2>
        </div>
        
        <select id="focus-dash-timeframe" class="input-field" onchange="renderFocusDashboard()" style="margin-bottom: 20px; padding: 10px; border-radius: 12px;">
          <option value="today">اليوم</option>
          <option value="7days">آخر 7 أيام</option>
          <option value="30days">آخر 30 يوم</option>
          <option value="alltime">كل الأوقات</option>
        </select>
        
        <div style="background: var(--surface2); border: 1px solid var(--border-darker); border-radius: 16px; padding: 20px;">
          <h3 style="margin:0 0 10px 0; color:var(--black); font-size:18px;">المؤشر العام (Overall LPI)</h3>
          <p style="margin:0 0 20px 0; color:var(--text2); font-size:12px; line-height:1.6;">يتم حساب مؤشرك العام بناءً على متوسط أفضل نتائجك في جميع المجالات خلال الفترة المحددة.</p>
          
          <div id="focus-dash-categories" style="display: flex; flex-direction: column; gap: 15px;">
            <!-- Categories injected here -->
          </div>
        </div>
        
        <button class="btn" style="background:var(--surface2); color:var(--text); margin-top:30px; width:100%; box-shadow:none;" onclick="closeFocusDashboard()">🔙 عودة للقائمة</button>
      </div>
`;
html = html.replace('<!-- Stroop Game Area -->', dashboardUI + '\n      <!-- Stroop Game Area -->');

// 3. Inject JS Logic
const dashLogic = `
    function openFocusDashboard() {
      document.getElementById('focus-menu').style.display = 'none';
      document.getElementById('focus-dashboard-area').style.display = 'block';
      renderFocusDashboard();
    }
    
    function closeFocusDashboard() {
      document.getElementById('focus-dashboard-area').style.display = 'none';
      document.getElementById('focus-menu').style.display = 'block';
    }
    
    function renderFocusDashboard() {
      const timeframe = document.getElementById('focus-dash-timeframe').value;
      const history = state.gameHistory || {};
      
      let datesToInclude = [];
      const now = new Date();
      now.setHours(0,0,0,0);
      
      Object.keys(history).forEach(dStr => {
        const d = new Date(dStr);
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (timeframe === 'today' && diffDays === 0) datesToInclude.push(dStr);
        if (timeframe === '7days' && diffDays < 7) datesToInclude.push(dStr);
        if (timeframe === '30days' && diffDays < 30) datesToInclude.push(dStr);
        if (timeframe === 'alltime') datesToInclude.push(dStr);
      });
      
      // Calculate max score per game within the timeframe
      const bestScores = { stroop:0, vs:0, slide:0, sm:0, sc:0, direction:0, sizesorter:0, mc:0 };
      
      datesToInclude.forEach(dStr => {
        const dayData = history[dStr];
        Object.keys(bestScores).forEach(game => {
          if (dayData[game] && dayData[game].length > 0) {
            const maxForDay = Math.max(...dayData[game]);
            if (maxForDay > bestScores[game]) bestScores[game] = maxForDay;
          }
        });
      });
      
      // Map to Categories
      // Speed: direction, vs
      // Memory: mc
      // Attention: stroop, vs, direction
      // Flexibility: stroop, slide, sizesorter
      // Reasoning & Math: sm, sc
      
      const calcAvg = (gamesArr) => {
        let sum = 0, count = 0;
        gamesArr.forEach(g => { if(bestScores[g] > 0) { sum += bestScores[g]; count++; } });
        return count > 0 ? Math.round(sum / count) : 0;
      };
      
      const categories = [
        { name: 'السرعة (Speed)', score: calcAvg(['direction', 'vs']), max: 8000 },
        { name: 'الذاكرة (Memory)', score: calcAvg(['mc']), max: 3000 },
        { name: 'الانتباه (Attention)', score: calcAvg(['stroop', 'vs', 'direction']), max: 6000 },
        { name: 'المرونة (Flexibility)', score: calcAvg(['stroop', 'slide', 'sizesorter']), max: 4000 },
        { name: 'المنطق (Reasoning & Math)', score: calcAvg(['sm', 'sc']), max: 5000 }
      ];
      
      let html = '';
      categories.forEach(c => {
        let scoreText = c.score > 0 ? c.score : '--';
        let pct = c.score > 0 ? Math.min(100, Math.max(5, (c.score / c.max) * 100)) : 0;
        
        html += \`
          <div>
            <div style="font-size:14px; font-weight:bold; color:var(--black); margin-bottom:5px;">\${c.name}</div>
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="flex:1; height:12px; background:var(--border); border-radius:6px; overflow:hidden;">
                <div style="width:\${pct}%; height:100%; background:linear-gradient(90deg, #fcd34d, #f59e0b); border-radius:6px; transition: width 0.5s;"></div>
              </div>
              <div style="font-weight:bold; color:var(--text); font-family:'JetBrains Mono', monospace; width:40px; text-align:right;">\${scoreText}</div>
            </div>
          </div>
        \`;
      });
      
      document.getElementById('focus-dash-categories').innerHTML = html;
    }
`;
html = html.replace('function startStroopGame() {', dashLogic + '\n    function startStroopGame() {');

fs.writeFileSync('life-planner.html', html);
console.log('Dashboard UI injected');
