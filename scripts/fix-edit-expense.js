const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

// 1. addExpense function (reading value)
js = js.replace(
    /const date = document\.getElementById\('m-exp-date'\)\.value \|\| td\(\);\s*const payment = document\.getElementById\('m-exp-payment'\)\.value;\s*const note = document\.getElementById\('m-exp-note'\)\.value\.trim\(\);/,
    `const date = document.getElementById('m-exp-date').value || td();
            const walletId = document.getElementById('m-exp-wallet') ? document.getElementById('m-exp-wallet').value : 'cash';
            const note = document.getElementById('m-exp-note').value.trim();`
);

// 1.5 addExpense function (pushing to array)
js = js.replace(
    /state\.expenses\.push\(\{ id: state\.nextId\+\+, desc, amount, date, payment, note, items \}\);/,
    `state.expenses.push({ id: state.nextId++, desc, amount, date, walletId, note, items });`
);

// 2. openEditExpense function (setting value)
js = js.replace(
    /document\.getElementById\('m-exp-date'\)\.value = exp\.date \|\| td\(\);\s*document\.getElementById\('m-exp-payment'\)\.value = exp\.payment \|\| '[^']*';\s*document\.getElementById\('m-exp-note'\)\.value = exp\.note \|\| '';/,
    `document.getElementById('m-exp-date').value = exp.date || td();
            const wOpts = (state.wallets||[]).map(w => \`<option value="\${w.id}">\${w.icon} \${w.name}</option>\`).join('');
            if(document.getElementById('m-exp-wallet')) document.getElementById('m-exp-wallet').innerHTML = wOpts;
            if(document.getElementById('m-exp-wallet')) document.getElementById('m-exp-wallet').value = exp.walletId || 'cash';
            document.getElementById('m-exp-note').value = exp.note || '';`
);

// 3. saveEditExpense function (reading value)
js = js.replace(
    /const date = document\.getElementById\('m-exp-date'\)\.value \|\| td\(\);\s*const payment = document\.getElementById\('m-exp-payment'\)\.value;\s*const note = document\.getElementById\('m-exp-note'\)\.value\.trim\(\);/,
    `const date = document.getElementById('m-exp-date').value || td();
            const walletId = document.getElementById('m-exp-wallet') ? document.getElementById('m-exp-wallet').value : 'cash';
            const note = document.getElementById('m-exp-note').value.trim();`
);

// 3.5 saveEditExpense function (saving to exp)
js = js.replace(
    /exp\.desc = desc; exp\.date = date; exp\.payment = payment; exp\.note = note; exp\.items = items; exp\.amount = amount;/,
    `exp.desc = desc; exp.date = date; exp.walletId = walletId; exp.note = note; exp.items = items; exp.amount = amount;`
);

// BUMP SW
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/مصاريفي-cache-v\d+/, 'مصاريفي-cache-v7');
fs.writeFileSync('sw.js', sw, 'utf8');

fs.writeFileSync('js/app.js', js, 'utf8');
console.log('Fixed edit expense modal via regex and bumped cache to v7.');
