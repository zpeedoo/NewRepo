const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// Menu entries
html = html.replace(/<div class="card-box"[^>]+onclick="startVisualSearchGame\(\)"[\s\S]*?<\/div>\s*<\/div>\s*/, '');
html = html.replace(/<div class="card-box"[^>]+onclick="startPatternCopyGame\(\)"[\s\S]*?<\/div>\s*<\/div>\s*/, '');
html = html.replace(/<div class="card-box"[^>]+onclick="startSizeSorterGame\(\)"[\s\S]*?<\/div>\s*<\/div>\s*/, '');

// HTML blocks - use more robust matching based on the actual lines
html = html.replace(/<!-- Visual Search Game Area -->[\s\S]*?<!-- Color Slide Game Area -->/, '<!-- Color Slide Game Area -->');
html = html.replace(/<!-- Pattern Copy Game Area -->[\s\S]*?<!-- Size Sorter Game Area -->/, '<!-- Size Sorter Game Area -->');
html = html.replace(/<!-- Size Sorter Game Area -->[\s\S]*?<!-- Word Search Game Area -->/, '<!-- Word Search Game Area -->');

// Hide logic
html = html.replace(/document\.getElementById\('focus-visual-area'\)\.style\.display = 'none';\n/g, '');
html = html.replace(/document\.getElementById\('focus-patterncopy-area'\)\.style\.display = 'none';\n/g, '');
html = html.replace(/document\.getElementById\('focus-sizesorter-area'\)\.style\.display = 'none';\n/g, '');

// JS blocks
html = html.replace(/\/\/\s*---\s*Visual Search Game\s*---[\s\S]*?\/\/\s*---\s*Slide Puzzle Game\s*---/, '// --- Slide Puzzle Game ---');
html = html.replace(/\/\/\s*---\s*Pattern Copy Game\s*---[\s\S]*?\/\/\s*---\s*Size Sorter Game\s*---/, '// --- Size Sorter Game ---');
html = html.replace(/\/\/\s*---\s*Size Sorter Game\s*---[\s\S]*?\/\/\s*---\s*Word Search Game\s*---/, '// --- Word Search Game ---');

// Dashboard logic
html = html.replace(/vs:\s*0\s*,?\s*/g, '');
html = html.replace(/sizesorter:\s*0\s*,?\s*/g, '');
html = html.replace(/'vs',?\s*/g, '');
html = html.replace(/'sizesorter',?\s*/g, '');

// Fix array/object commas
html = html.replace(/\[\s*,/g, '[');
html = html.replace(/,\s*\]/g, ']');
html = html.replace(/,\s*,/g, ',');

fs.writeFileSync('life-planner.html', html);
console.log('Games deleted.');
