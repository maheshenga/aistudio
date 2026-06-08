const fs = require("fs");
const file = "src/components/StoreView.tsx";
let content = fs.readFileSync(file, "utf8");
content = content.replace(/className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"/g, 'className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 xl:max-w-6xl 2xl:max-w-[1400px]"');
fs.writeFileSync(file, content);
