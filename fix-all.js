const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');

// ═══════════════════════════════════════
// 1. Add incomeDeductions to default state
// ═══════════════════════════════════════
html = html.replace(
    `shopping: [],`,
    `shopping: [],\n            incomeDeductions: [],`
);

// ═══════════════════════════════════════
// 2. Load incomeDeductions in processLoadedState
// ═══════════════════════════════════════
html = html.replace(
    `state.shopping = p.shopping ? Object.values(p.shopping) : [];`,
    `state.shopping = p.shopping ? Object.values(p.shopping) : [];\n                state.incomeDeductions = p.incomeDeductions ? Object.values(p.incomeDeductions) : [];`
);

// Add incomeDeductions to ID-dedup array
html = html.replace(
    `[state.expenses, state.freelanceLog, state.incomeSources, state.subscriptions, state.maintenance, state.loans, state.shopping].forEach(arr => {
                    arr.forEach(item => {
                        if (item.id > maxId) maxId = item.id;
                    });
                });`,
    `[state.expenses, state.freelanceLog, state.incomeSources, state.subscriptions, state.maintenance, state.loans, state.shopping, state.incomeDeductions].forEach(arr => {
                    arr.forEach(item => {
                        if (item.id > maxId) maxId = item.id;
                    });
                });`
);

html = html.replace(
    `[state.expenses, state.freelanceLog, state.incomeSources, state.subscriptions, state.maintenance, state.loans, state.shopping].forEach(arr => {
                    arr.forEach(item => {
                        if (seenIds.has(item.id)) {`,
    `[state.expenses, state.freelanceLog, state.incomeSources, state.subscriptions, state.maintenance, state.loans, state.shopping, state.incomeDeductions].forEach(arr => {
                    arr.forEach(item => {
                        if (seenIds.has(item.id)) {`
);

// ═══════════════════════════════════════
// 3. Update monthlyIncome() to subtract deductions
// ═══════════════════════════════════════
html = html.replace(
    `function monthlyIncome() {
            const fixed = state.incomeSources.reduce((s, src) => s + src.amount, 0);
            const { from, to } = getDateRange();
            const fl = state.freelanceLog.filter(f => { const d = new Date(f.date); return d >= from && d <= to }).reduce((s, f) => s + f.amount, 0);
            return { fixed, fl, total: fixed + fl };
        }`,
    `function monthlyIncome() {
            const fixed = state.incomeSources.reduce((s, src) => s + src.amount, 0);
            const { from, to } = getDateRange();
            const fl = state.freelanceLog.filter(f => { const d = new Date(f.date); return d >= from && d <= to }).reduce((s, f) => s + f.amount, 0);
            const deductions = (state.incomeDeductions || []).reduce((s, d) => s + d.amount, 0);
            return { fixed, fl, deductions, grossFixed: fixed, netFixed: fixed - deductions, total: fixed + fl - deductions };
        }`
);

// ═══════════════════════════════════════
// 4. Update renderIncome() to show deductions section + net income
// ═══════════════════════════════════════
html = html.replace(
    `function renderIncome() {
            const inc = monthlyIncome();
            document.getElementById('income-metrics').innerHTML = \`
        <div class="metric m-g"><div class="metric-lbl">إجمالي الدخل الثابت/شهر</div><div class="metric-val">\${inc.fixed.toFixed(0)} <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>
        <div class="metric m-c"><div class="metric-lbl">دخل فري لانس (الفترة)</div><div class="metric-val">\${inc.fl.toFixed(0)} <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>
        <div class="metric m-g"><div class="metric-lbl">الإجمالي الكلي</div><div class="metric-val">\${inc.total.toFixed(0)} <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>
        <div class="metric m-a"><div class="metric-lbl">عدد مصادر الدخل</div><div class="metric-val">\${state.incomeSources.length}</div></div>
      \`;`,
    `function renderIncome() {
            const inc = monthlyIncome();
            document.getElementById('income-metrics').innerHTML = \`
        <div class="metric m-g"><div class="metric-lbl">إجمالي الدخل الثابت</div><div class="metric-val">\${inc.grossFixed.toFixed(0)} <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>
        <div class="metric m-r"><div class="metric-lbl">الاستقطاعات الشهرية</div><div class="metric-val">\${inc.deductions.toFixed(0)} <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>
        <div class="metric m-c"><div class="metric-lbl">دخل فري لانس (الفترة)</div><div class="metric-val">\${inc.fl.toFixed(0)} <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>
        <div class="metric m-g"><div class="metric-lbl">صافي الدخل الكلي</div><div class="metric-val">\${inc.total.toFixed(0)} <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>
        <div class="metric m-a"><div class="metric-lbl">عدد مصادر الدخل</div><div class="metric-val">\${state.incomeSources.length}</div></div>
      \`;`
);

// Add deductions list rendering after income-fixed-list rendering
html = html.replace(
    `// freelance in period`,
    `// deductions
            const dedsEl = document.getElementById('income-deductions-list');
            if (dedsEl) {
                const deds = state.incomeDeductions || [];
                dedsEl.innerHTML = deds.length ? deds.map(d => \`
        <div class="income-source">
          <div>
            <div class="income-source-name">\${d.name}</div>
            <div class="income-source-type">استقطاع شهري تلقائي</div>
          </div>
          <div style="text-align:left">
            <div class="income-source-amt" style="color:var(--red)">-\${d.amount.toFixed(2)} د.أ</div>
            <div style="font-size:10px;color:var(--text3)">شهرياً</div>
          </div>
          <button class="del-btn" onclick="delDeduction(\${d.id})">✕</button>
        </div>\`).join('') + \`<div style="display:flex;justify-content:space-between;padding:10px 14px;border-top:1px solid var(--border);font-size:12px;font-weight:600"><span>صافي الراتب بعد الاستقطاعات</span><span style="color:var(--green)">\${inc.netFixed.toFixed(2)} د.أ</span></div>\` : '<div class="empty">لا استقطاعات — أضف تأمين أو ضمان</div>';
            }
            // freelance in period`
);

// ═══════════════════════════════════════
// 5. Add deductions HTML section to Income page
// ═══════════════════════════════════════
html = html.replace(
    `<div class="grid-2">
                <div class="card">
                    <div class="card-title">مصادر الدخل الثابتة (شهرياً)</div>
                    <div id="income-fixed-list"></div>
                </div>
                <div class="card">
                    <div class="card-title">دخل فري لانس / متغير</div>
                    <div id="income-var-list"></div>
                </div>
            </div>`,
    `<div class="grid-2">
                <div class="card">
                    <div class="card-title">مصادر الدخل الثابتة (شهرياً)</div>
                    <div id="income-fixed-list"></div>
                </div>
                <div class="card">
                    <div class="card-title">دخل فري لانس / متغير</div>
                    <div id="income-var-list"></div>
                </div>
            </div>
            <!-- Deductions Section -->
            <div class="card" style="margin-top:14px;border:1px solid rgba(248,113,113,0.2)">
                <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
                    <span>🏥 الاستقطاعات الشهرية (تأمين / ضمان)</span>
                </div>
                <div id="income-deductions-list"></div>
                <div class="divider" style="margin:10px 0"></div>
                <div class="form-title" style="font-size:12px">إضافة استقطاع جديد</div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
                    <div class="field" style="flex:1;min-width:140px">
                        <label>الاسم</label><input class="inp" id="m-ded-name" placeholder="مثال: تأمين صحي، ضمان اجتماعي" />
                    </div>
                    <div class="field" style="width:120px">
                        <label>المبلغ الشهري (د.أ)</label><input class="inp" type="number" id="m-ded-amount" placeholder="0.00" step="0.01" min="0" />
                    </div>
                    <div class="field" style="justify-content:flex-end">
                        <button class="btn" style="background:var(--red);color:#fff" onclick="addDeduction()">+ إضافة استقطاع</button>
                    </div>
                </div>
            </div>`
);

// ═══════════════════════════════════════
// 6. Add export button to Expenses page header
// ═══════════════════════════════════════
html = html.replace(
    `<button class="btn btn-primary" onclick="openModal('addExpense')">+ إضافة مصروف</button>
                </div>
            </div>

            <!-- Dashboard -->`,
    `<button class="btn btn-primary" onclick="openModal('addExpense')">+ إضافة مصروف</button>
                    <button class="btn" style="background:var(--surface3);border:1px solid var(--border)" onclick="printFilteredExpenses()">🖨️ تصدير الكل</button>
                </div>
            </div>

            <!-- Dashboard -->`
);

// ═══════════════════════════════════════
// 7. Fix renderExpDash metrics: show total from ALL categories
// ═══════════════════════════════════════
html = html.replace(
    `const m = document.getElementById('exp-dash-metrics');
            if (m) m.innerHTML =
                '<div class="metric m-r"><div class="metric-lbl">إجمالي المصاريف</div><div class="metric-val">' + total.toFixed(0) + ' <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div><div class="metric-sub">' + exps.length + ' معاملة (فاتورة)</div></div>' +
                (topCat ? '<div class="metric m-a"><div class="metric-lbl">الأكثر إنفاقاً (فئة)</div><div class="metric-val" style="font-size:15px">' + topCat[0] + '</div><div class="metric-sub">' + topCat[1].toFixed(0) + ' د.أ</div></div>' : '') +
                (topExp ? '<div class="metric m-p"><div class="metric-lbl">أعلى مصروف</div><div class="metric-val" style="font-size:14px">' + topExp.desc + '</div><div class="metric-sub">' + topExp.amount.toFixed(2) + ' د.أ</div></div>' : '') +
                '<div class="metric m-g"><div class="metric-lbl">متوسط المصروف</div><div class="metric-val">' + (exps.length ? (total / exps.length).toFixed(1) : 0) + ' <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>';`,
    `const inc = monthlyIncome();
            const pctOfIncome = inc.total > 0 ? (total / inc.total * 100) : 0;
            const remaining = inc.total - total;
            const m = document.getElementById('exp-dash-metrics');
            if (m) m.innerHTML =
                '<div class="metric m-r"><div class="metric-lbl">إجمالي المصاريف (كل الفئات)</div><div class="metric-val">' + total.toFixed(0) + ' <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div><div class="metric-sub">' + exps.length + ' فاتورة · ' + pctOfIncome.toFixed(1) + '% من الدخل</div></div>' +
                '<div class="metric m-g"><div class="metric-lbl">صافي الدخل</div><div class="metric-val">' + inc.total.toFixed(0) + ' <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div><div class="metric-sub">ثابت: ' + inc.netFixed.toFixed(0) + ' | فري لانس: ' + inc.fl.toFixed(0) + '</div></div>' +
                '<div class="metric ' + (remaining >= 0 ? 'm-g' : 'm-r') + '"><div class="metric-lbl">المتبقي من الدخل</div><div class="metric-val ' + (remaining >= 0 ? 'metric-pos' : 'metric-neg') + '">' + remaining.toFixed(0) + ' <span style="font-size:13px;font-weight:400">د.أ</span></div><div class="metric-sub">' + (remaining >= 0 ? '✓ وفر' : '⚠ عجز') + '</div></div>' +
                (topCat ? '<div class="metric m-a"><div class="metric-lbl">الأكثر إنفاقاً (فئة)</div><div class="metric-val" style="font-size:15px">' + topCat[0] + '</div><div class="metric-sub">' + topCat[1].toFixed(0) + ' د.أ</div></div>' : '') +
                (topExp ? '<div class="metric m-p"><div class="metric-lbl">أعلى مصروف</div><div class="metric-val" style="font-size:14px">' + topExp.desc + '</div><div class="metric-sub">' + topExp.amount.toFixed(2) + ' د.أ</div></div>' : '') +
                '<div class="metric m-c"><div class="metric-lbl">متوسط المصروف</div><div class="metric-val">' + (exps.length ? (total / exps.length).toFixed(1) : 0) + ' <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>';`
);

// ═══════════════════════════════════════
// 8. Add incomeDeductions to import handler
// ═══════════════════════════════════════
html = html.replace(
    `if (data.maintenance) state.maintenance = [...state.maintenance, ...(data.maintenance || []).filter(n => !state.maintenance.find(o => o.id === n.id))];`,
    `if (data.maintenance) state.maintenance = [...state.maintenance, ...(data.maintenance || []).filter(n => !state.maintenance.find(o => o.id === n.id))];
                    if (data.incomeDeductions) state.incomeDeductions = [...(state.incomeDeductions||[]), ...(data.incomeDeductions || []).filter(n => !(state.incomeDeductions||[]).find(o => o.id === n.id))];`
);

fs.writeFileSync('index.html', html, 'utf-8');
console.log("All fixes applied successfully!");
