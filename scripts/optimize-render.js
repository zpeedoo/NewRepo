const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

// 1. Inject generateInvoiceHTML
const renderExpTableIndex = appJs.indexOf('function renderExpTable() {');
const generateHTMLFunc = `
        function generateInvoiceHTML(inv, shopFilterCat) {
            const items2show = shopFilterCat === 'all' ? (inv.items || []) : (inv.items || []).filter(it => it.subcat === shopFilterCat);
            const displayTotal = items2show.reduce((s, it) => s + it.qty * it.price, 0);
            const itemsHtml = items2show.map(it => {
                const col = shopSubcatColor(it.subcat);
                return \`<div class="inv-item-row">
        <div class="inv-subcat-dot" style="background:\${col}"></div><span class="inv-item-name">\${it.name}</span><span class="inv-item-qty">×\${it.qty}</span><span class="inv-subcat-badge"
            style="background:\${col}22;color:\${col}">\${it.subcat}</span><span class="inv-item-price">\${(it.qty * it.price).toFixed(2)} د.أ</span>
    </div>\`;
            }).join('');

            const primaryCat = (inv.items || [])[0]?.subcat || 'أخرى';
            const hasMore = (inv.items || []).length > 1;

            return \`<div class="invoice-card" data-id="\${inv.id}">
        <div class="invoice-hdr" onclick="toggleInvoice(\${inv.id})">
            <div class="invoice-icon" style="background:\${catColor(primaryCat)}22;color:\${catColor(primaryCat)}">📄
            </div>
            <div class="invoice-info">
                <div class="invoice-title">\${inv.desc}</div>
                <div class="invoice-meta">\${inv.date} · \${primaryCat}\${hasMore ? ' (+ متعدد)' : ''} · \${inv.payment || 'نقدي'}\${inv.note ? ' · ' + inv.note : ''} · \${(inv.items || []).length} صنف</div>
            </div>
            <div class="invoice-total">\${(shopFilterCat === 'all' ? inv.amount.toFixed(2) : displayTotal.toFixed(2))} د.أ</div><button class="del-btn" style="color:var(--text);margin-inline-end:4px"
                onclick="event.stopPropagation();printInvoice(\${inv.id})" title="تصدير">🖨</button><button
                class="del-btn" style="color:var(--accent2);margin-inline-end:4px"
                onclick="event.stopPropagation();openEditExpense(\${inv.id})" title="تعديل">✎</button><button
                class="del-btn" onclick="event.stopPropagation();delExpense(\${inv.id})" title="حذف">✕</button>
        </div>
        <div class="invoice-body" id="inv-body-\${inv.id}">\${itemsHtml}<div
                style="display:flex;justify-content:space-between;padding-top:8px;margin-top:4px;border-top:1px solid var(--border)">
                <span style="font-size:11px;color:var(--text3)">\${shopFilterCat === 'all' ? 'إجمالي الفاتورة' : 'إجمالي الأصناف المحددة'}</span><span
                    style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:var(--red)">\${(shopFilterCat === 'all' ? inv.amount : displayTotal).toFixed(2)} د.أ</span></div>
                \${(shopFilterCat !== 'all' && (inv.items || []).length > items2show.length) ? \`<button class="btn btn-sm btn-primary" style="width:100%; justify-content:center; margin-top:12px;" onclick="event.stopPropagation(); setShopFilter('all'); setTimeout(() => { const b = document.getElementById('inv-body-\${inv.id}'); if(b){ b.classList.add('open'); b.parentElement.scrollIntoView({behavior:'smooth', block:'center'}); } }, 50);">عرض الفاتورة كاملة (\${inv.amount.toFixed(2)} د.أ)</button>\` : ''}
        </div>
    </div>\`;
        }
`;
appJs = appJs.substring(0, renderExpTableIndex) + generateHTMLFunc + appJs.substring(renderExpTableIndex);

// 2. Refactor renderExpTable
const regexRenderLoop = /let html = visible\.length \? visible\.map\(inv => \{[\s\S]*?\}\)\.join\(''\) : '<div class="empty">لا مصاريف في هذه الفترة — أضف مصروف جديد<\/div>';/;
appJs = appJs.replace(regexRenderLoop, "let html = visible.length ? visible.map(inv => generateInvoiceHTML(inv, shopFilterCat)).join('') : '<div class=\"empty\">لا مصاريف في هذه الفترة — أضف مصروف جديد</div>';");

// 3. Refactor addExpense
const regexAddExp = /saveState\(\); closeModal\('addExpense'\); renderExpTable\(\); renderOverview\(\); if \(typeof renderStatement === 'function'\) renderStatement\(\); toast\('تمت إضافة المصروف ✓'\);/;
appJs = appJs.replace(regexAddExp, `saveState(); closeModal('addExpense');
            
            // SMART INJECTION
            if (inRange(date) && (typeof shopFilterCat === 'undefined' || shopFilterCat === 'all' || items.some(it => it.subcat === shopFilterCat))) {
                const newInv = state.expenses[state.expenses.length - 1];
                const table = document.getElementById('exp-table');
                if (table) {
                    const emptyDiv = table.querySelector('.empty');
                    if (emptyDiv) emptyDiv.remove();
                    const html = generateInvoiceHTML(newInv, typeof shopFilterCat !== 'undefined' ? shopFilterCat : 'all');
                    table.insertAdjacentHTML('afterbegin', html);
                }
            }
            if (typeof renderExpDash === 'function') renderExpDash();
            renderOverview();
            if (typeof renderStatement === 'function') renderStatement();
            toast('تمت إضافة المصروف ✓');`);

// 4. Refactor delExpense
const regexDelExp = /saveState\(\); renderExpTable\(\); renderOverview\(\); if \(typeof renderStatement === 'function'\) renderStatement\(\); toast\('تم الحذف'\);/;
appJs = appJs.replace(regexDelExp, `saveState(); 
            // SMART DELETION
            const row = document.querySelector(\`.invoice-card[data-id="\${id}"]\`);
            if (row) row.remove();
            else if (typeof renderExpTable === 'function') renderExpTable();
            
            if (typeof renderExpDash === 'function') renderExpDash();
            renderOverview(); 
            if (typeof renderStatement === 'function') renderStatement(); 
            toast('تم الحذف');`);

// 5. Refactor saveEditExpense
const regexEditExp = /saveState\(\); editingExpId = null; closeModal\('addExpense'\); renderExpTable\(\); renderOverview\(\); if \(typeof renderStatement === 'function'\) renderStatement\(\); toast\('تم التعديل'\);/;
appJs = appJs.replace(regexEditExp, `saveState(); editingExpId = null; closeModal('addExpense');
            
            // SMART UPDATE
            const row = document.querySelector(\`.invoice-card[data-id="\${exp.id}"]\`);
            if (row) {
                row.outerHTML = generateInvoiceHTML(exp, typeof shopFilterCat !== 'undefined' ? shopFilterCat : 'all');
            } else {
                if (typeof renderExpTable === 'function') renderExpTable();
            }
            
            if (typeof renderExpDash === 'function') renderExpDash();
            renderOverview();
            if (typeof renderStatement === 'function') renderStatement();
            toast('تم التعديل');`);

fs.writeFileSync('js/app.js', appJs, 'utf8');
console.log("Optimization applied!");
