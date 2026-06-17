const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');

// 1. Add recordGameScore function
const recordScoreFunc = `
    function recordGameScore(gameId, score) {
      if (!state.gameHistory) state.gameHistory = {};
      const dStr = today;
      if (!state.gameHistory[dStr]) state.gameHistory[dStr] = {};
      if (!state.gameHistory[dStr][gameId]) state.gameHistory[dStr][gameId] = [];
      state.gameHistory[dStr][gameId].push(score);
      saveState();
    }
`;
html = html.replace('function startStroopGame() {', recordScoreFunc + '\n    function startStroopGame() {');

// 2. Inject into each game's end function
html = html.replace(/if\s*\(stroopScore\s*>\s*\(state\.highScores\.stroop\s*\|\|\s*0\)\)\s*\{[\s\S]*?saveState\(\);\s*\}/, (match) => {
  return match + '\n      recordGameScore("stroop", stroopScore);';
});

html = html.replace(/if\s*\(vsScore\s*>\s*\(state\.highScores\.vs\s*\|\|\s*0\)\)\s*\{[\s\S]*?saveState\(\);\s*\}/, (match) => {
  return match + '\n      recordGameScore("vs", vsScore);';
});

html = html.replace(/if\s*\(slideScore\s*>\s*\(state\.highScores\.slide\s*\|\|\s*0\)\)\s*\{[\s\S]*?saveState\(\);\s*\}/, (match) => {
  return match + '\n      recordGameScore("slide", slideScore);';
});

html = html.replace(/if\s*\(smScore\s*>\s*\(state\.highScores\.sm\s*\|\|\s*0\)\)\s*\{[\s\S]*?saveState\(\);\s*\}/, (match) => {
  return match + '\n      recordGameScore("sm", smScore);';
});

html = html.replace(/if\s*\(scScore\s*>\s*\(state\.highScores\.sc\s*\|\|\s*0\)\)\s*\{[\s\S]*?saveState\(\);\s*\}/, (match) => {
  return match + '\n      recordGameScore("sc", scScore);';
});

html = html.replace(/if\s*\(dirScore\s*>\s*\(state\.highScores\.direction\s*\|\|\s*0\)\)\s*\{[\s\S]*?saveState\(\);\s*\}/, (match) => {
  return match + '\n      recordGameScore("direction", dirScore);';
});

html = html.replace(/if\s*\(ssScore\s*>\s*\(state\.highScores\.sizesorter\s*\|\|\s*0\)\)\s*\{[\s\S]*?saveState\(\);\s*\}/, (match) => {
  return match + '\n      recordGameScore("sizesorter", ssScore);';
});

html = html.replace(/if\s*\(mcScore\s*>\s*\(state\.highScores\.mc\s*\|\|\s*0\)\)\s*\{[\s\S]*?saveState\(\);\s*\}/, (match) => {
  return match + '\n      recordGameScore("mc", mcScore);';
});

fs.writeFileSync('life-planner.html', html);
console.log('Done injecting recordGameScore');
