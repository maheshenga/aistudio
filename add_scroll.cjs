const fs = require("fs");
let file = "src/components/ECommerceView.tsx";
let content = fs.readFileSync(file, "utf8");

// 1. Add ArrowUp to import
if (!content.includes("ArrowUp")) {
    content = content.replace("Layers } from 'lucide-react';", "Layers, ArrowUp } from 'lucide-react';");
}
if (!content.includes("useRef")) {
    content = content.replace("useState, useEffect, useMemo", "useState, useEffect, useMemo, useRef");
}

// 2. Add State and Refs
const stateCode = `
  const viewScrollRef = useRef<HTMLDivElement>(null);
  const [isViewScrolled, setIsViewScrolled] = useState(false);
  const [isViewScrollBottom, setIsViewScrollBottom] = useState(false);

  const handleViewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop > 50) {
      setIsViewScrolled(true);
    } else {
      setIsViewScrolled(false);
    }
    
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 50) {
      setIsViewScrollBottom(true);
    } else {
      setIsViewScrollBottom(false);
    }
  };

  const scrollToTop = () => {
    if (viewScrollRef.current) {
      viewScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
`;

content = content.replace(
  "const [aspectRatio, setAspectRatio] = useState('');",
  "const [aspectRatio, setAspectRatio] = useState('');\n" + stateCode
);

// 3. Update ROOT ECommerceView container to use overflow-y-auto + custom-scrollbar + top/bottom shadow indicators
const rootTarget = `<div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] h-auto min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] bg-[#F8F9FA] overflow-visible lg:overflow-hidden">`;
const rootReplacement = `<div 
      ref={viewScrollRef}
      onScroll={handleViewScroll}
      className={\`grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] h-[calc(100vh-4rem)] bg-[#F8F9FA] overflow-y-auto custom-scrollbar relative \${isViewScrolled ? 'shadow-[inset_0_12px_16px_-12px_rgba(0,0,0,0.1)]' : ''} \${!isViewScrollBottom ? 'shadow-[inset_0_-12px_16px_-12px_rgba(0,0,0,0.1)]' : ''}\`}
    >`;

content = content.replace(rootTarget, rootReplacement);

// If the previous rootTarget didn't match perfectly, we can do a regex
if (!content.includes("viewScrollRef")) {
     content = content.replace(
         /className="grid grid-cols-1 lg:grid-cols-\[340px_1fr\] xl:grid-cols-\[380px_1fr\] h-auto min-h-\[calc\(100vh-4rem\)\] lg:h-\[calc\(100vh-4rem\)\] bg-\[#F8F9FA\] overflow-visible lg:overflow-hidden"/g,
         `ref={viewScrollRef} onScroll={handleViewScroll} className={\`grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] h-[calc(100vh-4rem)] bg-[#F8F9FA] overflow-y-auto custom-scrollbar relative \${isViewScrolled ? 'shadow-[inset_0_12px_16px_-12px_rgba(0,0,0,0.1)]' : ''} \${!isViewScrollBottom ? 'shadow-[inset_0_-12px_16px_-12px_rgba(0,0,0,0.1)]' : ''}\`}`
     );
}

// 4. Add the Back to Top button. ECommerceView component closes with two divs normally? Wait, let's just insert it right before the final closing tag of the component.
// I'll put it at the very end.
content = content.replace(
  "    </div>\n  );\n}",
  `      {/* Back to Top Button */}
      <div className={\`fixed bottom-8 right-8 z-50 transition-all duration-300 \${isViewScrolled ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible'}\`}>
         <button 
           onClick={scrollToTop}
           className="w-12 h-12 bg-white border border-gray-200 shadow-[0_8px_20px_rgba(0,0,0,0.12)] rounded-full flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:shadow-xl transition-all"
           title="回到顶部"
         >
            <ArrowUp className="w-6 h-6" />
         </button>
      </div>
    </div>
  );
}`
);

fs.writeFileSync("add_scroll.cjs", content);
