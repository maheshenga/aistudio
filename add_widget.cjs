const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
content = content.replace("import { ModuleFlowMap } from './ModuleFlowMap';", "import { ModuleFlowMap } from './ModuleFlowMap';\nimport { FrequentWorkflowsWidget } from './FrequentWorkflowsWidget';");
content = content.replace("<TimeSpentChart />", "<TimeSpentChart />\n        <FrequentWorkflowsWidget />");
content = content.replace("className=\"grid grid-cols-1 xl:grid-cols-3 gap-[var(--spacing-md)] items-start\"", "className=\"grid grid-cols-1 xl:grid-cols-4 gap-[var(--spacing-md)] items-start\"");
content = content.replace('<div className="xl:col-span-3">\n           <SystemResources />', '<div className="xl:col-span-4">\n           <SystemResources />');
fs.writeFileSync('src/components/Dashboard.tsx', content);
