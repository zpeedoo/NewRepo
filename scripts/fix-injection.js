const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');
let addScript = fs.readFileSync('scripts/add-direction-game.js', 'utf8');

let match = addScript.match(/const directionLogicJs = `([\s\S]*?)`;/);
let jsLogic = match[1];

// Remove the wrongly injected code from the head
let wrongInjectionRegex = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js">\s*\/\*? \-\-\- Direction Game \-\-\-[\s\S]*?  <\/script>/;
if (html.match(wrongInjectionRegex) || html.includes('// --- Direction Game ---')) {
    html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js">[\s\S]*?function handleDirectionInput[\s\S]*?\}\s*<\/script>/, '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>');
    
    // Also try a broader replace if the above fails
    if(html.includes('// --- Direction Game ---')) {
        let parts = html.split('// --- Direction Game ---');
        let before = parts[0];
        let after = parts[1].substring(parts[1].indexOf('</script>') + 9);
        html = before + '</script>' + after;
    }
}

// Find the last index of </script>
let lastIndex = html.lastIndexOf('</script>');
if (lastIndex !== -1) {
    let before = html.substring(0, lastIndex);
    let after = html.substring(lastIndex);
    html = before + jsLogic + '\n' + after;
    fs.writeFileSync('life-planner.html', html, 'utf8');
    console.log('Fixed injection.');
}
