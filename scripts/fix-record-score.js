const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Stroop Game
html = html.replace(/alert\(\`انتهى الوقت! نقاطك: \$\{stroopScore\}\`\);/, (match) => {
  return `recordGameScore('stroop', stroopScore);\n            ` + match;
});

// 2. Visual Search
html = html.replace(/alert\(\`انتهى الوقت! وصلت للمستوى \$\{visualLevel\}\`\);/, (match) => {
  return `recordGameScore('vs', visualLevel * 100);\n            ` + match;
});

// 3. Slide Puzzle
html = html.replace(/alert\('أحسنت! أكملت اللغز في ' \+ slideMoves \+ ' حركة.'\);/, (match) => {
  // Score based on moves, lower is better. Let's make it 1000 - moves*10 (min 100)
  return `let score = Math.max(100, 1000 - slideMoves * 10);\n      recordGameScore('slide', score);\n      ` + match;
});

// 4. Sum Match
html = html.replace(/alert\(\`انتهى الوقت! نقاطك: \$\{smScore\}\`\);/, (match) => {
  return `recordGameScore('sm', smScore);\n            ` + match;
});

// 5. Shape Counter
html = html.replace(/alert\(\`انتهى الوقت! نقاطك: \$\{scScore\}\`\);/, (match) => {
  return `recordGameScore('sc', scScore);\n            ` + match;
});

// 6. Direction Game
html = html.replace(/if \(!state\.highScores\.direction \|\| dirScore > state\.highScores\.direction\) state\.highScores\.direction = dirScore; saveState\(\); updateHighScores\(\);/g, (match) => {
  return match + `\n      recordGameScore('direction', dirScore);`;
});

// 7. Size Sorter Game
html = html.replace(/if \(!state\.highScores\.sizesorter \|\| ssScore > state\.highScores\.sizesorter\) state\.highScores\.sizesorter = ssScore; saveState\(\); updateHighScores\(\);/g, (match) => {
  return match + `\n      recordGameScore('sizesorter', ssScore);`;
});

// 8. Memory Connect Game
html = html.replace(/if \(!state\.highScores\.mc \|\| mcScore > state\.highScores\.mc\) state\.highScores\.mc = mcScore; saveState\(\); updateHighScores\(\);/g, (match) => {
  return match + `\n      recordGameScore('mc', mcScore);`;
});

fs.writeFileSync('life-planner.html', html);
console.log('recordGameScore injected into all games.');
