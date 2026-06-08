const fs = require("fs");
let file = "src/components/ECommerceView.tsx";
let content = fs.readFileSync(file, "utf8");
content = content.replace(/py-5/g, 'py-3');
content = content.replace(/pb-5/g, 'pb-3');
content = content.replace(/gap-3/g, 'gap-2');
content = content.replace(/space-y-4/g, 'space-y-3');
content = content.replace(/p-6 md:p-8/g, 'p-4 md:p-6');
content = content.replace(/p-4/g, 'p-3');
content = content.replace(/p-5/g, 'p-4');
content = content.replace(/px-6/g, 'px-5');
fs.writeFileSync(file, content);

let file2 = "src/components/StoreView.tsx";
let content2 = fs.readFileSync(file2, "utf8");
content2 = content2.replace(/w-full max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 xl.*?2xl.*?\"/g, 'w-full max-w-5xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300"');
content2 = content2.replace(/gap-6/g, 'gap-4');
content2 = content2.replace(/p-6/g, 'p-5');
fs.writeFileSync(file2, content2);
