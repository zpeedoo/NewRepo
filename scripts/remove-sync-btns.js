const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// Use regex to remove the forceRESTSync buttons
// It matches <button ... onclick="forceRESTSync()" ... > ... </button>
content = content.replace(/<button[^>]*onclick="forceRESTSync\(\)"[^>]*>[\s\S]*?<\/button>\s*/g, '');

fs.writeFileSync('index.html', content, 'utf8');
console.log("Sync buttons removed!");
