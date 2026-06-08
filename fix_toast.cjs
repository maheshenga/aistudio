const fs = require('fs');
let content = fs.readFileSync('src/components/Toast.tsx', 'utf8');

// replace ToastOptions
content = content.replace(
  'interface ToastOptions {\n  id: string;\n  message: string;\n  type: ToastType;\n}',
  'export interface ToastAction { label: string; onClick: () => void; }\ninterface ToastOptions {\n  id: string;\n  message: string;\n  type: ToastType;\n  actions?: ToastAction[];\n}'
);

// replace add signature
content = content.replace(
  "add(message: string, type: ToastType = 'info', urgent: boolean = false) {",
  "add(message: string, type: ToastType = 'info', urgent: boolean = false, actions?: ToastAction[]) {"
);

// replace this.toasts = [...this.toasts, { id, message, type }];
content = content.replace(
  "this.toasts = [...this.toasts, { id, message, type }];",
  "this.toasts = [...this.toasts, { id, message, type, actions }];"
);

// Change timeout for action toasts
content = content.replace(
  "setTimeout(() => {\n      this.remove(id);\n    }, 3000);",
  "if (!actions || actions.length === 0) { setTimeout(() => { this.remove(id); }, 3000); }"
);

// replace export const toast
content = content.replace(
  "export const toast = (message: string, type: ToastType = 'info', urgent: boolean = false) => toastManager.add(message, type, urgent);",
  "export const toast = (message: string, type: ToastType = 'info', urgent: boolean = false, actions?: ToastAction[]) => toastManager.add(message, type, urgent, actions);"
);

// Add action buttons
content = content.replace(
  '<button onClick={() => toastManager.remove(toast.id)} className="ml-4 text-gray-500 hover:text-gray-700">',
  '{toast.actions && toast.actions.length > 0 && (\n              <div className="flex gap-2 ml-4">\n                {toast.actions.map((action, i) => (\n                  <button key={i} onClick={() => { action.onClick(); toastManager.remove(toast.id); }} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">\n                    {action.label}\n                  </button>\n                ))}\n              </div>\n            )}\n            <button onClick={() => toastManager.remove(toast.id)} className="ml-4 text-gray-500 hover:text-gray-700">'
);


fs.writeFileSync('src/components/Toast.tsx', content);
