const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Add Direction Game to Menu
const newMenuCard = `
        <div class="card-box" style="margin-bottom: 20px; cursor: pointer; border-right: 4px solid #f97316;" onclick="startDirectionGame()">
          <h3 style="margin-bottom: 5px; color: var(--black);">الحركة والاتجاه 🧭</h3>
          <p style="font-size: 13px; color: var(--text2);">حدد اتجاه الأسهم أو اتجاه حركتها بناءً على القاعدة المطلوبة بأسرع وقت.</p>
        </div>
`;
html = html.replace(/(<div id="focus-menu">[\s\S]*?)(<\/div>\s*<!-- Stroop Game Area -->)/, `$1${newMenuCard}$2`);

// 2. High Score injection for existing games using regex
const games = [
  { title: "اختبار ستروب \\(Stroop\\) 🎨", id: "stroop" },
  { title: "البحث البصري 🔍", id: "visual" },
  { title: "لغز المربعات المنزلقة 🧩", id: "slide" },
  { title: "مطابقة المجاميع 🔢", id: "summatch" },
  { title: "عد الأشكال 🔵", id: "shapecounter" },
  { title: "نسخ النمط 🔲", id: "patterncopy" },
  { title: "ترتيب الأحجام 📏", id: "sizesorter" },
  { title: "البحث عن الكلمات 📝", id: "wordsearch" },
  { title: "مسار اللانهاية ♾️", id: "infinity" },
  { title: "الذاكرة المكانية 📍", id: "memoryconnect" },
  { title: "الحركة والاتجاه 🧭", id: "direction" }
];
games.forEach(g => {
  const regex = new RegExp(`(<h3.*?>)(${g.title})(<\\/h3>)`);
  html = html.replace(regex, `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;">$1$2$3<span style="font-size:12px; color:var(--text3); font-weight:bold;" id="hs-${g.id}">🏆 0</span></div>`);
});
// Remove margin-bottom from h3 that are now inside flex container
html = html.replace(/<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;"><h3 style="margin-bottom: 5px;/g, '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;"><h3 style="margin: 0;');

// 3. Add Direction Game Area HTML
const directionGameHtml = `
      <!-- Direction Game Area -->
      <div id="focus-direction-area" style="display: none; text-align: center;">
        <div style="display:flex; justify-content:space-between; margin-bottom: 10px;">
          <div style="font-weight: bold; color: var(--text2);">الوقت: <span id="direction-time" style="color:var(--black);">60</span></div>
          <div style="font-weight: bold; color: var(--text2);">النقاط: <span id="direction-score" style="color:var(--primary);">0</span></div>
        </div>
        
        <div id="direction-rule" style="background:var(--primary); color:white; padding:10px; border-radius:12px; font-size:24px; font-weight:bold; margin-bottom:15px; box-shadow:0 4px 10px rgba(0,0,0,0.1); letter-spacing:1px;">الحركة</div>
        
        <div id="direction-canvas-container" style="background:var(--black); border-radius:16px; height: 260px; position:relative; overflow:hidden; margin-bottom:20px;">
           <div id="direction-layer" style="position:absolute; inset:0;"></div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; width: 220px; margin: 0 auto; margin-bottom:20px;">
          <div></div>
          <button class="btn btn-dark" style="font-size: 28px; padding: 15px;" onclick="handleDirectionInput('up')">⬆️</button>
          <div></div>
          <button class="btn btn-dark" style="font-size: 28px; padding: 15px;" onclick="handleDirectionInput('left')">⬅️</button>
          <button class="btn btn-dark" style="font-size: 28px; padding: 15px;" onclick="handleDirectionInput('down')">⬇️</button>
          <button class="btn btn-dark" style="font-size: 28px; padding: 15px;" onclick="handleDirectionInput('right')">➡️</button>
        </div>
        <button class="btn" style="width: 100%; border:1px solid var(--border);" onclick="endDirectionGameEarly()">إنهاء اللعبة مبكراً</button>
      </div>
`;
html = html.replace(/(<!-- Stroop Game Area -->)/, `${directionGameHtml}\n      $1`);

// 4. Update JS state.highScores
html = html.replace(/focusMistakes:\s*0\n\s*};/, "focusMistakes: 0,\n    highScores: {}\n  };");

// 5. Add updateHighScores Call
const updateHighScoresCall = `
      if (typeof updateHighScores === 'function') updateHighScores();
    }
    function updateHighScores() {
      if(!state.highScores) state.highScores = {};
      const g = ['stroop','visual','slide','summatch','shapecounter','patterncopy','sizesorter','wordsearch','infinity','memoryconnect','direction'];
      g.forEach(id => {
        if(document.getElementById('hs-'+id)) {
           document.getElementById('hs-'+id).textContent = '🏆 ' + (state.highScores[id] || 0);
        }
      });
    }`;
html = html.replace(/if\(typeof populateReportSelector === 'function'\) populateReportSelector\(\);\s*\}/, updateHighScoresCall);

// 6. Add Direction Logic
const directionLogicJs = `
    // --- Direction Game ---
    let dirTime = 60;
    let dirScore = 0;
    let dirInterval = null;
    let dirRule = 'moving';
    let dirPoint = 'up';
    let dirMove = 'up';
    let dirArrows = [];
    let dirAnimFrame = null;
    const dirs = ['up', 'down', 'left', 'right'];
    
    function startDirectionGame() {
      focusMistakes = 0; if(document.getElementById('mistake-count')) document.getElementById('mistake-count').textContent = 0; if(document.getElementById('global-mistake-counter')) document.getElementById('global-mistake-counter').style.display = 'block';
      hideAllFocusGames();
      document.getElementById('focus-direction-area').style.display = 'block';
      dirTime = 60;
      dirScore = 0;
      document.getElementById('direction-time').textContent = dirTime;
      document.getElementById('direction-score').textContent = dirScore;
      spawnDirectionFlock();
      clearInterval(dirInterval);
      dirInterval = setInterval(() => {
        dirTime--;
        document.getElementById('direction-time').textContent = dirTime;
        if (dirTime <= 0) {
          endDirectionGameEarly();
        }
      }, 1000);
    }
    
    function endDirectionGameEarly() {
      clearInterval(dirInterval);
      if(dirAnimFrame) cancelAnimationFrame(dirAnimFrame);
      if (!state.highScores.direction || dirScore > state.highScores.direction) state.highScores.direction = dirScore; saveState(); updateHighScores();
      endGame('الحركة والاتجاه 🧭', dirScore);
    }
    
    function spawnDirectionFlock() {
      dirRule = Math.random() > 0.5 ? 'moving' : 'pointing';
      dirPoint = dirs[Math.floor(Math.random() * dirs.length)];
      dirMove = dirs[Math.floor(Math.random() * dirs.length)];
      
      const ruleEl = document.getElementById('direction-rule');
      ruleEl.textContent = dirRule === 'moving' ? 'الحركة (المسار) 🏃‍♂️' : 'الاتجاه (رأس السهم) 🎯';
      ruleEl.style.background = dirRule === 'moving' ? '#f97316' : '#8b5cf6';
      
      const layer = document.getElementById('direction-layer');
      layer.innerHTML = '';
      dirArrows = [];
      const numArrows = 12;
      
      let rotation = 0;
      if(dirPoint === 'right') rotation = 90;
      if(dirPoint === 'down') rotation = 180;
      if(dirPoint === 'left') rotation = -90;
      
      for(let i=0; i<numArrows; i++) {
        const el = document.createElement('div');
        el.innerHTML = '⬆'; // Arrow symbol
        el.style.position = 'absolute';
        el.style.fontSize = '35px';
        el.style.fontWeight = 'bold';
        el.style.color = '#fbbf24'; // Amber yellow color for arrows like the image
        el.style.transform = \`rotate(\${rotation}deg)\`;
        el.style.textShadow = '0 2px 5px rgba(0,0,0,0.8)';
        el.style.transition = 'opacity 0.2s ease';
        
        let x = 10 + Math.random() * 80;
        let y = 10 + Math.random() * 80;
        
        el.style.left = x + '%';
        el.style.top = y + '%';
        layer.appendChild(el);
        dirArrows.push({el, x, y});
      }
      if(dirAnimFrame) cancelAnimationFrame(dirAnimFrame);
      animateDirectionFlock();
    }
    
    function animateDirectionFlock() {
      dirArrows.forEach(a => {
        let speed = 0.6;
        if(dirMove === 'right') a.x += speed;
        if(dirMove === 'left') a.x -= speed;
        if(dirMove === 'down') a.y += speed;
        if(dirMove === 'up') a.y -= speed;
        
        if(a.x > 110) a.x = -10;
        if(a.x < -10) a.x = 110;
        if(a.y > 110) a.y = -10;
        if(a.y < -10) a.y = 110;
        
        a.el.style.left = a.x + '%';
        a.el.style.top = a.y + '%';
      });
      if(document.getElementById('focus-direction-area').style.display === 'block') {
        dirAnimFrame = requestAnimationFrame(animateDirectionFlock);
      }
    }
    
    function handleDirectionInput(inputDir) {
      let expected = dirRule === 'moving' ? dirMove : dirPoint;
      if (inputDir === expected) {
        if(typeof playSound === 'function') playSound('soft');
        dirScore += 10;
        document.getElementById('direction-score').textContent = dirScore;
        // Fade out arrows and spawn new
        dirArrows.forEach(a => a.el.style.opacity = '0');
        setTimeout(spawnDirectionFlock, 100);
      } else {
        if(typeof playSound === 'function') playSound('error');
        shakeScreen();
        focusMistakes++;
        if(document.getElementById('mistake-count')) document.getElementById('mistake-count').textContent = focusMistakes;
      }
    }
`;
html = html.replace(/\/\/ --- END FOCUS GYM LOGIC ---/, `${directionLogicJs}\n    // --- END FOCUS GYM LOGIC ---`);

// 7. Fix hideAllFocusGames to include all
const newHideAll = `function hideAllFocusGames() {
      document.getElementById('focus-menu').style.display = 'none';
      const areas = ['stroop','visual','slide','wordsearch','summatch','shapecounter','patterncopy','sizesorter','infinity','memoryconnect','direction'];
      areas.forEach(a => {
        const el = document.getElementById('focus-' + a + '-area');
        if(el) el.style.display = 'none';
      });
    }`;
html = html.replace(/function hideAllFocusGames\(\) \{[\s\S]*?\}\n/m, `${newHideAll}\n`);

// 8. Update all endGame calls
const scoreUpdates = [
  ['اختبار ستروب \\(Stroop\\)', 'stroopScore', 'stroop', '>'],
  ['البحث البصري', 'vsScore', 'visual', '>'],
  ['لغز المربعات المنزلقة', 'slideMoves', 'slide', '<'],
  ['مطابقة المجاميع', 'smTime', 'summatch', '<'],
  ['عد الأشكال', '100', 'shapecounter', '>'],
  ['نسخ النمط', '100', 'patterncopy', '>'],
  ['ترتيب الأحجام', '100', 'sizesorter', '>'],
  ['البحث عن الكلمات', 'wsTime', 'wordsearch', '<'],
  ['مسار اللانهاية', 'infTime', 'infinity', '<'],
  ['الذاكرة المكانية', 'mcTime', 'memoryconnect', '<']
];
scoreUpdates.forEach(u => {
  const [title, scoreVar, id, op] = u;
  const regex = new RegExp(`endGame\\('${title}',\\s*${scoreVar}\\);`, 'g');
  let logic = `if(!state.highScores.${id} || ${scoreVar} ${op} state.highScores.${id} || state.highScores.${id} === 0) state.highScores.${id} = ${scoreVar}; saveState(); updateHighScores();`;
  if(op === '>') logic = `if(!state.highScores.${id} || ${scoreVar} > state.highScores.${id}) state.highScores.${id} = ${scoreVar}; saveState(); updateHighScores();`;
  html = html.replace(regex, `${logic} endGame('${title.replace(/\\/g,'')}', ${scoreVar});`);
});

fs.writeFileSync('life-planner.html', html, 'utf8');
