const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const btnSidebar = `
            <button class="btn btn-sm" onclick="window.location.reload()"
                style="margin-top:8px; width:100%; font-size:10px; padding:4px 8px; justify-content:center; gap:4px; height: 28px; background:rgba(124, 109, 250, 0.1); color:var(--accent2); border-color:rgba(124, 109, 250, 0.2);">
                🔃 تحديث الصفحة
            </button>`;

content = content.replace(/(<button[^>]*onclick="forceRESTSync\(\)"[^>]*>[\s\S]*?<\/button>)/, `$1\n${btnSidebar}`);

const bnavBtn = `
            <div class="bnav-item" onclick="window.location.reload()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21.5 2v6h-6M2 22v-6h6M21.34 15.57a10 10 0 1 1-.92-10.26l5.08 5.08M2.66 8.43a10 10 0 1 1 .92 10.26l-5.08-5.08" />
                </svg><span style="margin-top: 2px;">تحديث</span>
            </div>`;

content = content.replace(/(<div class="bnav-item" data-page="loans"[\s\S]*?<\/div>)([\s]*<\/div>)/, `$1\n${bnavBtn}$2`);

fs.writeFileSync('index.html', content, 'utf8');
console.log("Buttons Injected!");
