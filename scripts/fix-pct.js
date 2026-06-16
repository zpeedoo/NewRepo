const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');

const target = `const catTotal = Object.values(byCat).reduce((s, v) => s + v, 0);`;
const replacement = `const totalInc = monthlyIncome().total;
                const catTotal = totalInc > 0 ? totalInc : Object.values(byCat).reduce((s, v) => s + v, 0);`;

html = html.replace(target, replacement);

const targetPct = `style="width:' + pct + '%`;
const replacementPct = `style="width:' + Math.min(pct, 100) + '%`;

html = html.replace(targetPct, replacementPct);

fs.writeFileSync('index.html', html, 'utf-8');
console.log("Success");
