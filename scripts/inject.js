const fs = require('fs');
let html = fs.readFileSync('life-planner.html', 'utf8');
let addScript = fs.readFileSync('scripts/add-direction-game.js', 'utf8');

// The JS logic we want to extract is defined in add-direction-game.js inside backticks:
// const directionLogicJs = `...`;
let match = addScript.match(/const directionLogicJs = `([\s\S]*?)`;/);
if (match) {
  let jsLogic = match[1];
  
  // Make sure we only inject it once!
  if (!html.includes('let dirArrows = [];')) {
    html = html.replace('</script>', jsLogic + '\n  </script>');
    fs.writeFileSync('life-planner.html', html, 'utf8');
    console.log('Successfully injected game logic.');
  } else {
    console.log('Game logic already exists in the file.');
  }
} else {
  console.log('Could not find the logic block to extract.');
}
