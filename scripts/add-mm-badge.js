const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');
const searchStr = '<p style="font-size: 13px; color: var(--text2);">تذكر أماكن المربعات المضاءة بدقة وانقر عليها.</p>';
const repStr = searchStr + '\n          <div id="hs-mm" style="font-size: 12px; color: #f59e0b; margin-top: 5px; font-weight: bold;">🏆 0</div>';
html = html.replace(searchStr, repStr);
fs.writeFileSync('life-planner.html', html);
console.log('Badge added.');
