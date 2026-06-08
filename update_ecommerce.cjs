const fs = require("fs");
let file = "src/components/ECommerceView.tsx";
let content = fs.readFileSync(file, "utf8");

// Change max-w-6xl to max-w-5xl for the results container
content = content.replace(/max-w-6xl/g, 'max-w-5xl');

// Change the generated wrapper to use CSS Grid instead of flex flex-wrap 
content = content.replace(
    /flex flex-wrap \${previewDevice === 'mobile' \? 'flex-col' : 'min-h-\[660px\]'}/g,
    "grid ${previewDevice === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[1fr_1fr] min-h-[660px]'}"
);

// Reduce padding in result preview
content = content.replace(/p-4 md:p-6/g, 'px-4 py-4 md:px-5 md:py-5');

fs.writeFileSync(file, content);
