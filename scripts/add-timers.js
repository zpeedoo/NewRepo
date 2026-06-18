const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// Generic function inject
const adjustFn = `    function adjustGameTime(game, amount) {
      if (!isFocusGameActive) return;
      const tMap = {
        stroop: () => { stroopTimeLeft = Math.max(0, stroopTimeLeft + amount); return stroopTimeLeft; },
        slide:  () => { slideTimeLeft = Math.max(0, slideTimeLeft + amount); return formatGameTime(slideTimeLeft); },
        sm:     () => { smTime = Math.max(0, smTime + amount); return formatGameTime(smTime); },
        sc:     () => { scTime = Math.max(0, scTime + amount); return formatGameTime(scTime); },
        ws:     () => { wsTime = Math.max(0, wsTime + amount); return formatGameTime(wsTime); },
        inf:    () => { infTime = Math.max(0, infTime + amount); return formatGameTime(infTime); },
        dir:    () => { dirTime = Math.max(0, dirTime + amount); return dirTime; }
      };
      if (tMap[game]) {
        let prefix = game === 'dir' ? 'direction' : game;
        document.getElementById(prefix + '-time').textContent = tMap[game]();
      }
    }`;

if (!html.includes('function adjustGameTime')) {
  html = html.replace(/function recordGameScore/, adjustFn + '\n    function recordGameScore');
}

// Replacement logic
function addTimers(code, prefix, initialVal, isDirection) {
  let style = "width:24px; height:24px; font-size:12px; padding:0; min-height:0; line-height:1; font-weight:bold; ";
  style += isDirection 
    ? "background:rgba(255,255,255,0.2); color:white; border:none;" 
    : "background:var(--surface2); color:var(--text); border:1px solid var(--border-darker);";
    
  let searchRegex = new RegExp(`<div[^>]*>الوق[^<]*<span id="${prefix}-time"[^>]*>(?:[^<]+)</span></div>`);
  
  html = html.replace(searchRegex, `<div style="font-weight: bold; color: var(--text2); display:flex; align-items:center; gap:8px; direction:ltr;">
            <button class="circle-btn" onclick="adjustGameTime('${code}', -10)" style="${style}">-10</button>
            <span id="${prefix}-time" style="color:var(--black);">${initialVal}</span>
            <button class="circle-btn" onclick="adjustGameTime('${code}', 10)" style="${style}">+10</button>
          </div>`);
}

addTimers('stroop', 'stroop', '60', false);
addTimers('sm', 'sm', '00:00', false);
addTimers('sc', 'sc', '00:00', false);
addTimers('ws', 'ws', '00:00', false);
addTimers('inf', 'inf', '00:00', false);
addTimers('dir', 'direction', '60', true);

// Slide Puzzle needs countdown logic update
addTimers('slide', 'slide', '02:00', false);

html = html.replace(/let slideTime = 0;/g, 'let slideTimeLeft = 120;');
html = html.replace(/slideTime = 0;\s*document\.getElementById\('slide-time'\)\.textContent = "00:00";/g, 'slideTimeLeft = 120; document.getElementById("slide-time").textContent = "02:00";');
html = html.replace(/slideTime\+\+;/g, 'slideTimeLeft--;');

let slideEnd = `document.getElementById('slide-time').textContent = formatGameTime(slideTimeLeft);
        if (slideTimeLeft <= 0) {
          clearInterval(slideInterval);
          isFocusGameActive = false;
          alert('انتهى الوقت للغز الانزلاق!');
          startSlideGame();
        }`;
html = html.replace(/document\.getElementById\('slide-time'\)\.textContent = formatGameTime\(slideTime\);/g, slideEnd);

fs.writeFileSync('life-planner.html', html);
console.log('Timers done!');
