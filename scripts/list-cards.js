const fs = require('fs');
const html = fs.readFileSync('life-planner.html', 'utf8');
const lines = html.split('\n');
let inFocusMenu = false;
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('id="focus-menu"')) {
    inFocusMenu = true;
  }
  if (inFocusMenu && lines[i].includes('onclick="start')) {
    console.log(lines[i].trim());
  }
}
