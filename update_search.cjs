const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalSearchOverlay.tsx', 'utf8');

// replace imports 
content = content.replace("import { Search, Command, ArrowRight, Folder, LayoutDashboard, FileText, Image, Video, Users, X } from 'lucide-react';", "import { Search, Command, ArrowRight, Folder, LayoutDashboard, FileText, Image as ImageIcon, Video, Users, X, History } from 'lucide-react';");

const stateHistory = `  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
       try { setRecentSearches(JSON.parse(saved)); } catch(e){}
    }
  }, []);

  const saveToHistory = (item: string) => {
    setRecentSearches(prev => {
      const updated = [item, ...prev.filter(i => i !== item)].slice(0, 5);
      localStorage.setItem('recent_searches', JSON.stringify(updated));
      return updated;
    });
  };
`;

content = content.replace(/  const \[query, setQuery\] = useState\(''\);\n  const inputRef = useRef<HTMLInputElement>\(null\);/, stateHistory);

// Also need to use saveToHistory 
content = content.replace(
  "if (result.type === 'module') {\n                        onNavigate(result.id as ModuleId);\n                      }",
  "saveToHistory(result.title);\n                      if (result.type === 'module') {\n                        onNavigate(result.id as ModuleId);\n                      }"
);

// We need to show recent searches if query is empty.
// In the render:
const noResultsReplace = `        {searchResults.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto py-2">
            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
               Results
            </div>
            <ul className="px-2">
              {searchResults.map((result, i) => (`;

const newRender = `        {query === '' && recentSearches.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto py-2">
             <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
               Recent Searches
             </div>
             <ul className="px-2">
               {recentSearches.map((rec, i) => (
                 <li key={i}>
                   <button 
                     onClick={() => setQuery(rec)}
                     className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                   >
                     <History className="w-4 h-4 text-gray-400 mr-3" />
                     <span className="text-sm font-medium text-gray-700">{rec}</span>
                   </button>
                 </li>
               ))}
             </ul>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto py-2">
            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
               Results
            </div>
            <ul className="px-2">
              {searchResults.map((result, i) => (`;

content = content.replace(noResultsReplace, newRender);

fs.writeFileSync('src/components/GlobalSearchOverlay.tsx', content);
