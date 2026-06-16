const fs = require('fs');
const content = fs.readFileSync('life-planner.html', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<div class="page"')) {
    console.log(`Page at line ${i + 1}: ${lines[i].trim()}`);
  }
  if (lines[i].includes('نسبة إنجاز اليوم')) {
    console.log(`نسبة إنجاز اليوم at line ${i + 1}: ${lines[i].trim()}`);
  }
  if (lines[i].includes('تقدم الأسبوع')) {
    console.log(`تقدم الأسبوع at line ${i + 1}: ${lines[i].trim()}`);
  }
  if (lines[i].includes('العادات المجدولة')) {
    console.log(`العادات المجدولة at line ${i + 1}: ${lines[i].trim()}`);
  }
}
