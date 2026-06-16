const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

const breatheCardRegex = /\s*<!-- Daily Breathing Card -->\s*<div class="breathe-card">[\s\S]*?<\/div>\s*<button class="btn" onclick="openBreatheModal\(\)">ابدأ التمرين ▶<\/button>\s*<\/div>/;

const extracted = html.match(breatheCardRegex);

if (extracted) {
    // Remove from original place
    html = html.replace(breatheCardRegex, '');
    
    // Inject right under habit-list
    const habitListStr = `<div id="habit-list" style="margin-bottom: 20px;"></div>`;
    const newStr = `${habitListStr}\n${extracted[0]}`;
    
    html = html.replace(habitListStr, newStr);
    
    // BUMP SW CACHE to v10
    let sw = fs.readFileSync('sw.js', 'utf8');
    sw = sw.replace(/مصاريفي-cache-v\d+/, 'مصاريفي-cache-v10');
    fs.writeFileSync('sw.js', sw, 'utf8');
    
    fs.writeFileSync('life-planner.html', html, 'utf8');
    console.log('Moved breathe card successfully.');
} else {
    console.log('Could not find breathe card to move.');
}
