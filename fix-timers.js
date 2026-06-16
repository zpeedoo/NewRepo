const fs = require('fs');
const path = 'life-planner.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Stroop Game
content = content.replace(
  `      nextStroopWord();
      if (focusTimer) clearInterval(focusTimer); isFocusGameActive = false;`,
  `      nextStroopWord();
      if (focusTimer) clearInterval(focusTimer);
      isFocusGameActive = true;
      focusTimer = setInterval(() => {
        stroopTimeLeft--;
        document.getElementById('stroop-time').textContent = stroopTimeLeft;
        document.getElementById('stroop-bottom-timer').textContent = formatGameTime(stroopTimeLeft);
        if (stroopTimeLeft <= 0) {
          clearInterval(focusTimer);
          isFocusGameActive = false;
          alert(\`انتهى الوقت! نقاطك: \${stroopScore}\`);
          startStroopGame();
        }
      }, 1000);`
);

content = content.replace(
  `      if (!isFocusGameActive) {
        isFocusGameActive = true;
        focusTimer = setInterval(() => {
          stroopTimeLeft--;
          document.getElementById('stroop-time').textContent = stroopTimeLeft;
          document.getElementById('stroop-bottom-timer').textContent = formatGameTime(stroopTimeLeft);
          if (stroopTimeLeft <= 0) {
            clearInterval(focusTimer);
            isFocusGameActive = false;
            alert(\`انتهى الوقت! نقاطك: \${stroopScore}\`);
            startStroopGame();
          }
        }, 1000);
      }`,
  ``
);


// 2. Visual Search Game
content = content.replace(
  `      document.getElementById('visual-bottom-timer').textContent = formatGameTime(visualTimeLeft);
      nextVisualLevel();`,
  `      document.getElementById('visual-bottom-timer').textContent = formatGameTime(visualTimeLeft);
      if (focusTimer) clearInterval(focusTimer);
      isFocusGameActive = true;
      focusTimer = setInterval(() => {
        visualTimeLeft--;
        document.getElementById('visual-time').textContent = visualTimeLeft;
        document.getElementById('visual-bottom-timer').textContent = formatGameTime(visualTimeLeft);
        if (visualTimeLeft <= 0) {
          clearInterval(focusTimer);
          isFocusGameActive = false;
          alert(\`انتهى الوقت! وصلت للمستوى: \${visualLevel}\`);
          startVisualSearchGame();
        }
      }, 1000);
      nextVisualLevel();`
);

const visualSearchTimerBlock = `          if (!isFocusGameActive) {
            isFocusGameActive = true;
            focusTimer = setInterval(() => {
              visualTimeLeft--;
              document.getElementById('visual-time').textContent = visualTimeLeft;
              document.getElementById('visual-bottom-timer').textContent = formatGameTime(visualTimeLeft);
              if (visualTimeLeft <= 0) {
                clearInterval(focusTimer);
                isFocusGameActive = false;
                alert(\`انتهى الوقت! وصلت للمستوى: \${visualLevel}\`);
                startVisualSearchGame();
              }
            }, 1000);
          }`;

// Remove all occurrences of visualSearchTimerBlock (there are two, one for correct target, one for wrong)
content = content.split(visualSearchTimerBlock).join('');


// 3. Slide Game
content = content.replace(
  `      renderSlideGrid();
      if(slideInterval) clearInterval(slideInterval); isFocusGameActive = false;`,
  `      renderSlideGrid();
      if(slideInterval) clearInterval(slideInterval);
      isFocusGameActive = true;
      slideInterval = setInterval(() => {
        slideTime++;
        document.getElementById('slide-time').textContent = formatGameTime(slideTime);
        document.getElementById('slide-bottom-timer').textContent = formatGameTime(slideTime);
      }, 1000);`
);

content = content.replace(
  `      if (!isFocusGameActive) {
        isFocusGameActive = true;
        slideInterval = setInterval(() => {
          slideTime++;
          document.getElementById('slide-time').textContent = formatGameTime(slideTime);
          document.getElementById('slide-bottom-timer').textContent = formatGameTime(slideTime);
        }, 1000);
      }`,
  ``
);


// 4. Word Search Game
content = content.replace(
  `      renderWordSearch();
      if(wsInterval) clearInterval(wsInterval); isFocusGameActive = false;`,
  `      renderWordSearch();
      if(wsInterval) clearInterval(wsInterval);
      isFocusGameActive = true;
      wsInterval = setInterval(() => {
        wsTime++;
        document.getElementById('ws-time').textContent = formatGameTime(wsTime);
        document.getElementById('ws-bottom-timer').textContent = formatGameTime(wsTime);
      }, 1000);`
);

content = content.replace(
  `      if (!isFocusGameActive) {
        isFocusGameActive = true;
        wsInterval = setInterval(() => {
          wsTime++;
          document.getElementById('ws-time').textContent = formatGameTime(wsTime);
          document.getElementById('ws-bottom-timer').textContent = formatGameTime(wsTime);
        }, 1000);
      }`,
  ``
);


// 5. Infinity Game
content = content.replace(
  `      generateInfinityPath();
      if(infInterval) clearInterval(infInterval); isFocusGameActive = false;`,
  `      generateInfinityPath();
      if(infInterval) clearInterval(infInterval);
      isFocusGameActive = true;
      infInterval = setInterval(() => {
        infTime++;
        const m = String(Math.floor(infTime / 60)).padStart(2, '0');
        const s = String(infTime % 60).padStart(2, '0');
        document.getElementById('inf-time').textContent = \`\${m}:\${s}\`;
        document.getElementById('inf-bottom-timer').textContent = \`\${m}:\${s}\`;
      }, 1000);`
);

content = content.replace(
  `      if (!isFocusGameActive) {
        isFocusGameActive = true;
        infInterval = setInterval(() => {
          infTime++;
          const m = String(Math.floor(infTime / 60)).padStart(2, '0');
          const s = String(infTime % 60).padStart(2, '0');
          document.getElementById('inf-time').textContent = \`\${m}:\${s}\`;
          document.getElementById('inf-bottom-timer').textContent = \`\${m}:\${s}\`;
        }, 1000);
      }`,
  ``
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done modifying timers!');
