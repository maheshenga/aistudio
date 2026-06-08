const fs = require('fs');
let content = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

// Insert import
content = content.replace("import React, { useState, useRef, useEffect } from 'react';", "import React, { useState, useRef, useEffect } from 'react';\nimport { useUndoRedo } from '../context/UndoRedoContext';");

// Inside ChatView
content = content.replace("export function ChatView() {", "export function ChatView() {\n  const { pushAction } = useUndoRedo();");

// Replace handleStop and handleClearChat
content = content.replace("  const handleClearChat = () => {", `  const handleClearChat = () => {
    const oldMessages = [...messages];
    pushAction('ChatView', {
      undo: () => setMessages(oldMessages),
      redo: () => {
        handleStop();
        setMessages([{ id: Date.now().toString(), role: 'assistant', content: \`你好！我是\${activeAgent.name}。你可以向我输入任何诉求或上传相关文件，我将结合领域专业知识为你提供强有力的支持。\` }]);
      }
    });`);

// Around line offset for handleSend. Replace setMessages(p => [...p, { id: Date.now().toString(), role: 'user', content: userMsg }]);
content = content.replace("setMessages(p => [...p, { id: Date.now().toString(), role: 'user', content: userMsg }]);", `
    const newMsgObj = { id: Date.now().toString(), role: 'user' as const, content: userMsg };
    setMessages(p => {
      const newMessages = [...p, newMsgObj];
      pushAction('ChatView', {
        undo: () => setMessages(p),
        redo: () => setMessages(newMessages)
      });
      return newMessages;
    });`);

fs.writeFileSync('src/components/ChatView.tsx', content);
