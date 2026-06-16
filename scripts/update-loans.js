const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

const dateLogicTarget = `const mLeft = l.monthly > 0 ? Math.ceil(l.remaining / l.monthly) : 0;`;
const dateLogicNew = `const mLeft = l.monthly > 0 ? Math.ceil(l.remaining / l.monthly) : 0;
                let nextDueStr = '-';
                if (l.start && l.remaining > 0) {
                    const today = new Date();
                    const startD = new Date(l.start);
                    let nextDue = new Date(today.getFullYear(), today.getMonth(), startD.getDate());
                    nextDue.setHours(0,0,0,0);
                    if (nextDue < today) nextDue.setMonth(nextDue.getMonth() + 1);
                    nextDueStr = nextDue.toLocaleDateString('ar-JO', {month:'short', day:'numeric'});
                }`;

const nextDateUItarget = /<div style="font-size:11px;color:var\(--text3\);font-family:'JetBrains Mono',monospace">\s*\$\{LOAN_TYPES\[l\.type\] \|\| l\.type\} • \$\{l\.interest\}% فائدة<\/div>/;
const nextDateUInew = `<div style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace">
                            \${LOAN_TYPES[l.type] || l.type} • \${l.interest}% فائدة <span style="color:var(--orange);margin-inline-start:8px;font-weight:bold;">📅 القسط القادم: \${nextDueStr}</span></div>`;

const targetStats = /<div class="loan-stat-val" style="color:var\(--amber\)">\$\{l\.monthly\} د\.أ<\/div>\s*<\/div>/;
const newStats = `<div class="loan-stat-val" style="color:var(--amber)">\${l.monthly} د.أ</div>
                    </div>
                    <div class="loan-stat">
                        <div class="loan-stat-lbl">الأقساط المتبقية</div>
                        <div class="loan-stat-val">\${mLeft} قسط</div>
                    </div>`;

js = js.replace(dateLogicTarget, dateLogicNew);
js = js.replace(nextDateUItarget, nextDateUInew);
js = js.replace(targetStats, newStats);

fs.writeFileSync('js/app.js', js, 'utf8');
console.log('Debt UI updated.');
