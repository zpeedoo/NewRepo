const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Remove nav items
html = html.replace(/<div class="nav-item" data-page="dash" onclick="goPage\(this\)">📊 الملخص العام<\/div>\s*/g, '');
html = html.replace(/<div class="bnav-item" data-page="dash" onclick="goPage\(this\)">📊<span>الملخص<\/span><\/div>\s*/g, '');

// 2. Extract analytics-card
const analyticsCardRegex = /\s*(<div class="analytics-card">[\s\S]*?<canvas id="productivityChart"><\/canvas>\s*<\/div>\s*<\/div>)/;
const match = html.match(analyticsCardRegex);
let analyticsHtml = "";
if (match) {
    analyticsHtml = match[1];
} else {
    console.log("Could not find analytics-card");
}

// 3. Delete page-dash entirely
const pageDashRegex = /\s*<!-- Dashboard -->\s*<div class="page" id="page-dash">[\s\S]*?<!-- Daily Habits -->/;
html = html.replace(pageDashRegex, '\n    <!-- Daily Habits -->');

// 4. Inject analyticsHtml at the bottom of page-daily
// page-daily ends right before <!-- ALL HABITS & STATS PAGE -->
// But wait, there are closing tags.
// Let's find:
//         <div class="daily-sidebar">
//           <div class="mini-dash-card" id="mini-dash-content"></div>
//         </div>
//       </div>
//     </div>
//     <!-- ALL HABITS & STATS PAGE -->

const injectTargetRegex = /(\s*)<\/div>\s*<\/div>\s*<!-- ALL HABITS & STATS PAGE -->/;
if (html.match(injectTargetRegex)) {
    html = html.replace(injectTargetRegex, (fullMatch, spaces) => {
        return `\n${spaces}  <!-- Moved Analytics Card -->\n${spaces}  ${analyticsHtml}\n${fullMatch}`;
    });
    console.log("Injected analytics card.");
} else {
    console.log("Could not find injection target for analytics card.");
}

// BUMP SW CACHE to v15
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/مصاريفي-cache-v\d+/, 'مصاريفي-cache-v15');
fs.writeFileSync('sw.js', sw, 'utf8');

fs.writeFileSync('life-planner.html', html, 'utf8');
console.log('Processed deletion and move.');
