const fs = require('fs');

let content = fs.readFileSync('src/components/PerformanceMonitor.tsx', 'utf8');

// replace imports to include Download icon and jsPDF + html2canvas
content = content.replace("import { Activity, Cpu, Wifi } from 'lucide-react';", "import { Activity, Cpu, Wifi, Download } from 'lucide-react';\nimport jsPDF from 'jspdf';\nimport html2canvas from 'html2canvas';\nimport { useRef } from 'react';");

// add ref to the div we want to export
content = content.replace("const [history, setHistory] = useState<any[]>([]);", `const [history, setHistory] = useState<any[]>([]);
  const monitorRef = useRef<HTMLDivElement>(null);
  
  const handleExportPDF = async () => {
    if (!monitorRef.current) return;
    try {
       const canvas = await html2canvas(monitorRef.current, { backgroundColor: '#111827' });
       const imgData = canvas.toDataURL('image/png');
       const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
       pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
       pdf.save('performance_report.pdf');
    } catch(e) {
       console.error("PDF Export failed", e);
    }
  };`);

// add ref to div, add button
content = content.replace('initial={{ opacity: 0, y: 50 }}', 'ref={monitorRef}\n      initial={{ opacity: 0, y: 50 }}');
content = content.replace(
  '<span className="text-[9px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">LIVE</span>',
  '<button onClick={handleExportPDF} className="pointer-events-auto hover:text-white transition-colors" title="Export PDF Report"><Download className="w-3 h-3" /></button>\n        <span className="text-[9px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">LIVE</span>'
);

// We need to change pointer-events-none to let the button be clicked.
content = content.replace("className=\"fixed bottom-6 left-6 z-[9999] bg-gray-900/95 backdrop-blur-md text-green-400 p-4 rounded-xl shadow-2xl border border-gray-700 font-mono text-[11px] w-80 pointer-events-none\"", "className=\"fixed bottom-6 left-6 z-[9999] bg-gray-900/95 backdrop-blur-md text-green-400 p-4 rounded-xl shadow-2xl border border-gray-700 font-mono text-[11px] w-80\"");

fs.writeFileSync('src/components/PerformanceMonitor.tsx', content);
