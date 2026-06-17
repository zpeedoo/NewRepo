const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Add CSS
const cssSnippet = `
    .task-card {
      border: 2px dashed #f59e0b;
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      color: #92400e;
    }
    body.dark .task-card {
      background: linear-gradient(135deg, #78350f, #92400e);
      border-color: #f59e0b;
      color: #fef3c7;
    }
    .task-card.done .habit-name {
      text-decoration: line-through;
      opacity: 0.7;
    }
    .quick-task-input-wrapper {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      margin-top: -10px;
      align-items: center;
    }
    .quick-task-input {
      flex: 1;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface2);
      color: var(--black);
      font-family: inherit;
    }
`;
html = html.replace('/* Calendar Colors */', cssSnippet + '\n    /* Calendar Colors */');

// 2. Add UI
const uiSearch = /<div style="display: flex; justify-content: flex-end; margin-bottom: 10px; margin-top: -10px;">[\s\S]*?<div id="habit-list"/;
const newUI = `<div class="quick-task-input-wrapper">
        <input type="text" id="quick-task-input" class="quick-task-input" placeholder="أضف مهمة مميزة لليوم... (اضغط Enter)" onkeydown="if(event.key==='Enter') addQuickTask()">
        <button class="btn btn-dark" onclick="addQuickTask()" style="padding: 12px 15px; border-radius: 12px;">إضافة ➕</button>
        <button class="btn btn-dark btn-circle" onclick="openModal('habit')" title="إضافة عادة يومية" style="width: 45px; height: 45px; font-size: 20px; box-shadow: 0 3px 8px rgba(0,0,0,0.15); flex-shrink: 0;">+</button>
      </div>
      <div id="habit-list"`;
html = html.replace(uiSearch, newUI);

// 3. JS Logic
const jsLogic = `
    function addQuickTask() {
      const input = document.getElementById('quick-task-input');
      const text = input.value.trim();
      if(!text) return;
      const dStr = today;
      state.habits.push({
        id: Date.now(),
        name: text,
        freq: 'daily',
        start: dStr,
        end: dStr,
        isTask: true,
        createdAt: new Date().toISOString()
      });
      saveState();
      input.value = '';
      renderHabits();
      updateDashboard();
    }
`;

// Insert the JS logic right before renderHabits
html = html.replace('function renderHabits() {', jsLogic + '\n    function renderHabits() {');

// 4. Update renderHabits
// We need to inject logic into renderHabits to add the .task-card class and the star icon.
// Let's find the inner loop in renderHabits
// \`<div class="habit-card ${done ? 'done' : ''}" onclick="toggleHabit(${h.id})">\`
// -> \`<div class="habit-card ${done ? 'done' : ''} ${h.isTask ? 'task-card' : ''}" onclick="toggleHabit(${h.id})">\`

html = html.replace(
  /\`<div class="habit-card \$\{done \? 'done' : ''\}" onclick="toggleHabit\(\$\{h\.id\}\)"\>/g,
  `\`<div class="habit-card \${done ? 'done' : ''} \${h.isTask ? 'task-card' : ''}" onclick="toggleHabit(\${h.id})">\``
);

// Icon replacement:
// `<div class="habit-icon">${done ? '✔️' : '🔄'}</div>`
// We need to make it: `<div class="habit-icon">${done ? '✔️' : (h.isTask ? '⭐' : '🔄')}</div>`
html = html.replace(
  /<div class="habit-icon">\$\{done \? '✔️' : '🔄'\}<\/div>/g,
  `<div class="habit-icon">\${done ? '✔️' : (h.isTask ? '⭐' : '🔄')}</div>`
);

fs.writeFileSync('life-planner.html', html);
console.log('Update complete.');
