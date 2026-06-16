const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Fix requestNotification()
const reqNotifOld = `    function requestNotification() {
      if (!("Notification" in window)) { alert("المتصفح لا يدعم الإشعارات"); return; }
      Notification.requestPermission().then(permission => {
        if (permission === "granted") openModal('notif');
        else alert("يجب تفعيل الصلاحيات من إعدادات المتصفح أولاً.");
      });
    }`;

const reqNotifNew = `    function requestNotification() {
      openModal('notif');
      if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }`;

html = html.replace(reqNotifOld, reqNotifNew);

if (!html.includes('Notification.permission !== "granted"')) {
   // fallback regex
   html = html.replace(/function requestNotification\(\)\s*\{[\s\S]*?\}\n/m, reqNotifNew + '\n');
}

// 2. Fix Settings Button to call openModal('settings')
html = html.replace(/onclick="openSettingsModal\(\)"/g, `onclick="openModal('settings')"`);
html = html.replace(/onclick="toggleSettingsPopup\(\)"/g, `onclick="openModal('settings')"`);

// 3. Add Settings Modal HTML right before modal-notif
const settingsModalHTML = `  <!-- Settings Modal -->
  <div class="modal-ov" id="modal-settings">
    <div class="modal-box">
      <div class="modal-hdr">
        <div class="modal-title">إعدادات الحساب ⚙️</div>
        <button class="modal-close" onclick="closeModal('settings')">×</button>
      </div>
      <div class="field" style="margin-bottom:15px;">
        <label>الاسم المستعار</label>
        <input type="text" id="s-name-m" class="inp" placeholder="الاسم">
      </div>
      <div class="field" style="margin-bottom:20px;">
        <label>العمر</label>
        <input type="number" id="s-age-m" class="inp" placeholder="مثال: 25">
      </div>
      <button class="btn btn-dark" style="width:100%;" onclick="saveAccountSettingsM()">حفظ التعديلات 💾</button>
    </div>
  </div>\n`;

if (!html.includes('id="modal-settings"')) {
    html = html.replace('<div class="modal-ov" id="modal-notif">', settingsModalHTML + '  <div class="modal-ov" id="modal-notif">');
}

// 4. Add openModal logic for settings
const openModalOld = /if \(type === 'notif'\) \{/m;
const openModalNew = `if (type === 'settings') {
        document.getElementById('s-name-m').value = state.settings.displayName || "صديقي";
        document.getElementById('s-age-m').value = state.settings.age || "";
        document.getElementById('modal-settings').classList.add('show'); return;
      }\n      if (type === 'notif') {`;

if (!html.includes("type === 'settings'")) {
    html = html.replace(openModalOld, openModalNew);
}

// 5. Add saveAccountSettingsM()
const saveAccountCode = `    function saveAccountSettingsM() {
      const name = document.getElementById('s-name-m').value.trim();
      const age = parseInt(document.getElementById('s-age-m').value);
      if(name) state.settings.displayName = name;
      if(age) state.settings.age = age;
      saveState();
      closeModal('settings');
      toast('تم حفظ الإعدادات بنجاح ✅');
      loadState();
    }\n`;

if (!html.includes('saveAccountSettingsM()')) {
    html = html.replace('function saveAccountSettings() {', saveAccountCode + '    function saveAccountSettings() {');
}

// BUMP SW CACHE to v11
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/مصاريفي-cache-v\d+/, 'مصاريفي-cache-v11');
fs.writeFileSync('sw.js', sw, 'utf8');

fs.writeFileSync('life-planner.html', html, 'utf8');
console.log('Fixed buttons.');
