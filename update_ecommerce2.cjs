const fs = require("fs");
let file = "src/components/ECommerceView.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
    /w-full flex-\[1_1_400px\] /g,
    "w-full h-full min-h-0 "
);

content = content.replace(
    /w-full flex-\[1_1_350px\] /g,
    "w-full h-full min-h-0 "
);

content = content.replace(/'w-full flex-\[1_1_350px\]'/g, "'w-full h-full'");

fs.writeFileSync(file, content);
