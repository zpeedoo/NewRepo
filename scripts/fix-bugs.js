const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Fix Word Search (ws) interval
if (!html.includes('wsTime++;')) {
  html = html.replace(/document\.getElementById\('ws-remaining'\)\.textContent = 10;/,
    "document.getElementById('ws-remaining').textContent = 10;\n      if(typeof wsInterval !== 'undefined' && wsInterval) clearInterval(wsInterval);\n      wsInterval = setInterval(() => {\n        if(!isFocusGameActive) return;\n        wsTime++;\n        document.getElementById('ws-time').textContent = formatGameTime(wsTime);\n      }, 1000);");
}

// 2. Fix Infinity Path (inf) interval
if (!html.includes('infTime++;')) {
  html = html.replace(/let infLoops = 0;/,
    "let infLoops = 0;\n      if(typeof infInterval !== 'undefined' && infInterval) clearInterval(infInterval);\n      infInterval = setInterval(() => {\n        if(!isFocusGameActive) return;\n        infTime++;\n        document.getElementById('inf-time').textContent = formatGameTime(infTime);\n      }, 1000);");
}

// 3. Add +/- buttons to Sum Match (sm)
if (!html.includes("adjustGameTime('sm'")) {
  html = html.replace(/الوقت: <span id="sm-timer" style="color:var\(--black\);">00:00<\/span>/,
    "الوقت: <button class=\"circle-btn\" onclick=\"adjustGameTime('sm', -10)\" style=\"width:24px; height:24px; font-size:12px; padding:0; min-height:0; line-height:1; background:var(--surface2); color:var(--text); border:1px solid var(--border-darker); font-weight:bold;\">-10</button> <span id=\"sm-time\" style=\"color:var(--black);\">00:00</span> <button class=\"circle-btn\" onclick=\"adjustGameTime('sm', 10)\" style=\"width:24px; height:24px; font-size:12px; padding:0; min-height:0; line-height:1; background:var(--surface2); color:var(--text); border:1px solid var(--border-darker); font-weight:bold;\">+10</button>");
  // Also fix the interval to update sm-time instead of sm-timer
  html = html.replace(/document\.getElementById\('sm-timer'\)\.textContent = `\${m}:\${s}`;/g,
    "document.getElementById('sm-time').textContent = `${m}:${s}`;");
  html = html.replace(/document\.getElementById\('sm-timer'\)\.textContent = '00:00';/g,
    "document.getElementById('sm-time').textContent = '00:00';");
}

// 4. Add +/- buttons to Shape Counter (sc)
if (!html.includes("adjustGameTime('sc'")) {
  html = html.replace(/الوقت: <span id="sc-timer" style="color:var\(--black\);">00:00<\/span>/,
    "الوقت: <button class=\"circle-btn\" onclick=\"adjustGameTime('sc', -10)\" style=\"width:24px; height:24px; font-size:12px; padding:0; min-height:0; line-height:1; background:var(--surface2); color:var(--text); border:1px solid var(--border-darker); font-weight:bold;\">-10</button> <span id=\"sc-time\" style=\"color:var(--black);\">00:00</span> <button class=\"circle-btn\" onclick=\"adjustGameTime('sc', 10)\" style=\"width:24px; height:24px; font-size:12px; padding:0; min-height:0; line-height:1; background:var(--surface2); color:var(--text); border:1px solid var(--border-darker); font-weight:bold;\">+10</button>");
  // Also fix the interval to update sc-time instead of sc-timer
  html = html.replace(/document\.getElementById\('sc-timer'\)\.textContent = `\${m}:\${s}`;/g,
    "document.getElementById('sc-time').textContent = `${m}:${s}`;");
  html = html.replace(/document\.getElementById\('sc-timer'\)\.textContent = '00:00';/g,
    "document.getElementById('sc-time').textContent = '00:00';");
}

fs.writeFileSync('life-planner.html', html);
console.log('Bugs fixed successfully!');
