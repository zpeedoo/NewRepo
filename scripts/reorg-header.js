const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Desktop CSS overrides
html = html.replace(
    /\.date-hdr \{[\s\S]*?gap: 15px;\s*\}/,
    `.date-hdr {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      flex-wrap: wrap;
      gap: 10px;
    }`
);

html = html.replace(
    /\.date-circle \{[\s\S]*?font-weight: 800;\s*\}/,
    `.date-circle {
      width: 45px;
      height: 45px;
      border-radius: 50%;
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
    }`
);

// 2. Mobile CSS overrides
const mobileTarget = `      .date-hdr {
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
      }
      .greeting {
        margin-top: 10px;
      }`;
      
const mobileNew = `      .date-hdr {
        flex-direction: row;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      .greeting {
        display: none;
      }
      .date-widget {
        gap: 8px;
      }
      .date-circle {
        width: 38px; height: 38px; font-size: 16px;
      }
      .header-actions .circle-btn {
        width: 36px; height: 36px; font-size: 14px;
      }`;

if (html.includes(mobileTarget)) {
    html = html.replace(mobileTarget, mobileNew);
} else {
    // If not exact, let's regex
    html = html.replace(
        /\.date-hdr\s*\{\s*flex-direction:\s*column;\s*align-items:\s*flex-start;\s*gap:\s*20px;\s*\}/,
        `.date-hdr { flex-direction: row; align-items: center; gap: 10px; margin-bottom: 10px; }`
    );
    html = html.replace(
        /\.greeting\s*\{\s*margin-top:\s*10px;\s*\}/,
        `.greeting { display: none; } .date-circle { width: 38px; height: 38px; font-size: 16px; } .header-actions .circle-btn { width: 36px; height: 36px; font-size: 14px; }`
    );
}

// 3. Move and shrink the + button
// The old HTML
const btnTarget = /<div style="display: flex; justify-content: center; margin-bottom: 20px; margin-top: 10px;">\s*<button class="btn btn-dark btn-circle" onclick="openModal\('habit'\)" title="إضافة عادة" style="width: 60px; height: 60px; font-size: 32px; box-shadow: 0 6px 16px rgba\(0,0,0,0\.2\);">\+<\/button>\s*<\/div>/;

const btnNew = `<div style="display: flex; justify-content: flex-end; margin-bottom: 10px; margin-top: -10px;">
        <button class="btn btn-dark btn-circle" onclick="openModal('habit')" title="إضافة عادة" style="width: 40px; height: 40px; font-size: 20px; box-shadow: 0 3px 8px rgba(0,0,0,0.15);">+</button>
      </div>`;
      
html = html.replace(btnTarget, btnNew);

// BUMP SW CACHE to v9
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/مصاريفي-cache-v\d+/, 'مصاريفي-cache-v9');
fs.writeFileSync('sw.js', sw, 'utf8');

fs.writeFileSync('life-planner.html', html, 'utf8');
console.log('Modified header styles and button.');
