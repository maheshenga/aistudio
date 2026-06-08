const fs = require('fs');
let sh = fs.readFileSync('src/components/KeyboardShortcutsHelp.tsx', 'utf8');
const moduleShortcutsRe = `const moduleShortcuts: Record<string, {label: string, keys: string[], icon: React.ReactNode}[]> = {
    canvas: [
      { label: 'Pan Tool (Select)', keys: ['V'], icon: <Zap className="w-4 h-4 text-blue-500" /> },
      { label: 'Draw Tool', keys: ['P'], icon: <Zap className="w-4 h-4 text-blue-500" /> },
      { label: 'Zoom In', keys: ['⌘', '+'], icon: <Zap className="w-4 h-4 text-blue-500" /> }
    ],
    design_workflow: [
      { label: 'Generate Layout', keys: ['⌘', 'Enter'], icon: <Sparkles className="w-4 h-4 text-purple-500" /> },
      { label: 'Clear Prompt', keys: ['Esc'], icon: <X className="w-4 h-4 text-gray-500" /> }
    ]
  };`;
const moduleShortcutsRep = `const moduleShortcuts: Record<string, {label: string, keys: string[], icon: React.ReactNode}[]> = {
    canvas: [
      { label: 'Pan Tool (Select)', keys: ['V'], icon: <Zap className="w-4 h-4 text-blue-500" /> },
      { label: 'Draw Tool', keys: ['P'], icon: <Zap className="w-4 h-4 text-blue-500" /> },
      { label: 'Zoom In', keys: ['⌘', '+'], icon: <Zap className="w-4 h-4 text-blue-500" /> }
    ],
    design_workflow: [
      { label: 'Generate Layout', keys: ['⌘', 'Enter'], icon: <Sparkles className="w-4 h-4 text-purple-500" /> },
      { label: 'Clear Prompt', keys: ['Esc'], icon: <X className="w-4 h-4 text-gray-500" /> }
    ],
    ecommerce_mini: [
      { label: 'Publish Miniapp', keys: ['⌘', '⇧', 'P'], icon: <CheckSquare className="w-4 h-4 text-green-500" /> },
      { label: 'Toggle View Mode', keys: ['⌘', 'M'], icon: <Zap className="w-4 h-4 text-yellow-500" /> }
    ],
    store_dashboard: [
      { label: 'Export Report', keys: ['⌘', 'E'], icon: <CheckSquare className="w-4 h-4 text-blue-500" /> },
      { label: 'Refresh Data', keys: ['⌘', 'R'], icon: <Zap className="w-4 h-4 text-blue-500" /> }
    ]
  };`;
sh = sh.replace(moduleShortcutsRe, moduleShortcutsRep);

const dynamicPromptLine = `键盘快捷键`;
const dynamicPromptRep = `键盘快捷键 \${activeModule ? '- ' + activeModule.replace('_', ' ') : ''}`;
sh = sh.replace(dynamicPromptLine, dynamicPromptRep);

fs.writeFileSync('src/components/KeyboardShortcutsHelp.tsx', sh);
