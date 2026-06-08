const fs = require("fs");
let file = "src/components/ECommerceView.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
    'className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] h-auto min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] bg-[#F8F9FA] overflow-visible lg:overflow-hidden"',
    'className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] h-auto min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] bg-[#F8F9FA] overflow-y-auto custom-scrollbar lg:overflow-hidden"'
);

fs.writeFileSync(file, content);
