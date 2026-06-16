const fs = require('fs');

// 1. Inject Wallets Dashboard into index.html
let html = fs.readFileSync('index.html', 'utf8');
const miniDashTarget = `<!-- 4 Mini Dashboards -->
            <div class="grid-4" id="mini-dashboards" style="margin-bottom: 14px;">
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
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('Injected Wallets Dashboard HTML.');
}

// 2. Bump Service Worker Cache Version
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/مصاريفي-cache-v\d+/, 'مصاريفي-cache-v3');
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('Bumped SW cache to v3.');
