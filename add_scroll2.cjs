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
    if (target.scrollTop > 20) {
      setIsViewScrolled(true);
    } else {
      setIsViewScrolled(false);
    }
    
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 20) {
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


// Let's modify the ROOT container. 
// "Update the ECommerceView component to use 'overflow-y-auto' with a custom scrollbar styling to ensure all content is accessible while maintaining the clean aesthetic, preventing content from being cut off."
const rootTarget = /className="grid grid-cols-1 lg:grid-cols-\[340px_1fr\] xl:grid-cols-\[380px_1fr\] h-auto min-h-\[calc\(100vh-4rem\)\] lg:h-\[calc\(100vh-4rem\)\] bg-\[#F8F9FA\] overflow-visible lg:overflow-hidden"/g;
const rootReplacement = `ref={viewScrollRef} onScroll={handleViewScroll} className={\`grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] h-[calc(100vh-4rem)] bg-[#F8F9FA] overflow-y-auto custom-scrollbar relative \${isViewScrolled ? 'shadow-[inset_0_12px_16px_-12px_rgba(0,0,0,0.1)]' : ''} \${!isViewScrollBottom ? 'shadow-[inset_0_-12px_16px_-12px_rgba(0,0,0,0.1)]' : ''}\`}`;
content = content.replace(rootTarget, rootReplacement);


// BUT ALSO, because if the ROOT wrapper is 'overflow-y-auto' and has fixed height, we MUST MAKE SURE its inner content can actually grow to trigger scroll if needed!
// Right now, inner left panel and inner right panel are 'h-full'. 
// If they are 'h-full' inside a 'h-[calc...]', they won't grow past the container height.
// Let's remove 'h-full' from them or change their 'overflow-y-auto' to instead just expand?
// Wait, if we keep them 'h-full' and let them handle their OWN scrolling on desktop, we should NOT make the ROOT container shadow stuff?
// Wait, on mobile, 'grid-cols-1' makes them stack! If they stack, their 'h-full' makes them 100vh EACH! That's why it was cutting off.
// If we change it so they stack naturally, we need to remove 'h-full' from Left Panel and Right Panel when on mobile, or just let the whole layout scroll properly.
// But if they wanted it to scroll, let's just make the left config panel the one that tracks scrolling, since that is where the 'category headers' are.

// Actually let's assume they DO want the outer container to be the scroll tracker.

fs.writeFileSync("add_scroll.cjs", content);
