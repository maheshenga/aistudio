const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// add splitRatio state
if (!content.includes('const [splitRatio')) {
  content = content.replace(
    "const [secondaryModule, setSecondaryModule] = useState<ModuleId | null>(null);",
    "const [secondaryModule, setSecondaryModule] = useState<ModuleId | null>(null);\n  const [splitRatio, setSplitRatio] = useState<number>(50);\n  const isDraggingRef = useRef<boolean>(false);"
  );
}

// update the container
content = content.replace(
  '<main className={`flex-1 overflow-hidden relative z-0 flex ${isSplitScreen ? \'bg-gray-100 p-2 gap-2\' : \'\'}`}>',
  '<main className={`flex-1 overflow-hidden relative z-0 flex ${isSplitScreen ? \'bg-gray-100 p-2 gap-2 flex-row\' : \'\'}`} onMouseMove={(e) => {\n            if (!isDraggingRef.current) return;\n            const container = e.currentTarget;\n            const rect = container.getBoundingClientRect();\n            const maxRatio = 80; const minRatio = 20;\n            let newRatio = ((e.clientX - rect.left) / rect.width) * 100;\n            newRatio = Math.max(minRatio, Math.min(newRatio, maxRatio));\n            setSplitRatio(newRatio);\n          }} onMouseUp={() => isDraggingRef.current = false} onMouseLeave={() => isDraggingRef.current = false} >'
);

// update primary pane
content = content.replace(
  'className={`flex flex-col min-w-0 flex-1 overflow-hidden relative ${isSplitScreen ? \'bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--border-color)] transition-all \' + (activePane === \'primary\' ? \'ring-2 ring-blue-500\' : \'opacity-70 hover:opacity-100\') : \'\'}`}',
  'className={`flex flex-col min-w-0 overflow-hidden relative ${isSplitScreen ? \'bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--border-color)] transition-none \' + (activePane === \'primary\' ? \'ring-2 ring-blue-500\' : \'opacity-70 hover:opacity-100\') : \'flex-1\'}`}\n            style={isSplitScreen ? { width: `${splitRatio}%`, flex: \'none\' } : undefined}'
);

// add drag handle between panes
content = content.replace(
  '{/* Secondary Pane */}',
  '{isSplitScreen && secondaryModule && (\n            <div \n              className="cursor-col-resize hover:bg-blue-200 transition-colors rounded-full shrink-0 flex items-center justify-center flex-col gap-1 w-2 my-10"\n              onMouseDown={() => isDraggingRef.current = true}\n            >\n              <div className="w-1 h-3 bg-gray-400 rounded-full"></div>\n              <div className="w-1 h-3 bg-gray-400 rounded-full"></div>\n              <div className="w-1 h-3 bg-gray-400 rounded-full"></div>\n            </div>\n          )}\n\n          {/* Secondary Pane */}'
);

content = content.replace(
  'className={`overflow-hidden relative bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--border-color)] transition-all flex flex-col min-w-0 flex-1 ${activePane === \'secondary\' ? \'ring-2 ring-blue-500\' : \'opacity-70 hover:opacity-100\'}`}',
  'className={`overflow-hidden relative bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--border-color)] transition-none flex flex-col min-w-0 ${activePane === \'secondary\' ? \'ring-2 ring-blue-500\' : \'opacity-70 hover:opacity-100\'}`}\n                style={{ width: `calc(${100 - splitRatio}% - 1rem)`, flex: \'none\' }}'
);

fs.writeFileSync('src/App.tsx', content);
