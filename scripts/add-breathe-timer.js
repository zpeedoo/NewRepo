const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Add HTML timer display
const cyclesHtml = `<div style="font-size: 16px; font-weight: 800; color: var(--primary); margin-bottom: 20px;">
        الدورات المنجزة: <span id="breathe-cycles">0</span>
      </div>`;
const timerHtml = `<div style="font-size: 16px; font-weight: 800; color: var(--primary); margin-bottom: 20px;">
        الدورات المنجزة: <span id="breathe-cycles">0</span>
      </div>
      <div style="font-size: 24px; font-weight: 800; color: var(--text); margin-bottom: 20px; font-family: 'JetBrains Mono', monospace;" id="breathe-session-clock">00:00</div>`;

html = html.replace(cyclesHtml, timerHtml);

// 2. Add JS interval variable
html = html.replace('let breatheSessionStart = 0;', 'let breatheSessionStart = 0;\n    let breatheSessionTimerInterval = null;');

// 3. Start timer in startBreathe()
const startBreatheOld = `breatheSessionStart = Date.now();
      document.getElementById('btn-start-breathe').textContent = 'إيقاف ◼';
      document.getElementById('btn-start-breathe').onclick = resetBreathe;
      runBreatheCycle();`;
const startBreatheNew = `breatheSessionStart = Date.now();
      document.getElementById('btn-start-breathe').textContent = 'إيقاف ◼';
      document.getElementById('btn-start-breathe').onclick = resetBreathe;
      
      document.getElementById('breathe-session-clock').textContent = '00:00';
      if(breatheSessionTimerInterval) clearInterval(breatheSessionTimerInterval);
      breatheSessionTimerInterval = setInterval(() => {
        let elapsed = Math.floor((Date.now() - breatheSessionStart) / 1000);
        let m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        let s = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('breathe-session-clock').textContent = \`\${m}:\${s}\`;
      }, 1000);

      runBreatheCycle();`;

html = html.replace(startBreatheOld, startBreatheNew);

// 4. Stop timer in stopBreathe()
const stopBreatheOld = `if (breatheInterval) clearInterval(breatheInterval);`;
const stopBreatheNew = `if (breatheInterval) clearInterval(breatheInterval);\n      if (breatheSessionTimerInterval) clearInterval(breatheSessionTimerInterval);`;

html = html.replace(stopBreatheOld, stopBreatheNew);

// 5. Reset timer display in resetBreathe()
const resetBreatheOld = `document.getElementById('breathe-cycles').textContent = '0';`;
const resetBreatheNew = `document.getElementById('breathe-cycles').textContent = '0';\n      document.getElementById('breathe-session-clock').textContent = '00:00';`;

html = html.replace(resetBreatheOld, resetBreatheNew);

fs.writeFileSync('life-planner.html', html);
console.log('Stopwatch timer added to breathe exercises');
