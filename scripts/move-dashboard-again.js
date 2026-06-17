const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Remove the button from focus-menu
const buttonRegex = /<div class="card-box" style="margin-bottom: 20px; cursor: pointer; border-right: 4px solid #f59e0b; background: linear-gradient\(135deg, #fffbeb, #fef3c7\);" onclick="openFocusDashboard\(\)">[\s\S]*?<\/div>/;
html = html.replace(buttonRegex, '');

// 2. Extract the dashboard content
const dashAreaRegex = /<!-- Focus Dashboard Area -->\s*<div id="focus-dashboard-area" style="display: none;">([\s\S]*?)<button class="btn" style="background:var\(--surface2\); color:var\(--text\); margin-top:30px; width:100%; box-shadow:none;" onclick="closeFocusDashboard\(\)">🔙 عودة للقائمة<\/button>\s*<\/div>/;
const match = html.match(dashAreaRegex);

if (match) {
  let dashContent = match[1];
  
  // Remove it from its current place
  html = html.replace(dashAreaRegex, '');
  
  // Clean up the dashboard content slightly (remove the "عودة" button was already done in regex)
  // We need to wrap it in a nice card at the bottom of page-daily
  const injectedDash = `
      <!-- Embedded Brain Performance Dashboard -->
      <div id="daily-focus-dashboard" style="margin-top: 30px; margin-bottom: 20px;">
        \${dashContent}
      </div>
  `;
  
  // Find the end of page-daily
  // page-daily ends right before <!-- ALL HABITS & STATS PAGE -->
  // Wait, let's search for <!-- ALL HABITS & STATS PAGE --> and insert right before it.
  const pageDailyEndRegex = /<\/div>\s*<!-- ALL HABITS & STATS PAGE -->/;
  html = html.replace(pageDailyEndRegex, injectedDash + '\n    </div>\n  <!-- ALL HABITS & STATS PAGE -->');
}

// 3. Update the Javascript
// We need to remove openFocusDashboard and closeFocusDashboard
html = html.replace(/function openFocusDashboard\(\) \{[\s\S]*?\}\s*function closeFocusDashboard\(\) \{[\s\S]*?\}/, '');

// Ensure renderFocusDashboard is called when updateDashboard is called (so it updates whenever the page is shown or daily habits are completed)
html = html.replace(/function updateDashboard\(\) \{([\s\S]*?)\}/, (m, p1) => {
  if (p1.includes('renderFocusDashboard();')) return m;
  return `function updateDashboard() {${p1}\n      if(typeof renderFocusDashboard === 'function') renderFocusDashboard();\n    }`;
});

// Remove the inline style="display: none;" from the original if there were any, but we already extracted the inner HTML.

fs.writeFileSync('life-planner.html', html);
console.log("Dashboard moved successfully.");
