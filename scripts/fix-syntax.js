const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

js = js.replace(/function toggleTheme\(\)\s*\{[\s\S]*?catch \(e\) \{ \}[\s\S]*?applyTheme\(next\);\s*\}/, `function toggleTheme() {
            let t = localStorage.getItem('theme') || 'light';
            t = t === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', t);
            applyTheme(t);
        }`);

fs.writeFileSync('js/app.js', js, 'utf8');
console.log('Fixed syntax error via regex.');
