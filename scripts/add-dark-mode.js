const fs = require('fs');

// 1. Update CSS
let css = fs.readFileSync('css/styles.css', 'utf8');
const darkThemeStr = `
[data-theme="dark"] {
    --bg: #0f172a;
    --surface: #1e293b;
    --surface2: #334155;
    --surface3: #475569;
    --border: #334155;
    --border2: #475569;
    --text: #f8fafc;
    --text2: #cbd5e1;
    --text3: #94a3b8;
    --accent: #f8fafc;
    --accent2: #f1f5f9;
    --hover-row: #1e293b;
    --shadow-card: 0 8px 30px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2);
    --shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.2);
}
`;
if (!css.includes('[data-theme="dark"]')) {
    css += darkThemeStr;
    fs.writeFileSync('css/styles.css', css, 'utf8');
    console.log('CSS updated with dark theme.');
}

// 2. Update JS Theme Logic
let js = fs.readFileSync('js/app.js', 'utf8');
const oldThemeFunc = `        function applyTheme(theme) {
            if (theme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
                const ic = document.getElementById('themeToggleIcon');
                const lb = document.getElementById('themeToggleLbl');
                if (ic) ic.textContent = '🌙';
                if (lb) lb.textContent = 'الوضع الداكن';
            } else {
                document.documentElement.removeAttribute('data-theme');
                const ic = document.getElementById('themeToggleIcon');
                const lb = document.getElementById('themeToggleLbl');
                if (ic) ic.textContent = '☀️';
                if (lb) lb.textContent = 'الوضع الفاتح';
            }
        }`;

const newThemeFunc = `        function applyTheme(theme) {
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                const ic = document.getElementById('themeToggleIcon');
                const lb = document.getElementById('themeToggleLbl');
                if (ic) ic.textContent = '☀️';
                if (lb) lb.textContent = 'الوضع الفاتح';
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                const ic = document.getElementById('themeToggleIcon');
                const lb = document.getElementById('themeToggleLbl');
                if (ic) ic.textContent = '🌙';
                if (lb) lb.textContent = 'الوضع الداكن';
            }
        }`;

// Replace the old function using regex to be robust against newlines
js = js.replace(/function applyTheme\(theme\)\s*\{[\s\S]*?\}\s*(?=\/\/ ──)/, newThemeFunc + '\n        ');

// Update toggleTheme logic which might just toggle 'light' to ''
const oldToggleFunc = `        function toggleTheme() {
            let t = localStorage.getItem('theme') || 'dark';
            t = t === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', t);
            applyTheme(t);
        }`;
const newToggleFunc = `        function toggleTheme() {
            let t = localStorage.getItem('theme') || 'light';
            t = t === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', t);
            applyTheme(t);
        }`;
js = js.replace(/function toggleTheme\(\)\s*\{[\s\S]*?\}/, newToggleFunc);

fs.writeFileSync('js/app.js', js, 'utf8');
console.log('JS theme logic updated.');
