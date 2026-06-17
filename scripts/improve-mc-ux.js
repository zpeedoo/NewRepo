const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Add transition and id to legend items
html = html.replace(/function generateMCLegend\(\) \{[\s\S]*?legendEl\.appendChild\(item\);\s*\}\s*\}/, (match) => {
  return match.replace(/const item = document\.createElement\('div'\);/, `const item = document.createElement('div');\n        item.id = 'mc-legend-' + i;\n        item.style.transition = 'all 0.3s ease';`)
              .replace(/const num = document\.createElement\('div'\);/, `const num = document.createElement('div');\n        num.id = 'mc-legend-num-' + i;\n        num.style.transition = 'all 0.3s ease';`);
});

// 2. Add transition to dots in nextMCLevel and pass `this` to handleMCClick
html = html.replace(/dot\.style\.cursor = 'pointer';\n\s*dot\.onclick = \(\) => handleMCClick\(num\);/, `dot.style.cursor = 'pointer';\n        dot.style.transition = 'transform 0.15s ease';\n        dot.onclick = function() { handleMCClick(num, this); };`);

// 3. Highlight Next Target function
const highlightScript = `
    function highlightNextMCTarget() {
      if(!isFocusGameActive) return;
      const targetNum = mcSequence[mcUserSequence.length];
      for(let i=1; i<=9; i++) {
        const item = document.getElementById('mc-legend-' + i);
        const numEl = document.getElementById('mc-legend-num-' + i);
        if(!item || !numEl) continue;
        if(i === targetNum) {
          item.style.transform = 'scale(1.2)';
          numEl.style.color = '#ef4444'; // Red highlight for the number
          item.style.opacity = '1';
        } else {
          item.style.transform = 'scale(1)';
          numEl.style.color = 'var(--text)';
          item.style.opacity = '0.5'; // Dim others
        }
      }
    }
`;

// Inject the highlightScript before handleMCClick
html = html.replace(/function handleMCClick\(num\) \{/, highlightScript + '\n    function handleMCClick(num, el) {');

// 4. Trigger click animation and update highlight on click / next level
// Inside handleMCClick
html = html.replace(/function handleMCClick\(num, el\) \{[\s\S]*?if\(mcUserSequence\.length === mcSequence\.length\) \{/m, (match) => {
  // Add animation block right at the beginning of handleMCClick
  return match.replace(/if\(mcSequence\[mcUserSequence\.length\] === num\) \{/, `if (el) {
        el.style.transform = 'scale(0.8)';
        setTimeout(() => { if (el) el.style.transform = 'scale(1)'; }, 150);
      }
      if(mcSequence[mcUserSequence.length] === num) {`)
              .replace(/mcUserSequence\.push\(num\);/, `mcUserSequence.push(num);\n        highlightNextMCTarget();`);
});

// Also reset highlight when sequence is wrong
html = html.replace(/mcUserSequence = \[\];\n\s*drawMCLines\(\);/, `mcUserSequence = [];\n        drawMCLines();\n        highlightNextMCTarget();`);

// Also trigger highlight at the start of nextMCLevel sequence presentation
// Wait, nextMCLevel sets mcUserSequence = []; so we should call highlightNextMCTarget() at the end of nextMCLevel()
html = html.replace(/nodesEl\.appendChild\(dot\);\n\s*\}/g, `nodesEl.appendChild(dot);\n      }\n      highlightNextMCTarget();`);

fs.writeFileSync('life-planner.html', html);
console.log('MC UX improved.');
