const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
let cssContent = '';
let jsContent = '';

// Extract all <style> blocks
while (true) {
    const sStart = html.indexOf('<style>');
    if (sStart === -1) break;
    const sEnd = html.indexOf('</style>', sStart);
    cssContent += html.substring(sStart + 7, sEnd) + '\n';
    html = html.substring(0, sStart) + html.substring(sEnd + 8);
}

// Extract the main <script> block
const jsStart = html.indexOf('<script>');
const jsEnd = html.lastIndexOf('</script>');
if (jsStart !== -1 && jsEnd !== -1) {
    jsContent = html.substring(jsStart + 8, jsEnd);
    html = html.substring(0, jsStart) + html.substring(jsEnd + 9);
}

// Inject external links
html = html.replace('</head>', '    <link rel="stylesheet" href="css/styles.css">\n</head>');
html = html.replace('</body>', '    <script src="js/app.js"></script>\n</body>');

fs.writeFileSync('css/styles.css', cssContent.trim(), 'utf8');
fs.writeFileSync('js/app.js', jsContent.trim(), 'utf8');
fs.writeFileSync('index.html', html.trim() + '\n', 'utf8');

console.log('Split completed successfully!');
