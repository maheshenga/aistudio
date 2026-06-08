const fs = require('fs');

let content = fs.readFileSync('src/components/KeyboardShortcutsHelp.tsx', 'utf8');

content = content.replace("interface KeyboardShortcutsHelpProps {", "interface KeyboardShortcutsHelpProps {\n  activeModule?: string;");

const defaultShortcuts = `
  const defaultShortcuts = [
    { label: '唤醒全局命令面板 (Command Palette)', keys: ['⌘', 'P'], icon: <Command className="w-4 h-4 text-blue-500" /> },
    { label: '唤醒数字助理 (AI Copilot)', keys: ['⌘', 'K'], icon: <Sparkles className="w-4 h-4 text-indigo-500" /> },
    { label: '全局搜索 & 导航', keys: ['⌘', '/'], icon: <Search className="w-4 h-4 text-gray-500" /> },
    { label: '打开全局任务中心', keys: ['⌘', 'T'], icon: <CheckSquare className="w-4 h-4 text-green-500" /> },
    { label: 'Toggle/Focus Split Right', keys: ['⌘', '→'], icon: <Zap className="w-4 h-4 text-yellow-500" /> },
    { label: 'Focus Split Left', keys: ['⌘', '←'], icon: <Zap className="w-4 h-4 text-yellow-500" /> },
    { label: 'Toggle Split Screen', keys: ['⌘', '\\\\'], icon: <Zap className="w-4 h-4 text-yellow-500" /> },
    { label: 'Toggle Deep Work Focus Mode', keys: ['⌘', '⇧', 'F'], icon: <Zap className="w-4 h-4 text-red-500" /> },
  ];

  const moduleShortcuts: Record<string, {label: string, keys: string[], icon: JSX.Element}[]> = {
    canvas: [
      { label: 'Pan Tool (Select)', keys: ['V'], icon: <Zap className="w-4 h-4 text-blue-500" /> },
      { label: 'Draw Tool', keys: ['P'], icon: <Zap className="w-4 h-4 text-blue-500" /> },
      { label: 'Zoom In', keys: ['⌘', '+'], icon: <Zap className="w-4 h-4 text-blue-500" /> }
    ],
    design_workflow: [
      { label: 'Generate Layout', keys: ['⌘', 'Enter'], icon: <Sparkles className="w-4 h-4 text-purple-500" /> },
      { label: 'Clear Prompt', keys: ['Esc'], icon: <X className="w-4 h-4 text-gray-500" /> }
    ]
  };

  const shortcuts = activeModule && moduleShortcuts[activeModule] 
    ? [...defaultShortcuts, ...moduleShortcuts[activeModule]] 
    : defaultShortcuts;
`;

content = content.replace("export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {", "export function KeyboardShortcutsHelp({ isOpen, onClose, activeModule }: KeyboardShortcutsHelpProps) {");

content = content.replace(/const shortcuts = \[\s*\{ label: '唤醒全局命令面板[\s\S]*?\];/, defaultShortcuts);

fs.writeFileSync('src/components/KeyboardShortcutsHelp.tsx', content);
