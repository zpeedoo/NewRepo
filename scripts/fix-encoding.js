const fs = require('fs');
const { execSync } = require('child_process');

// 1. Get clean v39 content from git directly to avoid PowerShell encoding bugs
const v39Buffer = execSync('git show b1ee01a:life-planner.html');
const v39Html = v39Buffer.toString('utf8');

// 2. Read current HTML
let currentHtml = fs.readFileSync('life-planner.html', 'utf8');

// 3. Extract the clean menu from v39
const menuStartMatch = v39Html.match(/<div id="focus-menu">/);
const menuEndMatch = v39Html.match(/<!-- Direction Game Area -->/);

if (menuStartMatch && menuEndMatch) {
  let cleanMenu = v39Html.slice(menuStartMatch.index, menuEndMatch.index);
  
  // Remove the 3 games
  cleanMenu = cleanMenu.replace(/<div class="card-box"[^>]+onclick="startVisualSearchGame\(\)"[\s\S]*?<\/p>\s*<\/div>\s*/, '');
  cleanMenu = cleanMenu.replace(/<div class="card-box"[^>]+onclick="startPatternCopyGame\(\)"[\s\S]*?<\/p>\s*<\/div>\s*/, '');
  cleanMenu = cleanMenu.replace(/<div class="card-box"[^>]+onclick="startSizeSorterGame\(\)"[\s\S]*?<\/p>\s*<\/div>\s*/, '');

  // Extract Memory Matrix card from current HTML
  const mmMatch = currentHtml.match(/(<div class="card-box"[^>]+onclick="startMemoryMatrixGame\(\)"[\s\S]*?<\/p>[\s\S]*?<\/div>)/);
  if (mmMatch) {
    cleanMenu += mmMatch[1] + '\n      ';
  }

  // Replace the corrupted menu in current HTML
  const currentMenuStartMatch = currentHtml.match(/<div id="focus-menu">/);
  const currentMenuEndMatch = currentHtml.match(/<!-- Direction Game Area -->/);
  
  if (currentMenuStartMatch && currentMenuEndMatch) {
    const before = currentHtml.slice(0, currentMenuStartMatch.index);
    const after = currentHtml.slice(currentMenuEndMatch.index);
    
    currentHtml = before + cleanMenu + after;
    fs.writeFileSync('life-planner.html', currentHtml);
    console.log('Menu restored with clean Arabic encoding!');
  } else {
    console.log('Could not find menu boundaries in current HTML');
  }
} else {
  console.log('Could not find menu boundaries in v39 HTML');
}
