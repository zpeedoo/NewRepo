const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// Replace the literal escaped characters
html = html.replace(/el\.style\.transform = \\\`rotate\(\\\$\\{rotation\\}deg\)\\\`;/g, 'el.style.transform = `rotate(${rotation}deg)`;');

// Just in case it's slightly different
html = html.replace(/el\.style\.transform = \\`rotate\(\\\$\\{rotation\\}deg\)\\`;/g, 'el.style.transform = `rotate(${rotation}deg)`;');

html = html.replace('el.style.transform = \\`rotate(\\${rotation}deg)\\`;', 'el.style.transform = `rotate(${rotation}deg)`;');

// A reliable way using string replacement
html = html.split('el.style.transform = \\`rotate(\\${rotation}deg)\\`;').join('el.style.transform = `rotate(${rotation}deg)`;');

fs.writeFileSync('life-planner.html', html, 'utf8');
