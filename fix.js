const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');
html = html.replace(/<div class="metric-val">\$\{totalShop\.toFixed\(0\)\}[\s\S]*?<\/div><\/div>\s*/, '');
html = html.replace(/renderBarCompare\(inc, totalExp, subMonthly, loanMonthly, totalShop\);/, 'renderBarCompare(inc, totalExp, subMonthly, loanMonthly, 0);');
fs.writeFileSync('index.html', html, 'utf-8');
console.log('Fixed');
