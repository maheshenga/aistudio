const fs = require('fs');
let content = fs.readFileSync('src/components/Topbar.tsx', 'utf8');

content = content.replace("import { GoogleLogo } from './Logo';", "import { GoogleLogo } from './Logo';\nimport { QuickActions } from './QuickActions';");
content = content.replace("<h1 className=\"text-[17px] font-medium text-[var(--text-main)] tracking-tight\">{title}</h1>", "<h1 className=\"text-[17px] font-medium text-[var(--text-main)] tracking-tight\">{title}</h1>\n          <QuickActions moduleTitle={title || ''} />");

fs.writeFileSync('src/components/Topbar.tsx', content);
