const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Replace HTML
const oldHtmlRegex = /<!-- Direction Game Area -->[\s\S]*?(?=<!-- Stroop Game Area -->)/;
const newHtml = `<!-- Direction Game Area -->
      <div id="focus-direction-area" style="display: none; text-align: center; height: 100vh; flex-direction: column; background-color: #0f172a; position: fixed; inset: 0; z-index: 10000; overflow: hidden;">
        <!-- Top Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.1); padding: 15px 20px; color: white;">
          <button onclick="endDirectionGameEarly()" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">✖</button>
          <div style="font-weight: bold; display:flex; gap:20px; font-size:18px;">
             <div>الوقت: <span id="direction-time">60</span></div>
             <div>النقاط: <span id="direction-score" style="color:#fbbf24;">0</span></div>
          </div>
        </div>
        
        <!-- Game Canvas -->
        <div id="direction-canvas-container" style="flex-grow: 1; position:relative; overflow:hidden; touch-action: none; cursor: grab;">
           <div id="direction-layer" style="position:absolute; inset:0;"></div>
           <div id="direction-hint" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.2); font-size:40px; pointer-events:none; font-weight:bold;">اسحب على الشاشة (Swipe)</div>
        </div>
        
        <!-- Bottom Prompt -->
        <div style="display:flex; background: rgba(255,255,255,0.1); height: 80px;">
           <div id="prompt-pointing" style="flex:1; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold; color:white; border-left:1px solid rgba(255,255,255,0.2); transition:0.3s;">الاتجاه (POINTING)</div>
           <div id="prompt-moving" style="flex:1; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold; color:white; transition:0.3s;">الحركة (MOVING)</div>
        </div>
      </div>
      
      `;
html = html.replace(oldHtmlRegex, newHtml);

// 2. Replace JS Logic
const oldJsRegex = /\/\/ \-\-\- Direction Game \-\-\-[\s\S]*?(?=<\/script>)/;

const newJs = `// --- Direction Game ---
    let dirTime = 60;
    let dirScore = 0;
    let dirInterval = null;
    let dirRule = 'moving';
    let dirPoint = 'up';
    let dirMove = 'up';
    let dirArrows = [];
    let dirAnimFrame = null;
    const dirs = ['up', 'down', 'left', 'right'];
    
    // Swipe logic
    let dirTouchStartX = 0;
    let dirTouchStartY = 0;
    let dirIsMouseDown = false;
    
    function initDirectionSwipe() {
      const container = document.getElementById('direction-canvas-container');
      if(!container || container.dataset.swipeInit) return;
      container.dataset.swipeInit = 'true';
      
      container.addEventListener('touchstart', e => {
        dirTouchStartX = e.changedTouches[0].screenX;
        dirTouchStartY = e.changedTouches[0].screenY;
      }, {passive: true});
      
      container.addEventListener('touchend', e => {
        let touchEndX = e.changedTouches[0].screenX;
        let touchEndY = e.changedTouches[0].screenY;
        handleDirectionSwipe(dirTouchStartX, dirTouchStartY, touchEndX, touchEndY);
      }, {passive: true});
      
      container.addEventListener('mousedown', e => {
        dirIsMouseDown = true;
        dirTouchStartX = e.clientX;
        dirTouchStartY = e.clientY;
        container.style.cursor = 'grabbing';
      });
      container.addEventListener('mouseup', e => {
        if(!dirIsMouseDown) return;
        dirIsMouseDown = false;
        container.style.cursor = 'grab';
        let touchEndX = e.clientX;
        let touchEndY = e.clientY;
        handleDirectionSwipe(dirTouchStartX, dirTouchStartY, touchEndX, touchEndY);
      });
      container.addEventListener('mouseleave', e => {
        dirIsMouseDown = false;
        container.style.cursor = 'grab';
      });
    }

    function handleDirectionSwipe(startX, startY, endX, endY) {
      if(document.getElementById('focus-direction-area').style.display !== 'flex') return;
      let diffX = endX - startX;
      let diffY = endY - startY;
      if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) return; // Too short
      
      let inputDir = '';
      if (Math.abs(diffX) > Math.abs(diffY)) {
        inputDir = diffX > 0 ? 'right' : 'left';
      } else {
        inputDir = diffY > 0 ? 'down' : 'up';
      }
      handleDirectionInput(inputDir);
    }
    
    function startDirectionGame() {
      initDirectionSwipe();
      focusMistakes = 0; if(document.getElementById('mistake-count')) document.getElementById('mistake-count').textContent = 0; if(document.getElementById('global-mistake-counter')) document.getElementById('global-mistake-counter').style.display = 'block';
      hideAllFocusGames();
      document.getElementById('focus-direction-area').style.display = 'flex';
      dirTime = 60;
      dirScore = 0;
      document.getElementById('direction-time').textContent = dirTime;
      document.getElementById('direction-score').textContent = dirScore;
      document.getElementById('direction-hint').style.display = 'flex';
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
      document.getElementById('focus-direction-area').style.display = 'none';
      if (!state.highScores.direction || dirScore > state.highScores.direction) state.highScores.direction = dirScore; saveState(); updateHighScores();
      endGame('الحركة والاتجاه 🧭', dirScore);
    }
    
    function spawnDirectionFlock() {
      dirRule = Math.random() > 0.5 ? 'moving' : 'pointing';
      dirPoint = dirs[Math.floor(Math.random() * dirs.length)];
      dirMove = dirs[Math.floor(Math.random() * dirs.length)];
      
      const pPointing = document.getElementById('prompt-pointing');
      const pMoving = document.getElementById('prompt-moving');
      
      if(dirRule === 'moving') {
        pMoving.style.background = '#f59e0b';
        pPointing.style.background = 'transparent';
      } else {
        pPointing.style.background = '#f59e0b';
        pMoving.style.background = 'transparent';
      }
      
      const layer = document.getElementById('direction-layer');
      layer.innerHTML = '';
      dirArrows = [];
      const numArrows = 10 + Math.floor(Math.random()*5);
      
      let rotation = 0;
      if(dirPoint === 'right') rotation = 90;
      if(dirPoint === 'down') rotation = 180;
      if(dirPoint === 'left') rotation = -90;
      
      const leafSvg = '<svg viewBox="0 0 100 150" width="40px" height="60px" style="display:block;"><line x1="50" y1="5" x2="50" y2="120" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/><path d="M 50 20 C 100 60, 90 130, 50 140 C 10 130, 0 60, 50 20 Z" fill="#f59e0b" stroke="white" stroke-width="6"/></svg>';
      
      for(let i=0; i<numArrows; i++) {
        const el = document.createElement('div');
        el.innerHTML = leafSvg;
        el.style.position = 'absolute';
        el.style.transform = 'rotate(' + rotation + 'deg)';
        el.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))';
        el.style.transition = 'opacity 0.2s ease, transform 0.1s linear';
        
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
        let speed = 0.5;
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
      if(document.getElementById('focus-direction-area').style.display === 'flex') {
        dirAnimFrame = requestAnimationFrame(animateDirectionFlock);
      }
    }
    
    function handleDirectionInput(inputDir) {
      document.getElementById('direction-hint').style.display = 'none';
      let expected = dirRule === 'moving' ? dirMove : dirPoint;
      if (inputDir === expected) {
        if(typeof playSound === 'function') playSound('soft');
        dirScore += 10;
        document.getElementById('direction-score').textContent = dirScore;
        // Fade out leaves and spawn new
        dirArrows.forEach(a => {
            a.el.style.transform += ' scale(0)';
            a.el.style.opacity = '0';
        });
        setTimeout(spawnDirectionFlock, 150);
      } else {
        if(typeof playSound === 'function') playSound('error');
        shakeScreen();
        focusMistakes++;
        if(document.getElementById('mistake-count')) document.getElementById('mistake-count').textContent = focusMistakes;
      }
    }
`;

html = html.replace(oldJsRegex, newJs + '\n');
fs.writeFileSync('life-planner.html', html, 'utf8');
