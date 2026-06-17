const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

const targetRegex = /<div class="add-bar"[^>]*>[\s\S]*?<div[^>]*>العادات المجدولة لليوم<\/div>[\s\S]*?<button class="btn btn-dark btn-circle" onclick="openModal\('habit'\)" title="إضافة عادة">\+<\/button>[\s\S]*?<\/div>\s*<\/div>/;

if (targetRegex.test(html)) {
    html = html.replace(targetRegex, '');
    
    const listStr = `<div id="habit-list" style="margin-bottom: 20px;"></div>`;
    const newBtn = `      <div style="display: flex; justify-content: center; margin-bottom: 20px; margin-top: 10px;">
        <button class="btn btn-dark btn-circle" onclick="openModal('habit')" title="إضافة عادة" style="width: 60px; height: 60px; font-size: 32px; box-shadow: 0 6px 16px rgba(0,0,0,0.2);">+</button>
      </div>
      <div id="habit-list" style="margin-bottom: 20px;"></div>`;
      
    html = html.replace(listStr, newBtn);
    
    fs.writeFileSync('life-planner.html', html, 'utf8');
    console.log('Modified habit add button.');
} else {
    console.log('Could not find target to replace.');
}
