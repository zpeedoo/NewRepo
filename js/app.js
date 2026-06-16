// ═══════════════════════════════════════
        //  DATA STORE
        // ═══════════════════════════════════════
        const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));

        function td() { return new Date().toISOString().split('T')[0] }
        function ym(d) { const x = d || new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') }

        let expLimit = 20;
        let searchTimeout = null;

        function debouncedSearch() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                expLimit = 20;
                renderExpTable();
            }, 150);
        }

        function loadMoreExpenses() {
            expLimit += 20;
            renderExpTable();
        }

        let state = {
            expenses: [],
            incomeSources: [
                { id: 1, name: 'الراتب الشهري', amount: 1200, type: 'salary', start: '2024-01-01' },
            ],
            freelanceLog: [],
            subscriptions: [],
            maintenance: [],
            loans: [],
            categories: [
                { name: 'إيجار / قسط البيت', color: '#818cf8' },
                { name: 'فواتير وخدمات', color: '#fb923c' },
                { name: 'صيانة المنزل', color: '#0ea5e9' },
                { name: 'بقالة وسوبرماركت', color: '#34d399' },
                { name: 'مطاعم وقهوة', color: '#f59e0b' },
                { name: 'خدم منزلية', color: '#8b5cf6' },
                { name: 'وقود ومواصلات', color: '#06b6d4' },
                { name: 'صيانة السيارة وتأمينها', color: '#fb7185' },
                { name: 'مصاريف الأولاد والمدارس', color: '#3b82f6' },
                { name: 'صحة وأدوية', color: '#10b981' },
                { name: 'تسوق وملابس', color: '#a78bfa' },
                { name: 'ترفيه وسفر', color: '#f472b6' },
                { name: 'قروض وأقساط', color: '#facc15' },
                { name: 'هدايا وصدقات', color: '#f43f5e' },
                { name: 'صحة وجمال', color: '#2dd4bf' },
                { name: 'رسوم حكومية ومعاملات', color: '#78716c' },
                { name: 'اشتراكات وباقات', color: '#d946ef' },
                { name: 'حيوانات أليفة', color: '#f97316' },
                { name: 'طوارئ ومتفرقات', color: '#ef4444' },
                { name: 'أخرى', color: '#94a3b8' }
            ],
            budgets: {},
            nextId: 200,
            shopping: [],
            incomeDeductions: [],
            // period
            periodMode: 'month', // month | year | all
            periodMonth: new Date().getMonth(),
            periodYear: new Date().getFullYear(),
            financialMonthStartDay: 27, // defaults to 27 as requested
            deletedIds: {},
            lastUpdated: 0,
        };

        const firebaseConfig = {
            apiKey: "AIzaSyD5_r_wBDjy1y6Pm0oOwLIMdHyITiknSSw",
            authDomain: "myexpenses-3b6f5.firebaseapp.com",
            databaseURL: "https://myexpenses-3b6f5-default-rtdb.firebaseio.com",
            projectId: "myexpenses-3b6f5",
            storageBucket: "myexpenses-3b6f5.firebasestorage.app",
            messagingSenderId: "321643278173",
            appId: "1:321643278173:web:5dfb1ae0c644e97fe842b4",
            measurementId: "G-MJZN5DXGRQ"
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        // Global flag to prevent Firebase listener feedback loop:
        // When WE write to Firebase, the .on() listener fires again with our own data.
        // We use this flag to skip that echo and avoid infinite loops.
        let isSaving = false;

        async function loadState() {
            // ── CATEGORY MIGRATION v2 HELPERS ──
            const CAT_MIGRATION = {
                'طعام': 'بقالة وسوبرماركت',
                'مواصلات': 'وقود ومواصلات',
                'فواتير': 'فواتير وخدمات',
                'ترفيه': 'ترفيه وسفر',
                'صحة': 'صحة وأدوية',
                'تعليم': 'مصاريف الأولاد والمدارس',
                'تسوق': 'تسوق وملابس',
                'سيارة': 'صيانة السيارة وتأمينها',
                'إيجار': 'إيجار / قسط البيت',
                'ديون': 'قروض وأقساط',
                'المصاريف الشهرية': 'فواتير وخدمات',
                'مصاريف السيارة': 'صيانة السيارة وتأمينها',
                'مصاريف المدارس': 'مصاريف الأولاد والمدارس',
                'الحارس': 'خدم منزلية',
                'اخرى': 'أخرى',
                'غير مصنفة': 'أخرى'
            };
            const NEW_CATS = [
                { name: 'إيجار / قسط البيت', color: '#818cf8' },
                { name: 'فواتير وخدمات', color: '#fb923c' },
                { name: 'صيانة المنزل', color: '#0ea5e9' },
                { name: 'بقالة وسوبرماركت', color: '#34d399' },
                { name: 'مطاعم وقهوة', color: '#f59e0b' },
                { name: 'خدم منزلية', color: '#8b5cf6' },
                { name: 'وقود ومواصلات', color: '#06b6d4' },
                { name: 'صيانة السيارة وتأمينها', color: '#fb7185' },
                { name: 'مصاريف الأولاد والمدارس', color: '#3b82f6' },
                { name: 'صحة وأدوية', color: '#10b981' },
                { name: 'تسوق وملابس', color: '#a78bfa' },
                { name: 'ترفيه وسفر', color: '#f472b6' },
                { name: 'قروض وأقساط', color: '#facc15' },
                { name: 'هدايا وصدقات', color: '#f43f5e' },
                { name: 'صحة وجمال', color: '#2dd4bf' },
                { name: 'رسوم حكومية ومعاملات', color: '#78716c' },
                { name: 'اشتراكات وباقات', color: '#d946ef' },
                { name: 'حيوانات أليفة', color: '#f97316' },
                { name: 'طوارئ ومتفرقات', color: '#ef4444' },
                { name: 'أخرى', color: '#94a3b8' }
            ];
            const NEW_CAT_SET = new Set(NEW_CATS.map(c => c.name));
            const remap = name => {
                const n = (name || '').toString().trim();
                if (NEW_CAT_SET.has(n)) return n;
                if (CAT_MIGRATION[n]) return CAT_MIGRATION[n];
                return 'أخرى';
            };

            const processLoadedState = (p) => {
                // Safeguard critical transaction arrays with Smart Merge
                state.deletedIds = { ...(state.deletedIds || {}), ...(p.deletedIds || {}) };

                const localExpenses = state.expenses || [];
                const localFreelance = state.freelanceLog || [];
                const localMaint = state.maintenance || [];
                const localLoans = state.loans || [];
                const localSubs = state.subscriptions || [];

                const serverExpenses = p.expenses ? Object.values(p.expenses) : [];
                const serverFreelance = p.freelanceLog ? Object.values(p.freelanceLog) : [];
                const serverMaint = p.maintenance ? Object.values(p.maintenance) : [];
                const serverLoans = p.loans ? Object.values(p.loans) : [];
                const serverSubs = p.subscriptions ? Object.values(p.subscriptions) : [];

                const smartMerge = (localArr, serverArr) => {
                    const mergedMap = new Map();
                    // 1. Server represents authoritative updates/deletions, add server items first (skipping deleted ones)
                    serverArr.forEach(item => {
                        if (item && item.id !== undefined) {
                            const isDeleted = state.deletedIds && (state.deletedIds[item.id] || state.deletedIds[String(item.id)]);
                            if (!isDeleted) {
                                mergedMap.set(item.id, item);
                            }
                        }
                    });
                    // 2. Add local items with unique IDs that don't exist on server (offline-created items, skipping deleted ones)
                    localArr.forEach(item => {
                        if (item && item.id !== undefined && !mergedMap.has(item.id)) {
                            const isDeleted = state.deletedIds && (state.deletedIds[item.id] || state.deletedIds[String(item.id)]);
                            if (!isDeleted) {
                                mergedMap.set(item.id, item);
                            }
                        }
                    });
                    return Array.from(mergedMap.values());
                };

                state.expenses = smartMerge(localExpenses, serverExpenses);
                state.freelanceLog = smartMerge(localFreelance, serverFreelance);
                state.maintenance = smartMerge(localMaint, serverMaint);
                state.loans = smartMerge(localLoans, serverLoans);
                state.subscriptions = smartMerge(localSubs, serverSubs);

                state.incomeSources = p.incomeSources ? Object.values(p.incomeSources) : [];
                state.shopping = p.shopping ? Object.values(p.shopping) : [];
                state.incomeDeductions = p.incomeDeductions ? Object.values(p.incomeDeductions) : [];
                if (p.categories) state.categories = p.categories;
                if (p.budgets) state.budgets = decodeBudgetsFromFirebase(p.budgets);
                if (p.periodMode) state.periodMode = p.periodMode;
                if (p.periodMonth !== undefined) state.periodMonth = p.periodMonth;
                state.periodYear = p.periodYear || new Date().getFullYear();
                state.financialMonthStartDay = p.financialMonthStartDay !== undefined ? parseInt(p.financialMonthStartDay) : 27;

                // Migrate fixedSubs to new object structure with dates
                if (p.fixedSubs) {
                    if (typeof p.fixedSubs.social === 'number' || typeof p.fixedSubs.health === 'number') {
                        state.fixedSubs = {
                            social: { amount: p.fixedSubs.social || 0, start: td(), end: '' },
                            health: { amount: p.fixedSubs.health || 0, start: td(), end: '' }
                        };
                    } else {
                        state.fixedSubs = p.fixedSubs;
                    }
                } else {
                    state.fixedSubs = {
                        social: { amount: 0, start: td(), end: '' },
                        health: { amount: 0, start: td(), end: '' }
                    };
                }

                let maxId = 0;
                const seenIds = new Set();
                [state.expenses, state.freelanceLog, state.incomeSources, state.subscriptions, state.maintenance, state.loans, state.shopping, state.incomeDeductions || []].forEach(arr => {
                    arr.forEach(item => {
                        if (item.id > maxId) maxId = item.id;
                    });
                });
                state.nextId = Math.max(state.nextId, maxId + 1);

                // Fix duplicate IDs & remove 'cat' logic to rely fully on 'items.subcat'

                let updatedIds = false;

                // --- MIGRATION: Convert old simple expenses to detailed expenses ---
                state.expenses = state.expenses.map(e => {
                    let updated = e;
                    if (!e.items) {
                        updated = {
                            id: e.id,
                            desc: e.desc,
                            amount: e.amount,
                            date: e.date,
                            payment: 'نقدي',
                            note: '',
                            items: [{ name: e.desc, qty: 1, price: e.amount, subcat: e.cat || 'أخرى' }]
                        };
                    }
                    // Ensure every item has a valid subcat
                    updated.items.forEach(it => {
                        if (!it.subcat) it.subcat = 'أخرى';
                    });
                    // Removed 'cat' to rely on items
                    delete updated.cat;
                    return updated;
                });

                // --- MIGRATION: Merge shopping into expenses ---
                if (state.shopping && state.shopping.length > 0) {
                    state.shopping.forEach(inv => {
                        // Avoid duplicates if it was synced
                        if (inv._expenseId && state.expenses.some(e => e.id === inv._expenseId)) {
                            let ex = state.expenses.find(e => e.id === inv._expenseId);
                            ex.items = inv.items;
                            ex.payment = inv.payment;
                            ex.note = inv.note;
                            ex.amount = inv.total;
                            ex.desc = inv.store;
                        } else {
                            state.expenses.push({
                                id: inv.id,
                                desc: inv.store,
                                amount: inv.total,
                                date: inv.date,
                                payment: inv.payment,
                                note: inv.note,
                                items: inv.items
                            });
                        }
                    });
                    state.shopping = []; // Clear it
                    updatedIds = true;
                }

                [state.expenses, state.freelanceLog, state.incomeSources, state.subscriptions, state.maintenance, state.loans, state.shopping].forEach(arr => {
                    arr.forEach(item => {
                        if (seenIds.has(item.id)) {
                            item.id = state.nextId++;
                            updatedIds = true;
                        }
                        seenIds.add(item.id);
                    });
                });
                if (p.nextId && p.nextId > state.nextId) state.nextId = p.nextId;

                // ── MIGRATIONS TO RUN ON LOAD ──

                // Migrate categories list to new schema (preserve user-added custom categories)
                const hasOldCats = state.categories.some(c => CAT_MIGRATION[c.name] !== undefined);
                const missingNew = NEW_CATS.some(nc => !state.categories.find(c => c.name === nc.name));
                if (hasOldCats || missingNew) {
                    const customCats = state.categories.filter(c =>
                        !NEW_CAT_SET.has(c.name) && CAT_MIGRATION[c.name] === undefined
                    );
                    state.categories = [...NEW_CATS, ...customCats];
                    updatedIds = true;
                }

                // Migrate expense item subcategories
                state.expenses.forEach(e => {
                    (e.items || []).forEach(it => {
                        const before = it.subcat;
                        // Skip remap if it's already a valid detailed subcat — remap() is for main category names only
                        if (!SUB_TO_MAIN_CAT[before]) {
                            const after = remap(before);
                            if (before !== after) { it.subcat = after; updatedIds = true; }
                        }

                        // Clean up any legacy corrupt 'بنزين' -> 'اتصالات' mappings in their historical database
                        if (it.name && it.name.trim().toLowerCase().includes('بنزين') && it.subcat !== 'بنزين / وقود') {
                            it.subcat = 'بنزين / وقود';
                            updatedIds = true;
                        }
                    });
                });

                // Migrate generic expense subcategories to granular detailed subcategories based on keywords
                let migratedDetailedCount = 0;
                state.expenses.forEach(e => {
                    (e.items || []).forEach(it => {
                        const isMainOrGeneric = !it.subcat ||
                            it.subcat === 'أخرى' ||
                            it.subcat === 'اخرى' ||
                            state.categories.some(c => c.name === it.subcat);

                        if (isMainOrGeneric && it.name) {
                            const nameLower = it.name.trim().toLowerCase();
                            for (const mapping of ITEM_AUTO_MAP) {
                                for (const kw of mapping.keywords) {
                                    if (nameLower.includes(kw)) {
                                        const oldSub = it.subcat;
                                        it.subcat = mapping.subcat;
                                        if (oldSub !== it.subcat) {
                                            migratedDetailedCount++;
                                            updatedIds = true;
                                        }
                                        return; // matched, skip other keywords
                                    }
                                }
                            }
                        }
                    });
                });
                if (migratedDetailedCount > 0) {
                    console.log(`Migrated ${migratedDetailedCount} old invoice items to granular subcategories!`);
                }

                // Migrate subscription categories
                (state.subscriptions || []).forEach(s => {
                    const before = s.cat;
                    const after = remap(before);
                    if (before !== after) { s.cat = after; updatedIds = true; }
                });

                // Migrate budget keys
                if (state.budgets) {
                    const newBudgets = {};
                    let budgetChanged = false;
                    Object.keys(state.budgets).forEach(k => {
                        const nk = remap(k);
                        if (nk !== k) budgetChanged = true;
                        newBudgets[nk] = (newBudgets[nk] || 0) + (parseFloat(state.budgets[k]) || 0);
                    });
                    if (budgetChanged) {
                        state.budgets = newBudgets;
                        updatedIds = true;
                    }
                }

                // Train the self-learning model
                trainModel();

                return updatedIds;
            };
            window.processLoadedState = processLoadedState;

            let needsSave = false;
            const s = localStorage.getItem('mwsarify_v3');
            if (s) {
                try {
                    const p = JSON.parse(s);
                    needsSave = processLoadedState(p);
                    if (p.lastUpdated !== undefined) {
                        state.lastUpdated = p.lastUpdated;
                    }
                } catch (e) { }
            }

            // Use .on() for REAL-TIME sync: fires automatically on any change from any device
            db.ref('state').on('value', snapshot => {
                    
                    const p = snapshot.val();
                    if (!p) return;

                    // Ignore Firebase updates triggered by our own saveState() call
                    if (isSaving) return;

                    const serverTime = p.lastUpdated || 0;
                    const localTime = state.lastUpdated || 0;

                    let shouldSyncLocal = localTime > serverTime;

                    if (localTime === 0 && serverTime === 0) {
                        const localCount = (state.expenses || []).length;
                        const serverCount = (p.expenses ? Object.values(p.expenses) : []).length;
                        if (localCount > serverCount) {
                            state.lastUpdated = Date.now();
                            shouldSyncLocal = true;
                        }
                    }

                    if (shouldSyncLocal) {
                        console.log('Local is newer → pushing to server');
                        isSaving = true;
                        db.ref('state').set({ ...state, budgets: encodeBudgetsForFirebase(state.budgets) })
                            .then(() => { isSaving = false; console.log('Pushed local to server ✅'); })
                            .catch(err => { isSaving = false; console.error('Push failed', err); });
                    } else {
                        console.log('Server updated → pulling to device ✅');

                        // Backup local state to prevent data loss if there are any local transactions
                        const currentLocal = localStorage.getItem('mwsarify_v3');
                        if (currentLocal) {
                            try {
                                const parsed = JSON.parse(currentLocal);
                                if (parsed.expenses && parsed.expenses.length > 0) {
                                    localStorage.setItem('mwsarify_v3_backup', currentLocal);
                                    console.log('Backed up local state to prevent sync data loss 🎒');
                                }
                            } catch (e) { }
                        }

                        const dbNeedsSave = processLoadedState(p);
                        if (p.lastUpdated !== undefined) state.lastUpdated = p.lastUpdated;
                        if (dbNeedsSave) {
                            saveState();
                        } else {
                            localStorage.setItem('mwsarify_v3', JSON.stringify(state));
                            renderCurrentPage();
                        }
                    }
                
                }, err => {
                    console.error('Firebase realtime listener error', err);
                });

            if (needsSave) saveState();
        }

        function renderCurrentPage() {
            const active = document.querySelector('.page.active');
            if (active) {
                const id = active.id.replace('page-', '');
                const renders = {
                    overview: renderOverview,
                    statement: renderStatement,
                    income: renderIncome,
                    transactions: renderExpTable,
                    subscriptions: renderSubs,
                    loans: renderLoans,
                    budget: renderBudget,
                    categories: renderCategories,
                    export: renderExport
                };
                if (renders[id]) renders[id]();
            }
        }

        // Encode budgets object keys (category names) to be Firebase-safe
        // Firebase forbids keys with: . # $ / [ ]
        function encodeBudgetsForFirebase(budgets) {
            if (!budgets || typeof budgets !== 'object') return budgets;
            const encoded = {};
            for (const key in budgets) {
                const safeKey = key
                    .replace(/\./g, '__DOT__')
                    .replace(/#/g, '__HASH__')
                    .replace(/\$/g, '__DOLLAR__')
                    .replace(/\//g, '__SLASH__')
                    .replace(/\[/g, '__LBRACKET__')
                    .replace(/\]/g, '__RBRACKET__');
                encoded[safeKey] = budgets[key];
            }
            return encoded;
        }

        // Decode Firebase-safe keys back to original category names
        function decodeBudgetsFromFirebase(budgets) {
            if (!budgets || typeof budgets !== 'object') return budgets;
            const decoded = {};
            for (const key in budgets) {
                const origKey = key
                    .replace(/__DOT__/g, '.')
                    .replace(/__HASH__/g, '#')
                    .replace(/__DOLLAR__/g, '$')
                    .replace(/__SLASH__/g, '/')
                    .replace(/__LBRACKET__/g, '[')
                    .replace(/__RBRACKET__/g, ']');
                decoded[origKey] = budgets[key];
            }
            return decoded;
        }

        async function saveState() {
            trainModel();
            state.lastUpdated = Date.now();
            isSaving = true; // block the .on() listener from reacting to our own write

            // 1. الحفظ المحلي الفوري (لضمان عدم ضياع الداتا من الهاتف أبداً)
            localStorage.setItem('mwsarify_v3', JSON.stringify(state));
            updateDatalists();

            // 2. المزامنة في الخلفية (Firebase تتعامل مع انقطاع النت بذكاء)
            try {
                const firebaseState = { ...state, budgets: encodeBudgetsForFirebase(state.budgets) };
                db.ref('state').set(firebaseState)
                    .then(() => console.log('Firebase Web SDK save OK'))
                    .catch(e => console.error('Firebase Web SDK save error', e))
                    .finally(() => { isSaving = false; });
            } catch (e) {
                console.error('Firebase format error', e);
                isSaving = false;
            }
        }

        // ═══════════════════════════════════════
        //  PERIOD HELPERS
        // ═══════════════════════════════════════
        function getFinancialMonthAndYear(dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
            const year = y;
            const month = m - 1; // 0-indexed calendar month
            const day = d;

            const startDay = state.financialMonthStartDay || 27;
            if (startDay === 1) {
                return { month, year };
            }

            if (day >= startDay) {
                let finMonth = month + 1;
                let finYear = year;
                if (finMonth > 11) {
                    finMonth = 0;
                    finYear += 1;
                }
                return { month: finMonth, year: finYear };
            } else {
                return { month: month, year: year };
            }
        }

        function inRange(dateStr) {
            if (state.periodMode === 'all') return true;

            const { month, year } = getFinancialMonthAndYear(dateStr);

            if (state.periodMode === 'year') {
                return year === state.periodYear;
            }
            if (state.periodMode === 'month') {
                return year === state.periodYear && month === state.periodMonth;
            }
            if (state.periodMode === 'last3') {
                const selAbs = state.periodYear * 12 + state.periodMonth;
                const itemAbs = year * 12 + month;
                return itemAbs <= selAbs && itemAbs >= (selAbs - 2);
            }
            if (state.periodMode === 'last6') {
                const selAbs = state.periodYear * 12 + state.periodMonth;
                const itemAbs = year * 12 + month;
                return itemAbs <= selAbs && itemAbs >= (selAbs - 5);
            }
            return true;
        }

        function getDateRange() {
            const { periodMode: m, periodMonth, periodYear } = state;
            const startDay = state.financialMonthStartDay || 27;
            if (m === 'month') {
                if (startDay === 1) {
                    const from = new Date(periodYear, periodMonth, 1);
                    const to = new Date(periodYear, periodMonth + 1, 0);
                    return { from, to };
                } else {
                    const from = new Date(periodYear, periodMonth - 1, startDay);
                    const to = new Date(periodYear, periodMonth, startDay - 1);
                    return { from, to };
                }
            }
            if (m === 'last3') {
                if (startDay === 1) {
                    const from = new Date(periodYear, periodMonth - 2, 1);
                    const to = new Date(periodYear, periodMonth + 1, 0);
                    return { from, to };
                } else {
                    const from = new Date(periodYear, periodMonth - 3, startDay);
                    const to = new Date(periodYear, periodMonth, startDay - 1);
                    return { from, to };
                }
            }
            if (m === 'last6') {
                if (startDay === 1) {
                    const from = new Date(periodYear, periodMonth - 5, 1);
                    const to = new Date(periodYear, periodMonth + 1, 0);
                    return { from, to };
                } else {
                    const from = new Date(periodYear, periodMonth - 6, startDay);
                    const to = new Date(periodYear, periodMonth, startDay - 1);
                    return { from, to };
                }
            }
            if (m === 'year') {
                if (startDay === 1) {
                    return { from: new Date(periodYear, 0, 1), to: new Date(periodYear, 11, 31) };
                } else {
                    return { from: new Date(periodYear - 1, 11, startDay), to: new Date(periodYear, 11, startDay - 1) };
                }
            }
            return { from: new Date(2000, 0, 1), to: new Date(2099, 11, 31) };
        }

        function periodLabel() {
            const { periodMode: m, periodMonth, periodYear } = state;
            const startDay = state.financialMonthStartDay || 27;
            if (m === 'month') {
                let lbl = MONTHS[periodMonth] + ' ' + periodYear;
                if (startDay > 1) {
                    const prevMonth = periodMonth === 0 ? 11 : periodMonth - 1;
                    lbl += ` (${startDay}/${prevMonth + 1} - ${startDay - 1}/${periodMonth + 1})`;
                }
                return lbl;
            }
            if (m === 'last3') {
                return `آخر ٣ أشهر (حتى ${MONTHS[periodMonth]} ${periodYear})`;
            }
            if (m === 'last6') {
                return `آخر ٦ أشهر (حتى ${MONTHS[periodMonth]} ${periodYear})`;
            }
            if (m === 'year') return 'سنة ' + periodYear;
            return 'كل الفترات';
        }
        function monthlyIncome() {
            let numMonths = 1;
            let finM = state.periodMonth;
            let finY = state.periodYear;
            const startDay = state.financialMonthStartDay || 27;

            if (state.periodMode === 'last3') numMonths = 3;
            else if (state.periodMode === 'last6') numMonths = 6;
            else if (state.periodMode === 'year') numMonths = 12;
            else if (state.periodMode === 'all') {
                if (state.expenses && state.expenses.length > 0) {
                    const dates = state.expenses.map(e => new Date(e.date).getTime()).filter(Boolean);
                    if (dates.length > 0) {
                        const oldest = new Date(Math.min(...dates));
                        const newest = new Date();
                        numMonths = Math.max(1, (newest.getFullYear() - oldest.getFullYear()) * 12 + (newest.getMonth() - oldest.getMonth()) + 1);
                        const currentCycle = getFinancialMonthAndYear(td());
                        finM = currentCycle.month;
                        finY = currentCycle.year;
                    } else {
                        numMonths = 12;
                    }
                } else {
                    numMonths = 12;
                }
            }

            let fixed = 0;
            let curM = finM;
            let curY = finY;

            for (let i = 0; i < numMonths; i++) {
                let cycleEnd;
                if (startDay === 1) {
                    cycleEnd = new Date(curY, curM + 1, 0);
                } else {
                    cycleEnd = new Date(curY, curM, startDay - 1);
                }

                (state.incomeSources || []).forEach(src => {
                    const ds = src.start || td();
                    const [y, m, d] = ds.split('-').map(Number);
                    const startD = new Date(y, m - 1, d);
                    if (startD <= cycleEnd) {
                        fixed += parseFloat(src.amount) || 0;
                    }
                });

                curM--;
                if (curM < 0) {
                    curM = 11;
                    curY--;
                }
            }

            const fl = state.freelanceLog.filter(f => inRange(f.date)).reduce((s, f) => s + f.amount, 0);
            const deds = calcFixedDeductions() * numMonths;
            const netFixed = fixed - deds;
            // total = net available income (used by overview/budget calculations)
            return { fixed, fl, deds, netFixed, total: netFixed + fl, gross: fixed + fl };
        }

        // ═══════════════════════════════════════
        //  NAV + PERIOD
        // ═══════════════════════════════════════
        function goPage(el) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.bnav-item').forEach(n => n.classList.remove('active'));
            el.classList.add('active');
            const name = el.dataset.page;


            // Update both desktop and mobile nav styles
            document.querySelectorAll(`.nav-item[data-page="${name}"], .bnav-item[data-page="${name}"]`).forEach(n => n.classList.add('active'));

            document.getElementById('page-' + name).classList.add('active');
            const renders = { overview: renderOverview, statement: renderStatement, income: renderIncome, transactions: renderExpTable, subscriptions: renderSubs, loans: renderLoans, budget: renderBudget, categories: renderCategories, export: renderExport };
            if (renders[name]) renders[name]();
        }
        function updatePeriod() {
            state.periodMonth = parseInt(document.getElementById('selMonth').value);
            state.periodYear = parseInt(document.getElementById('selYear').value);
            renderCurrent();
        }
        function updateStartDay() {
            state.financialMonthStartDay = parseInt(document.getElementById('selStartDay').value) || 27;
            saveState();
            renderCurrent();
        }
        function setQuickPeriod(mode, btn) {
            state.periodMode = mode;
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            renderCurrent();
        }
        function syncPeriodChips() {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            const activeChip = document.getElementById('chip-' + state.periodMode);
            if (activeChip) activeChip.classList.add('active');
        }
        function renderCurrent() {
            const active = document.querySelector('.page.active');
            if (!active) return;
            const id = active.id.replace('page-', '');
            const renders = { overview: renderOverview, statement: renderStatement, income: renderIncome, transactions: renderExpTable, subscriptions: renderSubs, loans: renderLoans, budget: renderBudget };
            if (renders[id]) renders[id]();
        }
        function initPeriodSelects() {
            const now = new Date();
            const fin = getFinancialMonthAndYear(td());

            if (state.periodMonth === undefined) state.periodMonth = fin.month;
            if (state.periodYear === undefined) state.periodYear = fin.year;

            const mSel = document.getElementById('selMonth');
            if (mSel) mSel.value = state.periodMonth;

            const ySel = document.getElementById('selYear');
            if (ySel) {
                ySel.innerHTML = '';
                for (let y = now.getFullYear() - 5; y <= now.getFullYear() + 2; y++) {
                    const o = document.createElement('option');
                    o.value = y; o.textContent = y;
                    if (y === state.periodYear) o.selected = true;
                    ySel.appendChild(o);
                }
            }
            // Populate financial month start day select
            const startDaySel = document.getElementById('selStartDay');
            if (startDaySel) {
                startDaySel.innerHTML = '';
                for (let d = 1; d <= 28; d++) {
                    const o = document.createElement('option');
                    o.value = d;
                    o.textContent = d === 1 ? '1 (التقويم)' : `يوم ${d}`;
                    if (d === (state.financialMonthStartDay || 27)) o.selected = true;
                    startDaySel.appendChild(o);
                }
            }
            // statement selects
            ['stmtFromMonth', 'stmtToMonth'].forEach(id => {
                const sel = document.getElementById(id);
                if (sel) {
                    sel.innerHTML = '';
                    MONTHS.forEach((m, i) => { const o = document.createElement('option'); o.value = i; o.textContent = m; sel.appendChild(o) });
                }
            });
            ['stmtFromYear', 'stmtToYear'].forEach(id => {
                const sel = document.getElementById(id);
                if (sel) {
                    sel.innerHTML = '';
                    for (let y = now.getFullYear() - 5; y <= now.getFullYear() + 2; y++) {
                        const o = document.createElement('option'); o.value = y; o.textContent = y;
                        if (y === now.getFullYear()) o.selected = true;
                        sel.appendChild(o);
                    }
                }
            });
            const sfm = document.getElementById('stmtFromMonth');
            if (sfm) sfm.value = now.getMonth();
            const stm = document.getElementById('stmtToMonth');
            if (stm) stm.value = now.getMonth();
        }

        // ═══════════════════════════════════════
        //  OVERVIEW
        // ═══════════════════════════════════════
        let charts = { donut: null, line: null, stmtLine: null };

        function animateCounter(elementId, start, end, duration, formatter) {
            const el = document.getElementById(elementId);
            if (!el) return;
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                // easeOutQuad
                const easeOut = progress * (2 - progress);
                const current = easeOut * (end - start) + start;
                el.innerHTML = formatter ? formatter(current) : Math.floor(current);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    el.innerHTML = formatter ? formatter(end) : end;
                }
            };
            window.requestAnimationFrame(step);
        }

        function renderOverview() {
            document.getElementById('periodBadge').textContent = periodLabel();
            const exps = state.expenses.filter(e => inRange(e.date));
            const totalExp = exps.reduce((s, e) => s + e.amount, 0);
            const totalAll = totalExp; const totalShop = 0;
            const inc = monthlyIncome();
            const subMonthly = calcSubMonthly();
            // Pure monthly subscriptions only — for the overview dashboard tile.
            // Yearly subs are NOT divided by 12, and daily subs are NOT multiplied by 30 here.
            const subPureMonthly = state.subscriptions
                .filter(s => s.freq === 'monthly')
                .reduce((sum, s) => sum + s.amount, 0);
            // Pure yearly subscriptions (raw amount, not divided)
            const subPureYearly = state.subscriptions
                .filter(s => s.freq === 'yearly')
                .reduce((sum, s) => sum + s.amount, 0);

            // Calculate Loans metrics
            let totalLoanAmt = 0;
            let totalLoanRem = 0;
            let loanMonthly = 0;
            state.loans.forEach(l => {
                totalLoanAmt += l.total;
                totalLoanRem += l.remaining;
                loanMonthly += l.monthly;
            });
            const paidLoan = Math.max(0, totalLoanAmt - totalLoanRem);
            const loanPctRaw = totalLoanAmt > 0 ? (paidLoan / totalLoanAmt) * 100 : 0;
            const loanPct = Math.round(loanPctRaw * 10) / 10;
            const loanCol = loanPct === 100 ? 'var(--green)' : 'var(--accent)';

            let numMonths = 1;
            if (state.periodMode === 'last3') numMonths = 3;
            else if (state.periodMode === 'last6') numMonths = 6;
            else if (state.periodMode === 'year') numMonths = 12;
            else if (state.periodMode === 'all') {
                if (state.expenses && state.expenses.length > 0) {
                    const dates = state.expenses.map(e => new Date(e.date).getTime()).filter(Boolean);
                    if (dates.length > 0) {
                        const oldest = new Date(Math.min(...dates));
                        const newest = new Date();
                        numMonths = Math.max(1, (newest.getFullYear() - oldest.getFullYear()) * 12 + (newest.getMonth() - oldest.getMonth()) + 1);
                    } else {
                        numMonths = 12;
                    }
                } else {
                    numMonths = 12;
                }
            }

            const totalAllExp = totalExp + (subMonthly * numMonths) + (loanMonthly * numMonths);
            const net = inc.total - totalAllExp;

            // Common SVGs details for circular progress
            const radius = 52;
            const circumference = 2 * Math.PI * radius;

            // 1. Render Salary Dashboard (Mini Circular Gauge)
            // Use Math.round to avoid floating point differences between mobile Safari and desktop Chrome
            const spentPctRaw = inc.total > 0 ? (totalAllExp / inc.total) * 100 : 0;
            const spentPct = Math.round(spentPctRaw * 10) / 10;
            const safePct = Math.min(spentPct, 100);
            const dashCol = spentPct > 90 ? 'var(--red)' : spentPct > 70 ? 'var(--orange)' : 'var(--green)';
            const offsetCons = circumference - (safePct / 100) * circumference;
            // Warning animation thresholds:
            //   >= 80% → amber pulsing (approaching 85%)
            //   >= 85% → red pulsing + shake (critical)
            const consumeClass = spentPct >= 85 ? 'consume-critical'
                : spentPct >= 80 ? 'consume-near'
                    : '';
            const consumeTitle = spentPct >= 85 ? '⚠️ معدل الاستهلاك من الدخل'
                : spentPct >= 80 ? '🔔 معدل الاستهلاك من الدخل'
                    : 'معدل الاستهلاك من الدخل';

            // 2. Render Loan Dashbaord
            const offsetLoan = circumference - (loanPct / 100) * circumference;

            document.getElementById('mini-dashboards').innerHTML = `
                <!-- Dashboard 1: Consumption -->
                <div class="card" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <div class="card-title" style="margin-bottom:20px; text-align:center;">${consumeTitle}</div>
                    <div style="display:flex; justify-content:center; align-items:center; height:120px;">
                        <div class="circ-prog-wrap ${consumeClass}">
                            <svg width="120" height="120" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="${radius}" fill="none" stroke="var(--surface3)" stroke-width="8" />
                                <circle id="consumeCircle" cx="60" cy="60" r="${radius}" fill="none" stroke="${dashCol}" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" stroke-linecap="round" />
                            </svg>
                            <div class="circ-content">
                                <div class="circ-val" id="valCons" style="color:${dashCol}">0.0%</div>
                                <div class="circ-lbl" style="color:${dashCol}">مستهلك</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Dashboard 2: Expense Distribution -->
                <div class="card" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <div class="card-title" style="margin-bottom:20px; text-align:center;">توزيع المصاريف</div>
                    <div class="donut-wrap">
                        <canvas id="donutChart" role="img" aria-label="توزيع المصاريف حسب الفئة"></canvas>
                        <div class="donut-center">
                            <div class="donut-total" id="donutTotal">0</div>
                            <div class="donut-lbl">إجمالي</div>
                        </div>
                    </div>
                </div>

                <!-- Dashboard 3: Loans -->
                <div class="card" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <div class="card-title" style="margin-bottom:20px; text-align:center;">سداد القروض</div>
                    <div style="display:flex; justify-content:center; align-items:center; height:120px;">
                        <div class="circ-prog-wrap">
                            <svg width="120" height="120" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="${radius}" fill="none" stroke="var(--surface3)" stroke-width="8" />
                                <circle id="loanCircle" cx="60" cy="60" r="${radius}" fill="none" stroke="${loanCol}" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" stroke-linecap="round" />
                            </svg>
                            <div class="circ-content">
                                <div class="circ-val" id="valLoan">0.0%</div>
                                <div class="circ-lbl" style="color:${loanCol}">مسدد</div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:14px; text-align:center;">
                        <div style="font-size:10px; color:var(--text3); font-family:'JetBrains Mono', monospace; letter-spacing:.4px; margin-bottom:2px;">المبلغ المتبقي</div>
                        <div style="font-size:16px; font-weight:600; color:var(--red); font-family:'JetBrains Mono', monospace; letter-spacing:-0.3px;">
                            ${totalLoanRem.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style="font-size:11px; color:var(--text3); font-weight:400">د.أ</span>
                        </div>
                    </div>
                </div>

                <!-- Dashboard 4: Subscriptions (Monthly + Yearly) -->
                <div class="card" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <div class="card-title" style="margin-bottom:20px; text-align:center;">الاشتراكات</div>
                    <div style="display:flex; justify-content:center; align-items:center; gap:14px; height:120px;">
                        <!-- Monthly -->
                        <div class="circ-prog-wrap" style="width:100px;height:100px">
                            <svg width="100" height="100" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent2)" stroke-width="6" stroke-dasharray="4 5" opacity="0.3" />
                                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent2)" stroke-width="2" />
                            </svg>
                            <div class="circ-content">
                                <div class="circ-val" id="valSubM" style="font-size:15px">0</div>
                                <div class="circ-lbl" style="color:var(--accent2);font-size:9px">شهري · د.أ</div>
                            </div>
                        </div>
                        <!-- Yearly -->
                        <div class="circ-prog-wrap" style="width:100px;height:100px">
                            <svg width="100" height="100" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--teal)" stroke-width="6" stroke-dasharray="4 5" opacity="0.3" />
                                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--teal)" stroke-width="2" />
                            </svg>
                            <div class="circ-content">
                                <div class="circ-val" id="valSubY" style="font-size:15px">0</div>
                                <div class="circ-lbl" style="color:var(--teal);font-size:9px">سنوي · د.أ</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Slowly animate circular progress tracks after render to create premium feeling
            setTimeout(() => {
                const cCircle = document.getElementById('consumeCircle');
                if (cCircle) cCircle.setAttribute('stroke-dashoffset', offsetCons);
                const lCircle = document.getElementById('loanCircle');
                if (lCircle) lCircle.setAttribute('stroke-dashoffset', offsetLoan);

                // Counter animations
                animateCounter('valCons', 0, spentPct, 1500, (v) => v.toFixed(1) + '%');
                animateCounter('valLoan', 0, loanPct, 1500, (v) => v.toFixed(1) + '%');
                animateCounter('valSubM', 0, subPureMonthly, 1500, (v) => v.toFixed(0));
                animateCounter('valSubY', 0, subPureYearly, 1500, (v) => v.toFixed(0));
            }, 60);

            renderDonut(exps);
            renderBudgetBars(exps);
            renderLine();
            renderSubTracker('ov-tracker-list', 'ov-tracker-fraction', 'ov-tracker-sub');
            renderMonthlyEvaluation();

        }

        // Compute period length in days for a subscription (cycle length)
        function subCycleDays(s) {
            if (s.freq === 'daily') return 1;
            if (s.freq === 'yearly') return 365;
            if (s.next) {
                const nextDate = new Date(s.next);
                const prevDate = new Date(s.next);
                prevDate.setMonth(prevDate.getMonth() - 1);
                return Math.round((nextDate - prevDate) / 86400000);
            }
            return 30;
        }
        // Check if subscription is active (not ended)
        function isSubActive(s) {
            if (!s.end) return true;
            const endD = new Date(s.end); endD.setHours(0, 0, 0, 0);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            return endD >= today;
        }
        // ─── Merged subscription tracker ───
        function renderSubTracker(listId, fractionId, subId) {
            const listEl = document.getElementById(listId);
            if (!listEl) return;
            const fractionEl = fractionId ? document.getElementById(fractionId) : null;
            const subEl = subId ? document.getElementById(subId) : null;

            const today = new Date(); today.setHours(0, 0, 0, 0);
            const items = (state.subscriptions || [])
                .filter(s => s.next && isSubActive(s))
                .map(s => {
                    const next = new Date(s.next); next.setHours(0, 0, 0, 0);
                    const cycleDays = subCycleDays(s);
                    const days = Math.round((next - today) / 86400000);
                    const remainingFrac = Math.max(0, Math.min(1, days / cycleDays));
                    return { ...s, days, cycleDays, remainingFrac };
                })
                .sort((a, b) => a.days - b.days);

            if (!items.length) {
                listEl.innerHTML = '<div class="empty">لا اشتراكات نشطة</div>';
                if (fractionEl) fractionEl.innerHTML = `<span style="color:var(--text3)">0</span><span class="sub-tracker-fraction-total"> / 0</span><span class="sub-tracker-fraction-lbl">للتجديد قريباً</span>`;
                if (subEl) subEl.textContent = '';
                return;
            }

            // Header summary
            const soonCount = items.filter(s => s.days <= 7).length;
            const totalMonthly = items.reduce((sum, s) => {
                if (s.freq === 'daily') return sum + s.amount * 30;
                if (s.freq === 'monthly') return sum + s.amount;
                return sum + s.amount / 12;
            }, 0);
            const soonColor = soonCount === 0 ? 'var(--green)' : soonCount <= 2 ? 'var(--amber)' : 'var(--red)';
            if (fractionEl) {
                fractionEl.innerHTML = `<span style="color:${soonColor}">${soonCount}</span><span class="sub-tracker-fraction-total"> / ${items.length}</span><span class="sub-tracker-fraction-lbl">للتجديد خلال أسبوع</span>`;
            }
            if (subEl) {
                subEl.textContent = `${items.length} اشتراك نشط · ${totalMonthly.toFixed(0)} د.أ/شهر`;
            }

            // List rows
            const freqLbl = { daily: 'يومي', monthly: 'شهري', yearly: 'سنوي' };
            listEl.innerHTML = items.map(s => {
                // INVERTED LOGIC: bar fills as renewal approaches.
                // elapsedFrac = how much of the cycle has passed (0 = just renewed, 1 = renewal day)
                const elapsedFrac = 1 - s.remainingFrac;

                // Color based on how close we are to renewal:
                //   elapsed < 0.5 (less than half of cycle passed)  → green (calm)
                //   elapsed < 0.75 (over half passed)               → amber (heads up)
                //   elapsed >= 0.75 OR overdue                      → red (urgent)
                let col;
                if (s.days < 0) col = 'var(--red)';
                else if (elapsedFrac < 0.5) col = 'var(--green)';
                else if (elapsedFrac < 0.75) col = 'var(--amber)';
                else col = 'var(--red)';

                // Fill fraction: at/past due = 100% full
                const fillPct = s.days < 0 ? 100 : Math.max(2, elapsedFrac * 100);

                // Urgent classification (visual pulse + badge):
                //   days <= 1 → urgent (today / tomorrow / overdue)
                //   days <= 7 → alert-week (shimmer animation right→left)
                const isUrgent = s.days <= 1;
                const isOverdue = s.days < 0;
                const isAlertWeek = s.days <= 7;

                const dayLbl = isOverdue ? `متأخر ${Math.abs(s.days)} يوم`
                    : s.days === 0 ? 'يجدد اليوم'
                        : s.days === 1 ? 'يجدد غداً'
                            : `${s.days} يوم متبقي`;

                const warnBadge = isOverdue
                    ? `<span class="sub-tracker-warn-badge">⚠️ متأخر</span>`
                    : s.days === 0
                        ? `<span class="sub-tracker-warn-badge">⚠️ اليوم</span>`
                        : s.days === 1
                            ? `<span class="sub-tracker-warn-badge">⏰ غداً</span>`
                            : s.days <= 7
                                ? `<span class="sub-tracker-warn-badge" style="background:rgba(251,191,36,0.18);color:var(--amber)">🔔 خلال ${s.days} أيام</span>`
                                : '';

                const rowClasses = ['sub-tracker-row'];
                if (isUrgent) rowClasses.push('urgent');
                if (isAlertWeek) rowClasses.push('alert-week');

                return `<div class="${rowClasses.join(' ')}">
                    <div class="sub-tracker-body">
                        <div class="sub-tracker-row-hdr">
                            <div class="sub-tracker-pct" style="color:${col}">${dayLbl}</div>
                            <div class="sub-tracker-name">${warnBadge}${s.name}</div>
                        </div>
                        <div class="sub-tracker-bar">
                            <div class="sub-tracker-fill" style="width:${fillPct}%;background:${col}"></div>
                        </div>
                        <div class="sub-tracker-meta">
                            <span>${s.amount.toFixed(2)} د.أ · مر ${Math.round(elapsedFrac * 100)}% من الدورة</span>
                            <span>${freqLbl[s.freq] || ''} · يجدد ${s.next}</span>
                        </div>
                    </div>
                    <div class="sub-tracker-icon" style="color:${col}">${s.icon || '📦'}</div>
                </div>`;
            }).join('');
        }
        function normCat(name) {
            const v = (name || '').toString().trim();
            if (v === 'undefined' || v === 'null' || !v || v === 'غير مصنفة' || v === 'اخرى') return 'أخرى';
            if (SUB_TO_MAIN_CAT[v]) return SUB_TO_MAIN_CAT[v];
            if (state.categories.find(c => c.name === v)) return v;
            return 'أخرى';
        }
        function catColor(name) { return (state.categories.find(c => c.name === name) || { color: '#888' }).color }
        function renderDonut(exps, shopInvoices) {
            let numMonths = 1;
            if (state.periodMode === 'last3') numMonths = 3;
            else if (state.periodMode === 'last6') numMonths = 6;
            else if (state.periodMode === 'year') numMonths = 12;
            else if (state.periodMode === 'all') {
                if (state.expenses && state.expenses.length > 0) {
                    const dates = state.expenses.map(e => new Date(e.date).getTime()).filter(Boolean);
                    if (dates.length > 0) {
                        const oldest = new Date(Math.min(...dates));
                        const newest = new Date();
                        numMonths = Math.max(1, (newest.getFullYear() - oldest.getFullYear()) * 12 + (newest.getMonth() - oldest.getMonth()) + 1);
                    } else {
                        numMonths = 12;
                    }
                } else {
                    numMonths = 12;
                }
            }

            const byCat = {};
            exps.forEach(e => {
                (e.items || []).forEach(it => {
                    const c = normCat(it.subcat);
                    byCat[c] = (byCat[c] || 0) + (it.qty * it.price);
                });
            });
            if (state.subscriptions) state.subscriptions.forEach(s => {
                const amt = (s.freq === 'daily' ? s.amount * 30 : s.freq === 'monthly' ? s.amount : s.amount / 12) * numMonths;
                const cat = normCat(s.cat);
                byCat[cat] = (byCat[cat] || 0) + amt;
            });
            if (state.loans) state.loans.forEach(l => {
                byCat['ديون'] = (byCat['ديون'] || 0) + (l.monthly * numMonths);
            });
            const cats = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
            const vals = cats.map(c => byCat[c]);
            const total = vals.reduce((s, v) => s + v, 0);
            document.getElementById('donutTotal').textContent = total.toFixed(0);
            if (charts.donut) charts.donut.destroy();
            const ctx = document.getElementById('donutChart').getContext('2d');
            charts.donut = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: cats,
                    datasets: [{
                        data: vals,
                        backgroundColor: cats.map(c => catColor(c)),
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '82%',
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + c.raw.toFixed(2) + ' د.أ' } }
                    }
                }
            });
        }
        function renderBudgetBars(exps) {
            const byCat = {};
            exps.forEach(e => {
                (e.items || []).forEach(it => {
                    const c = normCat(it.subcat);
                    byCat[c] = (byCat[c] || 0) + (it.qty * it.price);
                });
            });
            const budgetKeys = Object.keys(state.budgets || {}).map(normCat);
            const spentKeys = Object.keys(byCat).map(normCat);
            const keys = [...new Set([...budgetKeys, ...spentKeys])].sort((a, b) => (byCat[b] || 0) - (byCat[a] || 0));
            if (!keys.length) { document.getElementById('budgetBars').innerHTML = '<div class="empty">لا توجد بيانات مصاريف</div>'; return; }
            const maxSpent = Math.max(...keys.map(k => byCat[k] || 0), 1);
            document.getElementById('budgetBars').innerHTML = keys.map(cat => {
                const spent = byCat[cat] || 0;
                const bud = parseFloat(state.budgets[cat]);
                const hasBudget = !isNaN(bud) && bud > 0;
                const pct = hasBudget ? Math.min(spent / bud * 100, 100) : (spent / maxSpent * 100);
                const over = hasBudget && spent > bud;
                const warn = hasBudget && pct > 75 && !over;
                const col = over ? 'var(--red)' : warn ? 'var(--amber)' : catColor(cat);
                const nums = hasBudget ? `${spent.toFixed(0)} / ${bud.toFixed(0)} د.أ` : `${spent.toFixed(0)} د.أ`;
                return `<div class="bbar"><div class="bbar-hdr"><div class="bbar-name"><div class="leg-dot" style="background:${catColor(cat)}"></div>${cat}</div><div class="bbar-nums ${over ? 'over' : warn ? 'warn' : ''}">${nums}</div></div><div class="bbar-bg"><div class="bbar-fill" style="width:${pct}%;background:${col}"></div></div></div>`;
            }).join('');
        }
        function renderLine() {
            const now = new Date(); const labels = []; const vals = [];

            const startDay = state.financialMonthStartDay || 27;
            const parseLocalDate = (dateStr) => {
                if (!dateStr) return new Date(0);
                const parts = dateStr.split('-');
                if (parts.length < 3) return new Date(dateStr);
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
            };

            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                labels.push(MONTHS_SHORT[d.getMonth()]);
                const targetMonth = d.getMonth();
                const targetYear = d.getFullYear();

                const expSum = state.expenses.filter(e => {
                    const { month, year } = getFinancialMonthAndYear(e.date);
                    return month === targetMonth && year === targetYear;
                }).reduce((s, e) => s + e.amount, 0);

                const maintSum = (state.maintenance || []).filter(m => {
                    if (m.status !== 'done' || !m.date) return false;
                    const { month, year } = getFinancialMonthAndYear(m.date);
                    return month === targetMonth && year === targetYear;
                }).reduce((s, m) => s + (parseFloat(m.cost) || 0), 0);

                let cycleEnd, cycleStart;
                if (startDay === 1) {
                    cycleEnd = new Date(targetYear, targetMonth + 1, 0);
                    cycleStart = new Date(targetYear, targetMonth, 1);
                } else {
                    cycleEnd = new Date(targetYear, targetMonth, startDay - 1);
                    cycleStart = new Date(targetYear, targetMonth - 1, startDay);
                }

                const subSum = (state.subscriptions || []).reduce((s, sub) => {
                    const startD = parseLocalDate(sub.start);
                    const endD = sub.end ? parseLocalDate(sub.end) : null;
                    if (startD <= cycleEnd && (!endD || endD >= cycleStart)) {
                        return s + (parseFloat(sub.amount) || 0);
                    }
                    return s;
                }, 0);

                const loanSum = (state.loans || []).reduce((s, loan) => {
                    const startD = parseLocalDate(loan.start || td());
                    if (startD <= cycleEnd && loan.remaining > 0) {
                        return s + (parseFloat(loan.monthly) || 0);
                    }
                    return s;
                }, 0);

                vals.push(expSum + maintSum + subSum + loanSum);
            }
            if (charts.line) charts.line.destroy();
            const ctx = document.getElementById('lineChart').getContext('2d');
            charts.line = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ data: vals, borderColor: '#7c6dfa', backgroundColor: 'rgba(124,109,250,0.1)', tension: 0.4, pointBackgroundColor: '#7c6dfa', pointRadius: 3, fill: true, borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw.toFixed(2) + ' د.أ' } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#55545f', font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#55545f', font: { size: 10 }, callback: v => v + 'د.أ' } } } } });
        }
        function calcSubMonthly() {
            return state.subscriptions.reduce((s, sub) => {
                if (sub.freq === 'daily') return s + sub.amount * 30;
                if (sub.freq === 'monthly') return s + sub.amount;
                // Yearly subscriptions are treated as one-off in their respective month, not divided monthly
                return s;
            }, 0);
        }
        function calcFixedDeductions() {
            if (!state.fixedSubs) return 0;
            return (state.fixedSubs.social?.amount || 0) + (state.fixedSubs.health?.amount || 0);
        }

        // ═══════════════════════════════════════
        //  STATEMENT
        // ═══════════════════════════════════════
        function setStatementPeriod(rangeKey) {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            let fromM, fromY, toM, toY;

            switch (rangeKey) {
                case 'currentMonth':
                    fromM = currentMonth;
                    fromY = currentYear;
                    toM = currentMonth;
                    toY = currentYear;
                    break;
                case 'prevMonth':
                    const prev = new Date(currentYear, currentMonth - 1, 1);
                    fromM = prev.getMonth();
                    fromY = prev.getFullYear();
                    toM = fromM;
                    toY = fromY;
                    break;
                case 'last3Months':
                    const threeAgo = new Date(currentYear, currentMonth - 2, 1);
                    fromM = threeAgo.getMonth();
                    fromY = threeAgo.getFullYear();
                    toM = currentMonth;
                    toY = currentYear;
                    break;
                case 'last6Months':
                    const sixAgo = new Date(currentYear, currentMonth - 5, 1);
                    fromM = sixAgo.getMonth();
                    fromY = sixAgo.getFullYear();
                    toM = currentMonth;
                    toY = currentYear;
                    break;
                case 'currentYear':
                    fromM = 0;
                    fromY = currentYear;
                    toM = 11;
                    toY = currentYear;
                    break;
                case 'prevYear':
                    fromM = 0;
                    fromY = currentYear - 1;
                    toM = 11;
                    toY = currentYear - 1;
                    break;
                case 'allTime':
                    fromM = 0;
                    fromY = currentYear - 5;
                    toM = 11;
                    toY = currentYear + 2;
                    break;
            }

            const sfm = document.getElementById('stmtFromMonth');
            const sfy = document.getElementById('stmtFromYear');
            const stm = document.getElementById('stmtToMonth');
            const sty = document.getElementById('stmtToYear');

            if (sfm) sfm.value = fromM;
            if (sfy) sfy.value = fromY;
            if (stm) stm.value = toM;
            if (sty) sty.value = toY;

            // Highlight active chip
            document.querySelectorAll('.stmt-quick-chips .chip').forEach(c => c.classList.remove('active'));
            if (window.event && window.event.currentTarget) {
                window.event.currentTarget.classList.add('active');
            }

            renderStatement();
        }

        let stmtSortKey = 'cat';
        let stmtSortOrder = 'desc';
        function setStmtSort(key) {
            if (stmtSortKey === key) {
                stmtSortOrder = stmtSortOrder === 'desc' ? 'asc' : 'desc';
            } else {
                stmtSortKey = key;
                stmtSortOrder = (key === 'date' || key === 'amount') ? 'desc' : 'asc';
            }
            renderStatement();
        }

        function renderStatement() {
            const fromM = parseInt(document.getElementById('stmtFromMonth').value);
            const fromY = parseInt(document.getElementById('stmtFromYear').value);
            const toM = parseInt(document.getElementById('stmtToMonth').value);
            const toY = parseInt(document.getElementById('stmtToYear').value);

            const startDay = state.financialMonthStartDay || 27;

            let from;
            if (startDay === 1) {
                from = new Date(fromY, fromM, 1, 0, 0, 0, 0);
            } else {
                from = new Date(fromY, fromM - 1, startDay, 0, 0, 0, 0);
            }

            let to;
            if (startDay === 1) {
                to = new Date(toY, toM + 1, 0, 23, 59, 59, 999);
            } else {
                to = new Date(toY, toM, startDay - 1, 23, 59, 59, 999);
            }

            const parseLocalDate = (dateStr) => {
                if (!dateStr) return new Date(0);
                const parts = dateStr.split('-');
                if (parts.length < 3) return new Date(dateStr);
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
            };

            // 1. Gather Daily Expenses & Shopping Invoices
            const baseExps = state.expenses.filter(e => {
                const d = parseLocalDate(e.date);
                return d >= from && d <= to;
            }).map(e => ({
                id: e.id,
                date: e.date,
                desc: e.desc,
                amount: parseFloat(e.amount) || 0,
                items: e.items || [],
                type: 'invoice'
            }));

            // 2. Gather Done Maintenance Expenses
            const maintExps = (state.maintenance || [])
                .filter(m => {
                    if (m.status !== 'done' || !m.date) return false;
                    const d = parseLocalDate(m.date);
                    return d >= from && d <= to;
                })
                .map(m => ({
                    id: 'maint-' + m.id,
                    date: m.date,
                    desc: `🛠️ صيانة: ${m.desc}`,
                    amount: parseFloat(m.cost) || 0,
                    items: [],
                    type: 'maintenance',
                    cat: m.cat || 'صيانة وإصلاح'
                }));

            const loopStart = new Date(fromY, fromM - 1, 1);
            const loopEnd = new Date(toY, toM + 1, 1);

            // 3. Gather Active Subscriptions (generate recurring monthly entries)
            const subExps = [];
            let tempDate = new Date(loopStart);
            while (tempDate <= loopEnd) {
                const curY = tempDate.getFullYear();
                const curM = tempDate.getMonth(); // 0-indexed
                const curYMStr = `${curY}-${String(curM + 1).padStart(2, '0')}`;

                (state.subscriptions || []).forEach(sub => {
                    const startD = parseLocalDate(sub.start);
                    const endD = sub.end ? parseLocalDate(sub.end) : null;
                    const thisMonthStart = new Date(curY, curM, 1);
                    const thisMonthEnd = new Date(curY, curM + 1, 0);

                    if (startD <= thisMonthEnd && (!endD || endD >= thisMonthStart)) {
                        let finalDay = 1;
                        if (sub.freq !== 'monthly') {
                            const dayPart = startD.getDate();
                            finalDay = Math.min(dayPart, thisMonthEnd.getDate());
                        }
                        const dateStr = `${curY}-${String(curM + 1).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;

                        const d = parseLocalDate(dateStr);
                        if (d >= from && d <= to) {
                            subExps.push({
                                id: `sub-${sub.id}-${curYMStr}`,
                                date: dateStr,
                                desc: `🔄 اشتراك: ${sub.name}`,
                                amount: parseFloat(sub.amount) || 0,
                                items: [],
                                type: 'subscription',
                                cat: sub.cat || 'اشتراكات ورسوم'
                            });
                        }
                    }
                });
                tempDate.setMonth(tempDate.getMonth() + 1);
            }

            // 4. Gather Active Loans (generate monthly installments)
            const loanExps = [];
            tempDate = new Date(loopStart);
            while (tempDate <= loopEnd) {
                const curY = tempDate.getFullYear();
                const curM = tempDate.getMonth();
                const curYMStr = `${curY}-${String(curM + 1).padStart(2, '0')}`;

                (state.loans || []).forEach(loan => {
                    const startD = parseLocalDate(loan.start || td());
                    const thisMonthEnd = new Date(curY, curM + 1, 0);

                    if (startD <= thisMonthEnd && loan.remaining > 0) {
                        const dayPart = startD.getDate();
                        const finalDay = Math.min(dayPart, thisMonthEnd.getDate());
                        const dateStr = `${curY}-${String(curM + 1).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;

                        const d = parseLocalDate(dateStr);
                        if (d >= from && d <= to) {
                            loanExps.push({
                                id: `loan-${loan.id}-${curYMStr}`,
                                date: dateStr,
                                desc: `💸 قروض: ${loan.name}`,
                                amount: parseFloat(loan.monthly) || 0,
                                items: [],
                                type: 'loan',
                                cat: 'قروض والتزامات'
                            });
                        }
                    }
                });
                tempDate.setMonth(tempDate.getMonth() + 1);
            }

            // 5. Gather Fixed Incomes (generate monthly entries)
            const fixedIncExps = [];
            tempDate = new Date(loopStart);
            while (tempDate <= loopEnd) {
                const curY = tempDate.getFullYear();
                const curM = tempDate.getMonth();
                const curYMStr = `${curY}-${String(curM + 1).padStart(2, '0')}`;

                (state.incomeSources || []).forEach(src => {
                    const startD = parseLocalDate(src.start || td());
                    const thisMonthEnd = new Date(curY, curM + 1, 0);

                    if (startD <= thisMonthEnd) {
                        const dayPart = startD.getDate();
                        const finalDay = Math.min(dayPart, thisMonthEnd.getDate());
                        const dateStr = `${curY}-${String(curM + 1).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;

                        const d = parseLocalDate(dateStr);
                        if (d >= from && d <= to) {
                            fixedIncExps.push({
                                id: `fixedinc-${src.id}-${curYMStr}`,
                                origId: src.id,
                                date: dateStr,
                                desc: `💵 مصدر دخل: ${src.name}`,
                                amount: parseFloat(src.amount) || 0,
                                items: [],
                                type: 'fixed_income',
                                cat: 'دخل'
                            });
                        }
                    }
                });
                tempDate.setMonth(tempDate.getMonth() + 1);
            }

            // Combine all into unified list
            let exps = [...baseExps, ...maintExps, ...subExps, ...loanExps];

            const fls = state.freelanceLog.filter(f => {
                const d = parseLocalDate(f.date);
                return d >= from && d <= to;
            });
            const incExps = fls.map(f => ({
                id: `inc-${f.id}`,
                origId: f.id,
                date: f.date,
                desc: `💰 دخل حر: ${f.desc}`,
                amount: parseFloat(f.amount) || 0,
                items: [],
                type: 'income',
                cat: 'دخل'
            }));

            exps = exps.concat(incExps, fixedIncExps).sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

            const totalExp = exps.filter(e => e.type !== 'income' && e.type !== 'fixed_income').reduce((s, e) => s + e.amount, 0);
            const totalFl = fls.reduce((s, f) => s + f.amount, 0);
            const fixedIncomeThisPeriod = fixedIncExps.reduce((s, e) => s + e.amount, 0);
            const totalIncome = fixedIncomeThisPeriod + totalFl;
            const net = totalIncome - totalExp;

            // count months
            let months = 0; let d = new Date(fromY, fromM, 1);
            while (d <= to) { months++; d.setMonth(d.getMonth() + 1) }

            document.getElementById('stmtSummary').innerHTML = `
        <div class="stmt-box"><div class="stmt-box-lbl">إجمالي الدخل</div><div class="stmt-box-val metric-pos">${totalIncome.toFixed(2)} د.أ</div></div>
        <div class="stmt-box"><div class="stmt-box-lbl">إجمالي المصاريف</div><div class="stmt-box-val metric-neg">${totalExp.toFixed(2)} د.أ</div></div>
        <div class="stmt-box"><div class="stmt-box-lbl">صافي الفترة</div><div class="stmt-box-val ${net >= 0 ? 'metric-pos' : 'metric-neg'}">${net.toFixed(2)} د.أ</div></div>
        <div class="stmt-box"><div class="stmt-box-lbl">عدد المعاملات</div><div class="stmt-box-val">${exps.filter(e => e.type !== 'income' && e.type !== 'fixed_income').length}</div></div>
        <div class="stmt-box"><div class="stmt-box-lbl">دخل فري لانس</div><div class="stmt-box-val">${totalFl.toFixed(2)} د.أ</div></div>
        <div class="stmt-box"><div class="stmt-box-lbl">متوسط الإنفاق/شهر</div><div class="stmt-box-val">${months > 0 ? (totalExp / months).toFixed(2) : 0} د.أ</div></div>
      `;
            // line chart by month
            const lbls = []; const incVals = []; const expVals = [];
            let cur = new Date(fromY, fromM, 1);
            while (cur <= to) {
                lbls.push(MONTHS_SHORT[cur.getMonth()] + ' ' + String(cur.getFullYear()).slice(2));
                const targetYM = ym(cur).slice(0, 7);
                expVals.push(exps.filter(e => e.type !== 'income' && e.type !== 'fixed_income' && e.date.startsWith(targetYM)).reduce((s, e) => s + e.amount, 0));
                const fl2 = fls.filter(f => f.date.startsWith(targetYM)).reduce((s, f) => s + f.amount, 0);
                const fix2 = fixedIncExps.filter(e => e.date.startsWith(targetYM)).reduce((s, e) => s + e.amount, 0);
                incVals.push(fix2 + fl2);
                cur.setMonth(cur.getMonth() + 1);
            }
            if (charts.stmtLine) charts.stmtLine.destroy();
            const ctx = document.getElementById('stmtLineIncome').getContext('2d');
            charts.stmtLine = new Chart(ctx, { type: 'line', data: { labels: lbls, datasets: [{ label: 'الدخل', data: incVals, borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)', tension: 0.4, pointRadius: 3, fill: true, borderWidth: 2 }, { label: 'المصاريف', data: expVals, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', tension: 0.4, pointRadius: 3, fill: true, borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8e8d9a', font: { size: 11 } } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw.toFixed(2) + ' د.أ' } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#55545f', font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#55545f', font: { size: 10 }, callback: v => v + 'د.أ' } } } } });
            // table — grouped by main category to ensure cleaner reporting and easier print view reading
            const groups = {};
            state.categories.forEach(c => {
                groups[c.name] = [];
            });
            groups['أخرى'] = groups['أخرى'] || [];
            groups['دخل'] = groups['دخل'] || [];

            exps.forEach(e => {
                let cat = 'أخرى';
                if (e.type === 'invoice') {
                    const primarySub = e.items?.[0]?.subcat || 'أخرى';
                    cat = normCat(primarySub);
                } else if (e.type === 'income' || e.type === 'fixed_income') {
                    cat = 'دخل';
                } else {
                    cat = normCat(e.cat);
                }
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(e);
            });

            let flatRowsHtml = '';

            let uniqueCats = [];
            if (stmtSortKey === 'cat') {
                const orderedCats = ['دخل', ...state.categories.map(c => c.name), 'أخرى'];
                uniqueCats = Array.from(new Set(orderedCats));
            } else {
                groups['all'] = exps;
                uniqueCats = ['all'];
            }

            uniqueCats.forEach(catName => {
                const groupExps = groups[catName] || [];
                if (groupExps.length === 0) return;

                groupExps.sort((a, b) => {
                    let valA, valB;
                    if (stmtSortKey === 'cat' || stmtSortKey === 'date') {
                        valA = new Date(a.date).getTime();
                        valB = new Date(b.date).getTime();
                    } else if (stmtSortKey === 'desc') {
                        valA = a.desc || '';
                        valB = b.desc || '';
                    } else if (stmtSortKey === 'amount') {
                        valA = a.amount || 0;
                        valB = b.amount || 0;
                    }
                    if (valA < valB) return stmtSortOrder === 'asc' ? -1 : 1;
                    if (valA > valB) return stmtSortOrder === 'asc' ? 1 : -1;
                    return 0;
                });

                if (catName !== 'all') {
                    const groupTotal = groupExps.reduce((sum, e) => sum + e.amount, 0);
                    const catCol = catColor(catName);

                    flatRowsHtml += `
                        <tr class="stmt-cat-group-hdr" style="background: ${catCol}10; color: ${catCol}; font-weight: 700; font-size: 13px; border-top: 2px solid ${catCol}33; page-break-inside: avoid;">
                            <td colspan="3" style="padding: 12px 16px; font-weight: 700; font-size: 13.5px;"><span style="margin-left: 8px;">📁</span>${catName} <span style="font-size: 11px; color: var(--text3); font-weight: 400; margin-right: 8px;">(${groupExps.length} معاملات)</span></td>
                            <td class="td-mono" style="padding: 12px 16px; text-align: left; font-size: 14px; font-weight: 800; color: ${catCol};">${groupTotal.toFixed(2)} د.أ</td>
                            <td class="no-print"></td>
                        </tr>
                    `;
                }

                // Add expenses in this group
                groupExps.forEach(e => {
                    const items = e.items || [];

                    if (e.type !== 'invoice' || items.length === 0) {
                        const specificCat = e.type === 'invoice' ? (items[0]?.subcat || 'أخرى') : (e.cat || 'أخرى');
                        const specificCol = catColor(specificCat);

                        let actionHtml = '';
                        if (e.type === 'invoice') {
                            actionHtml = `
                                <button class="del-btn" style="color:var(--accent2); margin-inline-end: 8px; font-size: 13px;" onclick="event.stopPropagation(); openEditExpense(${e.id})" title="تعديل">✎</button>
                                <button class="del-btn" style="color:var(--red); font-size: 13px;" onclick="event.stopPropagation(); if(confirm('هل أنت متأكد من حذف هذا المصروف؟')) { delExpense(${e.id}); renderStatement(); }" title="حذف">✕</button>
                            `;
                        } else if (e.type === 'maintenance') {
                            actionHtml = `
                                <button class="del-btn" style="color:var(--red); font-size: 13px;" onclick="event.stopPropagation(); if(confirm('هل أنت متأكد من حذف بند الصيانة هذا؟')) { delMaint(${String(e.id).replace('maint-', '')}); renderStatement(); }" title="حذف">✕</button>
                            `;
                        } else if (e.type === 'subscription') {
                            actionHtml = `
                                <button class="del-btn" style="color:var(--red); font-size: 13px;" onclick="event.stopPropagation(); if(confirm('هل أنت متأكد من حذف هذا الاشتراك بالكامل؟')) { delSub(${String(e.id).split('-')[1]}); renderStatement(); }" title="حذف الاشتراك">✕</button>
                            `;
                        } else if (e.type === 'income') {
                            actionHtml = `
                                <button class="del-btn" style="color:var(--accent2); margin-inline-end: 8px; font-size: 13px;" onclick="event.stopPropagation(); openEditFL(${e.origId})" title="تعديل">✎</button>
                                <button class="del-btn" style="color:var(--red); font-size: 13px;" onclick="event.stopPropagation(); if(confirm('هل أنت متأكد من حذف هذا الدخل؟')) { delFL(${e.origId}); renderStatement(); }" title="حذف">✕</button>
                            `;
                        } else if (e.type === 'fixed_income') {
                            actionHtml = `
                                <button class="del-btn" style="color:var(--accent2); margin-inline-end: 8px; font-size: 13px;" onclick="event.stopPropagation(); openEditIncome(${e.origId})" title="تعديل">✎</button>
                                <button class="del-btn" style="color:var(--red); font-size: 13px;" onclick="event.stopPropagation(); if(confirm('هل أنت متأكد من حذف هذا المصدر الثابت؟')) { delIncomeSource(${e.origId}); renderStatement(); }" title="حذف">✕</button>
                            `;
                        } else if (e.type === 'loan') {
                            actionHtml = `
                                <button class="del-btn" style="color:var(--red); font-size: 13px;" onclick="event.stopPropagation(); if(confirm('هل أنت متأكد من حذف هذا القرض بالكامل؟')) { delLoan(${String(e.id).split('-')[1]}); renderStatement(); }" title="حذف القرض">✕</button>
                            `;
                        }

                        let amtDisplay = `${e.amount.toFixed(2)} د.أ`;
                        let amtStyle = '';
                        if (e.type === 'income' || e.type === 'fixed_income') {
                            amtDisplay = `+${e.amount.toFixed(2)} د.أ`;
                            amtStyle = 'color:var(--green);';
                        }

                        flatRowsHtml += `
                            <tr class="stmt-inv-hdr" style="font-weight:600; border-top: 1px solid var(--border);">
                                <td class="td-mono" style="font-size:11px; padding-right: 24px;">${e.date}</td>
                                <td class="td-main">${e.desc}</td>
                                <td><span class="badge" style="background:${specificCol}15;color:${specificCol}">${specificCat}</span></td>
                                <td class="td-mono" style="${amtStyle}">${amtDisplay}</td>
                                <td class="no-print" style="text-align: left; padding: 6px 12px; white-space: nowrap;">
                                    ${actionHtml}
                                </td>
                            </tr>
                        `;
                        return;
                    }

                    // Parent Invoice Header (Collapsible)
                    const hdrHtml = `
                        <tr class="stmt-inv-hdr" style="background: rgba(124, 109, 250, 0.02); font-weight:600; border-top: 1px solid var(--border); cursor: pointer;" onclick="toggleStmtInvoice('${e.id}', this)">
                            <td class="td-mono" style="font-size:11px; padding-right: 24px;">${e.date}</td>
                            <td class="td-main" style="color:var(--text); font-weight: 600;"><span class="toggle-arrow">▶</span><span style="margin-left:6px;">🧾</span>${e.desc}</td>
                            <td><span class="badge" style="background:var(--border); color:var(--text3); font-weight:500; font-size:10px;">فاتورة تفصيلية</span></td>
                            <td class="td-mono" style="font-weight:700; color:var(--accent); font-size:13px;">${e.amount.toFixed(2)} د.أ</td>
                            <td class="no-print" style="text-align: left; padding: 6px 12px; white-space: nowrap;">
                                <button class="del-btn" style="color:var(--accent2); margin-inline-end: 8px; font-size: 13px;" onclick="event.stopPropagation(); openEditExpense(${e.id})" title="تعديل">✎</button>
                                <button class="del-btn" style="color:var(--red); font-size: 13px;" onclick="event.stopPropagation(); if(confirm('هل أنت متأكد من حذف هذا المصروف؟')) { delExpense(${e.id}); renderStatement(); }" title="حذف">✕</button>
                            </td>
                        </tr>
                    `;

                    // Child Item Rows (Hidden on screen until expanded, forced visible on print)
                    const itemsHtml = items.map(it => {
                        const itemCol = catColor(it.subcat || 'أخرى');
                        return `
                            <tr class="stmt-inv-item child-of-${e.id}" style="font-size:11px; opacity: 0.95;">
                                <td class="td-mono" style="color: var(--text3); font-size:10px; text-align:center; padding: 6px 16px;">↳</td>
                                <td style="padding-right: 28px; color: var(--text2); font-weight: 400; padding: 6px 16px;">• ${it.name}</td>
                                <td style="padding: 6px 16px;"><span class="badge" style="background:${itemCol}15; color:${itemCol}; font-size:10px; padding:2px 8px;">${it.subcat || 'أخرى'}</span></td>
                                <td class="td-mono" style="font-size:11.5px; color: var(--text2); padding: 6px 16px;">${(it.price || 0).toFixed(2)} د.أ</td>
                                <td class="no-print"></td>
                            </tr>
                        `;
                    }).join('');

                    flatRowsHtml += (hdrHtml + itemsHtml);
                });
            });

            const getSortIcon = (key) => {
                if (stmtSortKey !== key) return '<span style="color:var(--text3); font-size:10px; opacity: 0.4; margin-right: 4px;">↕</span>';
                return `<span style="color:var(--accent); font-size:12px; margin-right: 4px;">${stmtSortOrder === 'asc' ? '↑' : '↓'}</span>`;
            };

            document.getElementById('stmtTable').innerHTML = exps.length ? `
        <div class="table-hdr"><div class="table-title">تفاصيل المعاملات — ${MONTHS[fromM]} ${fromY} إلى ${MONTHS[toM]} ${toY}</div></div>
        <table class="stmt-table"><thead><tr>
            <th onclick="setStmtSort('date')" style="cursor:pointer; user-select:none; transition: 0.2s;" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">التاريخ ${getSortIcon('date')}</th>
            <th onclick="setStmtSort('desc')" style="cursor:pointer; user-select:none; transition: 0.2s;" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">الوصف ${getSortIcon('desc')}</th>
            <th onclick="setStmtSort('cat')" style="cursor:pointer; user-select:none; transition: 0.2s;" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''" title="الترتيب حسب الفئة (مع تجميعها)">الفئة ${getSortIcon('cat')}</th>
            <th onclick="setStmtSort('amount')" style="cursor:pointer; user-select:none; transition: 0.2s;" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">المبلغ ${getSortIcon('amount')}</th>
            <th class="no-print" style="width: 100px; text-align: left; padding-left: 20px;">العمليات</th>
        </tr></thead><tbody>
        ${flatRowsHtml}
        <tr class="stmt-grand-total"><td colspan="3">المجموع الكلي للفترة</td><td class="td-mono">${totalExp.toFixed(2)} د.أ</td><td class="no-print"></td></tr>
        </tbody></table>`: '<div class="empty">لا مصاريف في هذه الفترة</div>';

            filterStatementTable();
        }
        function printStatement() { window.print() }
        function toggleStmtInvoice(invId, hdrEl) {
            hdrEl.classList.toggle('active');
            const children = document.querySelectorAll(`.child-of-${invId}`);
            children.forEach(el => {
                el.classList.toggle('expanded');
            });
        }
        function filterStatementTable() {
            const query = document.getElementById('stmtSearch').value.toLowerCase();
            const tableBody = document.querySelector('.stmt-table tbody');
            if (!tableBody) return;

            const rows = Array.from(tableBody.querySelectorAll('tr'));

            if (query === '') {
                rows.forEach(row => row.style.display = '');
                return;
            }

            let currentParentRow = null;
            let parentMatches = false;

            rows.forEach(row => {
                if (row.classList.contains('stmt-grand-total')) return;

                const text = row.textContent.toLowerCase();
                const isMatch = text.includes(query);

                if (row.classList.contains('stmt-inv-hdr')) {
                    currentParentRow = row;
                    parentMatches = isMatch;
                    row.style.display = isMatch ? '' : 'none';
                } else if (row.classList.contains('stmt-inv-item')) {
                    if (isMatch) {
                        row.style.display = '';
                        if (currentParentRow) {
                            currentParentRow.style.display = '';
                            currentParentRow.classList.add('active');
                            row.classList.add('expanded');
                        }
                    } else {
                        row.style.display = parentMatches ? '' : 'none';
                    }
                }
            });
        }

        // ═══════════════════════════════════════
        //  INCOME
        // ═══════════════════════════════════════
        const INC_TYPES = { salary: 'راتب', freelance_fixed: 'فري لانس ثابت', rent: 'إيجار', investment: 'استثمار', other: 'أخرى' };
        function renderIncome() {
            if (!state.fixedSubs || typeof state.fixedSubs.social !== 'object') {
                state.fixedSubs = { social: { amount: 0, start: td(), end: '' }, health: { amount: 0, start: td(), end: '' } };
            }
            const inc = monthlyIncome();
            document.getElementById('income-metrics').innerHTML = `
        <div class="metric m-g"><div class="metric-lbl">إجمالي الدخل الثابت/شهر</div><div class="metric-val">${inc.fixed.toFixed(0)} <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>
        <div class="metric m-r"><div class="metric-lbl">استقطاعات شهرية</div><div class="metric-val">${inc.deds.toFixed(0)} <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>
        <div class="metric m-c"><div class="metric-lbl">صافي الراتب الثابت</div><div class="metric-val">${inc.netFixed.toFixed(0)} <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>
        <div class="metric m-a"><div class="metric-lbl">دخل فري لانس (الفترة)</div><div class="metric-val">${inc.fl.toFixed(0)} <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>
      `;
            // Fixed deductions card
            const fL = document.getElementById('fixed-deds-list');
            if (fL) {
                const sDate = state.fixedSubs.social.start ? `من: ${state.fixedSubs.social.start}` : '';
                const sEnd = state.fixedSubs.social.end ? ` إلى: ${state.fixedSubs.social.end}` : ' (مستمر)';
                const hDate = state.fixedSubs.health.start ? `من: ${state.fixedSubs.health.start}` : '';
                const hEnd = state.fixedSubs.health.end ? ` إلى: ${state.fixedSubs.health.end}` : ' (مستمر)';
                fL.innerHTML = `
            <div class="sub-item">
                <div class="sub-icon" style="background:rgba(52,211,153,0.15)">🛡️</div>
                <div class="sub-info">
                    <div class="sub-name">الضمان الاجتماعي</div>
                    <div class="sub-meta" style="font-family:'JetBrains Mono',monospace">${sDate}${sEnd}</div>
                </div>
                <div class="sub-amt" style="text-align:left">${state.fixedSubs.social.amount.toFixed(2)} د.أ</div>
            </div>
            <div class="sub-item">
                <div class="sub-icon" style="background:rgba(239,68,68,0.15)">🏥</div>
                <div class="sub-info">
                    <div class="sub-name">التأمين الصحي</div>
                    <div class="sub-meta" style="font-family:'JetBrains Mono',monospace">${hDate}${hEnd}</div>
                </div>
                <div class="sub-amt" style="text-align:left">${state.fixedSubs.health.amount.toFixed(2)} د.أ</div>
            </div>`;
            }
            const socAmtEl = document.getElementById('m-fixed-social-amt');
            if (socAmtEl) {
                socAmtEl.value = state.fixedSubs.social.amount;
                document.getElementById('m-fixed-social-start').value = state.fixedSubs.social.start;
                document.getElementById('m-fixed-social-end').value = state.fixedSubs.social.end;
                document.getElementById('m-fixed-health-amt').value = state.fixedSubs.health.amount;
                document.getElementById('m-fixed-health-start').value = state.fixedSubs.health.start;
                document.getElementById('m-fixed-health-end').value = state.fixedSubs.health.end;
            }
            // Salary net summary card
            const sumEl = document.getElementById('salary-net-summary');
            if (sumEl) {
                sumEl.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
                    <span style="color:var(--text2)">إجمالي الراتب الثابت</span>
                    <span style="color:var(--green);font-family:'JetBrains Mono',monospace;font-weight:600">+${inc.fixed.toFixed(2)} د.أ</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
                    <span style="color:var(--text2)">- الضمان الاجتماعي</span>
                    <span style="color:var(--red);font-family:'JetBrains Mono',monospace">-${state.fixedSubs.social.amount.toFixed(2)} د.أ</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
                    <span style="color:var(--text2)">- التأمين الصحي</span>
                    <span style="color:var(--red);font-family:'JetBrains Mono',monospace">-${state.fixedSubs.health.amount.toFixed(2)} د.أ</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:14px;font-weight:600;margin-top:4px;border-top:2px solid var(--border2)">
                    <span>صافي الراتب</span>
                    <span style="color:var(--green);font-family:'JetBrains Mono',monospace">${inc.netFixed.toFixed(2)} د.أ</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;color:var(--text3)">
                    <span>+ دخل فري لانس (الفترة)</span>
                    <span style="font-family:'JetBrains Mono',monospace">${inc.fl.toFixed(2)} د.أ</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;font-weight:600;border-top:1px solid var(--border)">
                    <span>الإجمالي الفعلي بعد الاستقطاعات</span>
                    <span style="color:var(--green);font-family:'JetBrains Mono',monospace">${(inc.netFixed + inc.fl).toFixed(2)} د.أ</span>
                </div>
            </div>`;
            }
            document.getElementById('income-fixed-list').innerHTML = state.incomeSources.length ? state.incomeSources.map(src => {
                let nextDate = new Date();
                if (nextDate.getDate() > 28) {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }
                nextDate.setDate(28);
                const nextStr = ymd(nextDate);

                return `
        <div class="income-source">
          <div>
            <div class="income-source-name">${src.name}</div>
            <div class="income-source-type">${INC_TYPES[src.type] || src.type} — يستحق يوم 28 (القادم: <span style="color:var(--accent)">${nextStr}</span>)</div>
          </div>
          <div style="text-align:left">
            <div class="income-source-amt">+${src.amount.toFixed(2)} د.أ</div>
            <div style="font-size:10px;color:var(--text3)">شهرياً</div>
          </div>
          <div style="display:flex;gap:4px;margin-right:8px;">
            <button class="del-btn" style="color:var(--accent2);" onclick="openEditIncome(${src.id})" title="تعديل">✎</button>
            <button class="del-btn" onclick="delIncomeSource(${src.id})" title="حذف">✕</button>
          </div>
        </div>`;
            }).join('') : '<div class="empty">لا مصادر دخل ثابتة — أضف من الأعلى</div>';
            // freelance in period
            const flList = state.freelanceLog.filter(f => inRange(f.date)).sort((a, b) => new Date(b.date) - new Date(a.date));
            document.getElementById('income-var-list').innerHTML = flList.length ? flList.slice(0, 5).map(f => `
        <div class="income-source">
          <div><div class="income-source-name">${f.desc}</div><div class="income-source-type">${f.date}</div></div>
          <div class="income-source-amt">+${f.amount.toFixed(2)} د.أ</div>
        </div>`).join('') : '<div class="empty">لا دخل فري لانس في هذه الفترة</div>';
            renderFLTable();
        }
        function renderFLTable() {
            const rows = state.freelanceLog.sort((a, b) => new Date(b.date) - new Date(a.date));
            document.getElementById('income-var-table').innerHTML = rows.length ? `
        <table><thead><tr><th>التاريخ</th><th>الوصف</th><th>المبلغ</th><th></th></tr></thead><tbody>
        ${rows.map(f => `<tr><td class="td-mono" style="font-size:11px">${f.date}</td><td class="td-main">${f.desc}</td><td class="td-mono" style="color:var(--green)">+${f.amount.toFixed(2)} د.أ</td><td><button class="del-btn" style="color:var(--accent2);margin-inline-end:6px" onclick="openEditFL(${f.id})" title="تعديل">✎</button><button class="del-btn" onclick="delFL(${f.id})">✕</button></td></tr>`).join('')}
        </tbody></table>`: '<div class="empty">لا سجلات</div>';
        }
        function addIncomeSource() {
            const name = document.getElementById('m-inc-name').value.trim();
            const amount = parseFloat(document.getElementById('m-inc-amount').value);
            const type = document.getElementById('m-inc-type').value;
            const start = document.getElementById('m-inc-start').value || td();
            if (!name || isNaN(amount) || amount <= 0) { toast('يرجى ملء جميع الحقول'); return; }
            state.incomeSources.push({ id: state.nextId++, name, amount, type, start });
            saveState(); closeModal('addIncome'); renderIncome(); renderOverview(); toast('تم إضافة مصدر الدخل ✓');
            document.getElementById('m-inc-name').value = ''; document.getElementById('m-inc-amount').value = '';
        }

        let editingIncId = null;
        function openEditIncome(id) {
            const inc = state.incomeSources.find(i => String(i.id) === String(id));
            if (!inc) return;
            editingIncId = id;
            document.getElementById('e-inc-name').value = inc.name;
            document.getElementById('e-inc-amount').value = inc.amount;
            document.getElementById('e-inc-type').value = inc.type;
            document.getElementById('e-inc-start').value = inc.start;
            openModal('editIncome');
        }
        function saveEditIncome() {
            const inc = state.incomeSources.find(i => String(i.id) === String(editingIncId));
            if (!inc) return;
            inc.name = document.getElementById('e-inc-name').value.trim();
            inc.amount = parseFloat(document.getElementById('e-inc-amount').value) || 0;
            inc.type = document.getElementById('e-inc-type').value;
            inc.start = document.getElementById('e-inc-start').value;
            saveState(); closeModal('editIncome'); renderIncome(); renderOverview();
            const active = document.querySelector('.page.active');
            if (active && active.id === 'page-statement') renderStatement();
            toast('تم التعديل ✓');
        }
        function delIncomeSource(id) {
            state.deletedIds = state.deletedIds || {};
            state.deletedIds[String(id)] = true;
            state.incomeSources = state.incomeSources.filter(s => String(s.id) !== String(id)); saveState(); renderIncome(); renderOverview();
            const active = document.querySelector('.page.active');
            if (active && active.id === 'page-statement') renderStatement();
            toast('تم الحذف');
        }
        function addDeduction() {
            const name = document.getElementById('m-ded-name').value.trim();
            const amount = parseFloat(document.getElementById('m-ded-amount').value);
            if (!name || isNaN(amount) || amount <= 0) { toast('يرجى إدخال البيانات بشكل صحيح'); return; }
            if (!state.incomeDeductions) state.incomeDeductions = [];
            state.incomeDeductions.push({ id: state.nextId++, name, amount });
            saveState(); renderIncome(); renderOverview(); toast('تم إضافة الاستقطاع ✓');
            document.getElementById('m-ded-name').value = ''; document.getElementById('m-ded-amount').value = '';
        }
        function delDeduction(id) {
            state.deletedIds = state.deletedIds || {};
            state.deletedIds[String(id)] = true;
            state.incomeDeductions = state.incomeDeductions.filter(d => String(d.id) !== String(id)); saveState(); renderIncome(); renderOverview(); toast('تم الحذف');
        }
        function addFreelance() {
            const desc = document.getElementById('fl-desc').value.trim();
            const amount = parseFloat(document.getElementById('fl-amount').value);
            const date = document.getElementById('fl-date').value || td();
            if (!desc || isNaN(amount) || amount <= 0) { toast('أدخل البيانات'); return; }
            state.freelanceLog.push({ id: state.nextId++, desc, amount, date });
            saveState(); renderIncome(); renderOverview(); toast('تم التسجيل ✓');
            document.getElementById('fl-desc').value = ''; document.getElementById('fl-amount').value = '';
        }
        let editingFLId = null;
        function openEditFL(id) {
            const f = state.freelanceLog.find(x => String(x.id) === String(id));
            if (!f) return;
            editingFLId = id;
            document.getElementById('e-fl-desc').value = f.desc;
            document.getElementById('e-fl-amount').value = f.amount;
            document.getElementById('e-fl-date').value = f.date;
            openModal('editFL');
        }
        function saveEditFL() {
            const f = state.freelanceLog.find(x => String(x.id) === String(editingFLId));
            if (!f) return;
            const desc = document.getElementById('e-fl-desc').value.trim();
            const amount = parseFloat(document.getElementById('e-fl-amount').value);
            const date = document.getElementById('e-fl-date').value || td();
            if (!desc || isNaN(amount) || amount <= 0) { toast('أدخل البيانات'); return; }
            f.desc = desc; f.amount = amount; f.date = date;
            saveState(); closeModal('editFL'); renderIncome(); renderOverview();
            const active = document.querySelector('.page.active');
            if (active && active.id === 'page-statement') renderStatement();
            toast('تم تعديل الدخل ✓');
        }
        function saveNewFLFromStmt() {
            const desc = document.getElementById('n-fl-desc').value.trim();
            const amount = parseFloat(document.getElementById('n-fl-amount').value);
            const date = document.getElementById('n-fl-date').value || td();
            if (!desc || isNaN(amount) || amount <= 0) { toast('أدخل البيانات بشكل صحيح'); return; }
            if (!state.freelanceLog) state.freelanceLog = [];
            state.freelanceLog.push({ id: state.nextId++, desc, amount, date });
            saveState(); closeModal('addFLFromStmt'); renderIncome(); renderOverview();
            const active = document.querySelector('.page.active');
            if (active && active.id === 'page-statement') renderStatement();
            toast('تم إضافة الدخل بنجاح ✓');
            document.getElementById('n-fl-desc').value = '';
            document.getElementById('n-fl-amount').value = '';
            document.getElementById('n-fl-date').value = '';
        }
        function delFL(id) {
            state.deletedIds = state.deletedIds || {};
            state.deletedIds[String(id)] = true;
            state.freelanceLog = state.freelanceLog.filter(f => String(f.id) !== String(id)); saveState(); renderFLTable();
            const active = document.querySelector('.page.active');
            if (active && active.id === 'page-statement') renderStatement();
        }

        // ═══════════════════════════════════════
        //  EXPENSES (DETAILED)
        // ═══════════════════════════════════════
        const SUB_TO_MAIN_CAT = {
            // بقالة وسوبرماركت
            'خضار وفواكه': 'بقالة وسوبرماركت',
            'البيض': 'بقالة وسوبرماركت',
            'المجمدات': 'بقالة وسوبرماركت',
            'ألبان وأجبان': 'بقالة وسوبرماركت',
            'مخابز ومعجنات': 'بقالة وسوبرماركت',
            'لحوم ودواجن': 'بقالة وسوبرماركت',
            'معلبات ومواد تموينية': 'بقالة وسوبرماركت',
            'حلويات وتسالي': 'بقالة وسوبرماركت',
            'مشروبات ومياه': 'بقالة وسوبرماركت',
            'منظفات وعناية شخصية': 'بقالة وسوبرماركت',
            'أدوات منزلية': 'بقالة وسوبرماركت',

            // مطاعم وقهوة
            'وجبات سريعة': 'مطاعم وقهوة',
            'كافيهات وقهوة': 'مطاعم وقهوة',
            'مطاعم شعبية': 'مطاعم وقهوة',
            'حلويات ومخابز': 'مطاعم وقهوة',

            // فواتير وخدمات
            'كهرباء': 'فواتير وخدمات',
            'مياه': 'فواتير وخدمات',
            'إنترنت واتصالات': 'فواتير وخدمات',
            'اشتراكات وخدمات': 'فواتير وخدمات',

            // وقود ومواصلات
            'بنزين / وقود': 'وقود ومواصلات',
            'مواصلات عامة وتكسي': 'وقود ومواصلات',
            'ترخيص ورسوم': 'وقود ومواصلات',

            // صيانة السيارة وتأمينها
            'قطع غيار وتصليح': 'صيانة السيارة وتأمينها',
            'غسيل وتنظيف': 'صيانة السيارة وتأمينها',
            'تأمين وترخيص': 'صيانة السيارة وتأمينها',

            // صحة وأدوية
            'أدوية وصيدلية': 'صحة وأدوية',
            'عيادات وأطباء': 'صحة وأدوية',
            'تحاليل وفحوصات': 'صحة وأدوية',

            // تسوق وملابس
            'ملابس وأحذية': 'تسوق وملابس',
            'إلكترونيات وأجهزة': 'تسوق وملابس',
            'هدايا وإكسسوارات': 'تسوق وملابس',

            // ترفيه وسفر
            'سينما وألعاب': 'ترفيه وسفر',
            'رحلات وسفر': 'ترفيه وسفر',
            'أنشطة ترفيهية': 'ترفيه وسفر',

            // صيانة المنزل
            'أدوات ومواد بناء': 'صيانة المنزل',
            'فني وصيانة': 'صيانة المنزل',
            'أثاث وديكور': 'صيانة المنزل',

            // مصاريف الأولاد والمدارس
            'أقساط مدرسية': 'مصاريف الأولاد والمدارس',
            'قرطاسية وكتب': 'مصاريف الأولاد والمدارس',
            'ألعاب وملابس أطفال': 'مصاريف الأولاد والمدارس',

            // إيجار / قسط البيت
            'إيجار شهري': 'إيجار / قسط البيت',
            'قسط عقاري': 'إيجار / قسط البيت',

            // قروض وأقساط
            'قروض بنكية': 'قروض وأقساط',
            'أقساط سيارات': 'قروض وأقساط',
            'ديون شخصية': 'قروض وأقساط',

            // خدم منزلية
            'أجر الحارس / الحماية': 'خدم منزلية',
            'تنظيف وخدمات منزلية': 'خدم منزلية',

            // هدايا وصدقات
            'هدايا ومناسبات': 'هدايا وصدقات',
            'زكاة وصدقات': 'هدايا وصدقات',

            // صحة وجمال
            'صالون وحلاقة': 'صحة وجمال',
            'عناية شخصية ومكياج': 'صحة وجمال',

            // رسوم حكومية ومعاملات
            'مخالفات ورسوم': 'رسوم حكومية ومعاملات',
            'ضرائب ومعاملات': 'رسوم حكومية ومعاملات',

            // اشتراكات وباقات
            'اشتراكات رقمية': 'اشتراكات وباقات',
            'أندية رياضية (جيم)': 'اشتراكات وباقات',

            // حيوانات أليفة
            'حيوانات أليفة': 'حيوانات أليفة',
            'طعام ورعاية الحيوانات': 'حيوانات أليفة',
            'بيطري وتطعيمات': 'حيوانات أليفة',

            // طوارئ ومتفرقات
            'مصاريف طارئة': 'طوارئ ومتفرقات',
            'إصلاحات مفاجئة': 'طوارئ ومتفرقات',

            // أخرى
            'أخرى': 'أخرى'
        };

        const ITEM_AUTO_MAP = [
            // بقالة وسوبرماركت
            { keywords: ['بيض', 'بيضة', 'كرتونة بيض', 'طبق بيض'], subcat: 'البيض' },
            { keywords: ['مجمدات', 'مفرزات', 'مجمد', 'مفرز', 'ناجتس', 'اسكالوب', 'هوت دوج', 'نقانق', 'زنجر', 'كوردون', 'بطاطا مقلية'], subcat: 'المجمدات' },
            { keywords: ['خضار', 'خضره', 'خضرة', 'فواكه', 'موز', 'تفاح', 'برتقال', 'بطاطا', 'جزر', 'حشائش', 'خس', 'بندورة', 'خيار', 'اجاص', 'بصل', 'ثوم', 'ليمون', 'فريز', 'بطيخ', 'تمر', 'شمام', 'فراولة', 'عنب', 'دراق', 'خوخ', 'نجاص', 'فطر', 'سبانخ', 'ملفوف', 'قرنبيط', 'زهرة', 'كوسا', 'باذنجان', 'فليفلة', 'فلفل', 'بقدونس', 'نعنع', 'كزبرة', 'جرجير'], subcat: 'خضار وفواكه' },
            { keywords: ['لبن', 'لبنة', 'جبن', 'أجبان', 'حليب', 'دانيت', 'قشطة', 'زبدة', 'سمن', 'كشك', 'شنينة', 'موزاريلا', 'كرافت', 'بوك', 'المراعي', 'بلدنا', 'سنيورة', 'كريمة', 'لبن بلدنا', 'لبنة طرية'], subcat: 'ألبان وأجبان' },
            { keywords: ['خبز', 'كعك', 'توست', 'مفرود', 'حمام', 'مخبز', 'مخابز', 'شراك', 'صمون', 'بيتا', 'عجين', 'عجينة', 'مناقيش', 'توست', 'روتي', 'باغيت', 'كرواسون'], subcat: 'مخابز ومعجنات' },
            { keywords: ['لحم', 'لحوم', 'دجاج', 'جناح', 'فخذ', 'ستيك', 'سمك', 'أسماك', 'روبيان', 'كفتة', 'سجق', 'همبرغر', 'كباب', 'شقف', 'فيليه', 'سردين', 'طون', 'كوارع', 'لية', 'شيش', 'طاووق'], subcat: 'لحوم ودواجن' },
            { keywords: ['شوفان', 'رز', 'أرز', 'سكر', 'ملح', 'زيت', 'طحين', 'عدس', 'فريكة', 'سنيورة', 'معلبات', 'صلصة', 'تونة', 'فول', 'حمص', 'حبوب', 'فاصولياء', 'بازيلاء', 'مفتول', 'برغل', 'معكرونة', 'اندومي', 'مكرونة', 'بهارات', 'هيل', 'زعتر', 'كاتشب', 'مايونيز', 'خردل', 'شطة', 'خل', 'نشا', 'خميرة', 'بيكنج', 'فانيلا', 'بشار'], subcat: 'معلبات ومواد تموينية' },
            { keywords: ['شيبس', 'بوزة', 'ايس كريم', 'أيس كريم', 'علكة', 'حلويات', 'شوكولاته', 'شوكولاتة', 'بزر', 'مخلوطة', 'مكسرات', 'فستق', 'فصدق', 'ذرة', 'مولتو', 'مارشميلو', 'بسكت', 'بسكويت', 'سوس', 'جيلو', 'توفي', 'نوتيلا', 'كندر', 'جالكسي', 'كيتكات', 'سنيكرز', 'مارس', 'باونتي', 'تويكس', 'شيبسات', 'فشار'], subcat: 'حلويات وتسالي' },
            { keywords: ['عصير', 'مياه', 'ماء', 'قارورة', 'قوارير', 'مياسي', 'غازية', 'بيبسي', 'كولا', 'شاي', 'قهوة', 'نسكافيه', 'كابتشينو', 'مشروب', 'سفن', 'فانتا', 'ريدبول', 'مكثف', 'مشروبات', 'عصائر', 'شراب', 'ميرندا', 'سبرايت'], subcat: 'مشروبات ومياه' },
            { keywords: ['منظف', 'صابون', 'شامبو', 'هايجين', 'اسفنج', 'جلي', 'العملاق', 'مزيل', 'عرق', 'اكس', 'كلور', 'ديتول', 'معجون', 'فرشاة', 'فاين', 'محارم', 'كلينكس', 'شفرة', 'شفرات', 'حلاقة', 'فوط', 'حفاضات', 'معطر', 'ملين', 'غسيل', 'ديودرنت', 'شاور', 'جل', 'سائل', 'مطبخ', 'مطهر', 'سلكة'], subcat: 'منظفات وعناية شخصية' },
            { keywords: ['بطارية', 'بطاريات', 'لمبة', 'سلك', 'وصلة', 'شاحن', 'ابريق', 'كاسة', 'كاسات', 'صحون', 'شوك', 'سكين', 'طنجرة', 'قلاية', 'فنجان', 'مطبخ'], subcat: 'أدوات منزلية' },

            // مطاعم وقهوة
            { keywords: ['شاورما', 'فلافل', 'برقر', 'برجر', 'وجبة', 'سندويش', 'سندويشة', 'بيتزا', 'معجنات', 'مطعم', 'سناجق', 'بروستد', 'كريب', 'وافل', 'دونر', 'صاج', 'فتوش', 'تبولة', 'حمص مطعم', 'فطور', 'غداء', 'عشاء', 'سناك', 'كنتاكي', 'ماكدونالدز', 'شاورماجي'], subcat: 'وجبات سريعة' },
            { keywords: ['قهوة', 'كافيه', 'كابتشينو', 'اسبريسو', 'لاتيه', 'شاي', 'جبران', 'ستاربكس', 'اسبرسو', 'موكا', 'امريكانو', 'دبل', 'ماكياتو', 'مقهى'], subcat: 'كافيهات وقهوة' },

            // فواتير وخدمات
            { keywords: ['كهرباء', 'كهربا', 'فلس الريف', 'فاتورة كهرباء'], subcat: 'كهرباء' },
            { keywords: ['مياه', 'ميه', 'سلطة المياه', 'الماء', 'صرف صحي', 'فاتورة مياه'], subcat: 'مياه' },
            { keywords: ['إنترنت', 'انترنت', 'خلوي', 'شحن', 'رصيد', 'أمنية', 'زين', 'أورانج', 'اورنج', 'فايبر', 'اشتراك نت', 'تلفون', 'هاتف', 'فاتورة نت', 'اشتراك شهري'], subcat: 'إنترنت واتصالات' },

            // وقود ومواصلات
            { keywords: ['بنزين', 'سولار', 'ديزل', 'وقود', 'محطة', 'تعبئة', 'كازية', 'مناصير', 'توتال', 'تعبئة وقود', 'فل بنزين'], subcat: 'بنزين / وقود' },
            { keywords: ['تكسي', 'تاكسي', 'أوبر', 'كريم', 'باص', 'مواصلات', 'سرفيس', 'مترو', 'قطار', 'رحلة', 'سرفيس', 'مواقف', 'تعرفة', 'أجرة الباص'], subcat: 'مواصلات عامة وتكسي' },

            // صيانة السيارة
            { keywords: ['تصليح', 'غيار', 'ميكانيكي', 'كوشوك', 'إطار', 'بواجي', 'فيلتر', 'فرامل', 'صيانة سيارة', 'كراج', 'قطع غيار', 'بناشر', 'بنشري', 'زيت سيارة', 'كهربائي سيارات'], subcat: 'قطع غيار وتصليح' },
            { keywords: ['غسيل', 'تغسيل', 'دراي كلين', 'تلميع', 'غسيل سيارة', 'تنظيف سيارة'], subcat: 'غسيل وتنظيف' },

            // صحة وأدوية
            { keywords: ['دواء', 'أدوية', 'ادوية', 'علاج', 'صيدلية', 'بخاخ', 'حبوب', 'بندول', 'فيتامين', 'مرهم', 'قطرة', 'مسكن', 'شراب دواء'], subcat: 'أدوية وصيدلية' },
            { keywords: ['دكتور', 'طبيب', 'عيادة', 'مستشفى', 'مراجعة', 'كشفية', 'طوارئ', 'اسنان', 'أخصائي', 'طبيب اسنان', 'تحليل'], subcat: 'عيادات وأطباء' },

            // هدايا وصدقات
            { keywords: ['هدية', 'هدايا', 'عيدية', 'ورد', 'كيكة مناسبة', 'عيد ميلاد', 'عرس', 'نقوط'], subcat: 'هدايا ومناسبات' },
            { keywords: ['زكاة', 'صدقة', 'تبرع', 'كفالة', 'فقير', 'مسجد', 'صدقات'], subcat: 'زكاة وصدقات' },

            // صحة وجمال
            { keywords: ['حلاق', 'حلاقة', 'صالون', 'كوافير', 'قص شعر', 'لحية'], subcat: 'صالون وحلاقة' },
            { keywords: ['مكياج', 'عناية', 'بشرة', 'ليزر', 'كريم', 'واقي شمس', 'عطور', 'عطر'], subcat: 'عناية شخصية ومكياج' },

            // رسوم واشتراكات
            { keywords: ['مخالفة', 'سير', 'ضريبة', 'رسوم', 'طوابع', 'معاملة', 'محكمة', 'تصديق', 'مخالفات'], subcat: 'مخالفات ورسوم' },
            { keywords: ['جيم', 'نادي', 'سباحة', 'رياضة', 'اشتراك جيم', 'مدرب'], subcat: 'أندية رياضية (جيم)' },
            { keywords: ['نتفلكس', 'شاهد', 'يوتيوب', 'سبوتيفاي', 'اشتراك', 'تجديد', 'باقة', 'بي ان', 'تلفزيون', 'iptv'], subcat: 'اشتراكات رقمية' },

            // حيوانات أليفة
            { keywords: ['قطة', 'بسة', 'كلب', 'قطط', 'طعام قطط', 'دراي فود', 'رمل قطط', 'علف'], subcat: 'طعام ورعاية الحيوانات' },
            { keywords: ['بيطري', 'دكتور حيوان', 'تطعيم', 'تطعيمات', 'علاج حيوان', 'عيادة بيطرية'], subcat: 'بيطري وتطعيمات' },

            // طوارئ ومتفرقات
            { keywords: ['طارئ', 'طوارئ', 'مفاجئ', 'مفاجئة', 'إصلاح عاجل', 'عطل', 'حادث'], subcat: 'مصاريف طارئة' },
            { keywords: ['إصلاح مفاجئ', 'انكسر', 'تعطل', 'تلف', 'ضرورة'], subcat: 'إصلاحات مفاجئة' }
        ];

        let exactMatchTrained = {};
        let wordTrainedFreq = {};

        function trainModel() {
            exactMatchTrained = {};
            wordTrainedFreq = {};

            if (!state || !state.expenses) return;

            state.expenses.forEach(e => {
                (e.items || []).forEach(it => {
                    if (!it.name || !it.subcat) return;

                    const nameNorm = it.name.trim().toLowerCase();
                    const subcat = it.subcat;

                    // 1. Train exact match mapping
                    exactMatchTrained[nameNorm] = subcat;

                    // 2. Train word-level frequencies
                    const words = nameNorm.split(/[\s\-_,\.\/\(\)]+/).filter(w => w.length > 2);
                    words.forEach(w => {
                        if (!wordTrainedFreq[w]) {
                            wordTrainedFreq[w] = {};
                        }
                        wordTrainedFreq[w][subcat] = (wordTrainedFreq[w][subcat] || 0) + 1;
                    });
                });
            });
        }

        function autoMapItemSubcat(inputEl) {
            const name = inputEl.value.trim().toLowerCase();
            if (!name) return;
            const row = inputEl.closest('.item-row');
            if (!row) return;
            const selectEl = row.querySelector('select');
            if (!selectEl) return;

            // If the user manually selected an option from the dropdown, respect their choice and stop AI intervention for this row!
            if (selectEl.dataset.manual === '1') return;

            // --- LEVEL 0: Self-Learning AI Predictions ---
            // A. Check exact trained match
            if (exactMatchTrained[name]) {
                selectEl.value = exactMatchTrained[name];
                return;
            }

            // B. Check word-level trained association frequencies
            const nameWords = name.split(/[\s\-_,\.\/\(\)]+/).filter(Boolean);
            const trainedWords = nameWords.filter(w => w.length > 2);
            let bestSubcat = null;
            let highestFreq = 0;

            for (const w of trainedWords) {
                if (wordTrainedFreq[w]) {
                    Object.keys(wordTrainedFreq[w]).forEach(sub => {
                        const freq = wordTrainedFreq[w][sub];
                        if (freq > highestFreq) {
                            highestFreq = freq;
                            bestSubcat = sub;
                        }
                    });
                }
            }

            if (bestSubcat && highestFreq >= 1) {
                selectEl.value = bestSubcat;
                return;
            }

            // Helper to check if a keyword matches the input name safely
            const isMatch = (kw) => {
                // If the keyword is a brand or a short word, we want exact word match to avoid substring collisions (e.g. 'بنزين' containing 'زين')
                if (kw.length <= 4 || kw === 'زين' || kw === 'ماء' || kw === 'رز' || kw === 'ملح' || kw === 'كول') {
                    return nameWords.includes(kw);
                }
                // Otherwise, standard substring includes is fine for longer specific terms
                return name.includes(kw);
            };

            // 1. Direct comprehensive keywords search
            for (const mapping of ITEM_AUTO_MAP) {
                for (const kw of mapping.keywords) {
                    if (isMatch(kw)) {
                        selectEl.value = mapping.subcat;
                        return;
                    }
                }
            }

            // 2. Intelligent Substring & Fuzzy matching fallback against subcategory options themselves
            const options = Array.from(selectEl.options).map(opt => opt.value);

            // Phase A: check if the input contains any subcategory name, or a subcategory name contains the input
            for (const sub of options) {
                if (sub.includes(name) || name.includes(sub)) {
                    selectEl.value = sub;
                    return;
                }
            }

            // Phase B: split the input into words (len > 2) and check if any word matches a subcategory
            const words = name.split(/\s+/).filter(w => w.length > 2);
            for (const w of words) {
                for (const sub of options) {
                    if (sub.includes(w)) {
                        selectEl.value = sub;
                        return;
                    }
                }
            }
        }

        function shopSubcatColor(n) { return catColor(normCat(n)); }

        function shopSubcatIcon(n) {
            const icons = {
                // بقالة وسوبرماركت
                'خضار وفواكه': '🍎',
                'ألبان وأجبان': '🧀',
                'مخابز ومعجنات': '🍞',
                'لحوم ودواجن': '🥩',
                'معلبات ومواد تموينية': '🥫',
                'حلويات وتسالي': '🍫',
                'مشروبات ومياه': '🥤',
                'منظفات وعناية شخصية': '🧴',
                'أدوات منزلية': '🧹',

                // مطاعم وقهوة
                'وجبات سريعة': '🍔',
                'كافيهات وقهوة': '☕',
                'مطاعم شعبية': '🍲',
                'حلويات ومخابز': '🍰',

                // فواتير وخدمات
                'كهرباء': '⚡',
                'مياه': '💧',
                'إنترنت واتصالات': '🌐',
                'اشتراكات وخدمات': '💳',

                // وقود ومواصلات
                'بنزين / وقود': '⛽',
                'مواصلات عامة وتكسي': '🚕',
                'ترخيص ورسوم': '📄',

                // صيانة السيارة
                'قطع غيار وتصليح': '🔧',
                'غسيل وتنظيف': '🧼',
                'تأمين وترخيص': '🛡️',

                // صحة وأدوية
                'أدوية وصيدلية': '💊',
                'عيادات وأطباء': '🩺',
                'تحاليل وفحوصات': '🧪',

                // تسوق وملابس
                'ملابس وأحذية': '👕',
                'إلكترونيات وأجهزة': '💻',
                'هدايا وإكسسوارات': '🎁',

                // ترفيه وسفر
                'سينما وألعاب': '🎮',
                'رحلات وسفر': '✈️',
                'أنشطة ترفيهية': '🎡',

                // صيانة المنزل
                'أدوات ومواد بناء': '🔨',
                'فني وصيانة': '🛠️',
                'أثاث وديكور': '🛋️',

                // مصاريف الأولاد
                'أقساط مدرسية': '🏫',
                'قرطاسية وكتب': '📚',
                'ألعاب وملابس أطفال': '🧸',

                // إيجار
                'إيجار شهري': '🏠',
                'قسط عقاري': '🏦',

                // قروض
                'قروض بنكية': '📉',
                'أقساط سيارات': '🚗',
                'ديون شخصية': '🤝',

                // خدم منزلية
                'أجر الحارس / الحماية': '💂',
                'تنظيف وخدمات منزلية': '🧹',

                // حيوانات أليفة
                'حيوانات أليفة': '🐾',
                'طعام ورعاية الحيوانات': '🦮',
                'بيطري وتطعيمات': '🩺',

                // طوارئ ومتفرقات
                'مصاريف طارئة': '🚨',
                'إصلاحات مفاجئة': '⚡',

                // أخرى
                'أخرى': '🏷️',
                'اخرى': '🏷️',

                // Fallbacks for main category names
                'بقالة وسوبرماركت': '🛒',
                'مطاعم وقهوة': '🍕',
                'فواتير وخدمات': '🔌',
                'وقود ومواصلات': '🚗',
                'صيانة السيارة وتأمينها': '🔧',
                'صحة وأدوية': '🏥',
                'تسوق وملابس': '🛍️',
                'ترفيه وسفر': '🎈',
                'صيانة المنزل': '🏠',
                'مصاريف الأولاد والمدارس': '👶',
                'إيجار / قسط البيت': '🏠',
                'قروض وأقساط': '💸',
                'خدم منزلية': '🧹',
                'هدايا وصدقات': '🎁',
                'صحة وجمال': '💅',
                'رسوم حكومية ومعاملات': '🏛️',
                'اشتراكات وباقات': '📱',
                'حيوانات أليفة': '🐾',
                'طوارئ ومتفرقات': '🚨'
            };
            return icons[n] || '🏷️';
        }

        function getCatOptions() {
            const subcatsByMain = {};
            state.categories.forEach(c => {
                subcatsByMain[c.name] = [];
            });
            Object.entries(SUB_TO_MAIN_CAT).forEach(([sub, main]) => {
                if (subcatsByMain[main]) {
                    subcatsByMain[main].push(sub);
                }
            });
            let html = '';
            state.categories.forEach(c => {
                const subs = subcatsByMain[c.name] || [];
                if (subs.length > 0) {
                    html += `<optgroup label="${c.name}">`;
                    subs.forEach(sub => {
                        html += `<option value="${sub}">${sub}</option>`;
                    });
                    html += `</optgroup>`;
                } else {
                    html += `<option value="${c.name}">${c.name}</option>`;
                }
            });
            return html;
        }

        let shopFilterCat = 'all';
        let expDashChart = null;
        let editingExpId = null;

        function populateCatSelects() {
            ['m-sub-cat', 'e-sub-cat'].forEach(id => {
                const sel = document.getElementById(id);
                if (!sel) return;
                sel.innerHTML = state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            });
            const ecSel = document.getElementById('exp-cat-sel');
            if (ecSel) ecSel.innerHTML = '<option value="all">كل الفئات</option>' + state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        }

        function checkBudgetWarning(cat) {
            if (!state.budgets || !state.budgets[cat]) return;
            const limit = state.budgets[cat];

            // Re-calculate spent on this specific subcat
            let spent = 0;
            state.expenses.filter(e => inRange(e.date)).forEach(e => {
                (e.items || []).forEach(it => {
                    if (it.subcat === cat) spent += (it.qty * it.price);
                })
            });

            if (state.subscriptions) state.subscriptions.forEach(s => {
                if (s.cat === cat) spent += (s.freq === 'daily' ? s.amount * 30 : s.freq === 'yearly' ? s.amount / 12 : s.amount);
            });
            if (cat === 'ديون' && state.loans) state.loans.forEach(l => { spent += l.monthly; });

            if (spent >= limit) {
                setTimeout(() => alert(`🚨 تحذير الميزانية 🚨\n\nلقد تجاوزت الميزانية المخصصة لفئة "${cat}"!\n\nالمنفق: ${spent.toFixed(2)} د.أ\nالميزانية: ${limit.toFixed(2)} د.أ`), 100);
            } else if (spent >= limit * 0.8) {
                setTimeout(() => alert(`⚠️ تنبيه الميزانية ⚠️\n\nلقد استهلكت ${(spent / limit * 100).toFixed(0)}% من ميزانية فئة "${cat}".\n\nالمتبقي فقط: ${(limit - spent).toFixed(2)} د.أ`), 100);
            }
        }

        function addInvItemRow(prefill) {
            const container = document.getElementById('inv-items-container');
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = '<input class="inp" placeholder="اسم الصنف" oninput="autoMapItemSubcat(this); updateInvTotal()" /><input class="inp" type="number" placeholder="1" value="1" min="0.01" step="0.01" oninput="updateInvTotal()" /><input class="inp" type="number" placeholder="0.00" min="0" step="0.01" oninput="updateInvTotal()" /><select class="inp" onchange="this.dataset.manual=\'1\'">' + getCatOptions() + '</select><button class="remove-item-btn" onclick="this.closest(\'.item-row\').remove();updateInvTotal()">✕</button>';
            container.appendChild(row);
            if (prefill) {
                const inputs = row.querySelectorAll('input');
                const sel = row.querySelectorAll('select');
                inputs[0].value = prefill.name || '';
                inputs[1].value = prefill.qty ?? 1;
                inputs[2].value = prefill.price ?? 0;
                if (sel[0] && prefill.subcat) {
                    let exists = false;
                    for (let i = 0; i < sel[0].options.length; i++) {
                        if (sel[0].options[i].value === prefill.subcat) { exists = true; break; }
                    }
                    if (!exists) {
                        const opt = document.createElement('option');
                        opt.value = prefill.subcat;
                        opt.text = prefill.subcat;
                        sel[0].add(opt);
                    }
                    sel[0].value = prefill.subcat;
                    sel[0].dataset.manual = '1';
                }
            }
            updateInvTotal();
        }

        function updateInvTotal() {
            let total = 0;
            document.querySelectorAll('#inv-items-container .item-row').forEach(row => {
                const inputs = row.querySelectorAll('input');
                total += (parseFloat(inputs[1]?.value) || 0) * (parseFloat(inputs[2]?.value) || 0);
            });
            const el = document.getElementById('inv-total-preview');
            if (el) el.textContent = total.toFixed(2) + ' د.أ';
        }

        function saveExpenseFromModal() {
            if (editingExpId) saveEditExpense();
            else addExpense();
        }

        function addExpense() {
            const desc = document.getElementById('m-exp-desc').value.trim();
            const date = document.getElementById('m-exp-date').value || td();
            const payment = document.getElementById('m-exp-payment').value;
            const note = document.getElementById('m-exp-note').value.trim();

            if (!desc) { toast('أدخل الوصف / الجهة'); return; }

            const items = [];
            let valid = true;
            document.querySelectorAll('#inv-items-container .item-row').forEach(row => {
                const inputs = row.querySelectorAll('input');
                const sel = row.querySelectorAll('select');
                const name = inputs[0]?.value.trim();
                const qty = parseFloat(inputs[1]?.value) || 1;
                const price = parseFloat(inputs[2]?.value) || 0;
                const subcat = sel[0]?.value || 'أخرى';
                if (!name) { valid = false; return; }
                items.push({ name, qty, price, subcat });
            });

            if (!valid || items.length === 0) { toast('أضف صنفاً واحداً على الأقل'); return; }
            const amount = items.reduce((s, it) => s + it.qty * it.price, 0);

            state.expenses.push({ id: state.nextId++, desc, amount, date, payment, note, items });
            saveState(); closeModal('addExpense'); renderExpTable(); renderOverview(); if (typeof renderStatement === 'function') renderStatement(); toast('تمت إضافة المصروف ✓');

            document.getElementById('m-exp-desc').value = '';
            document.getElementById('m-exp-note').value = '';
            document.getElementById('inv-items-container').innerHTML = '';
            document.getElementById('inv-total-preview').textContent = '0.00 د.أ';

            // Check budget for newly added subcats
            const modifiedCats = [...new Set(items.map(it => normCat(it.subcat)))];
            modifiedCats.forEach(c => checkBudgetWarning(c));
        }

        function delExpense(id) {
            state.deletedIds = state.deletedIds || {};
            state.deletedIds[String(id)] = true;
            state.expenses = state.expenses.filter(e => String(e.id) !== String(id));
            saveState(); renderExpTable(); renderOverview(); if (typeof renderStatement === 'function') renderStatement(); toast('تم الحذف');
        }

        // Edit reuses the same modal as Add (modal-addExpense). The mode is
        // distinguished by the `editingExpId` variable (null → add, id → edit).
        function openEditExpense(id) {
            const exp = state.expenses.find(e => String(e.id) === String(id));
            if (!exp) return;
            editingExpId = id;
            document.getElementById('m-exp-desc').value = exp.desc || '';
            document.getElementById('m-exp-date').value = exp.date || td();
            document.getElementById('m-exp-payment').value = exp.payment || 'نقدي';
            document.getElementById('m-exp-note').value = exp.note || '';
            const container = document.getElementById('inv-items-container');
            container.innerHTML = '';
            (exp.items || []).forEach(it => addInvItemRow(it));
            if (!(exp.items || []).length) addInvItemRow();
            updateInvTotal();
            document.querySelector('#modal-addExpense .modal-title').textContent = 'تعديل مصروف تفصيلي';
            document.getElementById('modal-addExpense').classList.add('open');
        }

        function saveEditExpense() {
            const exp = state.expenses.find(e => String(e.id) === String(editingExpId));
            if (!exp) return;
            const desc = document.getElementById('m-exp-desc').value.trim();
            const date = document.getElementById('m-exp-date').value || td();
            const payment = document.getElementById('m-exp-payment').value;
            const note = document.getElementById('m-exp-note').value.trim();

            if (!desc) { toast('أدخل الوصف'); return; }
            const items = [];
            let valid = true;
            document.querySelectorAll('#inv-items-container .item-row').forEach(row => {
                const inputs = row.querySelectorAll('input');
                const sel = row.querySelectorAll('select');
                const name = inputs[0]?.value.trim();
                const qty = parseFloat(inputs[1]?.value) || 1;
                const price = parseFloat(inputs[2]?.value) || 0;
                const subcat = sel[0]?.value || 'أخرى';
                if (!name) { valid = false; return; }
                items.push({ name, qty, price, subcat });
            });
            if (!valid || items.length === 0) { toast('أضف صنفاً واحداً على الأقل'); return; }
            const amount = items.reduce((s, it) => s + it.qty * it.price, 0);

            exp.desc = desc; exp.date = date; exp.payment = payment; exp.note = note; exp.items = items; exp.amount = amount;

            saveState(); closeModal('addExpense'); editingExpId = null; renderExpTable(); renderOverview(); if (typeof renderStatement === 'function') renderStatement(); toast('تم التعديل ✓');
        }

        function setShopFilter(subcat) { shopFilterCat = subcat; expLimit = 20; renderExpTable(); }

        function toggleInvoice(id) { const b = document.getElementById('inv-body-' + id); if (b) b.classList.toggle('open'); }

        function renderExpDash() {
            const exps = state.expenses.filter(e => inRange(e.date));
            const total = exps.reduce((s, e) => s + e.amount, 0);
            const subMonthly = calcSubMonthly();
            const loanMonthly = state.loans ? state.loans.reduce((s, l) => s + l.monthly, 0) : 0;
            const overallTotal = total + subMonthly + loanMonthly;

            const topExp = exps.slice().sort((a, b) => b.amount - a.amount)[0];
            const byCat = {};
            exps.forEach(e => {
                (e.items || []).forEach(it => {
                    const c = normCat(it.subcat);
                    byCat[c] = (byCat[c] || 0) + (it.qty * it.price);
                });
            });
            if (state.subscriptions) state.subscriptions.forEach(s => {
                const amt = s.freq === 'daily' ? s.amount * 30 : s.freq === 'yearly' ? s.amount / 12 : s.amount;
                const c = normCat(s.cat);
                byCat[c] = (byCat[c] || 0) + amt;
            });
            if (state.loans) state.loans.forEach(l => {
                byCat['ديون'] = (byCat['ديون'] || 0) + l.monthly;
            });

            const m = document.getElementById('exp-dash-metrics');
            if (m) m.innerHTML =
                '<div class="metric m-r"><div class="metric-lbl">إجمالي المصاريف</div><div class="metric-val">' + overallTotal.toFixed(0) + ' <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div><div class="metric-sub">شاملة الاشتراكات والقروض</div></div>' +
                (topExp ? '<div class="metric m-p"><div class="metric-lbl">أعلى فاتورة</div><div class="metric-val" style="font-size:14px">' + topExp.desc + '</div><div class="metric-sub">' + topExp.amount.toFixed(2) + ' د.أ</div></div>' : '') +
                '<div class="metric m-g"><div class="metric-lbl">متوسط المصروف</div><div class="metric-val">' + (exps.length ? (overallTotal / (exps.length + (state.subscriptions ? state.subscriptions.length : 0) + (state.loans ? state.loans.length : 0))).toFixed(1) : 0) + ' <span style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div></div>';

            const catEl = document.getElementById('exp-dash-cats');
            if (catEl) {
                const totalInc = monthlyIncome().total;
                catEl.innerHTML = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                    const pct = totalInc > 0 ? (amt / totalInc * 100) : 0;
                    const col = catColor(cat);
                    return '<div class="shop-analysis-bar"><div class="bar-hdr"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + col + ';margin-inline-end:5px"></span>' + cat + '</span><span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--text3)">' + pct.toFixed(1) + '% · ' + amt.toFixed(2) + ' د.أ</span></div><div class="bar-bg"><div class="bar-fill" style="width:' + Math.min(pct, 100) + '%;background:' + col + '"></div></div></div>';
                }).join('') || '<div class="empty">لا بيانات</div>';
            }

            const now3 = new Date(); const lbls3 = []; const vals3 = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now3.getFullYear(), now3.getMonth() - i, 1);
                lbls3.push(MONTHS_SHORT[d.getMonth()]);
                const targetMonth = d.getMonth();
                const targetYear = d.getFullYear();

                const filtered = state.expenses.filter(e => {
                    const { month, year } = getFinancialMonthAndYear(e.date);
                    return month === targetMonth && year === targetYear;
                });
                vals3.push(filtered.reduce((s, e) => s + e.amount, 0));
            }
            if (expDashChart) expDashChart.destroy();
            const lineEl = document.getElementById('expDashLine');
            if (lineEl) {
                expDashChart = new Chart(lineEl.getContext('2d'), { type: 'line', data: { labels: lbls3, datasets: [{ data: vals3, borderColor: 'rgba(248,113,113,0.8)', backgroundColor: 'rgba(248,113,113,0.08)', tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: 'rgba(248,113,113,0.8)' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw.toFixed(2) + ' د.أ' } } }, scales: { x: { grid: { display: false }, ticks: { color: '#55545f', font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#55545f', font: { size: 10 }, callback: v => v + 'د.أ' } } } } });
            }
        }

        function printFilteredExpenses() {
            const q = (document.getElementById('exp-search') || {}).value || '';
            let invoices = state.expenses.filter(e => {
                return inRange(e.date) && (!q || (e.desc + (e.note || '') + (e.items || []).map(i => i.subcat).join('')).includes(q));
            });
            const filtered = (shopFilterCat === 'all' ? invoices : invoices.filter(inv => (inv.items || []).some(it => it.subcat === shopFilterCat))).sort((a, b) => new Date(b.date) - new Date(a.date));
            const win = window.open('', '_blank');
            win.document.write('<html dir="rtl"><head><title>سجل المصاريف (' + (shopFilterCat === 'all' ? 'الكل' : shopFilterCat) + ')</title></head><body>');
            win.document.write('<h2>سجل المصاريف (' + (shopFilterCat === 'all' ? 'الكل' : shopFilterCat) + ')</h2><p>الفترة: ' + periodLabel() + '</p>');
            win.document.write('<table><thead><tr><th>التاريخ</th><th>الوصف</th><th>الفئة</th><th>طريقة الدفع</th><th>المبلغ</th></tr></thead><tbody>');
            let t = 0;
            filtered.forEach(e => {
                let amt = shopFilterCat === 'all' ? e.amount : (e.items || []).filter(it => it.subcat === shopFilterCat).reduce((s, it) => s + it.qty * it.price, 0);
                t += amt;
                win.document.write('<tr><td>' + e.date + '</td><td>' + e.desc + '</td><td>' + ((e.items || [])[0]?.subcat || 'أخرى') + '</td><td>' + (e.payment || 'نقدي') + '</td><td>' + amt.toFixed(2) + ' د.أ</td></tr>');
            });
            win.document.write('</tbody><tfoot><tr><th colspan="4">الإجمالي</th><th>' + t.toFixed(2) + ' د.أ</th></tr></tfoot></table><script>window.print();<\/script></body></html>');
            win.document.close();
        }

        function printInvoice(id) {
            const inv = state.expenses.find(e => e.id === id);
            if (!inv) return;
            const items2show = shopFilterCat === 'all' ? (inv.items || []) : (inv.items || []).filter(it => it.subcat ===
                shopFilterCat);
            const total = shopFilterCat === 'all' ? inv.amount : items2show.reduce((s, it) => s + it.qty * it.price, 0);

            const win = window.open('', '_blank');
            win.document.write(`<html dir="rtl">
<head>
    <title>فاتورة: ${inv.desc}</title>
    
</head>
<body>`);
            win.document.write(`<div class="hdr">
        <div>
            <h2>${inv.desc}</h2>
            <div>الفئة: ${(inv.items || [])[0]?.subcat || 'أخرى'} | الدفع: ${inv.payment || 'نقدي'}</div>
        </div>
        <div>
            <h3>${inv.date}</h3>
        </div>
    </div>`);
            if (shopFilterCat !== 'all') win.document.write('<p><b>مفلترة حسب:</b> ' + shopFilterCat + '</p>');
            win.document.write(`<table>
        <thead>
            <tr>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
            </tr>
        </thead>
        <tbody>`);
            items2show.forEach(it => {
                win.document.write(`<tr>
                <td>${it.name}</td>
                <td>${it.qty}</td>
                <td>${it.price.toFixed(2)}</td>
                <td>${(it.qty * it.price).toFixed(2)} د.أ</td>
            </tr>`);
            });
            win.document.write(`</tbody>
        <tfoot>
            <tr>
                <th colspan="3">الإجمالي الكلي</th>
                <th>${total.toFixed(2)} د.أ</th>
            </tr>
        </tfoot>
    </table>`);
            if (inv.note) win.document.write('<p style="margin-top:20px"><b>ملاحظات:</b> ' + inv.note + '</p>');
            win.document.write('<script>window.print();<\/script></body></html>');
            win.document.close();
        }

        function renderExpTable() {
            renderExpDash();
            const q = (document.getElementById('exp-search') || {}).value || '';

            let invoices = state.expenses.filter(e => {
                return inRange(e.date) && (!q || (e.desc + (e.note || '') + (e.items || []).map(i => i.subcat).join('')).includes(q));
            }); const allSubcats = [...new
                Set(invoices.flatMap(inv => (inv.items || []).map(it => it.subcat)))];
            const allAmt = invoices.reduce((s, inv) => s + inv.amount, 0);
            document.getElementById('shop-tabs').innerHTML =
                `<span class="shop-tab ${shopFilterCat === 'all' ? 'active' : ''}" onclick="setShopFilter('all')">الكل <span class="tab-amt">${allAmt.toFixed(0)} د.أ</span></span>` +
                allSubcats.map(sub => {
                    const subAmt = invoices.reduce((s, inv) => s + (inv.items || []).filter(it => it.subcat === sub).reduce((ss, it) =>
                        ss + it.qty * it.price, 0), 0);
                    return `<span class="shop-tab ${shopFilterCat === sub ? 'active' : ''}" onclick="setShopFilter('${sub}')">${shopSubcatIcon(sub)} ${sub} <span class="tab-amt">${subAmt.toFixed(0)} د.أ</span></span>`;
                }).join('');

            const filtered = (shopFilterCat === 'all' ? invoices : invoices.filter(inv => (inv.items || []).some(it => it.subcat
                === shopFilterCat))).sort((a, b) => new Date(b.date) - new Date(a.date));

            const visible = filtered.slice(0, expLimit);

            let html = visible.length ? visible.map(inv => {
                const items2show = shopFilterCat === 'all' ? (inv.items || []) : (inv.items || []).filter(it => it.subcat ===
                    shopFilterCat);
                const displayTotal = items2show.reduce((s, it) => s + it.qty * it.price, 0);
                const itemsHtml = items2show.map(it => {
                    const col = shopSubcatColor(it.subcat);
                    return `<div class="inv-item-row">
        <div class="inv-subcat-dot" style="background:${col}"></div><span class="inv-item-name">${it.name}</span><span class="inv-item-qty">×${it.qty}</span><span class="inv-subcat-badge"
            style="background:${col}22;color:${col}">${it.subcat}</span><span class="inv-item-price">${(it.qty * it.price).toFixed(2)} د.أ</span>
    </div>`;
                }).join('');

                // Get primary subcat for badge
                const primaryCat = (inv.items || [])[0]?.subcat || 'أخرى';
                const hasMore = (inv.items || []).length > 1;

                return `<div class="invoice-card">
        <div class="invoice-hdr" onclick="toggleInvoice(${inv.id})">
            <div class="invoice-icon" style="background:${catColor(primaryCat)}22;color:${catColor(primaryCat)}">📄
            </div>
            <div class="invoice-info">
                <div class="invoice-title">${inv.desc}</div>
                <div class="invoice-meta">${inv.date} · ${primaryCat}${hasMore ? ' (+ متعدد)' : ''} · ${inv.payment || 'نقدي'}${inv.note ? ' · ' + inv.note : ''} · ${(inv.items || []).length} صنف</div>
            </div>
            <div class="invoice-total">${(shopFilterCat === 'all' ? inv.amount.toFixed(2) : displayTotal.toFixed(2))} د.أ</div><button class="del-btn" style="color:var(--text);margin-inline-end:4px"
                onclick="event.stopPropagation();printInvoice(${inv.id})" title="تصدير">🖨</button><button
                class="del-btn" style="color:var(--accent2);margin-inline-end:4px"
                onclick="event.stopPropagation();openEditExpense(${inv.id})" title="تعديل">✎</button><button
                class="del-btn" onclick="event.stopPropagation();delExpense(${inv.id})" title="حذف">✕</button>
        </div>
        <div class="invoice-body" id="inv-body-${inv.id}">${itemsHtml}<div
                style="display:flex;justify-content:space-between;padding-top:8px;margin-top:4px;border-top:1px solid var(--border)">
                <span style="font-size:11px;color:var(--text3)">${shopFilterCat === 'all' ? 'إجمالي الفاتورة' : 'إجمالي الأصناف المحددة'}</span><span
                    style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:var(--red)">${(shopFilterCat === 'all' ? inv.amount : displayTotal).toFixed(2)} د.أ</span></div>
                ${(shopFilterCat !== 'all' && (inv.items || []).length > items2show.length) ? `<button class="btn btn-sm btn-primary" style="width:100%; justify-content:center; margin-top:12px;" onclick="event.stopPropagation(); setShopFilter('all'); setTimeout(() => { const b = document.getElementById('inv-body-${inv.id}'); if(b){ b.classList.add('open'); b.parentElement.scrollIntoView({behavior:'smooth', block:'center'}); } }, 50);">عرض الفاتورة كاملة (${inv.amount.toFixed(2)} د.أ)</button>` : ''}
        </div>
    </div>`;
            }).join('') : '<div class="empty">لا مصاريف في هذه الفترة — أضف مصروف جديد</div>';

            if (filtered.length > expLimit) {
                html += `<div class="show-more-container" style="display:flex;justify-content:center;margin-top:20px;margin-bottom:10px;">
                    <button class="btn btn-primary" style="padding:10px 24px;border-radius:30px;font-size:14px;background:var(--accent);color:white;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 4px 15px rgba(124,109,250,0.25);" onclick="loadMoreExpenses()">
                        <span>📥 عرض المزيد من المصاريف</span>
                        <span style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px;font-size:11px;">${filtered.length - expLimit} إضافي</span>
                    </button>
                </div>`;
            }

            document.getElementById('exp-table').innerHTML = html;
        }

        // ═══════════════════════════════════════
        // SUBSCRIPTIONS
        // ═══════════════════════════════════════
        function addSubscription() {
            const name = document.getElementById('m-sub-name').value.trim();
            const icon = document.getElementById('m-sub-icon').value || '📦';
            const amount = parseFloat(document.getElementById('m-sub-amount').value);
            const freq = document.getElementById('m-sub-freq').value;
            const cat = document.getElementById('m-sub-cat').value;
            const start = document.getElementById('m-sub-start').value || td();
            let next = document.getElementById('m-sub-next').value || td();
            if (freq === 'monthly' && next) {
                const nextDate = new Date(next);
                nextDate.setDate(1);
                next = ymd(nextDate);
            }
            const end = document.getElementById('m-sub-end').value || '';
            const autoRenew = document.getElementById('m-sub-renew').checked;
            const note = document.getElementById('m-sub-note').value;
            if (!name || isNaN(amount) || amount <= 0) { toast('أدخل البيانات'); return; }
            state.subscriptions.push({
                id: state.nextId++, name, icon, amount, freq, cat, start, next, end, autoRenew, note
            });
            saveState(); closeModal('addSub'); renderSubs();
            renderOverview(); toast('تمت الإضافة ✓');
            ['m-sub-name', 'm-sub-icon', 'm-sub-amount', 'm-sub-start', 'm-sub-next', 'm-sub-end', 'm-sub-note']
                .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('m-sub-renew').checked = true;
        }
        function delSub(id) {
            state.deletedIds = state.deletedIds || {};
            state.deletedIds[String(id)] = true;
            state.subscriptions = state.subscriptions.filter(s => String(s.id) !== String(id)); saveState();
            renderSubs(); renderOverview(); toast('تم الحذف');
        }
        function updateFixedSubs() {
            if (!state.fixedSubs || typeof state.fixedSubs.social !== 'object') {
                state.fixedSubs = { social: { amount: 0, start: '', end: '' }, health: { amount: 0, start: '', end: '' } };
            }
            state.fixedSubs.social.amount = parseFloat(document.getElementById('m-fixed-social-amt').value) || 0;
            state.fixedSubs.social.start = document.getElementById('m-fixed-social-start').value;
            state.fixedSubs.social.end = document.getElementById('m-fixed-social-end').value;

            state.fixedSubs.health.amount = parseFloat(document.getElementById('m-fixed-health-amt').value) || 0;
            state.fixedSubs.health.start = document.getElementById('m-fixed-health-start').value;
            state.fixedSubs.health.end = document.getElementById('m-fixed-health-end').value;

            saveState(); closeModal('editFixedDeds'); renderIncome(); renderSubs(); renderOverview(); toast('تم التحديث ✓');
        }
        function renderSubs() {
            if (!state.fixedSubs || typeof state.fixedSubs.social !== 'object') {
                state.fixedSubs = { social: { amount: 0, start: td(), end: '' }, health: { amount: 0, start: td(), end: '' } };
            }
            const monthly = calcSubMonthly();
            const daily = state.subscriptions.filter(s => s.freq === 'daily').reduce((s, x) => s + x.amount, 0);
            const mOnly = state.subscriptions.filter(s => s.freq === 'monthly').reduce((s, x) => s + x.amount, 0);
            const yearly = state.subscriptions.filter(s => s.freq === 'yearly').reduce((s, x) => s + x.amount, 0);
            document.getElementById('sub-metrics').innerHTML = `
        <div class="metric m-r">
            <div class="metric-lbl">يومي (شهرياً)</div>
            <div class="metric-val">${(daily * 30).toFixed(0)} <span
                    style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div>
        </div>
        <div class="metric m-p">
            <div class="metric-lbl">شهري</div>
            <div class="metric-val">${mOnly.toFixed(0)} <span
                    style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div>
        </div>
        <div class="metric m-g">
            <div class="metric-lbl">سنوي</div>
            <div class="metric-val">${yearly.toFixed(0)} <span
                    style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div>
        </div>
        <div class="metric m-a">
            <div class="metric-lbl">إجمالي/شهر (مكافئ)</div>
            <div class="metric-val">${monthly.toFixed(0)} <span
                    style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div>
        </div>
        `;
            ['daily', 'monthly', 'yearly'].forEach(freq => {
                const list = state.subscriptions.filter(s => s.freq === freq);
                const freqLabel = { daily: 'يومي', monthly: 'شهري', yearly: 'سنوي' };
                document.getElementById('subs-' + freq).innerHTML = list.length ? list.map(s => `
        <div class="sub-item">
            <div class="sub-icon" style="background:rgba(124,109,250,0.15)">${s.icon || '📦'}</div>
            <div class="sub-info">
                <div class="sub-name">${s.name}</div>
                <div class="sub-meta">${s.cat}${s.note ? ' · ' + s.note : ''}</div>
            </div>
            <div style="text-align:left">
                <div class="sub-amt">${s.amount} د.أ</div>
                <div class="sub-next" style="font-size:13px; font-weight:600; color:var(--text); margin-top:2px;">تجديد: ${s.next}</div>
            </div>
            <div style="display:flex;gap:4px;">
                <button class="del-btn" style="color:var(--accent2);" onclick="openEditSub(${s.id})" title="تعديل">✎</button>
                <button class="del-btn" onclick="delSub(${s.id})">✕</button>
            </div>
        </div>`).join('') : `<div class="empty">لا اشتراكات ${freqLabel[freq]}ة</div>`;
            });
            renderSubTracker('sub-tracker-list', 'sub-tracker-fraction', 'sub-tracker-sub');
            renderSubCatBreakdown();
            // Init period inputs with month start/end if empty
            const fromEl = document.getElementById('sub-report-from');
            const toEl = document.getElementById('sub-report-to');
            if (fromEl && !fromEl.value) {
                const now = new Date();
                const first = new Date(now.getFullYear(), now.getMonth(), 1);
                const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                fromEl.value = ymd(first);
                toEl.value = ymd(last);
            }
            renderSubsReport();
        }
        function ymd(d) {
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${d.getFullYear()}-${m}-${day}`;
        }
        function isSubInRange(s, from, to) {
            // Sub is active in the range if start<=to and (end>=from or no end)
            const start = s.start ? new Date(s.start) : new Date(0);
            const end = s.end ? new Date(s.end) : new Date('2100-01-01');
            return start <= to && end >= from;
        }
        function renderSubCatBreakdown() {
            const el = document.getElementById('sub-cat-breakdown');
            if (!el) return;
            const byCat = {};
            (state.subscriptions || []).forEach(s => {
                const yearly = s.freq === 'daily' ? s.amount * 365 : s.freq === 'monthly' ? s.amount * 12 : s.amount;
                const c = normCat(s.cat);
                byCat[c] = (byCat[c] || 0) + yearly;
            });
            const cats = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
            const total = cats.reduce((s, c) => s + byCat[c], 0);
            if (!cats.length || total <= 0) {
                el.innerHTML = '<div class="empty">لا اشتراكات</div>';
                return;
            }
            el.innerHTML = cats.map(c => {
                const v = byCat[c];
                const pct = (v / total * 100);
                return `<div class="bbar">
                    <div class="bbar-hdr">
                        <div class="bbar-name"><div class="leg-dot" style="background:${catColor(c)}"></div>${c}</div>
                        <div class="bbar-nums">${v.toFixed(0)} د.أ <span style="color:var(--text3)">(${pct.toFixed(0)}%)</span></div>
                    </div>
                    <div class="bbar-bg"><div class="bbar-fill" style="width:${pct}%;background:${catColor(c)}"></div></div>
                </div>`;
            }).join('');
        }
        function renderSubsReport() {
            const el = document.getElementById('sub-report-result');
            if (!el) return;
            const fromVal = document.getElementById('sub-report-from').value;
            const toVal = document.getElementById('sub-report-to').value;
            if (!fromVal || !toVal) { el.innerHTML = '<div class="empty">حدد الفترة</div>'; return; }
            const from = new Date(fromVal);
            const to = new Date(toVal);
            if (from > to) { el.innerHTML = '<div class="empty">تاريخ البداية بعد النهاية</div>'; return; }
            const days = Math.round((to - from) / 86400000) + 1;
            const rows = (state.subscriptions || [])
                .filter(s => isSubInRange(s, from, to))
                .map(s => {
                    let cost = 0;
                    if (s.freq === 'daily') cost = s.amount * days;
                    else if (s.freq === 'monthly') cost = s.amount * (days / 30);
                    else if (s.freq === 'yearly') {
                        // Count renewals in range
                        let renewals = 0;
                        if (s.next) {
                            let cur = new Date(s.next);
                            while (cur < from) cur.setFullYear(cur.getFullYear() + 1);
                            while (cur <= to) { renewals++; cur.setFullYear(cur.getFullYear() + 1); }
                        }
                        cost = s.amount * renewals;
                    }
                    return { ...s, cost };
                })
                .filter(r => r.cost > 0)
                .sort((a, b) => b.cost - a.cost);
            const total = rows.reduce((s, r) => s + r.cost, 0);
            if (!rows.length) { el.innerHTML = '<div class="empty">لا اشتراكات نشطة في هذه الفترة</div>'; return; }
            const freqLbl = { daily: 'يومي', monthly: 'شهري', yearly: 'سنوي' };
            el.innerHTML = `
                <table>
                    <thead><tr><th>الاشتراك</th><th>الدورية</th><th>الفئة</th><th>التكلفة في الفترة</th></tr></thead>
                    <tbody>
                        ${rows.map(r => `<tr>
                            <td class="td-main">${r.icon || '📦'} ${r.name}</td>
                            <td>${freqLbl[r.freq] || ''}</td>
                            <td><span class="badge" style="background:${catColor(r.cat)}22;color:${catColor(r.cat)}">${r.cat || 'أخرى'}</span></td>
                            <td class="td-mono">${r.cost.toFixed(2)} د.أ</td>
                        </tr>`).join('')}
                        <tr style="font-weight:600;background:var(--surface2)">
                            <td colspan="3" style="color:var(--text)">الإجمالي (${days} يوم)</td>
                            <td class="td-mono" style="color:var(--accent2)">${total.toFixed(2)} د.أ</td>
                        </tr>
                    </tbody>
                </table>`;
        }

        // ═══════════════════════════════════════
        // EDIT SUBSCRIPTION
        // ═══════════════════════════════════════
        let editingSubId = null;
        function openEditSub(id) {
            const s = state.subscriptions.find(x => String(x.id) === String(id));
            if (!s) return;
            editingSubId = id;
            document.getElementById('e-sub-name').value = s.name;
            document.getElementById('e-sub-icon').value = s.icon || '📦';
            document.getElementById('e-sub-amount').value = s.amount;
            document.getElementById('e-sub-freq').value = s.freq;
            document.getElementById('e-sub-cat').value = s.cat || 'أخرى';
            document.getElementById('e-sub-start').value = s.start || '';
            document.getElementById('e-sub-next').value = s.next || '';
            document.getElementById('e-sub-end').value = s.end || '';
            document.getElementById('e-sub-renew').checked = s.autoRenew !== false;
            document.getElementById('e-sub-note').value = s.note || '';
            openModal('editSub');
        }
        function saveEditSub() {
            const s = state.subscriptions.find(x => String(x.id) === String(editingSubId));
            if (!s) return;
            s.name = document.getElementById('e-sub-name').value.trim();
            s.icon = document.getElementById('e-sub-icon').value || '📦';
            s.amount = parseFloat(document.getElementById('e-sub-amount').value) || 0;
            s.freq = document.getElementById('e-sub-freq').value;
            s.cat = document.getElementById('e-sub-cat').value;
            s.start = document.getElementById('e-sub-start').value;
            let next = document.getElementById('e-sub-next').value;
            if (s.freq === 'monthly' && next) {
                const nextDate = new Date(next);
                nextDate.setDate(1);
                next = ymd(nextDate);
            }
            s.next = next;
            s.end = document.getElementById('e-sub-end').value;
            s.autoRenew = document.getElementById('e-sub-renew').checked;
            s.note = document.getElementById('e-sub-note').value;
            saveState(); closeModal('editSub'); renderSubs(); renderOverview(); toast('تم تعديل الاشتراك ✓');
        }

        // ═══════════════════════════════════════
        // MAINTENANCE
        // ═══════════════════════════════════════
        const PRIO_COLORS = { urgent: 'var(--red)', high: 'var(--orange)', medium: 'var(--amber)', low: 'var(--green)' };
        const PRIO_LABELS = { urgent: 'عاجل', high: 'مهم', medium: 'متوسط', low: 'منخفض' };
        const STATUS_LABELS = { pending: 'قيد الانتظار', scheduled: 'مجدولة', done: 'منجزة' };
        function addMaintenance() {
            const desc = document.getElementById('m-maint-desc').value.trim();
            const cost = parseFloat(document.getElementById('m-maint-cost').value) || 0;
            const priority = document.getElementById('m-maint-priority').value;
            const cat = document.getElementById('m-maint-cat').value;
            const date = document.getElementById('m-maint-date').value || td();
            const status = document.getElementById('m-maint-status').value;
            const note = document.getElementById('m-maint-note').value;
            if (!desc) { toast('أدخل الوصف'); return; }
            state.maintenance.push({ id: state.nextId++, desc, cost, priority, cat, date, status, note });
            saveState(); closeModal('addMaint'); renderMaint(); renderOverview(); toast('تمت الإضافة ✓');
            ['m-maint-desc', 'm-maint-cost', 'm-maint-note'].forEach(id => document.getElementById(id).value = '');
        }
        function delMaint(id) {
            state.deletedIds = state.deletedIds || {};
            state.deletedIds[String(id)] = true;
            state.maintenance = state.maintenance.filter(m => String(m.id) !== String(id)); saveState();
            renderMaint(); renderOverview();
        }
        function doneMaint(id) {
            const m = state.maintenance.find(x => String(x.id) === String(id)); if (m) {
                m.status = 'done';
                saveState(); renderMaint(); renderOverview(); toast('تم تحديد الصيانة كمنجزة ✓');
            }
        }
        function renderMaint() {
            const totalCost = state.maintenance.filter(m => m.status !== 'done').reduce((s, m) => s + m.cost, 0);
            const pending = state.maintenance.filter(m => m.status !== 'done');
            document.getElementById('maint-metrics').innerHTML = `
        <div class="metric m-r">
            <div class="metric-lbl">عاجل / مهم</div>
            <div class="metric-val">${state.maintenance.filter(m => m.status !== 'done' && (m.priority === 'urgent' ||
                m.priority === 'high')).length}</div>
        </div>
        <div class="metric m-a">
            <div class="metric-lbl">إجمالي التكلفة المتوقعة</div>
            <div class="metric-val">${totalCost.toFixed(0)} <span
                    style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div>
        </div>
        <div class="metric m-g">
            <div class="metric-lbl">منجزة</div>
            <div class="metric-val">${state.maintenance.filter(m => m.status === 'done').length}</div>
        </div>
        <div class="metric m-p">
            <div class="metric-lbl">إجمالي البنود</div>
            <div class="metric-val">${state.maintenance.length}</div>
        </div>
        `;
            const urgent = state.maintenance.filter(m => m.status !== 'done' && (m.priority === 'urgent' || m.priority ===
                'high'));
            const scheduled = state.maintenance.filter(m => m.status !== 'done' && m.priority !== 'urgent' && m.priority !==
                'high');
            const renderList = (arr, el) => {
                document.getElementById(el).innerHTML = arr.length ? arr.map(m => `
        <div class="maint-item">
            <div class="maint-urgency" style="background:${PRIO_COLORS[m.priority]}"></div>
            <div class="maint-info">
                <div class="maint-name">${m.desc}</div>
                <div class="maint-meta">${m.cat} · ${STATUS_LABELS[m.status]}${m.note ? ' · ' + m.note : ''}</div>
            </div>
            <div style="text-align:left">
                <div class="maint-cost">${m.cost > 0 ? m.cost + ' د.أ' : '—'}</div>
                <div class="maint-date">${m.date}</div>
            </div>
            <button class="btn btn-sm btn-green" onclick="doneMaint(${m.id})" style="margin-left:4px">✓</button>
            <button class="del-btn" onclick="delMaint(${m.id})">✕</button>
        </div>`).join('') : '<div class="empty">لا بنود</div>';
            };
            renderList(urgent, 'maint-urgent');
            renderList(scheduled, 'maint-scheduled');
            const all = state.maintenance.sort((a, b) => new Date(b.date) - new Date(a.date));
            document.getElementById('maint-table').innerHTML = all.length ? `
        <table>
            <thead>
                <tr>
                    <th>الوصف</th>
                    <th>الفئة</th>
                    <th>الأولوية</th>
                    <th>الحالة</th>
                    <th>التكلفة</th>
                    <th>التاريخ</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${all.map(m => `<tr>
                    <td class="td-main">${m.desc}</td>
                    <td>${m.cat}</td>
                    <td><span style="color:${PRIO_COLORS[m.priority]};font-size:12px">${PRIO_LABELS[m.priority]}</span>
                    </td>
                    <td style="font-size:12px">${STATUS_LABELS[m.status]}</td>
                    <td class="td-mono">${m.cost > 0 ? m.cost + ' د.أ' : '—'}</td>
                    <td class="td-mono" style="font-size:11px">${m.date}</td>
                    <td><button class="del-btn" onclick="delMaint(${m.id})">✕</button></td>
                </tr>`).join('')}
            </tbody>
        </table>`: '<div class="empty">لا سجلات</div>';
        }

        // ═══════════════════════════════════════
        // LOANS
        // ═══════════════════════════════════════
        const LOAN_TYPES = { bank: 'بنكي', personal: 'شخصي', car: 'سيارة', home: 'منزل', other: 'أخرى' };
        function addLoan() {
            const name = document.getElementById('m-loan-name').value.trim();
            const total = parseFloat(document.getElementById('m-loan-total').value);
            const remaining = parseFloat(document.getElementById('m-loan-remaining').value);
            const monthly = parseFloat(document.getElementById('m-loan-monthly').value);
            const interest = parseFloat(document.getElementById('m-loan-interest').value) || 0;
            const start = document.getElementById('m-loan-start').value || td();
            const end = document.getElementById('m-loan-end').value || td();
            const type = document.getElementById('m-loan-type').value;
            if (!name || isNaN(total) || isNaN(remaining) || isNaN(monthly)) { toast('يرجى ملء الحقول المطلوبة'); return; }
            state.loans.push({ id: state.nextId++, name, total, remaining, monthly, interest, start, end, type });
            saveState(); closeModal('addLoan'); renderLoans(); renderOverview(); toast('تمت الإضافة ✓');
            ['m-loan-name', 'm-loan-total', 'm-loan-remaining', 'm-loan-monthly', 'm-loan-interest', 'm-loan-start',
                'm-loan-end'].forEach(id => document.getElementById(id).value = '');
        }
        function delLoan(id) {
            state.deletedIds = state.deletedIds || {};
            state.deletedIds[String(id)] = true;
            state.loans = state.loans.filter(l => String(l.id) !== String(id)); saveState(); renderLoans();
            renderOverview();
        }
        let editingLoanId = null;
        function openEditLoan(id) {
            const l = state.loans.find(x => String(x.id) === String(id));
            if (!l) return;
            editingLoanId = id;
            document.getElementById('e-loan-name').value = l.name;
            document.getElementById('e-loan-total').value = l.total;
            document.getElementById('e-loan-remaining').value = l.remaining;
            document.getElementById('e-loan-monthly').value = l.monthly;
            document.getElementById('e-loan-interest').value = l.interest;
            document.getElementById('e-loan-start').value = l.start;
            document.getElementById('e-loan-end').value = l.end;
            document.getElementById('e-loan-type').value = l.type;
            openModal('editLoan');
        }
        function saveEditLoan() {
            const l = state.loans.find(x => String(x.id) === String(editingLoanId));
            if (!l) return;
            const name = document.getElementById('e-loan-name').value.trim();
            const total = parseFloat(document.getElementById('e-loan-total').value);
            const remaining = parseFloat(document.getElementById('e-loan-remaining').value);
            const monthly = parseFloat(document.getElementById('e-loan-monthly').value);
            const interest = parseFloat(document.getElementById('e-loan-interest').value) || 0;
            const start = document.getElementById('e-loan-start').value || td();
            const end = document.getElementById('e-loan-end').value || td();
            const type = document.getElementById('e-loan-type').value;
            if (!name || isNaN(total) || isNaN(remaining) || isNaN(monthly)) { toast('يرجى ملء الحقول المطلوبة'); return; }
            l.name = name; l.total = total; l.remaining = remaining; l.monthly = monthly; l.interest = interest; l.start =
                start; l.end = end; l.type = type;
            saveState(); closeModal('editLoan'); renderLoans(); renderOverview(); toast('تم التعديل ✓');
        }
        function payLoan(id) {
            const l = state.loans.find(x => String(x.id) === String(id));
            if (!l) return;
            const pay = prompt('أدخل مبلغ الدفعة (د.أ):');
            const amt = parseFloat(pay);
            if (isNaN(amt) || amt <= 0) return; l.remaining = Math.max(0, l.remaining - amt); saveState(); renderLoans();
            renderOverview(); toast('تم تسجيل الدفعة ✓');
        } function renderLoans() {
            const
                totalRem = state.loans.reduce((s, l) => s + l.remaining, 0);
            const totalMonth = state.loans.reduce((s, l) => s + l.monthly, 0);
            document.getElementById('loan-metrics').innerHTML = `
            <div class="metric m-r">
                <div class="metric-lbl">إجمالي المديونية</div>
                <div class="metric-val">${totalRem.toFixed(0)} <span
                        style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div>
            </div>
            <div class="metric m-a">
                <div class="metric-lbl">الأقساط الشهرية</div>
                <div class="metric-val">${totalMonth.toFixed(0)} <span
                        style="font-size:13px;color:var(--text3);font-weight:400">د.أ</span></div>
            </div>
            <div class="metric m-p">
                <div class="metric-lbl">عدد القروض</div>
                <div class="metric-val">${state.loans.length}</div>
            </div>
            `;
            document.getElementById('loan-list').innerHTML = state.loans.length ? state.loans.map(l => {
                const paid = l.total - l.remaining;
                const pct = Math.min(paid / l.total * 100, 100);
                const mLeft = l.monthly > 0 ? Math.ceil(l.remaining / l.monthly) : 0;
                return `<div class="loan-card">
                <div class="loan-hdr">
                    <div>
                        <div class="loan-name">${l.name}</div>
                        <div style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace">
                            ${LOAN_TYPES[l.type] || l.type} · ${l.interest}% فائدة</div>
                    </div>
                    <div style="display:flex;gap:8px">
                        <button class="btn btn-sm btn-green" onclick="payLoan(${l.id})">+ دفعة</button>
                        <button class="del-btn" style="color:var(--accent2);margin-inline-end:6px"
                            onclick="openEditLoan(${l.id})" title="تعديل">✎</button>
                        <button class="del-btn" onclick="delLoan(${l.id})">✕</button>
                    </div>
                </div>
                <div class="loan-stats">
                    <div class="loan-stat">
                        <div class="loan-stat-lbl">المبلغ الأصلي</div>
                        <div class="loan-stat-val">${l.total.toLocaleString()} د.أ</div>
                    </div>
                    <div class="loan-stat">
                        <div class="loan-stat-lbl">المتبقي</div>
                        <div class="loan-stat-val" style="color:var(--red)">${l.remaining.toLocaleString()} د.أ</div>
                    </div>
                    <div class="loan-stat">
                        <div class="loan-stat-lbl">القسط الشهري</div>
                        <div class="loan-stat-val" style="color:var(--amber)">${l.monthly} د.أ</div>
                    </div>
                    <div class="loan-stat">
                        <div class="loan-stat-lbl">الأشهر المتبقية</div>
                        <div class="loan-stat-val">${mLeft}</div>
                    </div>
                </div>
                <div
                    style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px">
                    <span>تم سداد ${paid.toFixed(0)} د.أ (${pct.toFixed(1)}%)</span>
                    <span>${l.start} → ${l.end}</span>
                </div>
                <div class="progress-bg">
                    <div class="progress-fill" style="width:${pct}%;background:var(--green)"></div>
                </div>
            </div>`;
            }).join('') : '<div class="empty" style="padding:3rem">لا قروض مسجلة — أضف من الأعلى</div>';
        }

        // ═══════════════════════════════════════
        // BUDGET
        // ═══════════════════════════════════════
        function renderBudget() {
            const exps = state.expenses.filter(e => inRange(e.date));
            const byCat = {};
            exps.forEach(e => {
                (e.items || []).forEach(it => {
                    const c = normCat(it.subcat);
                    byCat[c] = (byCat[c] || 0) + (it.qty * it.price);
                });
            });
            document.getElementById('budget-form').innerHTML = state.categories.map(c => `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <div class="leg-dot" style="background:${c.color}"></div>
                <span style="flex:1;font-size:13px">${c.name}</span>
                <input class="inp" type="number" style="width:110px" placeholder="الميزانية"
                    value="${state.budgets[c.name] || ''}" oninput="updateBudget('${c.name}',this.value)" min="0" />
                <span class="td-mono"
                    style="width:70px;text-align:left;font-size:11px;color:var(--text3)">${(byCat[c.name] ||
                    0).toFixed(1)} د.أ</span>
            </div>`).join('');
            const total = exps.reduce((s, e) => s + e.amount, 0);
            const totalBudget = Object.values(state.budgets).reduce((s, v) => s + v, 0);
            const net = totalBudget - total;
            document.getElementById('budget-overview').innerHTML = `
            <div class="stmt-box" style="margin-bottom:8px">
                <div class="stmt-box-lbl">الإنفاق الفعلي</div>
                <div class="stmt-box-val metric-neg">${total.toFixed(2)} د.أ</div>
            </div>
            <div class="stmt-box" style="margin-bottom:8px">
                <div class="stmt-box-lbl">الميزانية المحددة</div>
                <div class="stmt-box-val">${totalBudget.toFixed(2)} د.أ</div>
            </div>
            <div class="stmt-box" style="margin-bottom:14px">
                <div class="stmt-box-lbl">الفائض / العجز</div>
                <div class="stmt-box-val ${net >= 0 ? 'metric-pos' : 'metric-neg'}">${net.toFixed(2)} د.أ</div>
            </div>
            ${Object.keys(state.budgets).map(cat => {
                const spent = byCat[cat] || 0; const bud = state.budgets[cat];
                const pct = Math.min(spent / bud * 100, 100);
                const over = spent > bud; const warn = pct > 75 && !over;
                const col = over ? 'var(--red)' : warn ? 'var(--amber)' : catColor(cat);
                return `<div class="bbar">
                <div class="bbar-hdr">
                    <div class="bbar-name">
                        <div class="leg-dot" style="background:${catColor(cat)}"></div>${cat}
                    </div>
                    <div class="bbar-nums ${over ? 'over' : warn ? 'warn' : ''}">${spent.toFixed(0)} / ${bud} د.أ</div>
                </div>
                <div class="bbar-bg">
                    <div class="bbar-fill" style="width:${pct}%;background:${col}"></div>
                </div>
            </div>`;
            }).join('')}`;
        }


        function updateBudget(cat, val) {
            const v = parseFloat(val); if (!isNaN(v) && v > 0) state.budgets[cat] = v;
            else delete state.budgets[cat]; saveState();
        }

        // ═══════════════════════════════════════
        // CATEGORIES
        // ═══════════════════════════════════════
        function renderCategories() {
            const byCat = {};
            state.expenses.forEach(e => {
                (e.items || []).forEach(it => {
                    byCat[it.subcat] = (byCat[it.subcat] || 0) + 1;
                });
            });
            document.getElementById('cats-grid').innerHTML = state.categories.map((c, i) => `
            <div
                style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);min-width:0">
                <div class="leg-dot" style="background:${c.color};width:10px;height:10px"></div>
                <span style="font-size:13px;flex:1">${c.name}</span>
                <span style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace">${byCat[c.name]
                || 0}</span>
                <button class="del-btn" style="color:var(--accent2)" onclick="openEditCat('${c.name}')"
                    title="تعديل">✎</button>
                ${i >= 9 ? `<button class="del-btn" onclick="delCat('${c.name}')">✕</button>` : ''}
            </div>`).join('');

            // Call the Smart Analytics Center render
            renderSmartCategoriesCenter();
        }

        function renderSmartCategoriesCenter() {
            const el = document.getElementById('smart-categories-center');
            if (!el) return;

            // 1. SUGGESTION ENGINE:
            // Scan state.expenses items for potential micro-categories
            const SUGGEST_RULES = [
                {
                    name: 'مستلزمات أطفال 👶',
                    keywords: ['حفاض', 'بامبرز', 'حليب أطفال', 'سيريلاك', 'لهاية', 'رضاعة', 'ألعاب أطفال', 'فوط أطفال'],
                    defaultColor: '#2dd4bf',
                    desc: 'تم رصد مواد رعاية أطفال مكررة في فواتيرك'
                },
                {
                    name: 'منظفات وعناية شخصية 🧼',
                    keywords: ['صابون', 'شامبو', 'كلور', 'ديتول', 'غسيل', 'منظف', 'فاين', 'محارم', 'معجون'],
                    defaultColor: '#38bdf8',
                    desc: 'تم رصد أدوات تنظيف ومواد صحية مكررة'
                },
                {
                    name: 'صيدلية وأدوية 💊',
                    keywords: ['دواء', 'علاج', 'بندول', 'مسكن', 'فيتامين', 'شراب دواء', 'بخاخ'],
                    defaultColor: '#f87171',
                    desc: 'تم رصد مشتريات طبية وصيدلانية مكررة'
                },
                {
                    name: 'وجبات سريعة 🍔',
                    keywords: ['شاورما', 'برجر', 'بيتزا', 'وجبة', 'سندويش', 'كنتاكي', 'ماكدونالدز'],
                    defaultColor: '#fb923c',
                    desc: 'تم رصد مشتريات مطاعم ووجبات سريعة مكررة'
                }
            ];

            let suggestionsHtml = '';
            SUGGEST_RULES.forEach(rule => {
                if (state.categories.some(c => c.name === rule.name || c.name.includes(rule.name.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim()))) return;

                const matchingItems = [];
                state.expenses.forEach(e => {
                    (e.items || []).forEach(it => {
                        if (!it.name || (it.subcat !== 'أخرى' && it.subcat !== 'اخرى' && it.subcat !== 'بقالة وسوبرماركت')) return;
                        const nameLower = it.name.trim().toLowerCase();
                        if (rule.keywords.some(kw => nameLower.includes(kw))) {
                            matchingItems.push(it.name);
                        }
                    });
                });

                if (matchingItems.length >= 3) {
                    const uniqueExamples = Array.from(new Set(matchingItems)).slice(0, 3);
                    suggestionsHtml += `
                        <div class="eval-item" style="background:var(--surface3); border:1px solid var(--border2); padding:12px; border-radius:var(--r); margin-bottom:10px; display:flex; flex-direction:column; gap:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight:600; color:var(--text); font-size:13px;">💡 اقتراح فئة جديدة: <span style="color:${rule.defaultColor}; font-weight:700;">${rule.name}</span></span>
                                <button class="btn btn-sm btn-green" onclick="applySmartCategorySuggestion('${rule.name}', ${JSON.stringify(rule.keywords).replace(/"/g, '&quot;')}, '${rule.defaultColor}')" style="padding:4px 8px; font-size:11px; border-radius:6px; cursor:pointer;">إنشاء وتصنيف تلقائي ⚡</button>
                            </div>
                            <div style="font-size:11.5px; color:var(--text2);">${rule.desc}. تم رصد ${matchingItems.length} مشتريات مثل: <span style="font-family:'JetBrains Mono',monospace; color:var(--text3); font-size:11px;">(${uniqueExamples.join('، ')})</span></div>
                        </div>
                    `;
                }
            });

            if (!suggestionsHtml) {
                suggestionsHtml = `<div style="font-size:11.5px; color:var(--text3); padding:10px 0; text-align:center;">🔍 لا توجد اقتراحات لتفريع فئات جديدة حالياً. هيكل الحسابات لديك متوافق مع مشترياتك!</div>`;
            }

            // 2. GROCERY BREAKDOWN:
            const currentCycle = getFinancialMonthAndYear(td());
            const curM = currentCycle.month;
            const curY = currentCycle.year;

            const curExps = state.expenses.filter(e => {
                const { month, year } = getFinancialMonthAndYear(e.date);
                return month === curM && year === curY;
            });

            const GROCERY_SUBCATS = {
                'خضار وفواكه': { color: '#4ade80', spent: 0 },
                'ألبان وأجبان': { color: '#60a5fa', spent: 0 },
                'لحوم ودواجن': { color: '#f87171', spent: 0 },
                'معلبات ومواد تموينية': { color: '#fb923c', spent: 0 },
                'حلويات وتسالي': { color: '#f472b6', spent: 0 },
                'مشروبات ومياه': { color: '#38bdf8', spent: 0 },
                'منظفات وعناية شخصية': { color: '#c084fc', spent: 0 },
                'أدوات منزلية': { color: '#94a3b8', spent: 0 }
            };

            let totalGrocery = 0;
            curExps.forEach(e => {
                (e.items || []).forEach(it => {
                    const sub = it.subcat;
                    if (GROCERY_SUBCATS[sub]) {
                        const amt = (it.qty || 1) * (it.price || 0);
                        GROCERY_SUBCATS[sub].spent += amt;
                        totalGrocery += amt;
                    }
                });
            });

            let groceryBreakdownHtml = '';
            let adviceHtml = '';

            if (totalGrocery > 0) {
                const sortedSubs = Object.keys(GROCERY_SUBCATS).sort((a, b) => GROCERY_SUBCATS[b].spent - GROCERY_SUBCATS[a].spent);
                groceryBreakdownHtml = sortedSubs.map(sub => {
                    const info = GROCERY_SUBCATS[sub];
                    if (info.spent <= 0) return '';
                    const pct = (info.spent / totalGrocery) * 100;
                    return `
                        <div class="bbar" style="margin-bottom:8px;">
                            <div class="bbar-hdr" style="font-size:11.5px;">
                                <div class="bbar-name">
                                    <div class="leg-dot" style="background:${info.color}; width:8px; height:8px;"></div>${sub}
                                </div>
                                <div class="bbar-nums" style="font-family:'JetBrains Mono',monospace;">${info.spent.toFixed(1)} د.أ (${pct.toFixed(0)}%)</div>
                            </div>
                            <div class="bbar-bg" style="height:6px; background:var(--surface3);">
                                <div class="bbar-fill" style="width:${pct}%; background:${info.color}; height:6px;"></div>
                            </div>
                        </div>
                    `;
                }).join('');

                const snacksInfo = GROCERY_SUBCATS['حلويات وتسالي'];
                const snacksPct = (snacksInfo.spent / totalGrocery) * 100;
                if (snacksPct > 15) {
                    adviceHtml += `
                        <div style="background:rgba(244,114,182,0.08); border-right:3px solid #f472b6; padding:8px 12px; border-radius:4px; font-size:11.5px; color:var(--text); margin-bottom:8px;">
                            ⚠️ **تنبيه ترشيد الاستهلاك**: مشتريات 'حلويات وتسالي 🍫' مرتفعة هذا الشهر وتشكل <strong>${snacksPct.toFixed(0)}%</strong> من إجمالي البقالة (${snacksInfo.spent.toFixed(0)} د.أ). تقليلها لـ 5% سيوفر لك حوالي <strong>${(snacksInfo.spent - (totalGrocery * 0.05)).toFixed(0)} د.أ</strong>!
                        </div>
                    `;
                }

                const cleanInfo = GROCERY_SUBCATS['منظفات وعناية شخصية'];
                const cleanPct = (cleanInfo.spent / totalGrocery) * 100;
                if (cleanPct > 20) {
                    adviceHtml += `
                        <div style="background:rgba(192,132,252,0.08); border-right:3px solid #c084fc; padding:8px 12px; border-radius:4px; font-size:11.5px; color:var(--text); margin-bottom:8px;">
                            💡 **نصيحة الشراء الذكي**: المنظفات وأدوات العناية تشكل <strong>${cleanPct.toFixed(0)}%</strong> من مشترياتك. نقترح شراء عبوات التوفير العائلية أو من تجار الجملة لتوفير ما يقارب 15% إلى 20% شهرياً!
                        </div>
                    `;
                }

                const meatInfo = GROCERY_SUBCATS['لحوم ودواجن'];
                const meatPct = (meatInfo.spent / totalGrocery) * 100;
                if (meatPct > 35) {
                    adviceHtml += `
                        <div style="background:rgba(248,113,113,0.08); border-right:3px solid #f87171; padding:8px 12px; border-radius:4px; font-size:11.5px; color:var(--text); margin-bottom:8px;">
                            🥩 **توصية ميزانية**: تشكل اللحوم والدواجن <strong>${meatPct.toFixed(0)}%</strong> من فاتورة البقالة. نقترح تعيين ميزانية فرعية شهرية لها بقيمة <strong>${Math.max(50, Math.round(meatInfo.spent * 0.8))} د.أ</strong> للتحكم الأفضل في المصاريف الغذائية.
                        </div>
                    `;
                }

                if (!adviceHtml) {
                    adviceHtml = `<div style="font-size:11.5px; color:var(--green); font-weight:600; padding:4px 0;">🎉 توزيع استهلاك البقالة متوازن ومثالي جداً هذا الشهر! لا توجد انحرافات إنفاقية.</div>`;
                }
            } else {
                groceryBreakdownHtml = `<div class="empty" style="padding:15px; font-size:11px;">لا توجد مشتريات بقالة مفصلة في هذا الشهر المالي حتى الآن.</div>`;
                adviceHtml = `<div style="font-size:11.5px; color:var(--text3);">سيظهر التحليل فور تسجيل الفواتير والمواد التفصيلية.</div>`;
            }

            // 3. AI BRAIN STATUS:
            const exactCount = Object.keys(exactMatchTrained || {}).length;
            const wordCount = Object.keys(wordTrainedFreq || {}).length;
            const learnedPercent = Math.min(100, Math.round((exactCount + wordCount) * 1.5));
            let brainLevel = 'مبتدئ';
            let brainIcon = '👶';
            if (learnedPercent >= 80) { brainLevel = 'عبقري مالي خارق'; brainIcon = '🧠⚡'; }
            else if (learnedPercent >= 50) { brainLevel = 'محلل مالي متقدم'; brainIcon = '📊🧠'; }
            else if (learnedPercent >= 20) { brainLevel = 'متعلم نشط'; brainIcon = '📖🧠'; }

            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                    <div>
                        <div style="font-size:15px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:6px;">
                            <span>🧠</span> مركز التحليل الذكي وتطوير التصنيفات
                        </div>
                        <div style="font-size:11px; color:var(--text3); margin-top:2px;">تحليل فواتيرك التاريخية وتطوير الفئات فرعياً بشكل تلقائي ومستمر</div>
                    </div>
                    <span class="badge" style="background:rgba(124, 109, 250, 0.15); color:var(--accent2); font-weight:600; font-size:10.5px; padding:3px 8px; border-radius:20px;">
                        ${brainIcon} مستوى ذكاء المحرك: ${brainLevel} (${learnedPercent}%)
                    </span>
                </div>

                <div class="grid-2" style="gap:16px;">
                    <div style="display:flex; flex-direction:column; gap:16px;">
                        <div>
                            <div style="font-size:13px; font-weight:600; color:var(--accent2); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                                <span>💡</span> مقترحات الفئات الفرعية الموصى بها
                            </div>
                            <div id="smart-suggestions-list">${suggestionsHtml}</div>
                        </div>

                        <div style="border-top:1px solid var(--border); padding-top:12px;">
                            <div style="font-size:13px; font-weight:600; color:var(--accent2); margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
                                <span>🛒</span> تفاصيل استهلاك البقالة والسوبرماركت
                                <span style="font-size:10.5px; color:var(--text3); font-weight:400; font-family:'JetBrains Mono',monospace;">إجمالي البقالة: ${totalGrocery.toFixed(1)} د.أ</span>
                            </div>
                            <div id="grocery-breakdown-container">${groceryBreakdownHtml}</div>
                            <div style="margin-top:14px; font-size:12px; display:flex; flex-direction:column; gap:6px;">
                                <div style="font-weight:600; color:var(--text2); font-size:11px;">💡 نصائح ترشيد وتوفير السوبرماركت:</div>
                                <div id="grocery-advice-container">${adviceHtml}</div>
                            </div>
                        </div>
                    </div>

                    <div style="background:var(--surface2); border:1px solid var(--border); padding:14px; border-radius:var(--r2); display:flex; flex-direction:column; gap:12px;">
                        <div style="font-size:13px; font-weight:600; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:8px; display:flex; align-items:center; gap:6px;">
                            <span>🔮</span> اختبار وتدريب نموذج الذكاء الاصطناعي (AI Brain)
                        </div>
                        
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <label style="font-size:11px; color:var(--text2); font-weight:600;">🔍 جرب اختبار المحرك الذكي (Live Testing):</label>
                            <div style="display:flex; gap:8px;">
                                <input class="inp" id="test-item-input" placeholder="اكتب اسم سلعة (مثال: دجاج نات، لبن المراعي)" oninput="predictItemSubcatTest()" style="flex:1; font-size:12px;" />
                            </div>
                            <div id="test-prediction-result" style="font-size:11.5px; color:var(--text3); padding:8px 10px; background:var(--surface3); border-radius:var(--r); min-height:36px; display:flex; align-items:center;">
                                💡 ابدأ الكتابة لرؤية توقع المحرك الذكي وفئة الصنف فوراً...
                            </div>
                        </div>

                        <div class="divider" style="margin:4px 0;"></div>

                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <label style="font-size:11px; color:var(--text2); font-weight:600;">🧠 تدريب مخصص وإضافة قاعدة ذكية (Manual Training):</label>
                            <div class="field" style="margin-bottom:6px;">
                                <input class="inp" id="train-keyword-input" placeholder="اسم السلعة أو الكلمة المفتاحية (مثال: المنظف السحري)" style="font-size:12px;" />
                            </div>
                            <div style="display:flex; gap:8px;">
                                <select class="inp" id="train-subcat-select" style="flex:1; font-size:12px;"></select>
                                <button class="btn btn-primary" onclick="trainManualKeywordRule()" style="font-size:11px; padding:6px 12px; cursor:pointer;">تدريب المحرك 🧠</button>
                            </div>
                        </div>

                        <div style="font-size:10px; color:var(--text3); line-height:1.4; margin-top:6px; background:rgba(124, 109, 250, 0.05); padding:8px; border-radius:6px; border:1px dashed rgba(124, 109, 250, 0.2);">
                            ℹ️ <strong>كيف يعمل؟</strong> يتعلم المحرك تلقائياً من الفواتير التاريخية وتصنيفك للسلع. عندما تضيف فاتورة جديدة بالمستقبل، سيتعرف المحرك الذكي تلقائياً على كل بند ويصنفه فوراً دون أي تدخل منك!
                        </div>
                    </div>
                </div>
            `;

            const selectEl = document.getElementById('train-subcat-select');
            if (selectEl) {
                selectEl.innerHTML = `
                    <option value="" disabled selected>اختر الصنف المناسب...</option>
                    ${Object.keys(SUB_TO_MAIN_CAT).map(sub => `<option value="${sub}">${sub} (${SUB_TO_MAIN_CAT[sub]})</option>`).join('')}
                `;
            }
        }

        function applySmartCategorySuggestion(catName, itemKeywords, defaultColor) {
            const cleanName = catName.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
            let catObj = state.categories.find(c => c.name === catName || c.name === cleanName);
            if (!catObj) {
                state.categories.push({ name: catName, color: defaultColor });
            }

            let remappedCount = 0;
            state.expenses.forEach(e => {
                (e.items || []).forEach(it => {
                    if (!it.name || (it.subcat !== 'أخرى' && it.subcat !== 'اخرى' && it.subcat !== 'بقالة وسوبرماركت')) return;
                    const nameLower = it.name.trim().toLowerCase();
                    if (itemKeywords.some(kw => nameLower.includes(kw))) {
                        it.subcat = catName;
                        remappedCount++;
                    }
                });
            });

            saveState();
            populateCatSelects();
            renderCategories();
            toast(`🎉 تم إنشاء فئة "${catName}" وتصنيف ${remappedCount} معاملات إليها بنجاح!`);
        }

        function predictItemSubcatTest() {
            const input = document.getElementById('test-item-input');
            const resultEl = document.getElementById('test-prediction-result');
            if (!input || !resultEl) return;
            const name = input.value.trim().toLowerCase();
            if (!name) {
                resultEl.innerHTML = `💡 ابدأ الكتابة لرؤية توقع المحرك الذكي وفئة الصنف فوراً...`;
                return;
            }

            if (exactMatchTrained[name]) {
                const sub = exactMatchTrained[name];
                const main = SUB_TO_MAIN_CAT[sub] || 'أخرى';
                resultEl.innerHTML = `🔮 الفئة المتوقعة: <strong style="color:var(--green); font-size:12.5px;">${sub}</strong> <span style="color:var(--text3); font-size:11px;">(${main})</span> <span style="color:var(--accent2); margin-right:8px; font-size:10.5px;">(مطابقة دقيقة 100% 🎯)</span>`;
                return;
            }

            const nameWords = name.split(/[\s\-_,\.\/\(\)]+/).filter(Boolean);
            const trainedWords = nameWords.filter(w => w.length > 2);
            let bestSubcat = null;
            let highestFreq = 0;

            for (const w of trainedWords) {
                if (wordTrainedFreq[w]) {
                    Object.keys(wordTrainedFreq[w]).forEach(sub => {
                        const freq = wordTrainedFreq[w][sub];
                        if (freq > highestFreq) {
                            highestFreq = freq;
                            bestSubcat = sub;
                        }
                    });
                }
            }

            if (bestSubcat && highestFreq >= 1) {
                const main = SUB_TO_MAIN_CAT[bestSubcat] || 'أخرى';
                resultEl.innerHTML = `🔮 الفئة المتوقعة: <strong style="color:var(--green); font-size:12.5px;">${bestSubcat}</strong> <span style="color:var(--text3); font-size:11px;">(${main})</span> <span style="color:var(--accent2); margin-right:8px; font-size:10.5px;">(ثقة عالية بناءً على تكرار الكلمات 🧠)</span>`;
                return;
            }

            const isMatch = (kw) => {
                if (kw.length <= 4 || kw === 'زين' || kw === 'ماء' || kw === 'رز' || kw === 'ملح' || kw === 'كول') {
                    return nameWords.includes(kw);
                }
                return name.includes(kw);
            };

            for (const mapping of ITEM_AUTO_MAP) {
                for (const kw of mapping.keywords) {
                    if (isMatch(kw)) {
                        const sub = mapping.subcat;
                        const main = SUB_TO_MAIN_CAT[sub] || 'أخرى';
                        resultEl.innerHTML = `🔮 الفئة المتوقعة: <strong style="color:var(--green); font-size:12.5px;">${sub}</strong> <span style="color:var(--text3); font-size:11px;">(${main})</span> <span style="color:var(--text3); margin-right:8px; font-size:10.5px;">(مطابقة كلمات مفتاحية 🔍)</span>`;
                        return;
                    }
                }
            }

            resultEl.innerHTML = `❓ الصنف المتوقع: <strong style="color:var(--text3); font-size:12px;">أخرى</strong> <span style="color:var(--text3); font-size:10.5px;">(لم يتم العثور على نمط مطابق، سيتم استخدام التصنيف العام)</span>`;
        }

        function trainManualKeywordRule() {
            const keywordEl = document.getElementById('train-keyword-input');
            const subcatEl = document.getElementById('train-subcat-select');
            if (!keywordEl || !subcatEl) return;

            const kw = keywordEl.value.trim().toLowerCase();
            const sub = subcatEl.value;

            if (!kw || !sub) {
                toast('⚠️ يرجى كتابة الكلمة المفتاحية واختيار الفئة الفرعية أولاً!');
                return;
            }

            state.expenses.push({
                id: state.nextId++,
                desc: '🧠 تدريب تلقائي للذكاء الاصطناعي',
                amount: 0,
                date: td(),
                payment: 'نقدي',
                note: 'بند تم تعليمه يدوياً لمحرك الفرز التلقائي',
                items: [{ name: kw, qty: 1, price: 0, subcat: sub }]
            });

            saveState();
            trainModel();
            renderCategories();

            keywordEl.value = '';
            subcatEl.value = '';
            toast(`🧠 تم تدريب المحرك الذكي بنجاح! سيتعرف على "${kw}" كـ "${sub}" في أي فواتير قادمة!`);
        }
        function addCategory() {
            const name = document.getElementById('new-cat-name').value.trim();
            const color = document.getElementById('new-cat-color').value;
            if (!name) { toast('أدخل اسم الفئة'); return; }
            if (state.categories.find(c => c.name === name)) { toast('الفئة موجودة'); return; }
            state.categories.push({ name, color });
            saveState(); populateCatSelects(); renderCategories(); toast('تمت الإضافة ✓');
            document.getElementById('new-cat-name').value = '';
        }
        function delCat(name) {
            if (state.expenses.some(e => (e.items || []).some(it => it.subcat === name))) { toast('لا يمكن حذف فئة بها مصاريف'); return; }
            state.categories = state.categories.filter(c => c.name !== name);
            delete state.budgets[name];
            saveState(); populateCatSelects(); renderCategories();
        }

        let editingCatName = null;
        function openEditCat(name) {
            const c = state.categories.find(x => x.name === name);
            if (!c) return;
            editingCatName = name;
            document.getElementById('e-cat-name').value = c.name;
            document.getElementById('e-cat-color').value = c.color;
            openModal('editCat');
        }

        function saveEditCat() {
            const c = state.categories.find(x => x.name === editingCatName);
            if (!c) return;
            const newName = document.getElementById('e-cat-name').value.trim();
            const newColor = document.getElementById('e-cat-color').value;
            if (!newName) { toast('أدخل اسم الفئة'); return; }

            if (newName !== editingCatName) {
                if (state.categories.find(x => x.name === newName)) { toast('الاسم موجود مسبقاً'); return; }
                state.expenses.forEach(e => {
                    (e.items || []).forEach(it => { if (it.subcat === editingCatName) it.subcat = newName; });
                });
                if (state.subscriptions) state.subscriptions.forEach(s => {
                    if (s.cat === editingCatName) s.cat = newName;
                });
                if (state.maintenance) state.maintenance.forEach(m => { if (m.cat === editingCatName) m.cat = newName; });
                if (state.budgets && state.budgets[editingCatName] !== undefined) {
                    state.budgets[newName] = state.budgets[editingCatName];
                    delete state.budgets[editingCatName];
                }
            }
            c.name = newName;
            c.color = newColor;

            saveState();
            typeof populateCatSelects === 'function' && populateCatSelects();
            typeof renderCategories === 'function' && renderCategories();
            typeof renderBudget === 'function' && renderBudget();
            typeof renderExpTable === 'function' && renderExpTable();
            typeof renderSubs === 'function' && renderSubs();
            typeof renderMaint === 'function' && renderMaint();
            typeof renderOverview === 'function' && renderOverview();

            closeModal('editCat');
            toast('تم التعديل ✓');
        }

        // ═══════════════════════════════════════
        // EXPORT
        // ═══════════════════════════════════════
        function getExpData() {
            const p = document.getElementById('exp-period-sel')?.value || 'all';
            const cat = document.getElementById('exp-cat-sel')?.value || 'all';
            return state.expenses.filter(e => {
                const [y, m] = e.date.split('-');
                if (p === 'month' && (parseInt(m) - 1 !== state.periodMonth || parseInt(y) !== state.periodYear)) return false;
                if (p === 'year' && parseInt(y) !== state.periodYear) return false;
                if (cat !== 'all' && !(e.items || []).some(it => it.subcat === cat)) return false;
                return true;
            });
        }
        function renderExport() {
            populateCatSelects();
            const data = getExpData();
            const el = document.getElementById('exp-stats');
            if (el) el.textContent = `${data.length} معاملة — إجمالي: ${data.reduce((s, e) => s + e.amount,
                0).toFixed(2)} د.أ`;
        }
        document.addEventListener('change', e => {
            if (['exp-period-sel', 'exp-cat-sel'].includes(e.target.id))
                renderExport();
        });
        function dl(content, filename, type) {
            const a = document.createElement('a'); a.href =
                URL.createObjectURL(new Blob([content], { type })); a.download = filename; a.click();
        }
        function exportCSV() {
            const rows = [['التاريخ', 'الوصف', 'الفئة', 'المبلغ'], ...getExpData().map(e => [e.date, e.desc, (e.items || [])[0]?.subcat || 'أخرى',
            e.amount])];
            dl('\uFEFF' + rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n'), 'مصاريف.csv',
                'text/csv;charset=utf-8');
            toast('تم تصدير CSV ✓');
        }
        function exportJSON() {
            dl(JSON.stringify({ ...state, exportDate: new Date().toISOString() }, null, 2), 'مصاريفي-backup.json',
                'application/json');
            toast('تم تصدير JSON ✓');
        }
        function exportHTML() {
            const data = getExpData(); const total = data.reduce((s, e) => s + e.amount, 0);
            const byCat = {}; data.forEach(e => { (e.items || []).forEach(it => { byCat[it.subcat] = (byCat[it.subcat] || 0) + (it.qty * it.price); }) });
            const inc = monthlyIncome();
            const html = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">

            <head>
                <meta charset="UTF-8">
                <title>تقرير المصاريف</title>
                
            </head>

            <body>
                <h1>تقرير المصاريف — ${new Date().toLocaleDateString('ar')}</h1>
                <div class="grid">
                    <div class="box">
                        <div class="box-lbl">إجمالي الدخل/شهر</div>
                        <div class="box-val">${inc.total.toFixed(2)} د.أ</div>
                    </div>
                    <div class="box">
                        <div class="box-lbl">إجمالي المصاريف</div>
                        <div class="box-val">${total.toFixed(2)} د.أ</div>
                    </div>
                    <div class="box">
                        <div class="box-lbl">الصافي</div>
                        <div class="box-val">${(inc.total - total).toFixed(2)} د.أ</div>
                    </div>
                </div>
                <h2>توزيع حسب الفئة</h2>
                <table>
                    <thead>
                        <tr>
                            <th>الفئة</th>
                            <th>المبلغ</th>
                            <th>النسبة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<tr>
                            <td>${c}</td>
                            <td>${v.toFixed(2)} د.أ</td>
                            <td>${(v / total * 100).toFixed(1)}%</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                <h2>المعاملات التفصيلية</h2>
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>الوصف</th>
                            <th>الفئة</th>
                            <th>المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => `<tr>
                            <td>${e.date}</td>
                            <td>${e.desc}</td>
                            <td>${(e.items || [])[0]?.subcat || 'أخرى'}</td>
                            <td>${e.amount.toFixed(2)} د.أ</td>
                        </tr>`).join('')}
                        <tr style="font-weight:700">
                            <td colspan="3">الإجمالي</td>
                            <td>${total.toFixed(2)} د.أ</td>
                        </tr>
                    </tbody>
                </table>
            </body>

            </html>`;
            dl(html, 'تقرير-المصاريف.html', 'text/html;charset=utf-8'); toast('تم تصدير التقرير ✓');
        }
        function handleImport(event) {
            const file = event.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.expenses) state.expenses = [...state.expenses, ...data.expenses.filter(ne =>
                        !state.expenses.find(oe => oe.id === ne.id))];
                    if (data.categories) data.categories.forEach(c => {
                        if (!state.categories.find(ec => ec.name === c.name))
                            state.categories.push(c);
                    });
                    if (data.budgets) Object.assign(state.budgets, data.budgets);
                    if (data.incomeSources) state.incomeSources = [...state.incomeSources, ...(data.incomeSources ||
                        []).filter(n => !state.incomeSources.find(o => o.id === n.id))];
                    if (data.freelanceLog) state.freelanceLog = [...state.freelanceLog, ...(data.freelanceLog || []).filter(n =>
                        !state.freelanceLog.find(o => o.id === n.id))];
                    if (data.subscriptions) state.subscriptions = [...state.subscriptions, ...(data.subscriptions ||
                        []).filter(n => !state.subscriptions.find(o => o.id === n.id))];
                    if (data.loans) state.loans = [...state.loans, ...(data.loans || []).filter(n => !state.loans.find(o => o.id
                        === n.id))];
                    if (data.maintenance) state.maintenance = [...state.maintenance, ...(data.maintenance || []).filter(n =>
                        !state.maintenance.find(o => o.id === n.id))];
                    if (data.incomeDeductions) state.incomeDeductions = [...(state.incomeDeductions || []),
                    ...(data.incomeDeductions || []).filter(n => !(state.incomeDeductions || []).find(o => o.id === n.id))];
                    saveState(); populateCatSelects(); renderOverview(); toast('تم الاستيراد بنجاح ✓');
                } catch { toast('خطأ في قراءة الملف'); }
            };
            reader.readAsText(file);
        }

        async function forceRESTSync() {
            toast('🔄 جاري الاتصال المباشر بالسحابة...');
            try {
                const user = firebase.auth().currentUser;
                if (!user) throw new Error('غير مصرح لك: يرجى تسجيل الدخول أولاً');
                const token = await user.getIdToken();

                // REST GET request bypasses ISP blocks on WebSockets completely!
                const res = await fetch(`https://myexpenses-3b6f5-default-rtdb.firebaseio.com/state.json?auth=${token}`);
                if (!res.ok) throw new Error('فشل جلب البيانات من السيرفر');
                const serverData = await res.json();

                if (serverData) {
                    // Decode budgets key if needed
                    if (serverData.budgets) {
                        serverData.budgets = decodeBudgetsFromFirebase(serverData.budgets);
                    }

                    // Smart merge incoming server data with current local data
                    window.processLoadedState(serverData);

                    // Update and save state to trigger immediate screen render and server PUT push
                    state.lastUpdated = Date.now();
                    const firebaseState = { ...state, budgets: encodeBudgetsForFirebase(state.budgets) };

                    // REST PUT request uploads the merged state safely over HTTPS REST
                    const putRes = await fetch(`https://myexpenses-3b6f5-default-rtdb.firebaseio.com/state.json?auth=${token}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(firebaseState)
                    });

                    if (!putRes.ok) throw new Error('فشل رفع البيانات المدمجة للسيرفر');

                    localStorage.setItem('mwsarify_v3', JSON.stringify(state));
                    renderCurrentPage();
                    toast('✅ تمت المزامنة السحابية المدمجة بنجاح!');
                } else {
                    toast('⚠️ السيرفر فارغ، تم رفع البيانات المحلية الحالية كنسخة أساسية');
                    saveState();
                }
            } catch (e) {
                console.error(e);
                toast('⚠️ فشلت المزامنة المباشرة: ' + e.message);
            }
        }

        function restoreLocalBackup() {
            const backupStr = localStorage.getItem('mwsarify_v3_backup');
            if (!backupStr) {
                toast('⚠️ لا توجد نسخة احتياطية سابقة محفوظة على متصفح هذا الهاتف حالياً');
                return;
            }
            try {
                const data = JSON.parse(backupStr);
                let mergedCount = 0;

                // Helper to merge arrays without duplicate IDs
                const mergeArray = (localArr, backupArr) => {
                    const existingIds = new Set(localArr.map(item => item.id));
                    let added = 0;
                    backupArr.forEach(item => {
                        if (item && item.id !== undefined && !existingIds.has(item.id)) {
                            localArr.push(item);
                            added++;
                        }
                    });
                    return added;
                };

                if (data.expenses) mergedCount += mergeArray(state.expenses, Object.values(data.expenses));
                if (data.freelanceLog) mergedCount += mergeArray(state.freelanceLog, Object.values(data.freelanceLog));
                if (data.maintenance) mergedCount += mergeArray(state.maintenance, Object.values(data.maintenance));
                if (data.loans) mergedCount += mergeArray(state.loans, Object.values(data.loans));
                if (data.subscriptions) mergedCount += mergeArray(state.subscriptions, Object.values(data.subscriptions));
                if (data.incomeSources) mergeArray(state.incomeSources, Object.values(data.incomeSources));

                if (mergedCount > 0) {
                    saveState();
                    renderOverview();
                    toast(`✅ تم بنجاح استعادة ودمج ${mergedCount} معاملات مفقودة!`);
                } else {
                    toast('ℹ️ جميع البيانات الموجودة في النسخة الاحتياطية متوفرة بالفعل بحسابك');
                }
            } catch (e) {
                toast('⚠️ خطأ في قراءة النسخة الاحتياطية المحلية');
            }
        }

        // ═══════════════════════════════════════
        // MODALS + TOAST
        // ═══════════════════════════════════════
        function openModal(name) {
            if (name === 'addExpense') {
                document.getElementById('m-exp-date').value = td();
                editingExpId = null;
                document.getElementById('m-exp-desc').value = '';
                document.getElementById('m-exp-note').value = '';
                document.getElementById('inv-items-container').innerHTML = '';
                document.getElementById('inv-total-preview').textContent = '0.00 د.أ';
                addInvItemRow();
                document.querySelector('#modal-addExpense .modal-title').textContent = 'إضافة مصروف تفصيلي';
            }
            if (name === 'addIncome') { document.getElementById('m-inc-start').value = td(); }
            if (name === 'addSub') { document.getElementById('m-sub-next').value = td(); }
            if (name === 'addMaint') { document.getElementById('m-maint-date').value = td(); }
            if (name === 'addLoan') { document.getElementById('m-loan-start').value = td(); }
            document.getElementById('modal-' + name).classList.add('open');
        }
        function closeModal(name) { document.getElementById('modal-' + name).classList.remove('open'); }
        document.querySelectorAll('.modal-ov').forEach(mo => mo.addEventListener('click', e => {
            if (e.target ===
                mo) mo.classList.remove('open');
        }));
        let toastT;
        function toast(msg) {
            clearTimeout(toastT);
            document.getElementById('toast-msg').textContent = msg;
            document.getElementById('toast').classList.add('show');
            toastT = setTimeout(() => document.getElementById('toast').classList.remove('show'), 2800);
        }

        function updateDatalists() {
            const exps = [...new Set(state.expenses.map(e => e.desc))];
            const listExp = exps.map(x => '<option value="' + x + '">').join('');
            if (document.getElementById('list-exp-desc')) document.getElementById('list-exp-desc').innerHTML =
                listExp;
            if (document.getElementById('list-m-exp-desc')) document.getElementById('list-m-exp-desc').innerHTML =
                listExp;

            const fls = [...new Set(state.freelanceLog.map(f => f.desc))];
            if (document.getElementById('list-fl-desc')) document.getElementById('list-fl-desc').innerHTML =
                fls.map(x => '<option value="' + x + '">').join('');

            const incs = [...new Set(state.incomeSources.map(i => i.name))];
            if (document.getElementById('list-m-inc-name')) document.getElementById('list-m-inc-name').innerHTML =
                incs.map(x => '<option value="' + x + '">').join('');

            const subs = [...new Set(state.subscriptions.map(s => s.name))];
            if (document.getElementById('list-m-sub-name')) document.getElementById('list-m-sub-name').innerHTML =
                subs.map(x => '<option value="' + x + '">').join('');

            const maints = [...new Set(state.maintenance.map(m => m.desc))];
            if (document.getElementById('list-m-maint-desc')) document.getElementById('list-m-maint-desc').innerHTML
                = maints.map(x => '<option value="' + x + '">').join('');

            const loans = [...new Set(state.loans.map(l => l.name))];
            if (document.getElementById('list-m-loan-name')) document.getElementById('list-m-loan-name').innerHTML =
                loans.map(x => '<option value="' + x + '">').join('');
        }

        // ═══════════════════════════════════════
        // THEME
        // ═══════════════════════════════════════
        function applyTheme(theme) {
            if (theme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
                const ic = document.getElementById('themeToggleIcon');
                const lb = document.getElementById('themeToggleLbl');
                if (ic) ic.textContent = '🌙';
                if (lb) lb.textContent = 'الوضع الليلي';
            } else {
                document.documentElement.removeAttribute('data-theme');
                const ic = document.getElementById('themeToggleIcon');
                const lb = document.getElementById('themeToggleLbl');
                if (ic) ic.textContent = '☀️';
                if (lb) lb.textContent = 'الوضع النهاري';
            }
        }
        function toggleTheme() {
            const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            const next = cur === 'light' ? 'dark' : 'light';
            try { localStorage.setItem('theme', next); } catch (e) { }
            applyTheme(next);
        }
        (function initTheme() {
            let saved = 'dark';
            try { saved = localStorage.getItem('theme') || 'dark'; } catch (e) { }
            applyTheme(saved);
        })();

        // ═══════════════════════════════════════
        // NOTIFICATIONS
        // ═══════════════════════════════════════
        function notifSupported() { return 'Notification' in window; }
        function updateNotifBtn() {
            const ic = document.getElementById('notifIcon');
            const lb = document.getElementById('notifLbl');
            if (!ic || !lb) return;
            if (!notifSupported()) { ic.textContent = '🔕'; lb.textContent = 'غير مدعوم'; return; }
            if (Notification.permission === 'granted') { ic.textContent = '🔔'; lb.textContent = 'التنبيهات مفعّلة'; }
            else if (Notification.permission === 'denied') { ic.textContent = '🔕'; lb.textContent = 'التنبيهات محظورة'; }
            else { ic.textContent = '🔔'; lb.textContent = 'تفعيل التنبيهات'; }
        }
        async function toggleNotifications() {
            if (!notifSupported()) { toast('المتصفح لا يدعم التنبيهات'); return; }
            if (Notification.permission === 'granted') {
                toast('التنبيهات مفعّلة بالفعل ✓');
                checkAllAlerts(true);
                return;
            }
            if (Notification.permission === 'denied') {
                toast('التنبيهات محظورة — فعّلها من إعدادات المتصفح');
                return;
            }
            const result = await Notification.requestPermission();
            updateNotifBtn();
            if (result === 'granted') {
                toast('تم تفعيل التنبيهات ✓');
                // Show a confirmation notification
                try {
                    new Notification('مصاريفي', {
                        body: 'تم تفعيل التنبيهات الذكية. ستصلك إشعارات للميزانية والديون والاشتراكات.',
                        icon: undefined,
                        tag: 'notif-enabled'
                    });
                } catch (e) { }
                checkAllAlerts(true);
            } else {
                toast('لم يتم منح الإذن');
            }
        }
        function showSystemNotification(title, body, tag) {
            if (notifSupported() && Notification.permission === 'granted') {
                try {
                    new Notification(title, { body, tag });
                    return;
                } catch (e) { }
            }
            // Fallback to in-app toast
            toast(`${title} — ${body}`);
        }

        // Returns array of trigger days when alerts should fire.
        const ALERT_DAYS = [7, 5, 3, 1, 0];
        const LOAN_ALERT_DAYS = [3, 1, 0];

        function checkAllAlerts(force) {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const todayKey = ymd(today);
            const storageKey = 'sysAlerts_' + todayKey;
            let shown = {};
            try { shown = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) { }

            // Clean up old day keys (>2 days back)
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('sysAlerts_') && k !== storageKey) {
                        const dk = k.replace('sysAlerts_', '');
                        const dDate = new Date(dk);
                        if (!isNaN(dDate) && (today - dDate) > 2 * 86400000) {
                            localStorage.removeItem(k); i--;
                        }
                    }
                }
            } catch (e) { }

            // 1. SUBSCRIPTIONS
            (state.subscriptions || []).filter(s => s.next && isSubActive(s)).forEach(s => {
                const next = new Date(s.next); next.setHours(0, 0, 0, 0);
                const days = Math.round((next - today) / 86400000);
                if (!ALERT_DAYS.includes(days) && days >= 0) return;
                const overdue = days < 0;
                const triggerKey = `sub_${s.id}_${overdue ? 'over' : days}`;
                if (shown[triggerKey] && !force) return;

                const dayLbl = overdue ? `متأخر ${Math.abs(days)} يوم` : days === 0 ? 'اليوم' : days === 1 ? 'غداً' : `بعد ${days} أيام`;
                showSystemNotification(`🔔 تذكير: ${s.name}`, `يتجدد ${dayLbl} — ${s.amount.toFixed(2)} د.أ`, triggerKey);
                shown[triggerKey] = Date.now();
            });

            // 2. LOANS
            (state.loans || []).filter(l => l.remaining > 0).forEach(l => {
                if (!l.start) return;
                const startD = new Date(l.start);
                let nextDue = new Date(today.getFullYear(), today.getMonth(), startD.getDate());
                nextDue.setHours(0, 0, 0, 0);
                if (nextDue < today) nextDue.setMonth(nextDue.getMonth() + 1); // move to next month if passed

                const days = Math.round((nextDue - today) / 86400000);
                if (!LOAN_ALERT_DAYS.includes(days)) return; // Only warn on 3, 1, 0 days

                const triggerKey = `loan_${l.id}_${days}`;
                if (shown[triggerKey] && !force) return;

                const dayLbl = days === 0 ? 'اليوم' : days === 1 ? 'غداً' : `بعد ${days} أيام`;
                showSystemNotification(`💳 قسط القرض: ${l.name}`, `يستحق الدفع ${dayLbl} بقيمة ${l.monthly.toFixed(2)} د.أ`, triggerKey);
                shown[triggerKey] = Date.now();
            });

            // 3. BUDGET LIMITS
            if (state.budgets) {
                const catSpent = {};
                (state.expenses || []).forEach(e => {
                    const ed = new Date(e.date);
                    if (ed.getMonth() === today.getMonth() && ed.getFullYear() === today.getFullYear()) {
                        catSpent[e.category] = (catSpent[e.category] || 0) + e.amount;
                    }
                });

                Object.keys(state.budgets).forEach(cat => {
                    const limit = state.budgets[cat];
                    if (limit <= 0) return;
                    const spent = catSpent[cat] || 0;
                    const pct = (spent / limit) * 100;

                    if (pct >= 100) {
                        const triggerKey = `budg_${cat}_100`;
                        if (!shown[triggerKey]) {
                            showSystemNotification(`⚠️ تجاوز الميزانية`, `لقد تجاوزت ميزانية (${cat}) المحددة بـ ${limit} د.أ`, triggerKey);
                            shown[triggerKey] = Date.now();
                        }
                    } else if (pct >= 90) {
                        const triggerKey = `budg_${cat}_90`;
                        if (!shown[triggerKey]) {
                            showSystemNotification(`⚠️ اقتراب من الحد`, `اقتربت مصاريف (${cat}) من الحد الأقصى (${pct.toFixed(0)}%)`, triggerKey);
                            shown[triggerKey] = Date.now();
                        }
                    }
                });
            }

            try { localStorage.setItem(storageKey, JSON.stringify(shown)); } catch (e) { }
        }

        // ═══════════════════════════════════════
        // MONTHLY EVALUATION
        // ═══════════════════════════════════════
        function renderMonthlyEvaluation() {
            const el = document.getElementById('monthly-evaluation');
            const periodEl = document.getElementById('eval-period');
            if (!el) return;

            // Evaluate the CURRENT financial month based on cycleStartDay
            const currentCycle = getFinancialMonthAndYear(td());
            const curM = currentCycle.month;
            const curY = currentCycle.year;

            let prevM = curM - 1;
            let prevY = curY;
            if (prevM < 0) {
                prevM = 11;
                prevY = curY - 1;
            }

            const startDay = state.financialMonthStartDay || 27;
            if (periodEl) {
                let lbl = `${MONTHS[curM]} ${curY}`;
                if (startDay > 1) {
                    const prevMonthVal = curM === 0 ? 11 : curM - 1;
                    lbl += ` (${startDay}/${prevMonthVal + 1} - ${startDay - 1}/${curM + 1})`;
                }
                periodEl.textContent = lbl;
            }

            const curExps = state.expenses.filter(e => {
                const { month, year } = getFinancialMonthAndYear(e.date);
                return month === curM && year === curY;
            });
            const prevExps = state.expenses.filter(e => {
                const { month, year } = getFinancialMonthAndYear(e.date);
                return month === prevM && year === prevY;
            });
            const curTotal = curExps.reduce((s, e) => s + e.amount, 0);
            const prevTotal = prevExps.reduce((s, e) => s + e.amount, 0);
            const subMonthly = calcSubMonthly();
            const loanMonthly = state.loans ? state.loans.reduce((s, l) => s + l.monthly, 0) : 0;
            const inc = state.incomeSources.reduce((s, src) => s + src.amount, 0) - calcFixedDeductions();
            const totalOut = curTotal + subMonthly + loanMonthly;
            const savings = inc - totalOut;
            const savingsRate = inc > 0 ? (savings / inc * 100) : 0;

            // Per-category spending current month
            const curByCat = {};
            curExps.forEach(e => (e.items || []).forEach(it => {
                const c = normCat(it.subcat);
                curByCat[c] = (curByCat[c] || 0) + (it.qty * it.price);
            }));
            const prevByCat = {};
            prevExps.forEach(e => (e.items || []).forEach(it => {
                const c = normCat(it.subcat);
                prevByCat[c] = (prevByCat[c] || 0) + (it.qty * it.price);
            }));

            // Find wasteful (>110% of budget)
            const wasteful = [];
            Object.keys(state.budgets || {}).forEach(cat => {
                const spent = curByCat[cat] || 0;
                const bud = parseFloat(state.budgets[cat]) || 0;
                if (bud <= 0) return;
                const pct = spent / bud * 100;
                const diff = spent - bud;
                if (pct > 110) wasteful.push({ cat, spent, bud, pct, diff });
            });
            wasteful.sort((a, b) => b.diff - a.diff);

            // Biggest month-over-month changes (only categories with prev > 0)
            const movers = [];
            Object.keys(curByCat).forEach(c => {
                const cur = curByCat[c] || 0;
                const prev = prevByCat[c] || 0;
                if (prev <= 0) return;
                movers.push({ cat: c, cur, prev, diff: cur - prev, pct: ((cur - prev) / prev) * 100 });
            });
            movers.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
            const topRise = movers.filter(m => m.diff > 0)[0];
            const topDrop = movers.filter(m => m.diff < 0)[0];

            // Overall grade
            let grade, gradeCol, gradeLbl, gradeBg;
            if (savings < 0) { grade = 'D'; gradeCol = 'var(--red)'; gradeLbl = 'يحتاج مراجعة'; gradeBg = 'rgba(248,113,113,0.15)'; }
            else if (savingsRate < 10) { grade = 'C'; gradeCol = 'var(--orange)'; gradeLbl = 'مقبول'; gradeBg = 'rgba(251,146,60,0.15)'; }
            else if (savingsRate < 20) { grade = 'B'; gradeCol = 'var(--amber)'; gradeLbl = 'جيد'; gradeBg = 'rgba(251,191,36,0.15)'; }
            else if (savingsRate < 35) { grade = 'A'; gradeCol = 'var(--green)'; gradeLbl = 'جيد جداً'; gradeBg = 'rgba(52,211,153,0.15)'; }
            else { grade = 'A+'; gradeCol = 'var(--green)'; gradeLbl = 'ممتاز'; gradeBg = 'rgba(52,211,153,0.2)'; }

            const monthDiff = curTotal - prevTotal;
            const monthDiffPct = prevTotal > 0 ? (monthDiff / prevTotal) * 100 : 0;
            const cmpIcon = monthDiff > 0 ? '⬆️' : monthDiff < 0 ? '⬇️' : '➡️';
            const cmpCol = monthDiff > 0 ? 'var(--red)' : monthDiff < 0 ? 'var(--green)' : 'var(--text3)';
            const cmpLbl = prevTotal > 0 ? `${cmpIcon} ${monthDiff > 0 ? '+' : ''}${monthDiffPct.toFixed(0)}%` : '—';

            const wastefulHtml = wasteful.length ? wasteful.slice(0, 6).map(w => `
                <div class="eval-item">
                    <div class="eval-item-name"><span style="color:${catColor(w.cat)}">●</span> ${w.cat}</div>
                    <div class="eval-item-val" style="color:var(--red)">+${w.diff.toFixed(0)} د.أ (${(w.pct - 100).toFixed(0)}%)</div>
                </div>`).join('') : '<div style="font-size:11px;color:var(--text3);padding:6px 0">لا تجاوزات هذا الشهر 🎉</div>';

            const moversHtml = (topRise || topDrop) ? `
                <div style="margin-top:14px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;font-size:12px;display:flex;flex-direction:column;gap:6px">
                    <div style="font-weight:600;color:var(--text2);font-size:11px;font-family:'JetBrains Mono',monospace;letter-spacing:.3px;margin-bottom:4px">مقارنة بالشهر السابق</div>
                    ${topRise ? `<div style="display:flex;justify-content:space-between"><span>⬆️ زيادة في ${topRise.cat}</span><span style="color:var(--red);font-family:'JetBrains Mono',monospace">+${topRise.diff.toFixed(0)} د.أ</span></div>` : ''}
                    ${topDrop ? `<div style="display:flex;justify-content:space-between"><span>⬇️ نقص في ${topDrop.cat}</span><span style="color:var(--green);font-family:'JetBrains Mono',monospace">-${Math.abs(topDrop.diff).toFixed(0)} د.أ</span></div>` : ''}
                </div>` : '';

            el.innerHTML = `
                <div class="eval-wrap">
                    <div class="eval-grade" style="background:${gradeBg};color:${gradeCol};border:2px solid ${gradeCol}">
                        <div class="eval-grade-letter">${grade}</div>
                        <div class="eval-grade-lbl">${gradeLbl}</div>
                    </div>
                    <div class="eval-stats">
                        <div class="eval-stat">
                            <div class="eval-stat-lbl">معدل التوفير</div>
                            <div class="eval-stat-val" style="color:${savings >= 0 ? 'var(--green)' : 'var(--red)'}">${savingsRate.toFixed(0)}%</div>
                        </div>
                        <div class="eval-stat">
                            <div class="eval-stat-lbl">المدّخر</div>
                            <div class="eval-stat-val" style="color:${savings >= 0 ? 'var(--green)' : 'var(--red)'}">${savings.toFixed(0)}<span style="font-size:11px;color:var(--text3);font-weight:500"> د.أ</span></div>
                        </div>
                        <div class="eval-stat">
                            <div class="eval-stat-lbl">vs الشهر السابق</div>
                            <div class="eval-stat-val" style="color:${cmpCol}">${cmpLbl}</div>
                        </div>
                    </div>
                </div>
                <div class="eval-lists eval-lists--single">
                    <div class="eval-list">
                        <div class="eval-list-title" style="color:var(--red)">⚠️ تبذير (تجاوز الميزانية)</div>
                        ${wastefulHtml}
                    </div>
                </div>
                ${moversHtml}
            `;
        }

        // ═══════════════════════════════════════
        // INIT
        // ═══════════════════════════════════════
        function processAutoRenewals() {
            // For subscriptions with autoRenew, advance the next date forward if it's in the past
            const today = new Date(); today.setHours(0, 0, 0, 0);
            let anyChanged = false;
            (state.subscriptions || []).forEach(s => {
                if (s.autoRenew === false) return; // explicit opt-out
                if (!s.next) return;
                // If subscription has an end date and it's already passed, do not renew
                if (s.end) {
                    const endD = new Date(s.end); endD.setHours(0, 0, 0, 0);
                    if (endD < today) return;
                }
                let next = new Date(s.next); next.setHours(0, 0, 0, 0);
                let subChanged = false;
                if (s.freq === 'monthly' && next.getDate() !== 1) {
                    next.setDate(1);
                    subChanged = true;
                }
                while (next <= today) {
                    if (s.freq === 'daily') {
                        next.setDate(next.getDate() + 1);
                    } else if (s.freq === 'yearly') {
                        next.setFullYear(next.getFullYear() + 1);
                    } else {
                        next.setMonth(next.getMonth() + 1);
                        next.setDate(1);
                    }
                    subChanged = true;
                }
                if (subChanged) {
                    s.next = ymd(next);
                    anyChanged = true;
                }
            });
            if (anyChanged) saveState();
        }
        async function initApp() {
            await loadState();
            processAutoRenewals();

            if (!state.periodMode || state.periodMode === 'all') {
                state.periodMode = 'month';
            }

            const fin = getFinancialMonthAndYear(td());
            state.periodMonth = fin.month;
            state.periodYear = fin.year;

            initPeriodSelects();
            syncPeriodChips();
            if (document.getElementById('exp-date')) document.getElementById('exp-date').value = td();
            if (document.getElementById('m-exp-date')) document.getElementById('m-exp-date').value = td();
            document.getElementById('fl-date').value = td();
            populateCatSelects();
            updateDatalists();
            const overviewNav = document.querySelector('.nav-item[data-page="overview"]');
            if (overviewNav) goPage(overviewNav);
            else renderOverview();
            applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
            updateNotifBtn();
            checkAllAlerts();
            setInterval(checkAllAlerts, 30 * 60 * 1000);
        }

        // Firebase Auth Implementation
        const auth = firebase.auth();
        let appInitialized = false;

        auth.onAuthStateChanged(user => {
            if (user) {
                document.getElementById('loginOverlay').style.display = 'none';
                if (!appInitialized) {
                    appInitialized = true;
                    initApp();
                }
            } else {
                document.getElementById('loginOverlay').style.display = 'flex';
                appInitialized = false;
            }
        });

        function switchAuthSection(section) {
            document.getElementById('authLoginSection').style.display = 'none';
            document.getElementById('authRegisterSection').style.display = 'none';
            document.getElementById('authForgotSection').style.display = 'none';

            if (section === 'login') {
                document.getElementById('authLoginSection').style.display = 'block';
            } else if (section === 'register') {
                document.getElementById('authRegisterSection').style.display = 'block';
            } else if (section === 'forgot') {
                document.getElementById('authForgotSection').style.display = 'block';
            }
        }

        async function doRegister(e) {
            if (e) e.preventDefault();
            const email = document.getElementById('regEmail').value;
            const pass = document.getElementById('regPassword').value;
            const btn = document.getElementById('regBtn');
            const err = document.getElementById('regError');

            btn.innerHTML = 'جاري الإنشاء...';
            btn.disabled = true;
            err.style.display = 'none';

            try {
                await auth.createUserWithEmailAndPassword(email, pass);
                // auto logs in, listener handles the rest
            } catch (error) {
                console.error(error);
                let msg = error.message;
                if (error.code === 'auth/email-already-in-use') msg = 'هذا الإيميل مسجل مسبقاً.';
                else if (error.code === 'auth/weak-password') msg = 'كلمة المرور ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل).';
                else if (error.code === 'auth/invalid-email') msg = 'صيغة الإيميل غير صحيحة.';

                err.innerText = error.code + ': ' + msg;
                err.style.display = 'block';
                btn.innerHTML = 'إنشاء الحساب';
                btn.disabled = false;
            }
        }

        async function doResetPassword(e) {
            if (e) e.preventDefault();
            const email = document.getElementById('forgotEmail').value;
            const err = document.getElementById('forgotError');
            const succ = document.getElementById('forgotSuccess');
            const btn = document.getElementById('forgotBtn');

            err.style.display = 'none';
            succ.style.display = 'none';
            btn.innerHTML = 'جاري الإرسال...';
            btn.disabled = true;

            try {
                await auth.sendPasswordResetEmail(email);
                succ.innerText = 'تم إرسال رابط التعديل لبريدك. تفقد صندوق الوارد (أو Spam).';
                succ.style.display = 'block';
                btn.innerHTML = 'تم الإرسال ✓';
            } catch (error) {
                console.error(error);
                err.innerText = 'حدث خطأ. تأكد أن الإيميل صحيح ومسجل.';
                err.style.display = 'block';
                btn.innerHTML = 'إرسال الرابط';
                btn.disabled = false;
            }
        }

        async function doLogin(e) {
            if (e) e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPassword').value;
            const btn = document.getElementById('loginBtn');
            const err = document.getElementById('loginError');

            btn.innerHTML = 'جاري تسجيل الدخول...';
            btn.disabled = true;
            err.style.display = 'none';

            try {
                await auth.signInWithEmailAndPassword(email, pass);
            } catch (error) {
                err.innerText = 'البيانات خاطئة. يرجى التأكد من كلمة المرور والإيميل.';
                err.style.display = 'block';
            }

            btn.innerHTML = 'دخول';
            btn.disabled = false;
        }

        async function doLogout() {
            if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                await auth.signOut();
                location.reload();
            }
        }