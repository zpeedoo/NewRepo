const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// Fix 1: Pass `this` to handleMCClick
html = html.replace(/dot\.style\.transition = 'transform 0\.1s';\n\s*dot\.onclick = \(\) => handleMCClick\(num\);/, `dot.style.transition = 'transform 0.15s ease';\n        dot.onclick = function() { handleMCClick(num, this); };`);

// Fix 2: Add highlightNextMCTarget() at the end of nextMCLevel()
html = html.replace(/mcSequence = possibleNums\.slice\(0, seqLength\);\n\s*document\.getElementById\('mc-sequence'\)\.textContent = mcSequence\.join\(' - '\);\n\s*\}/, `mcSequence = possibleNums.slice(0, seqLength);\n      document.getElementById('mc-sequence').textContent = mcSequence.join(' - ');\n      highlightNextMCTarget();\n    }`);

fs.writeFileSync('life-planner.html', html);
console.log('Fixed regex misses cleanly.');
