const fs = require('fs');
let topbar = fs.readFileSync('src/components/Topbar.tsx', 'utf8');

topbar = topbar.replace("interface TopbarProps {", "interface TopbarProps {\n  onOpenQuickNotes?: () => void;");

// find <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-colors tooltip relative" title="Notifications">

topbar = topbar.replace(
  '<button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-colors tooltip relative" title="Notifications">',
  `<button onClick={onOpenQuickNotes} className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-colors tooltip relative" title="Quick Notes">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sticky-note"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/></svg>
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-colors tooltip relative" title="Notifications">`
);

fs.writeFileSync('src/components/Topbar.tsx', topbar);

let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace("import { AgentStatusDashboardView } from './components/AgentStatusDashboardView';", "import { AgentStatusDashboardView } from './components/AgentStatusDashboardView';\nimport { QuickNotesPanel } from './components/QuickNotesPanel';");

app = app.replace("const [isCopilotOpen, setIsCopilotOpen] = useState(false);", "const [isCopilotOpen, setIsCopilotOpen] = useState(false);\n  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);");

app = app.replace("onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}", "onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}\n          onOpenQuickNotes={() => setIsQuickNotesOpen(true)}");

app = app.replace("<ToastContainer />", "<ToastContainer />\n      <QuickNotesPanel isOpen={isQuickNotesOpen} onClose={() => setIsQuickNotesOpen(false)} />");

fs.writeFileSync('src/App.tsx', app);
