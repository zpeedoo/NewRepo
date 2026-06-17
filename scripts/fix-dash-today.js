const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Extract the dashboard from page-daily
const dashRegex = /<!-- Embedded Brain Performance Dashboard -->\s*<div id="daily-focus-dashboard" style="margin-top: 30px; margin-bottom: 20px;">([\s\S]*?)<\/div>\s*<\/div>\s*<!-- ALL HABITS & STATS PAGE -->/;
const match = html.match(dashRegex);

if (match) {
  let dashContent = match[1];
  
  // Remove from page-daily
  html = html.replace(dashRegex, '\n    </div>\n  <!-- ALL HABITS & STATS PAGE -->');
  
  // Re-inject at the end of page-focus
  const injectedDash = `
      <!-- Embedded Brain Performance Dashboard -->
      <div id="daily-focus-dashboard" style="margin-top: 30px; margin-bottom: 20px;">
        \${dashContent}
      </div>
  `;
  
  const pageFocusEndRegex = /<\/div>\s*<!-- REPORTS PAGE -->/;
  html = html.replace(pageFocusEndRegex, `
      <!-- Embedded Brain Performance Dashboard -->
      <div id="daily-focus-dashboard" style="margin-top: 30px; margin-bottom: 20px; border-top: 2px dashed var(--border-darker); padding-top: 20px;">
        ${dashContent}
      </div>
    </div>
  <!-- REPORTS PAGE -->`);
}

// 2. Fix the Javascript date logic in renderFocusDashboard
html = html.replace(/Object\.keys\(history\)\.forEach\(dStr => \{[\s\S]*?if \(timeframe === 'today' && diffDays === 0\) datesToInclude\.push\(dStr\);[\s\S]*?if \(timeframe === 'alltime'\) datesToInclude\.push\(dStr\);\s*\}\);/, `Object.keys(history).forEach(dStr => {
        if(!dStr || !dStr.includes('-')) return;
        const parts = dStr.split('-');
        if(parts.length !== 3) return;
        const d = new Date(parts[0], parts[1]-1, parts[2]); // Local midnight
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (timeframe === 'today' && dStr === today) datesToInclude.push(dStr);
        else if (timeframe === '7days' && diffDays < 7 && diffDays >= 0) datesToInclude.push(dStr);
        else if (timeframe === '30days' && diffDays < 30 && diffDays >= 0) datesToInclude.push(dStr);
        else if (timeframe === 'alltime') datesToInclude.push(dStr);
      });`);

fs.writeFileSync('life-planner.html', html);
console.log('Dashboard moved to page-focus and date bug fixed.');
