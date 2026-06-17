const fs = require('fs');
const html = fs.readFileSync('life-planner.html', 'utf8');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/g);

if (scriptMatch) {
    scriptMatch.forEach((scriptTag, index) => {
        let js = scriptTag.replace(/<script>/, '').replace(/<\/script>/, '');
        fs.writeFileSync(`temp_script_${index}.js`, js);
    });
}
