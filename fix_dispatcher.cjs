const fs = require('fs');
let content = fs.readFileSync('./src/components/GlobalAgentDispatcherModal.tsx', 'utf8');

if (!content.includes('import { BaseModal }')) {
  content = content.replace("import { motion, AnimatePresence } from 'motion/react';", "import { motion, AnimatePresence } from 'motion/react';\nimport { BaseModal } from './ui/BaseModal';");
}

let startStr = `  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
       <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         exit={{ opacity: 0, scale: 0.95 }}
         className="bg-[var(--bg-panel)] rounded-3xl overflow-hidden shadow-2xl w-full max-w-4xl border border-[var(--border-color)] flex flex-col md:flex-row h-[75vh]"
       >
`;

let replacement = `  return (
    <BaseModal 
         isOpen={isOpen} 
         onClose={onClose} 
         maxWidth="max-w-4xl" 
         zIndex={100} 
         hideHeader
         className="flex flex-col md:flex-row h-[75vh]"
    >
`;

content = content.replace(startStr, replacement);
content = content.replace(/       <\/motion\.div>\n    <\/div>/, '    </BaseModal>');

fs.writeFileSync('./src/components/GlobalAgentDispatcherModal.tsx', content, 'utf8');
console.log('Fixed GlobalAgentDispatcherModal');
