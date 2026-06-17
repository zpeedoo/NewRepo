const fs = require('fs');
const code = fs.readFileSync('f:/مصاريف/my-expenses-app/life-planner.html', 'utf8');
const areas = [...code.matchAll(/id="focus-([a-zA-Z0-9]+)-area"/g)].map(m => m[1]);
console.log('Areas:', areas);
const menus = [...code.matchAll(/onclick="start([a-zA-Z0-9]+)Game\(\)"/g)].map(m => m[1]);
console.log('Menus:', menus);
