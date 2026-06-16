const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// 1. Fix Firebase Sync logic
// Remove the if (!localStorage.getItem('fb_auth_token')) wrapper around the db.ref listener
content = content.replace(
    /if \(!localStorage\.getItem\('fb_auth_token'\)\) \{\s*db\.ref\('state'\)\.on\('value', snapshot => \{([\s\S]*?)\}, err => \{\s*console\.error\('Firebase realtime listener error', err\);\s*\}\);\s*\}/,
    `db.ref('state').on('value', snapshot => {
                    $1
                }, err => {
                    console.error('Firebase realtime listener error', err);
                });`
);

// Simplify saveState to only use Web SDK and fix isSaving
const saveStateRegex = /try \{\s*const firebaseState = \{ \.\.\.state, budgets: encodeBudgetsForFirebase\(state\.budgets\) \};\s*const token = localStorage\.getItem\('fb_auth_token'\);\s*if \(token\) \{[\s\S]*?\} else \{\s*db\.ref\('state'\)\.set\(firebaseState\)[\s\S]*?\}\s*\} catch \(e\) \{\s*console\.error\('Firebase format error', e\);\s*\}\s*\/\/ Allow listener again after a short delay\s*setTimeout\(\(\) => \{ isSaving = false; \}, 500\);/;

const newSaveState = `try {
                const firebaseState = { ...state, budgets: encodeBudgetsForFirebase(state.budgets) };
                db.ref('state').set(firebaseState)
                    .then(() => console.log('Firebase Web SDK save OK'))
                    .catch(e => console.error('Firebase Web SDK save error', e))
                    .finally(() => { isSaving = false; });
            } catch (e) {
                console.error('Firebase format error', e);
                isSaving = false;
            }`;

content = content.replace(saveStateRegex, newSaveState);

// 2. Fix Custom Category getting lost in edit
const addInvItemRowFixRegex = /if \(sel\[0\] && prefill\.subcat\) \{\s*sel\[0\]\.value = prefill\.subcat;\s*sel\[0\]\.dataset\.manual = '1';\s*\}/;

const newAddInvItemRowFix = `if (sel[0] && prefill.subcat) {
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
                }`;

content = content.replace(addInvItemRowFixRegex, newAddInvItemRowFix);

fs.writeFileSync('index.html', content, 'utf8');
console.log('Done fixing index.html!');
