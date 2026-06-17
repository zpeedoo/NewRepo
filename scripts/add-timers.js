const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// Generic function inject
const adjustFn = `    function adjustGameTime(game, amount) {
      if(!isFocusGameActive) return;
      if (game === 'stroop') { stroopTimeLeft += amount; if(stroopTimeLeft<0) stroopTimeLeft=0; document.getElementById('stroop-time').textContent = stroopTimeLeft; }
      else if (game === 'slide') { slideTimeLeft += amount; if(slideTimeLeft<0) slideTimeLeft=0; document.getElementById('slide-time').textContent = formatGameTime(slideTimeLeft); }
      else if (game === 'sm') { smTime += amount; if(smTime<0) smTime=0; document.getElementById('sm-time').textContent = formatGameTime(smTime); }
      else if (game === 'sc') { scTime += amount; if(scTime<0) scTime=0; document.getElementById('sc-time').textContent = formatGameTime(scTime); }
      else if (game === 'ws') { wsTime += amount; if(wsTime<0) wsTime=0; document.getElementById('ws-time').textContent = formatGameTime(wsTime); }
      else if (game === 'inf') { infTime += amount; if(infTime<0) infTime=0; document.getElementById('inf-time').textContent = formatGameTime(infTime); }
      else if (game === 'dir') { dirTime += amount; if(dirTime<0) dirTime=0; document.getElementById('direction-time').textContent = dirTime; }
    }`;

if (!html.includes('function adjustGameTime')) {
  html = html.replace(/function recordGameScore/, adjustFn + '\n    function recordGameScore');
}

// Replacement logic
function addTimers(code, prefix, initialVal, isDirection) {
  let style = "width:24px; height:24px; font-size:12px; padding:0; min-height:0; line-height:1; background:var(--surface2); color:var(--text); border:1px solid var(--border-darker); font-weight:bold;";
  let searchRegex = new RegExp(`<div[^>]*>الوق[^<]*<span id="${prefix}-time"[^>]*>([^<]+)</span></div>`);
  
  if (isDirection) {
    style = "width:24px; height:24px; font-size:12px; padding:0; min-height:0; line-height:1; background:rgba(255,255,255,0.2); color:white; border:none; font-weight:bold;";
  }
  
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
