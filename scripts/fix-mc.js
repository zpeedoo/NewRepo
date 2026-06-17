const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Fix HTML structure: Pull out focus-mm-area from inside focus-memory-area
const mmStart = html.indexOf('<div id="focus-mm-area"');
const mmEndStr = '      </div>\n<div style="font-size: 12px; font-weight: bold; color: var(--text2); margin-bottom: 10px;">مفتاح الألوان (تذكرها جيداً):</div>';
const mmEnd = html.indexOf(mmEndStr);

if (mmStart > -1 && mmEnd > -1) {
  // Extract mmArea including the closing </div>
  const mmArea = html.slice(mmStart, mmEnd + 13); 
  
  // Remove mmArea from where it is
  html = html.substring(0, mmStart) + html.substring(mmEnd + 13);
  
  // Find where focus-memory-area ends
  const memoryAreaEndStr = '<!-- Embedded Brain Performance Dashboard -->';
  const memoryAreaEnd = html.indexOf(memoryAreaEndStr);
  
  // Insert mmArea right before the Dashboard
  if (memoryAreaEnd > -1) {
    html = html.substring(0, memoryAreaEnd) + mmArea + '\n      ' + html.substring(memoryAreaEnd);
  }
}

// 2. Enhance renderMCSequence to use spans
if (!html.includes('id="mc-seq-num-')) {
  html = html.replace(/document\.getElementById\('mc-sequence'\)\.textContent = mcSequence\.join\(' - '\);/,
    `const seqHtml = mcSequence.map((n, i) => \`<span id="mc-seq-num-\${i}" style="transition: all 0.3s ease; display: inline-block;">\${n}</span>\`).join(' <span style="color:var(--text3);">-</span> ');
      document.getElementById('mc-sequence').innerHTML = seqHtml;`);
}

// 3. Enhance highlightNextMCTarget to highlight the sequence span
if (!html.includes("document.getElementById('mc-seq-num-'")) {
  html = html.replace(/numEl\.style\.color = 'var\(--text\)';\s*item\.style\.opacity = '0\.5'; \/\/ Dim others/g,
    `numEl.style.color = 'var(--text)';
          item.style.opacity = '0.5';`);
          
  const targetHighlight = `item.style.transform = 'scale(1.2)';
          numEl.style.color = '#ef4444'; // Red highlight for the number
          item.style.opacity = '1';`;
  const targetHighlightNew = `item.style.transform = 'scale(1.2)';
          numEl.style.color = '#ef4444'; // Red highlight for the number
          item.style.opacity = '1';
      }
      
      // Also highlight the current target in the sequence!
      const currentIdx = mcUserSequence.length;
      for(let j=0; j<mcSequence.length; j++) {
        const seqSpan = document.getElementById('mc-seq-num-' + j);
        if(!seqSpan) continue;
        if(j === currentIdx) {
          seqSpan.style.color = '#ef4444';
          seqSpan.style.transform = 'scale(1.5) translateY(-5px)';
          seqSpan.style.textShadow = '0 4px 8px rgba(239, 68, 68, 0.4)';
        } else if (j < currentIdx) {
          seqSpan.style.color = '#10b981'; // Green for solved
          seqSpan.style.transform = 'scale(1)';
          seqSpan.style.textShadow = 'none';
        } else {
          seqSpan.style.color = 'var(--black)';
          seqSpan.style.transform = 'scale(1)';
          seqSpan.style.textShadow = 'none';
        }`;
        
  html = html.replace(targetHighlight, targetHighlightNew);
}

// 4. Enhance handleMCClick animation
if (html.includes("el.style.transform = 'scale(0.8)';")) {
  html = html.replace(/el\.style\.transform = 'scale\(0\.8\)';\s*setTimeout\(\(\) => \{ if \(el\) el\.style\.transform = 'scale\(1\)'; \}, 150\);/,
    `el.style.transform = 'scale(0.8)';
        el.style.boxShadow = '0 0 15px rgba(255,255,255,0.8)';
        setTimeout(() => { if (el) { el.style.transform = 'scale(1)'; el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)'; } }, 200);`);
}

fs.writeFileSync('life-planner.html', html);
console.log('Fixed Memory Connect structure and animations!');
