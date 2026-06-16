const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
let js = fs.readFileSync('js/app.js', 'utf8');

// --- HTML Modifications ---

// 1. Add Wallets UI to Dashboard
const miniDashTarget = `<div class="grid-4" id="mini-dashboards" style="margin-bottom: 14px;">
                <!-- Content injected via JS -->
            </div>`;
const walletsDashHTML = `
            <!-- Wallets Dashboard -->
            <div class="card" style="margin-bottom: 14px;">
                <div class="card-title">المحافظ والحسابات</div>
                <div class="grid-3" id="wallets-dash" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px;"></div>
            </div>`;

if (!html.includes('id="wallets-dash"')) {
    html = html.replace(miniDashTarget, miniDashTarget + '\n' + walletsDashHTML);
}

// 2. Change Payment Method to Wallet in Modals
// Expense Modal
html = html.replace(/<select class="inp" id="m-exp-payment">[\s\S]*?<\/select>/, `<select class="inp" id="m-exp-wallet"></select>`);
html = html.replace(/<label>طريقة الدفع<\/label>/, `<label>المحفظة / الحساب</label>`);

// Income Modal
html = html.replace(/(<div class="modal" style="width:400px">\s*<div class="modal-title">إضافة مصدر دخل<\/div>\s*<div class="modal-body">\s*<div class="field"><label>اسم المصدر<\/label><input class="inp" id="inc-name" \/><\/div>\s*<div class="field"><label>المبلغ<\/label><input class="inp" type="number" id="inc-amount" \/><\/div>)/, `$1\n<div class="field"><label>المحفظة</label><select class="inp" id="inc-wallet"></select></div>`);

// --- JS Modifications ---

// 1. Initialize Wallets in loadState
js = js.replace(/if \(!state\.loans\) state\.loans = \[\];/, `if (!state.loans) state.loans = [];\n            if (!state.wallets || state.wallets.length === 0) { state.wallets = [{ id: 'cash', name: 'كاش', icon: '💵', balance: 0 }, { id: 'visa', name: 'فيزا', icon: '💳', balance: 0 }, { id: 'savings', name: 'حساب توفير', icon: '🏦', balance: 0 }]; }`);

// 2. Inject Wallet Calculation in renderOverview
const renderOverviewTarget = `document.getElementById('mini-dashboards').innerHTML = \``;
const walletLogic = `
            // Wallet Balances
            if(state.wallets && document.getElementById('wallets-dash')) {
                let walletBals = {};
                state.wallets.forEach(w => walletBals[w.id] = 0);
                
                (state.incomeSources||[]).forEach(inc => {
                    let wid = inc.walletId || 'cash';
                    if(walletBals[wid] !== undefined) walletBals[wid] += inc.amount;
                });
                
                walletBals['cash'] -= calcFixedDeductions();
                
                (state.expenses||[]).forEach(exp => {
                    let wid = exp.walletId || 'cash';
                    if(walletBals[wid] !== undefined) walletBals[wid] -= exp.amount;
                });
                
                walletBals['cash'] -= calcSubMonthly();
                walletBals['cash'] -= loanMonthly;

                document.getElementById('wallets-dash').innerHTML = state.wallets.map(w => \`
                    <div class="metric" style="padding: 10px;">
                        <div class="metric-lbl">\${w.icon} \${w.name}</div>
                        <div class="metric-val" style="font-size: 16px; color: \${walletBals[w.id] < 0 ? 'var(--red)' : 'var(--text)'}">\${walletBals[w.id].toFixed(2)} <span style="font-size:11px;color:var(--text3)">د.أ</span></div>
                    </div>
                \`).join('');
            }
`;
js = js.replace(renderOverviewTarget, walletLogic + '\n' + renderOverviewTarget);

// 3. Populate Wallet selects on openModal
js = js.replace(/function openModal\(name\) \{/, `function openModal(name) {
            const wOpts = (state.wallets||[]).map(w => \`<option value="\${w.id}">\${w.icon} \${w.name}</option>\`).join('');
            if(document.getElementById('m-exp-wallet')) document.getElementById('m-exp-wallet').innerHTML = wOpts;
            if(document.getElementById('inc-wallet')) document.getElementById('inc-wallet').innerHTML = wOpts;
`);

// 4. Update saveExpenseFromModal to use walletId instead of payment
js = js.replace(/const pay = document\.getElementById\('m-exp-payment'\)\.value;/, `const walletId = document.getElementById('m-exp-wallet') ? document.getElementById('m-exp-wallet').value : 'cash';`);
js = js.replace(/payment: pay/, `walletId: walletId`);

// 5. Update saveIncome logic
js = js.replace(/const amt = parseFloat\(document\.getElementById\('inc-amount'\)\.value\);/, `const amt = parseFloat(document.getElementById('inc-amount').value);\n            const walletId = document.getElementById('inc-wallet') ? document.getElementById('inc-wallet').value : 'cash';`);
js = js.replace(/state\.incomeSources\.push\(\{ id: Date\.now\(\), name, amount: amt, type: 'salary', start: td\(\) \}\);/, `state.incomeSources.push({ id: Date.now(), name, amount: amt, type: 'salary', start: td(), walletId: walletId });`);


fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('js/app.js', js, 'utf8');
console.log('Multi-Wallet system injected.');
