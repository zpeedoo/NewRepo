const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Add timer interval to startMemoryConnectGame
html = html.replace(/function startMemoryConnectGame\(\) \{[\s\S]*?mcLevel = 1; mcScore = 0; mcTime = 0; document\.getElementById\('mc-bottom-timer'\)\.textContent = "00:00"; if\(mcInterval\) clearInterval\(mcInterval\);\s*isFocusGameActive = false;/m, (match) => {
  return match.replace(/mcTime = 0;/, `mcTime = 60;`).replace(/document\.getElementById\('mc-bottom-timer'\)\.textContent = "00:00";/, `document.getElementById('mc-bottom-timer').textContent = "01:00";`).replace(/isFocusGameActive = false;/, `isFocusGameActive = true;
      mcInterval = setInterval(() => {
        mcTime--;
        document.getElementById('mc-bottom-timer').textContent = formatGameTime(mcTime);
        if (mcTime <= 0) {
          clearInterval(mcInterval);
          isFocusGameActive = false;
          recordGameScore('mc', mcScore);
          alert(\`انتهى الوقت! نقاطك: \${mcScore}\`);
          startMemoryConnectGame();
        }
      }, 1000);`);
});

// Remove any existing broken injects (from previous scripts that might have appended stuff weirdly if they did)
html = html.replace(/recordGameScore\('mc', mcScore\);\n      if \(!state\.highScores\.mc \|\| mcScore > state\.highScores\.mc\) state\.highScores\.mc = mcScore; saveState\(\); updateHighScores\(\);/g, '');

fs.writeFileSync('life-planner.html', html);
console.log('MC Game fixed.');
