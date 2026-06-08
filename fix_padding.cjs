const fs = require("fs");
const file = "src/components/ECommerceView.tsx";
let content = fs.readFileSync(file, "utf8");
content = content.replace(/py-8/g, 'py-5');
content = content.replace(/pb-8/g, 'pb-5');
content = content.replace(/space-y-4 block/g, 'space-y-3 block');
content = content.replace(/py-6/g, 'py-5');
content = content.replace(/space-y-6 bg-blue-50/g, 'space-y-4 bg-blue-50');
fs.writeFileSync(file, content);
