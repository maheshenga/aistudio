const fs = require('fs');
const path = require('path');

const indexCssPath = './src/index.css';
let content = fs.readFileSync(indexCssPath, 'utf8');

// Insert new CSS variables
if (!content.includes('--color-highlight')) {
  const varsToInsert = `    --color-highlight: #6366F1;
    --color-success: #10B981;
    --color-warning: #F59E0B;
    --color-danger: #EF4444;
    --bg-hover: #F3F4F6;
    --border-highlight: #6366F1;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
`;
  content = content.replace('--color-primary-hover: #4338CA;', '--color-primary-hover: #4338CA;\n' + varsToInsert);
}

// Add icon sizing classes
if (!content.includes('.icon-sm')) {
  const iconClasses = `
  /* Icon Sizes */
  .icon-sm { @apply w-4 h-4; }
  .icon-md { @apply w-5 h-5; }
  .icon-lg { @apply w-6 h-6; }
  .icon-xl { @apply w-8 h-8; }
`;
  content = content.replace('/* Layout Spacing */', iconClasses + '\n  /* Layout Spacing */');
}

fs.writeFileSync(indexCssPath, content, 'utf8');
console.log('index.css updated.');
