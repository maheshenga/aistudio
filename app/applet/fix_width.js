const fs = require("fs");
const file = "src/components/StoreView.tsx";
let content = fs.readFileSync(file, "utf8");
content = content.replace(/className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"/g, 'className="w-full max-w-6xl mx-auto xl:max-w-7xl 2xl:max-w-[1600px] space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"');
fs.writeFileSync(file, content);
