const fs = require('fs');
let content = fs.readFileSync('life-planner.html', 'utf8');

// 1. Move habit-list to top of page-daily
// Remove habit-list from its current position
content = content.replace('<div id="habit-list"></div>', '');
// Add it just inside page-daily
content = content.replace('<div class="page active" id="page-daily">', '<div class="page active" id="page-daily">\n      <div id="habit-list" style="margin-bottom: 20px;"></div>');

// 2. Remove Zaha Nav Items
content = content.replace(/<div class="nav-item" data-page="zaha"[\s\S]*?<\/div>/, '');
content = content.replace(/<div class="bnav-item" data-page="zaha"[\s\S]*?<\/div>/, '');

// 3. Remove page-zaha
// We need to find the start and end of page-zaha
const zahaStartIndex = content.indexOf('<div class="page" id="page-zaha">');
if (zahaStartIndex !== -1) {
  // Find the next page to know where it ends
  const nextPageIndex = content.indexOf('<div class="page" id="page-reader">', zahaStartIndex);
  if (nextPageIndex !== -1) {
    const before = content.substring(0, zahaStartIndex);
    const after = content.substring(nextPageIndex);
    content = before + after;
  }
}

fs.writeFileSync('life-planner.html', content, 'utf8');
console.log('Done refactoring!');
