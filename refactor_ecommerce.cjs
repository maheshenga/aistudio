const fs = require("fs");
let file = "src/components/ECommerceView.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
    'className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] h-[calc(100vh-4rem)] bg-[#F8F9FA] overflow-hidden"',
    'className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] h-auto min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] bg-[#F8F9FA] overflow-visible lg:overflow-hidden"'
);

content = content.replace(
    'const FormSection = ({ title, subtitle, extra, icon: Icon, children, className = \'\' }: any) => (\n  <div className={`space-y-3 block py-3 first:pt-0 ${className}`}>',
    'const FormSection = ({ title, subtitle, extra, icon: Icon, children, className = \'\' }: any) => (\n  <div className={`space-y-3 block py-5 border-b border-gray-100 last:border-b-0 first:pt-4 ${className}`}>'
);

content = content.replace(
    'className="flex-1 overflow-y-auto w-full p-6 space-y-0 divide-y divide-gray-100/80 custom-scrollbar pb-40 bg-[#FDFDFE]"',
    'className="flex-1 overflow-y-auto w-full px-5 py-2 custom-scrollbar pb-40 bg-[#FDFDFE]"'
);

fs.writeFileSync(file, content);
