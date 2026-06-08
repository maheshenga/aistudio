const fs = require('fs');

let modalContent = fs.readFileSync('./src/components/ui/BaseModal.tsx', 'utf8');
modalContent = modalContent.replace(/\\`/g, "`");
modalContent = modalContent.replace(/\\\${/g, "${");
fs.writeFileSync('./src/components/ui/BaseModal.tsx', modalContent, 'utf8');

let dispatcherContent = fs.readFileSync('./src/components/GlobalAgentDispatcherModal.tsx', 'utf8');
dispatcherContent = dispatcherContent.replace('className={`h-1.5 rounded-full transition-all duration-300 ${agent.status === \'completed\' ? \'bg-[var(--color-success)]\' : \'bg-[var(--color-primary)]\'}`} \n                                    className="h-1.5 rounded-full transition-all duration-300"', 'className={`h-1.5 rounded-full transition-all duration-300 ${agent.status === \'completed\' ? \'bg-[var(--color-success)]\' : \'bg-[var(--color-primary)]\'}`} ');
fs.writeFileSync('./src/components/GlobalAgentDispatcherModal.tsx', dispatcherContent, 'utf8');

console.log('Fixed BaseModal syntax and deduplicated className');
