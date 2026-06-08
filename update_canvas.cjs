const fs = require('fs');

let content = fs.readFileSync('src/components/AICanvasView.tsx', 'utf8');

// 1. imports
content = content.replace(
  "import { Palette, MonitorPlay,",
  "import { PenTool, Palette, MonitorPlay,"
);

// 2. Add Collaboration state
const statePattern = "const [showInsights, setShowInsights] = useState(false);";
const collaborationState = `
  const [showInsights, setShowInsights] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{x: number, y: number}[]>([]);
  const [strokes, setStrokes] = useState<{points: {x: number, y: number}[], color: string}[]>([]);
  const [collabNotes, setCollabNotes] = useState<{id: string, x: number, y: number, text: string, author: string}[]>([]);
  const [mockPoints, setMockPoints] = useState<{x: number, y: number}[]>([]);

  useEffect(() => {
    // Mock incoming remote drawing
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
         const t = Date.now() / 1000;
         // Draw a simple circle-like path relative to an anchor
         const cx = 200 + Math.random() * 400;
         const cy = 200 + Math.random() * 400;
         const newStroke = [];
         for(let i=0; i<10; i++) {
           newStroke.push({ x: cx + Math.cos(i) * 50, y: cy + Math.sin(i) * 50 });
         }
         setStrokes(prev => [...prev, { points: newStroke, color: '#10B981' }]); // Bob color
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);
`;
content = content.replace(statePattern, collaborationState);

// 3. Pointer Handlers logic inside AICanvasView
content = content.replace(
  "const handlePointerDown = (e: React.PointerEvent) => {",
  `const handlePointerDown = (e: React.PointerEvent) => {
    if (isDrawingMode) {
       (e.target as HTMLElement).setPointerCapture(e.pointerId);
       const rect = canvasRef.current?.getBoundingClientRect();
       if (rect) {
          const rawX = (e.clientX - rect.left - pan.x - rect.width/2) / zoomLevel;
          const rawY = (e.clientY - rect.top - pan.y - rect.height/2) / zoomLevel;
          setCurrentStroke([{x: rawX, y: rawY}]);
       }
       return;
    }
`
);

content = content.replace(
  "const handlePointerMove = (e: React.PointerEvent) => {",
  `const handlePointerMove = (e: React.PointerEvent) => {
    if (isDrawingMode && currentStroke.length > 0) {
       const rect = canvasRef.current?.getBoundingClientRect();
       if (rect) {
          const rawX = (e.clientX - rect.left - pan.x - rect.width/2) / zoomLevel;
          const rawY = (e.clientY - rect.top - pan.y - rect.height/2) / zoomLevel;
          setCurrentStroke(prev => [...prev, {x: rawX, y: rawY}]);
       }
       return;
    }
`
);

content = content.replace(
  "const handlePointerUp = (e: React.PointerEvent) => {",
  `const handlePointerUp = (e: React.PointerEvent) => {
    if (isDrawingMode && currentStroke.length > 0) {
       setStrokes(prev => [...prev, { points: currentStroke, color: '#EF4444' }]); // Alice color
       setCurrentStroke([]);
       (e.target as HTMLElement).releasePointerCapture(e.pointerId);
       // We can also trigger a saveHistory here if we wanted
       return;
    }
`
);

// 4. Add the button to toolbar
const buttonPattern = `<button className="p-3 rounded-xl bg-gray-100 text-gray-900 transition-colors tooltip shadow-sm" title="选择与连接"><MousePointer2 className="w-[20px] h-[20px]"/></button>`;
const newButton = `
         <button onClick={() => setIsDrawingMode(!isDrawingMode)} className={\`p-3 rounded-xl transition-colors tooltip shadow-sm \${isDrawingMode ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-900'}\`} title="协作标记 (Draw)">
             <PenTool className="w-[20px] h-[20px]"/>
         </button>
         <button onClick={() => setIsDrawingMode(false)} className="p-3 rounded-xl hover:bg-gray-100/80 text-gray-500 hover:text-gray-900 transition-colors tooltip" title="选择与连接"><MousePointer2 className="w-[20px] h-[20px]"/></button>
`;
content = content.replace(buttonPattern, newButton);


// 5. Add rendering for the drawings inside #canvas-bg
// It needs to be inside the wrapper that applies Pan and Zoom.
// Around line: <div className="absolute pointer-events-none z-50 flex items-center transition-all duration-[2000ms] ease-in-out" style={{ left: '60%', top: '40%' }}>

const overlayRegex = /{([^{}]*{[^}]*}[^{}]*)} \/\* Fake Collaboration Cursors \*\//g;
// Wait, regex might fail. I'll just find the exact text
const SVG_MARKER = `<svg className="absolute top-[-2000px] left-[-2000px] pointer-events-none z-0 overflow-visible origin-top-left" style={{ width: '4000px', height: '4000px' }}>`;
const overlayDrawings = `
              {/* Collaborative Drawings */}
              <svg className="absolute top-[-2000px] left-[-2000px] z-10 overflow-visible origin-top-left pointer-events-none" style={{ width: '4000px', height: '4000px' }}>
                 {strokes.map((stroke, i) => (
                    <polyline key={i} points={stroke.points.map(p => \`\${p.x + 2000},\${p.y + 2000}\`).join(' ')} fill="none" stroke={stroke.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                 ))}
                 {currentStroke.length > 0 && (
                    <polyline points={currentStroke.map(p => \`\${p.x + 2000},\${p.y + 2000}\`).join(' ')} fill="none" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                 )}
              </svg>
`;

content = content.replace(SVG_MARKER, overlayDrawings + "\\n" + SVG_MARKER);

// 6. Provide the canvasRef to the wrapper wrapper
// To ensure mouse events work perfectly, the div #canvas-bg already has the event handlers. We just need to give it ref={canvasRef}
content = content.replace(`id="canvas-bg"`, `id="canvas-bg" ref={canvasRef}`);

fs.writeFileSync('src/components/AICanvasView.tsx', content);

console.log("AICanvasView updated successfully.");
