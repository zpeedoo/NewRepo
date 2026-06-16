const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// Inject SUB_TO_MAIN_CAT
content = content.replace(
    /'خضار وفواكه': 'بقالة وسوبرماركت',/g,
    "'خضار وفواكه': 'بقالة وسوبرماركت',\n            'البيض': 'بقالة وسوبرماركت',\n            'المجمدات': 'بقالة وسوبرماركت',"
);

// Inject ITEM_AUTO_MAP
const autoMapTarget = "{ keywords: ['خضار', 'خضره'";
content = content.replace(
    /\{ keywords: \['خضار', 'خضره'/g,
    "{ keywords: ['بيض', 'بيضة', 'كرتونة بيض', 'طبق بيض'], subcat: 'البيض' },\n            { keywords: ['مجمدات', 'مفرزات', 'مجمد', 'مفرز', 'ناجتس', 'اسكالوب', 'هوت دوج', 'نقانق', 'زنجر', 'كوردون', 'بطاطا مقلية'], subcat: 'المجمدات' },\n            { keywords: ['خضار', 'خضره'"
);

fs.writeFileSync('index.html', content, 'utf8');
console.log('Categories added!');
