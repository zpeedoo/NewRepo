const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// First, remove the broken injected code at the end
let brokenLogicRegex = /    \/\/ \-\-\- Direction Game \-\-\-[\s\S]*?el\.style\.transform = \\`rotate\(\\\$\{rotation\}deg\)\\/;
html = html.replace(brokenLogicRegex, '');

// Also remove any dangling text that might be part of it
html = html.replace(/    \/\/ \-\-\- Direction Game \-\-\-[\s\S]*?(?=<\/script>)/, '');


const correctLogic = `
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
        el.style.transform = 'rotate(' + rotation + 'deg)';
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

// Insert the correct logic
let lastIndex = html.lastIndexOf('</script>');
let before = html.substring(0, lastIndex);
let after = html.substring(lastIndex);
html = before + correctLogic + '\n' + after;

fs.writeFileSync('life-planner.html', html, 'utf8');
