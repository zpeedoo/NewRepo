const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

// 1. Update isSubActive
const isSubActiveTarget = `        function isSubActive(s) {
            if (!s.end) return true;
            const endD = new Date(s.end); endD.setHours(0, 0, 0, 0);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            return endD >= today;
        }`;
const isSubActiveNew = `        function isSubActive(s) {
            if (s.paused) return false;
            if (!s.end) return true;
            const endD = new Date(s.end); endD.setHours(0, 0, 0, 0);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            return endD >= today;
        }`;
if(js.includes(isSubActiveTarget)) {
    js = js.replace(isSubActiveTarget, isSubActiveNew);
} else {
    // try regex
    js = js.replace(/function isSubActive\(s\) \{\s*if \(\!s\.end\) return true;/g, `function isSubActive(s) {\n            if (s.paused) return false;\n            if (!s.end) return true;`);
}

// 2. Update renderSubs to show Pause button and Paused styling
const renderSubsHTMLTarget = /<div class="sub-amt">\$\{s\.amount\} د\.أ<\/div>\s*<div class="sub-next"[^>]*>تجديد: \$\{s\.next\}<\/div>\s*<\/div>\s*<div style="display:flex;gap:4px;">\s*<button class="del-btn" style="color:var\(--accent2\);" onclick="openEditSub\(\$\{s\.id\}\)" title="تعديل">✎<\/button>\s*<button class="del-btn" onclick="delSub\(\$\{s\.id\}\)">✕<\/button>\s*<\/div>/g;

const renderSubsHTMLNew = `<div class="sub-amt" style="text-decoration: \${s.paused ? 'line-through' : 'none'}; color: \${s.paused ? 'var(--text3)' : 'var(--text)'}">\${s.amount} د.أ</div>
                <div class="sub-next" style="font-size:13px; font-weight:600; color:\${s.paused ? 'var(--text3)' : 'var(--text)'}; margin-top:2px;">
                    \${s.paused ? '⏸ متوقف مؤقتاً' : 'تجديد: ' + s.next}
                </div>
            </div>
            <div style="display:flex;gap:4px;">
                <button class="del-btn" style="color:var(--accent2); font-size: 14px;" onclick="toggleSubPause(\${s.id})" title="\${s.paused ? 'تفعيل' : 'إيقاف مؤقت'}">\${s.paused ? '▶' : '⏸'}</button>
                <button class="del-btn" style="color:var(--accent2);" onclick="openEditSub(\${s.id})" title="تعديل">✎</button>
                <button class="del-btn" onclick="delSub(\${s.id})">✕</button>
            </div>`;

js = js.replace(renderSubsHTMLTarget, renderSubsHTMLNew);

// 3. Inject toggleSubPause function
if (!js.includes('function toggleSubPause')) {
    const toggleFunc = `
        window.toggleSubPause = function(id) {
            const s = state.subscriptions.find(x => x.id === id);
            if (s) {
                s.paused = !s.paused;
                saveState();
                renderSubs();
                renderOverview();
                toast(s.paused ? 'تم إيقاف الاشتراك مؤقتاً' : 'تم تفعيل الاشتراك');
            }
        };
`;
    js = js.replace('function renderSubs() {', toggleFunc + '\n        function renderSubs() {');
}

// 4. Update calcSubMonthly to exclude paused subs
const calcSubMonthlyTarget = `state.subscriptions.forEach(s => {`;
const calcSubMonthlyNew = `state.subscriptions.forEach(s => {
                if (s.paused || !isSubActive(s)) return;`;
js = js.replace(calcSubMonthlyTarget, calcSubMonthlyNew);

// 5. Exclude paused subs from daily/monthly/yearly sums in renderSubs
const mOnlyTarget = `const mOnly = state.subscriptions.filter(s => s.freq === 'monthly').reduce((s, x) => s + x.amount, 0);`;
const mOnlyNew = `const mOnly = state.subscriptions.filter(s => s.freq === 'monthly' && !s.paused && isSubActive(s)).reduce((s, x) => s + x.amount, 0);`;
js = js.replace(mOnlyTarget, mOnlyNew);

const dailyTarget = `const daily = state.subscriptions.filter(s => s.freq === 'daily').reduce((s, x) => s + x.amount, 0);`;
const dailyNew = `const daily = state.subscriptions.filter(s => s.freq === 'daily' && !s.paused && isSubActive(s)).reduce((s, x) => s + x.amount, 0);`;
js = js.replace(dailyTarget, dailyNew);

const yearlyTarget = `const yearly = state.subscriptions.filter(s => s.freq === 'yearly').reduce((s, x) => s + x.amount, 0);`;
const yearlyNew = `const yearly = state.subscriptions.filter(s => s.freq === 'yearly' && !s.paused && isSubActive(s)).reduce((s, x) => s + x.amount, 0);`;
js = js.replace(yearlyTarget, yearlyNew);

// 6. Fix `renderSubCatBreakdown` to ignore paused subs
const breakdownTarget = `(state.subscriptions || []).forEach(s => {`;
const breakdownNew = `(state.subscriptions || []).forEach(s => {
                if (s.paused || !isSubActive(s)) return;`;
js = js.replace(breakdownTarget, breakdownNew);

fs.writeFileSync('js/app.js', js, 'utf8');
console.log('Pause subscription feature injected.');
