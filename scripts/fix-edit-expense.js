const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

// 1. Fix openEditExpense
const openEditTarget = `        function openEditExpense(id) {
            const exp = state.expenses.find(e => String(e.id) === String(id));
            if (!exp) return;
            editingExpId = id;
            document.getElementById('m-exp-desc').value = exp.desc || '';
            document.getElementById('m-exp-date').value = exp.date || td();
            document.getElementById('m-exp-payment').value = exp.payment || 'نقدي';
            document.getElementById('m-exp-note').value = exp.note || '';`;

const openEditNew = `        function openEditExpense(id) {
            const exp = state.expenses.find(e => String(e.id) === String(id));
            if (!exp) return;
            editingExpId = id;
            
            const wOpts = (state.wallets||[]).map(w => \`<option value="\${w.id}">\${w.icon} \${w.name}</option>\`).join('');
            if(document.getElementById('m-exp-wallet')) document.getElementById('m-exp-wallet').innerHTML = wOpts;
            
            document.getElementById('m-exp-desc').value = exp.desc || '';
            document.getElementById('m-exp-date').value = exp.date || td();
            if(document.getElementById('m-exp-wallet')) document.getElementById('m-exp-wallet').value = exp.walletId || 'cash';
            document.getElementById('m-exp-note').value = exp.note || '';`;

js = js.replace(openEditTarget, openEditNew);

// 2. Fix saveEditExpense
const saveEditTarget = `            const payment = document.getElementById('m-exp-payment').value;
            const note = document.getElementById('m-exp-note').value.trim();`;

const saveEditNew = `            const walletId = document.getElementById('m-exp-wallet') ? document.getElementById('m-exp-wallet').value : 'cash';
            const note = document.getElementById('m-exp-note').value.trim();`;

js = js.replace(saveEditTarget, saveEditNew);

const saveEditSetTarget = `            exp.payment = payment;`;
const saveEditSetNew = `            exp.walletId = walletId;`;
js = js.replace(saveEditSetTarget, saveEditSetNew);

// 3. Fix addExpense
const addExpTarget = `            const payment = document.getElementById('m-exp-payment').value;
            const note = document.getElementById('m-exp-note').value.trim();`;
const addExpNew = `            const walletId = document.getElementById('m-exp-wallet') ? document.getElementById('m-exp-wallet').value : 'cash';
            const note = document.getElementById('m-exp-note').value.trim();`;
js = js.replace(addExpTarget, addExpNew);

const addExpPushTarget = `            state.expenses.push({ id: Date.now(), desc, amount: total, date, payment, note, items });`;
const addExpPushNew = `            state.expenses.push({ id: Date.now(), desc, amount: total, date, walletId: walletId, note, items });`;
js = js.replace(addExpPushTarget, addExpPushNew);

// 4. Bump sw.js
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/مصاريفي-cache-v\d+/, 'مصاريفي-cache-v6');
fs.writeFileSync('sw.js', sw, 'utf8');

fs.writeFileSync('js/app.js', js, 'utf8');
console.log('Fixed edit expense modal and bumped cache to v6.');
