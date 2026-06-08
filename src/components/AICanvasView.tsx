import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PenTool, Palette, MonitorPlay, Save, Download, MousePointer2, Move, ZoomIn, Image as ImageIcon, Sparkles, Wand2, Type, Layers, BoxSelect, Maximize, Undo2, Redo2, Copy, Trash2, Webhook, Settings, GripVertical, FileJson, Video, Eye, Terminal, Clock, History, ChevronRight, ChevronDown, AlertCircle, Search, Camera, Network, StickyNote, CheckCircle2, Loader2, AlertTriangle, Share } from 'lucide-react';

type NodeType = 'imageGen' | 'nlp' | 'vision' | 'videoGen' | 'macroNode' | 'dataFarming' | 'knowledgeHarvest' | 'productTagging' | 'modelSwap' | 'videoHighlight' | 'socialMediaCopy' | 'seoCopy';

interface NodeData {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  title: string;
  config: any;
}

interface EdgeData {
  id: string;
  fromId: string;
  toId: string;
}

const INITIAL_NODES: NodeData[] = [
  { id: 'node-1', type: 'imageGen', x: -400, y: -200, title: '核心物料渲染器节点', config: { seed: 84920015, steps: 40, cfg: 7.5 } },
  { id: 'node-2', type: 'nlp', x: 240, y: -50, title: 'Gemini 视觉文案转化节点', config: {} }
];

const INITIAL_EDGES: EdgeData[] = [
  { id: 'edge-1', fromId: 'node-1', toId: 'node-2' }
];

const NODE_TEMPLATES = [
  { type: 'imageGen', title: '核心物料渲染器', desc: 'Generates high quality core assets using advanced diffusion models.', icon: <ImageIcon className="icon-sm text-blue-500" /> },
  { type: 'nlp', title: 'Gemini 视觉文案转化', desc: 'Converts visual context into compelling copywriting via Gemini API.', icon: <Type className="icon-sm text-amber-500" /> },
  { type: 'vision', title: 'Vision 智能抠图', desc: 'Smart background removal and object extraction using vision AI.', icon: <Eye className="icon-sm text-green-500" /> },
  { type: 'videoGen', title: 'Sora 视频扩散态', desc: 'Transforms prompts and static images into dynamic video sequences.', icon: <Video className="icon-sm text-purple-500" /> },
  { type: 'dataFarming', title: '数据耕作引擎', desc: 'Continuous data cultivation and preprocessing pipeline.', icon: <BoxSelect className="icon-sm text-emerald-500" /> },
  { type: 'knowledgeHarvest', title: '知识收割节点', desc: 'Harvests structured insights from raw unstructured logs.', icon: <Network className="icon-sm text-orange-500" /> },
  { type: 'productTagging', title: '智能商品打标', desc: 'Auto-tags commerce products using multimodal analysis.', icon: <Search className="icon-sm text-blue-500" /> },
  { type: 'modelSwap', title: '模特换衣渲染', desc: 'Virtual try-on and model replacement for fashion commerce.', icon: <Camera className="icon-sm text-pink-500" /> },
  { type: 'videoHighlight', title: '视频高光剪辑', desc: 'Extracts viral highlights from long-form video.', icon: <Video className="icon-sm text-purple-400" /> },
  { type: 'socialMediaCopy', title: '小红书爆款生成', desc: 'Generates trending social media copy with emojis and hashtags.', icon: <Type className="icon-sm text-red-500" /> },
  { type: 'seoCopy', title: 'SEO 外链文案', desc: 'Optimized blog and site copy for search engines.', icon: <Type className="icon-sm text-orange-500" /> },
  { type: 'macroNode', title: 'Macro Pipeline Node', desc: 'Groups multiple agent nodes into a single collapsible orchestration pipeline.', icon: <Layers className="icon-sm text-indigo-500" /> },
];

const nodeTypesEnv: Record<NodeType, { in: string[], out: string[] }> = {
    imageGen: { in: ['text'], out: ['image'] },
    nlp: { in: ['image', 'text'], out: ['text'] },
    vision: { in: ['image'], out: ['image'] },
    videoGen: { in: ['image', 'text'], out: ['video'] },
    dataFarming: { in: ['raw'], out: ['processed'] },
    knowledgeHarvest: { in: ['processed'], out: ['insights'] },
    productTagging: { in: ['image'], out: ['json'] },
    modelSwap: { in: ['image'], out: ['image'] },
    videoHighlight: { in: ['video'], out: ['video'] },
    socialMediaCopy: { in: ['text', 'image'], out: ['text'] },
    seoCopy: { in: ['text'], out: ['text'] },
    macroNode: { in: ['any'], out: ['any'] }
};

export function AICanvasView() {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<EdgeData[]>(INITIAL_EDGES);
  
  const [history, setHistory] = useState<{nodes: NodeData[], edges: EdgeData[]}[]>([{ nodes: INITIAL_NODES, edges: INITIAL_EDGES }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [paletteQuery, setPaletteQuery] = useState('');
  
  const [activeTab, setActiveTab] = useState<'props' | 'palette' | 'library' | 'history' | 'templates'>('palette');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logFilterNodeId, setLogFilterNodeId] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<{ id: string, name: string, nodes: NodeData[], edges: EdgeData[] }[]>([]);

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string } | null>(null);
  const [draggingNode, setDraggingNode] = useState<{ id: string, anchorX: number, anchorY: number, startX: number, startY: number } | null>(null);
  const [tempEdge, setTempEdge] = useState<{ originId: string, endX: number, endY: number } | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<{ x?: number, y?: number } | null>(null);
  const [draggedPaletteItem, setDraggedPaletteItem] = useState<{ type: NodeType, title: string } | null>(null);
  const [previewNode, setPreviewNode] = useState<{ type: NodeType, title: string, x: number, y: number } | null>(null);
  
  const [executionLogs, setExecutionLogs] = useState<{ time: string, sender: string, text: React.ReactNode, type?: 'info' | 'warn' | 'error' | 'success', cpuUsage?: number, memUsage?: number }[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  
  const [showInsights, setShowInsights] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{x: number, y: number}[]>([]);
  const [strokes, setStrokes] = useState<{points: {x: number, y: number}[], color: string}[]>([]);
  const [collabNotes, setCollabNotes] = useState<{id: string, x: number, y: number, text: string, author: string}[]>([]);
  const [mockPoints, setMockPoints] = useState<{x: number, y: number}[]>([]);

  useEffect(() => {
    // Mock incoming remote drawing
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
         const t = Date.now() / 1000;
         // Draw a simple circle-like path relative to an anchor
         const cx = 200 + Math.random() * 400;
         const cy = 200 + Math.random() * 400;
         const newStroke = [];
         for(let i=0; i<10; i++) {
           newStroke.push({ x: cx + Math.cos(i) * 50, y: cy + Math.sin(i) * 50 });
         }
         setStrokes(prev => [...prev, { points: newStroke, color: '#10B981' }]); // Bob color
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
     const interval = setInterval(() => {
        localStorage.setItem('aistudio_autosave', JSON.stringify({ nodes, edges }));
        setLastSavedTime(new Date());
     }, 30000);
     return () => clearInterval(interval);
  }, [nodes, edges]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length > 0) {
          const newNodes = nodes.filter(n => !selectedNodeIds.includes(n.id));
          const newEdges = edges.filter(edg => !selectedNodeIds.includes(edg.fromId) && !selectedNodeIds.includes(edg.toId));
          setNodes(newNodes);
          setEdges(newEdges);
          saveHistory(newNodes, newEdges);
          setSelectedNodeIds([]);
          setSelectedNodeId(null);
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          if (e.shiftKey) {
             alert('Snapshot of canvas captured successfully!');
          } else {
             localStorage.setItem('aistudio_autosave', JSON.stringify({ nodes, edges }));
             alert('Workflow state saved successfully.');
          }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (historyIndex > 0) {
             setHistoryIndex(historyIndex - 1);
             setNodes(history[historyIndex - 1].nodes);
             setEdges(history[historyIndex - 1].edges);
          }
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
          e.preventDefault();
          if (historyIndex < history.length - 1) {
             setHistoryIndex(historyIndex + 1);
             setNodes(history[historyIndex + 1].nodes);
             setEdges(history[historyIndex + 1].edges);
          }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, selectedNodeIds, history, historyIndex]);

  const canvasRef = useRef<HTMLDivElement>(null);

  const saveHistory = (newNodes: NodeData[], newEdges: EdgeData[]) => {
     const newHistory = history.slice(0, historyIndex + 1);
     newHistory.push({ nodes: newNodes, edges: newEdges });
     setHistory(newHistory);
     setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
     if (historyIndex > 0) {
        setHistoryIndex(historyIndex - 1);
        setNodes(history[historyIndex - 1].nodes);
        setEdges(history[historyIndex - 1].edges);
     }
  };

  const redo = () => {
     if (historyIndex < history.length - 1) {
        setHistoryIndex(historyIndex + 1);
        setNodes(history[historyIndex + 1].nodes);
        setEdges(history[historyIndex + 1].edges);
     }
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoomLevel((z) => Math.min(Math.max(0.1, z - e.deltaY * 0.01), 3));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isDrawingMode) {
       (e.target as HTMLElement).setPointerCapture(e.pointerId);
       const rect = canvasRef.current?.getBoundingClientRect();
       if (rect) {
          const rawX = (e.clientX - rect.left - pan.x - rect.width/2) / zoomLevel;
          const rawY = (e.clientY - rect.top - pan.y - rect.height/2) / zoomLevel;
          setCurrentStroke([{x: rawX, y: rawY}]);
       }
       return;
    }

    setContextMenu(null);
    if (e.button === 1 || (e.target as HTMLElement).id === 'canvas-bg') {
      setIsPanning(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
    }
  };

  const rafRef = useRef<number | null>(null);
  const pendingPan = useRef({ x: 0, y: 0 });

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDrawingMode && currentStroke.length > 0) {
       const rect = canvasRef.current?.getBoundingClientRect();
       if (rect) {
          const rawX = (e.clientX - rect.left - pan.x - rect.width/2) / zoomLevel;
          const rawY = (e.clientY - rect.top - pan.y - rect.height/2) / zoomLevel;
          setCurrentStroke(prev => [...prev, {x: rawX, y: rawY}]);
       }
       return;
    }

    if (isPanning) {
      pendingPan.current.x += e.movementX;
      pendingPan.current.y += e.movementY;
      
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setPan((p) => ({ 
             x: p.x + pendingPan.current.x, 
             y: p.y + pendingPan.current.y 
          }));
          pendingPan.current = { x: 0, y: 0 };
          rafRef.current = null;
        });
      }
    } else if (draggingNode) {
       if (!rafRef.current) {
         rafRef.current = requestAnimationFrame(() => {
           const rawX = draggingNode.startX + (e.clientX - draggingNode.anchorX) / zoomLevel;
           const rawY = draggingNode.startY + (e.clientY - draggingNode.anchorY) / zoomLevel;
           
           let newX = Math.round(rawX / 20) * 20;
           let newY = Math.round(rawY / 20) * 20;
           
           let alignX = undefined;
           let alignY = undefined;
           
           nodes.forEach(n => {
               if (n.id !== draggingNode.id) {
                   if (Math.abs(newX - n.x) < 15) { newX = n.x; alignX = n.x; }
                   if (Math.abs(newY - n.y) < 15) { newY = n.y; alignY = n.y; }
               }
           });
           
           setAlignmentGuides({ x: alignX, y: alignY });

           setNodes(prev => prev.map(n => 
             n.id === draggingNode.id 
               ? { ...n, x: newX, y: newY } 
               : n
           ));
           rafRef.current = null;
         });
       }
    } else if (tempEdge) {
       if (!rafRef.current) {
         rafRef.current = requestAnimationFrame(() => {
           let mx = e.clientX;
           let my = e.clientY;
           
           if (canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const pX = (e.clientX - rect.left - pan.x - rect.width/2) / zoomLevel;
              const pY = (e.clientY - rect.top - pan.y - rect.height/2) / zoomLevel;
              
              for (let n of nodes) {
                  if (n.id !== tempEdge.originId) {
                     const portX = n.x;
                     const portY = n.y + (n.type === 'imageGen' ? 200 : (n.type === 'macroNode' ? 80 : 100)); // target port is on left
                     if (Math.abs(pX - portX) < 50 && Math.abs(pY - portY) < 50) {
                         mx = rect.left + pan.x + rect.width/2 + portX * zoomLevel;
                         my = rect.top + pan.y + rect.height/2 + portY * zoomLevel;
                         break;
                     }
                  }
              }
           }

           setTempEdge({ ...tempEdge, endX: mx, endY: my });
           rafRef.current = null;
         });
       }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDrawingMode && currentStroke.length > 0) {
       setStrokes(prev => [...prev, { points: currentStroke, color: '#EF4444' }]); // Alice color
       setCurrentStroke([]);
       (e.target as HTMLElement).releasePointerCapture(e.pointerId);
       // We can also trigger a saveHistory here if we wanted
       return;
    }

    setIsPanning(false);
    
    if (draggingNode) {
       const node = nodes.find(n => n.id === draggingNode.id);
       if (node && (node.x !== draggingNode.startX || node.y !== draggingNode.startY)) {
          saveHistory(nodes, edges);
       }
    }
    
    setDraggingNode(null);
    setAlignmentGuides(null);
    if (tempEdge) setTempEdge(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleExportWorkflow = () => {
    const workflowData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      nodes,
      edges,
      viewport: { pan, zoomLevel }
    };
    const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDragStart = (e: React.DragEvent, type: string, title: string) => {
    e.dataTransfer.setData('application/node-type', type);
    e.dataTransfer.setData('application/node-title', title);
    setDraggedPaletteItem({ type: type as NodeType, title });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = (e.dataTransfer.getData('application/node-type') || draggedPaletteItem?.type) as NodeType;
    const title = e.dataTransfer.getData('application/node-title') || draggedPaletteItem?.title || 'Node';
    
    if (type && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x - rect.width/2) / zoomLevel;
      const rawY = (e.clientY - rect.top - pan.y - rect.height/2) / zoomLevel;
      
      const newNode: NodeData = {
        id: `node-${Date.now()}`,
        type,
        title,
        x: Math.round(rawX / 20) * 20,
        y: Math.round(rawY / 20) * 20,
        config: {}
      };
      const newNodes = [...nodes, newNode];
      setNodes(newNodes);
      saveHistory(newNodes, edges);
    }
    setPreviewNode(null);
    setDraggedPaletteItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedPaletteItem && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const rawX = (e.clientX - rect.left - pan.x - rect.width/2) / zoomLevel;
        const rawY = (e.clientY - rect.top - pan.y - rect.height/2) / zoomLevel;
        setPreviewNode({
            type: draggedPaletteItem.type,
            title: draggedPaletteItem.title,
            x: Math.round(rawX / 20) * 20,
            y: Math.round(rawY / 20) * 20
        });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setPreviewNode(null);
  };

  const handleAutoLayout = () => {
    // Simple topological sort / rank assignment
    const ranks: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    
    nodes.forEach(n => {
        adj[n.id] = [];
        inDegree[n.id] = 0;
        ranks[n.id] = 0;
    });
    
    edges.forEach(e => {
        if (adj[e.fromId]) adj[e.fromId].push(e.toId);
        if (inDegree[e.toId] !== undefined) inDegree[e.toId]++;
    });

    const queue: string[] = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
    // If there are cycles or no roots, just take first node
    if (queue.length === 0 && nodes.length > 0) queue.push(nodes[0].id);

    while (queue.length > 0) {
        const u = queue.shift()!;
        (adj[u] || []).forEach(v => {
            if (ranks[v] < ranks[u] + 1) {
                ranks[v] = ranks[u] + 1;
                queue.push(v);
            }
        });
    }

    const rankCounts: Record<number, number> = {};
    const newNodes = nodes.map(n => {
        const r = ranks[n.id] || 0;
        const count = rankCounts[r] || 0;
        rankCounts[r] = count + 1;
        return {
            ...n,
            x: r * 450 - 500, // horizontal spacing
            y: count * 350 - 200 // vertical spacing
        };
    });

    setNodes(newNodes);
    setPan({ x: 0, y: 0 }); // reset pan nicely
    saveHistory(newNodes, edges);
  };

  const handleGroupNodes = () => {
      if (selectedNodeIds.length < 2) return;
      
      const nodesToGroup = nodes.filter(n => selectedNodeIds.includes(n.id));
      const avgX = nodesToGroup.reduce((sum, n) => sum + n.x, 0) / nodesToGroup.length;
      const avgY = nodesToGroup.reduce((sum, n) => sum + n.y, 0) / nodesToGroup.length;
      
      const newMacroNode: NodeData = {
          id: `node-${Date.now()}`,
          type: 'macroNode',
          title: `Macro Node (${nodesToGroup.length} items)`,
          x: Math.round(avgX / 20) * 20,
          y: Math.round(avgY / 20) * 20,
          config: {
              innerNodes: nodesToGroup 
          }
      };
      
      const newNodes = [
          ...nodes.filter(n => !selectedNodeIds.includes(n.id)),
          newMacroNode
      ];
      
      let newEdges = [...edges];
      newEdges = newEdges.filter(e => {
          const fromInner = selectedNodeIds.includes(e.fromId);
          const toInner = selectedNodeIds.includes(e.toId);
          if (fromInner && toInner) return false;
          return true;
      }).map(e => {
          const fromInner = selectedNodeIds.includes(e.fromId);
          const toInner = selectedNodeIds.includes(e.toId);
          if (fromInner) return { ...e, fromId: newMacroNode.id };
          if (toInner) return { ...e, toId: newMacroNode.id };
          return e;
      });
      
      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedNodeIds([newMacroNode.id]);
      setSelectedNodeId(newMacroNode.id);
      saveHistory(newNodes, newEdges);
  };

  const getEdgesStatus = () => {
     const statuses: Record<string, { typeError?: boolean, cyclic?: boolean }> = {};
     edges.forEach(e => statuses[e.id] = {});
     
     // 1. Type validation
     edges.forEach(e => {
         const source = nodes.find(n => n.id === e.fromId);
         const target = nodes.find(n => n.id === e.toId);
         if (source && target) {
            const sOut = nodeTypesEnv[source.type]?.out || ['any'];
            const tIn = nodeTypesEnv[target.type]?.in || ['any'];
            if (sOut[0] !== 'any' && tIn[0] !== 'any' && !sOut.some(o => tIn.includes(o)) && !tIn.some(i => sOut.includes(i))) {
               statuses[e.id].typeError = true;
            }
         }
     });
  
     // 2. Cycle detection
     const adj: Record<string, string[]> = {};
     nodes.forEach(n => adj[n.id] = []);
     edges.forEach(e => {
        if (adj[e.fromId]) adj[e.fromId].push(e.toId);
     });
  
     const visited = new Set<string>();
     const recStack = new Set<string>();
  
     const dfs = (nodeId: string) => {
         visited.add(nodeId);
         recStack.add(nodeId);
  
         if (adj[nodeId]) {
             for (const neighbor of adj[nodeId]) {
                 if (!visited.has(neighbor)) {
                     if (dfs(neighbor)) return true;
                 } else if (recStack.has(neighbor)) {
                     const cyclicEdge = edges.find(e => e.fromId === nodeId && e.toId === neighbor);
                     if (cyclicEdge) statuses[cyclicEdge.id].cyclic = true;
                     return true;
                 }
             }
         }
         recStack.delete(nodeId);
         return false;
     };
  
     nodes.forEach(n => {
         if (!visited.has(n.id)) dfs(n.id);
     });
  
     return statuses;
  }
  
  const edgeStatuses = getEdgesStatus();
  const hasCycle = Object.values(edgeStatuses).some(s => s.cyclic);
  const hasTypeError = Object.values(edgeStatuses).some(s => s.typeError);

  const runWorkflow = () => {
    if (hasCycle || hasTypeError || isExecuting) return;
    
    setShowLogs(true);
    setIsExecuting(true);
    
    const initialLogs = [
        { time: new Date().toLocaleTimeString('en-US', {hour12:false}), sender: 'SYSTEM', text: 'Initializing workflow execution...' }
    ];
    setExecutionLogs(initialLogs);
    
    setTimeout(() => {
        setExecutionLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-US', {hour12:false}), sender: 'node-1', text: 'Rendering core material... seed: 84920015', cpuUsage: 89, memUsage: 4500 }]);
    }, 800);
    
    setTimeout(() => {
        setExecutionLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-US', {hour12:false}), sender: 'node-2', type: 'error' as const, text: 'Vision analysis failed: Network Error / Timeout.', cpuUsage: 12, memUsage: 300 }]);
    }, 2000);
    
    setTimeout(() => {
        setExecutionLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-US', {hour12:false}), sender: 'SYSTEM', type: 'warn' as const, text: '自动重试中 (Auto-retrying in 10s)...' }]);
    }, 2100);
    
    setTimeout(() => {
        setExecutionLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-US', {hour12:false}), sender: 'node-2', text: 'Retry 1: Vision analysis processing...', cpuUsage: 95, memUsage: 5120 }]);
    }, 12100);
    
    setTimeout(() => {
        setExecutionLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-US', {hour12:false}), sender: 'node-2', type: 'success' as const, text: 'Vision analysis completed successfully.', cpuUsage: 5, memUsage: 200 }]);
        setIsExecuting(false);
    }, 14000);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);


  return (
    <div className="p-0 h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#e5e5f7] relative animate-in fade-in duration-300">
      
      {/* Canvas Top Bar */}
      <div className="h-14 bg-[var(--bg-panel)]/95 backdrop-blur shadow-[0_1px_4px_rgba(0,0,0,0.05)] border-b border-[var(--border-color)] flex items-center justify-between px-4 z-30 shrink-0">
        <div className="flex items-center">
           <div className="w-9 h-9 rounded-[var(--radius-lg)] bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center mr-3 shadow-md border border-purple-400/50">
             <Palette className="icon-md text-white" />
           </div>
           <div>
             <h2 className="text-[16px] font-black text-[var(--text-main)] tracking-tight flex items-center">
               无限极 AI 智能画布
               <span className="ml-2 bg-gray-100 text-[var(--text-main)] text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded shadow-sm border border-[var(--border-color)]">
                 BETA
               </span>
             </h2>
             <p className="text-[11px] text-[var(--text-muted)] font-medium tracking-wide">编排多模态算力节点，自由连线创造无限工作流</p>
           </div>
        </div>

        <div className="flex items-center space-x-4">
           {/* Active Collaborators */}
           <div className="flex items-center -space-x-2 mr-2 border-r border-[var(--border-color)] pr-5">
             <div className="w-7 h-7 rounded-full border-2 border-white bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold z-20 shadow-sm" title="Alice">A</div>
             <div className="w-7 h-7 rounded-full border-2 border-white bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold z-10 shadow-sm" title="Bob">B</div>
             <div className="w-7 h-7 rounded-full border-2 border-white bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold z-0 shadow-sm" title="System">S</div>
           </div>
           
           <div className="flex items-center space-x-1 border-r border-[var(--border-color)] pr-5">
             <button onClick={undo} disabled={historyIndex === 0} className="icon-xl flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-[var(--text-muted)] transition-colors tooltip" title="撤销"><Undo2 className="w-[18px] h-[18px]"/></button>
             <button onClick={redo} disabled={historyIndex === history.length - 1} className="icon-xl flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-[var(--text-muted)] transition-colors tooltip" title="重做"><Redo2 className="w-[18px] h-[18px]"/></button>
           </div>
           
           <div className="flex items-center space-x-1 border-r border-[var(--border-color)] pr-5">
             <span className="text-[11px] font-bold text-gray-400 mr-2">{Math.round(zoomLevel * 100)}%</span>
             <button onClick={() => { setPan({x:0, y:0}); setZoomLevel(1); }} className="icon-xl flex items-center justify-center rounded-lg hover:bg-gray-100 text-[var(--text-muted)] transition-colors tooltip" title="适合屏幕"><Maximize className="w-[18px] h-[18px]"/></button>
           </div>
           
           <div className="flex items-center space-x-3">
             <span className="text-[10px] text-gray-400 font-medium">
               {lastSavedTime ? `Last Saved: ${lastSavedTime.toLocaleTimeString()}` : 'Unsaved'}
             </span>
             <button onClick={() => setShowInsights(true)} className="text-[13px] bg-[var(--bg-panel)] border border-purple-200 text-purple-700 px-4 py-2 rounded-full hover:bg-purple-50 font-bold shadow-sm transition-all flex items-center">
               <Sparkles className="icon-sm mr-1.5" /> Insights
             </button>
             <button 
               onClick={() => setShowLogs(!showLogs)}
               className={`text-[13px] px-4 py-2 rounded-full font-bold shadow-sm transition-all flex items-center ${showLogs ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-gray-700 hover:bg-gray-50'}`}>
               <Terminal className="icon-sm mr-1.5" /> 运行日志 (Run Log)
             </button>
             <button 
               onClick={handleExportWorkflow}
               className="text-[13px] bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 px-4 py-2 rounded-full hover:bg-gray-50 hover:text-green-600 font-bold shadow-sm transition-all flex items-center group">
               <FileJson className="icon-sm mr-1.5 text-gray-400 group-hover:text-green-500" /> Export JSON
             </button>
             <button onClick={runWorkflow} disabled={hasCycle || hasTypeError || isExecuting} className={`text-[13px] ${isExecuting ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[var(--color-primary)] hover:bg-blue-700'} disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2 rounded-full font-bold shadow-md hover:shadow-lg transition-all flex items-center`}>
               <MonitorPlay className="icon-sm mr-1.5" /> {hasCycle ? '循环依赖冲突' : (hasTypeError ? '数据类型不匹配' : (isExecuting ? '执行中...' : '执行工作流'))}
             </button>
           </div>
        </div>
      </div>

      {/* Floating Toolbar (Left) */}
      <div className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-[var(--bg-panel)]/90 backdrop-blur-md rounded-[var(--radius-xl)] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-[var(--border-color)] p-2.5 flex flex-col gap-2 z-20">
         
         <button onClick={() => setIsDrawingMode(!isDrawingMode)} className={`p-3 rounded-[var(--radius-lg)] transition-colors tooltip shadow-sm ${isDrawingMode ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-[var(--text-main)]'}`} title="协作标记 (Draw)">
             <PenTool className="w-[20px] h-[20px]"/>
         </button>
         <button onClick={() => setIsDrawingMode(false)} className="p-3 rounded-[var(--radius-lg)] hover:bg-gray-100/80 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors tooltip" title="选择与连接"><MousePointer2 className="w-[20px] h-[20px]"/></button>

         <button className="p-3 rounded-[var(--radius-lg)] hover:bg-gray-100/80 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors tooltip" title="多节点框选"><BoxSelect className="w-[20px] h-[20px]"/></button>
         <button onClick={handleAutoLayout} className="p-3 rounded-[var(--radius-lg)] hover:bg-gray-100/80 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors tooltip" title="自动布局 (Auto-Layout)"><Network className="w-[20px] h-[20px]"/></button>
         <button onClick={() => alert('画布快照已生成并自动保存至云端视觉媒体库！')} className="p-3 rounded-[var(--radius-lg)] hover:bg-gray-100/80 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors tooltip" title="生成画布快照"><Camera className="w-[20px] h-[20px]"/></button>
         <div className="w-full h-px bg-gray-200/60 my-1.5"></div>
         <button className="p-3 rounded-[var(--radius-lg)] hover:bg-gray-100/80 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors tooltip" title="插入文字节点"><Type className="w-[20px] h-[20px]"/></button>
         <button className="p-3 rounded-[var(--radius-lg)] hover:bg-gray-100/80 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors tooltip" title="挂载参考图"><ImageIcon className="w-[20px] h-[20px]"/></button>
         <div className="w-full h-px bg-gray-200/60 my-1.5"></div>
         <button className="relative p-3 rounded-[var(--radius-lg)] bg-gradient-to-tr from-gray-700 to-gray-900 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all tooltip group" title="唤起 AI 计算节点池">
            <Wand2 className="w-[20px] h-[20px] group-hover:animate-pulse"/>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--bg-panel)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
            </span>
         </button>
      </div>
      
      {/* Node Layers/Properties/Palette Panel (Right) */}
      <div className="absolute right-6 top-20 bottom-6 w-[320px] bg-[var(--bg-panel)]/95 backdrop-blur-xl rounded-[24px] shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-[var(--border-color)]/80 flex flex-col overflow-hidden z-20">
         <div className="h-14 border-b border-[var(--border-color)]/80 bg-gradient-to-b from-white to-gray-50/50 flex items-center p-1 justify-between shrink-0">
            <div className="flex items-center w-full bg-gray-100/50 p-1 rounded-[var(--radius-lg)]">
               <button 
                 onClick={() => setActiveTab('library')}
                 className={`flex-1 text-[12px] font-bold py-1.5 rounded-lg transition-all ${activeTab === 'library' ? 'bg-[var(--bg-panel)] shadow-sm text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                 Library
               </button>
               <button 
                 onClick={() => setActiveTab('palette')}
                 className={`flex-1 text-[12px] font-bold py-1.5 rounded-lg transition-all ${activeTab === 'palette' ? 'bg-[var(--bg-panel)] shadow-sm text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                 Search
               </button>
               <button 
                 onClick={() => setActiveTab('props')}
                 className={`flex-1 text-[12px] font-bold py-1.5 rounded-lg transition-all ${activeTab === 'props' ? 'bg-[var(--bg-panel)] shadow-sm text-purple-600' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                 属性配置
               </button>
               <button 
                 onClick={() => setActiveTab('templates')}
                 className={`flex-1 text-[12px] font-bold py-1.5 rounded-lg transition-all ${activeTab === 'templates' ? 'bg-[var(--bg-panel)] shadow-sm text-emerald-600' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                 模板
               </button>
               {selectedNodeId && (
                 <button 
                   onClick={() => setActiveTab('history')}
                   className={`flex-1 text-[12px] font-bold py-1.5 rounded-lg transition-all ${activeTab === 'history' ? 'bg-[var(--bg-panel)] shadow-sm text-amber-600' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                   历史
                 </button>
               )}
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-[var(--spacing-md)]">
            {activeTab === 'library' ? (
              <div className="space-y-[var(--spacing-lg)]">
                 <div>
                    <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 border-b border-[var(--border-color)] pb-1">Image & Video</h4>
                    <div className="space-y-2">
                       {NODE_TEMPLATES.filter(tpl => ['imageGen', 'vision', 'videoGen', 'modelSwap', 'videoHighlight'].includes(tpl.type)).map(tpl => (
                          <div key={tpl.type} draggable onDragStart={(e) => handleDragStart(e, tpl.type, tpl.title)} className="bg-[var(--bg-panel)] border hover:border-blue-400 hover:shadow-md border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 flex flex-col cursor-grab active:cursor-grabbing transition-all group">
                             <div className="flex items-center mb-1.5"><div className="icon-lg rounded-md bg-gray-50 flex items-center justify-center mr-2">{tpl.icon}</div><h4 className="text-[11px] font-bold tracking-tight text-[var(--text-main)]">{tpl.title}</h4></div>
                             <p className="text-[9px] text-[var(--text-muted)] line-clamp-2">{tpl.desc}</p>
                          </div>
                       ))}
                    </div>
                 </div>
                 <div>
                    <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 border-b border-[var(--border-color)] pb-1">Text & Data & Commerce</h4>
                    <div className="space-y-2">
                       {NODE_TEMPLATES.filter(tpl => ['nlp', 'dataFarming', 'knowledgeHarvest', 'socialMediaCopy', 'seoCopy', 'productTagging'].includes(tpl.type)).map(tpl => (
                          <div key={tpl.type} draggable onDragStart={(e) => handleDragStart(e, tpl.type, tpl.title)} className="bg-[var(--bg-panel)] border hover:border-amber-400 hover:shadow-md border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 flex flex-col cursor-grab active:cursor-grabbing transition-all group">
                             <div className="flex items-center mb-1.5"><div className="icon-lg rounded-md bg-gray-50 flex items-center justify-center mr-2">{tpl.icon}</div><h4 className="text-[11px] font-bold tracking-tight text-[var(--text-main)]">{tpl.title}</h4></div>
                             <p className="text-[9px] text-[var(--text-muted)] line-clamp-2">{tpl.desc}</p>
                          </div>
                       ))}
                    </div>
                 </div>
                 <div>
                    <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 border-b border-[var(--border-color)] pb-1">Orchestration & Logic</h4>
                    <div className="space-y-2">
                       {NODE_TEMPLATES.filter(tpl => ['macroNode'].includes(tpl.type)).map(tpl => (
                          <div key={tpl.type} draggable onDragStart={(e) => handleDragStart(e, tpl.type, tpl.title)} className="bg-[var(--bg-panel)] border hover:border-indigo-400 hover:shadow-md border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 flex flex-col cursor-grab active:cursor-grabbing transition-all group">
                             <div className="flex items-center mb-1.5"><div className="icon-lg rounded-md bg-gray-50 flex items-center justify-center mr-2">{tpl.icon}</div><h4 className="text-[11px] font-bold tracking-tight text-[var(--text-main)]">{tpl.title}</h4></div>
                             <p className="text-[9px] text-[var(--text-muted)] line-clamp-2">{tpl.desc}</p>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
            ) : activeTab === 'palette' ? (
              <div className="space-y-3">
                 <p className="text-[11px] text-[var(--text-muted)] font-medium mb-3">拖拽代理节点至画布编排工作流</p>
                 
                 <div className="relative mb-4">
                    <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="搜索 AI Agent..." 
                      value={paletteQuery}
                      onChange={(e) => setPaletteQuery(e.target.value)}
                      className="w-full bg-gray-50 border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all placeholder:text-gray-400"
                    />
                 </div>

                 {NODE_TEMPLATES.filter(tpl => {
                     const q = paletteQuery.toLowerCase();
                     return tpl.title.toLowerCase().includes(q) || tpl.type.toLowerCase().includes(q) || (tpl.desc && tpl.desc.toLowerCase().includes(q));
                 }).map((tpl) => (
                    <div 
                      key={tpl.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, tpl.type, tpl.title)}
                      className="bg-[var(--bg-panel)] border hover:border-gray-900 hover:shadow-md border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 flex items-center cursor-grab active:cursor-grabbing transition-all group"
                    >
                      <div className="icon-xl rounded-lg bg-gray-50 flex items-center justify-center mr-3 group-hover:bg-blue-50 transition-colors">
                        {tpl.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[12px] font-black tracking-tight text-[var(--text-main)] group-hover:text-black">{tpl.title}</h4>
                        <p className="text-[10px] text-gray-400 font-medium">Model ID: auto-detect</p>
                      </div>
                      <GripVertical className="icon-sm text-gray-300" />
                    </div>
                 ))}
                 
                 <div className="mt-8 pt-4 border-t border-[var(--border-color)]">
                    <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                      自定义 Agent (Webhook)
                    </h4>
                    <div className="border border-dashed border-gray-300 rounded-[var(--radius-lg)] p-4 text-center cursor-pointer hover:bg-gray-50 hover:border-gray-900">
                       <Webhook className="icon-md text-gray-400 mx-auto mb-2" />
                       <span className="text-[12px] text-gray-600 font-bold">导入外部算力节点</span>
                    </div>
                 </div>
              </div>
            ) : activeTab === 'templates' ? (
              <div className="space-y-[var(--spacing-md)]">
                 <p className="text-[11px] text-[var(--text-muted)] font-medium mb-3">预设常用工作流编排模式</p>
                 
                 <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group">
                    <h4 className="text-[12px] font-black text-[var(--text-main)] group-hover:text-emerald-600 mb-1">图片灵感转文字预设</h4>
                    <p className="text-[10px] text-[var(--text-muted)] mb-3">Image Gen ➔ Vision ➔ NLP</p>
                    <div className="flex gap-1">
                       <div className="flex-1 h-1.5 bg-blue-200 rounded-full"></div>
                       <div className="flex-1 h-1.5 bg-green-200 rounded-full"></div>
                       <div className="flex-1 h-1.5 bg-amber-200 rounded-full"></div>
                    </div>
                 </div>

                 <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group">
                    <h4 className="text-[12px] font-black text-[var(--text-main)] group-hover:text-emerald-600 mb-1">多模态视频生产线</h4>
                    <p className="text-[10px] text-[var(--text-muted)] mb-3">NLP ➔ Image Gen ➔ Video Gen</p>
                    <div className="flex gap-1">
                       <div className="flex-1 h-1.5 bg-amber-200 rounded-full"></div>
                       <div className="flex-1 h-1.5 bg-blue-200 rounded-full"></div>
                       <div className="flex-1 h-1.5 bg-purple-200 rounded-full"></div>
                    </div>
                 </div>
                 
                 {customTemplates.map(ct => (
                     <div key={ct.id} onClick={(e) => {
                         // On click, instantiate custom template
                         const xOffset = Math.random() * 100 - 50;
                         const yOffset = Math.random() * 100 - 50;
                         const newIds: Record<string, string> = {};
                         
                         const newNodes = ct.nodes.map(n => {
                             const nid = `node-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                             newIds[n.id] = nid;
                             return { ...n, id: nid, x: n.x + xOffset, y: n.y + yOffset };
                         });
                         const newEdges = ct.edges.map(e => ({
                             id: `edge-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                             fromId: newIds[e.fromId],
                             toId: newIds[e.toId]
                         }));
                         
                         const nextNodes = [...nodes, ...newNodes];
                         const nextEdges = [...edges, ...newEdges];
                         setNodes(nextNodes);
                         setEdges(nextEdges);
                         saveHistory(nextNodes, nextEdges);
                     }} className="relative border border-indigo-200 rounded-[var(--radius-lg)] p-3 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group bg-indigo-50/30">
                        <h4 className="text-[12px] font-black text-indigo-900 mb-1">{ct.name}</h4>
                        <p className="text-[10px] text-indigo-600/70 mb-2">{ct.nodes.length} Nodes • {ct.edges.length} Connections</p>
                        <div className="flex gap-1">
                           <div className="flex-1 h-1 bg-indigo-200 rounded-full group-hover:bg-indigo-400 transition-colors"></div>
                        </div>
                        <button onClick={(e) => {
                            e.stopPropagation();
                            const blob = new Blob([JSON.stringify(ct, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${ct.name.replace(/\s+/g, '_')}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }} className="absolute top-2 right-2 p-1.5 text-indigo-400 hover:text-indigo-600 bg-[var(--bg-panel)] rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" title="Export as JSON file">
                           <FileJson className="w-3.5 h-3.5" />
                        </button>
                     </div>
                 ))}
                 
                 <button onClick={() => {
                     if (selectedNodeIds.length === 0) {
                         alert("请先选择要保存为模板的节点！");
                         return;
                     }
                     const name = prompt("请输入模板名称：", "Custom Pattern");
                     if (!name) return;
                     
                     const copyNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
                     const copyEdges = edges.filter(e => selectedNodeIds.includes(e.fromId) && selectedNodeIds.includes(e.toId));
                     
                     setCustomTemplates([...customTemplates, {
                         id: `tpl-${Date.now()}`,
                         name,
                         nodes: copyNodes,
                         edges: copyEdges
                     }]);
                 }} className="w-full py-2.5 mt-4 border border-dashed border-gray-300 rounded-[var(--radius-lg)] text-[12px] font-bold text-[var(--text-muted)] flex items-center justify-center hover:bg-gray-50 hover:text-[var(--text-main)] transition-colors">
                    <Save className="icon-sm mr-2" /> 保存选中节点为模板
                 </button>
              </div>
            ) : activeTab === 'history' && selectedNode ? (
              <div className="space-y-[var(--spacing-md)]">
                 <div className="flex items-center space-x-2 text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-widest mb-4">
                   <History className="icon-sm" />
                   <span>" {selectedNode.title} " 历史记录</span>
                 </div>
                 
                 <div className="relative pl-4 border-l-2 border-indigo-100 space-y-[var(--spacing-lg)]">
                    <div className="relative">
                       <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-4 ring-white"></span>
                       <p className="text-[12px] font-bold text-[var(--text-main)] mb-1">Version 1.2 (Current)</p>
                       <p className="text-[10px] text-[var(--text-muted)] mb-2">Today, 2:30 PM • system auto-save</p>
                       <div className="bg-gray-50 border border-[var(--border-color)] rounded p-2 text-[10px] font-mono text-gray-600">
                         "Updated prompt weights: space+1.2"
                       </div>
                    </div>
                    
                    <div className="relative opacity-60 hover:opacity-100 transition-opacity">
                       <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-gray-300 rounded-full ring-4 ring-white"></span>
                       <p className="text-[12px] font-bold text-[var(--text-main)] mb-1">Version 1.1</p>
                       <p className="text-[10px] text-[var(--text-muted)] mb-2">Yesterday, 10:15 AM • manual save</p>
                       <button className="text-[10px] bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-amber-400 font-bold text-gray-700 px-3 py-1 rounded shadow-sm hover:text-amber-600 flex items-center transition-colors">
                          <Undo2 className="w-3 h-3 mr-1" /> 回退此版本
                       </button>
                    </div>
                 </div>
              </div>
            ) : activeTab === 'props' && selectedNode ? (
              <div className="space-y-[var(--spacing-lg)]">
                 <div>
                    <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center justify-between">
                      Agent Props
                      <Settings className="w-3.5 h-3.5 text-gray-400" />
                    </h4>
                    
                    <div className="space-y-[var(--spacing-md)]">
                       <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1.5">Tag (Label)</label>
                          <input 
                             type="text" 
                             placeholder="e.g. Production, Draft" 
                             value={selectedNode.config?.tag || ''}
                             onChange={(e) => {
                                 const newNodes = nodes.map(n => n.id === selectedNode.id ? { ...n, config: { ...n.config, tag: e.target.value } } : n);
                                 setNodes(newNodes);
                                 saveHistory(newNodes, edges);
                             }}
                             className="w-full text-[12px] border border-[var(--border-color)] rounded-lg p-2.5 bg-gray-50 text-[var(--text-main)] font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder-gray-400"
                          />
                       </div>
                       <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1.5">Model Backend</label>
                          <select className="w-full text-[12px] border border-[var(--border-color)] rounded-lg p-2.5 bg-gray-50 text-[var(--text-main)] font-bold focus:outline-none focus:ring-2 focus:ring-blue-100">
                             <option>Gemini 1.5 Pro</option>
                             <option>Claude 3.5 Sonnet</option>
                             <option>GPT-4o</option>
                          </select>
                       </div>
                       
                       <div>
                          <div className="flex justify-between mb-1.5">
                             <label className="text-[11px] font-bold text-gray-600">Temperature (Creativity)</label>
                             <span className="text-[11px] text-[var(--text-muted)] font-mono">0.7</span>
                          </div>
                          <input type="range" min="0" max="100" defaultValue="70" className="w-full accent-blue-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                       </div>
                       
                       <div className="pt-2 border-t border-[var(--border-color)]">
                          <div className="flex items-center justify-between">
                             <div>
                                <label className="block text-[11px] font-bold text-[var(--text-main)] mb-0.5">Batch Mode (Parallel)</label>
                                <span className="text-[10px] text-[var(--text-muted)]">Process inputs concurrently</span>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" 
                                   checked={selectedNode.config.batchMode === 'parallel'} 
                                   onChange={(e) => {
                                       const newNodes = nodes.map(n => n.id === selectedNode.id ? { ...n, config: { ...n.config, batchMode: e.target.checked ? 'parallel' : 'sequence' } } : n);
                                       setNodes(newNodes);
                                       saveHistory(newNodes, edges);
                                   }} 
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-panel)] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                             </label>
                          </div>
                       </div>

                       <div className="pt-2 border-t border-[var(--border-color)]">
                          <label className="block text-[11px] font-bold text-gray-600 mb-1.5">System Prompt Override</label>
                          <textarea 
                            className="w-full h-24 text-[12px] border border-[var(--border-color)] rounded-lg p-2.5 bg-gray-50 text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                            placeholder="Enter custom prompt instructions here..."
                          ></textarea>
                       </div>
                    </div>
                 </div>
              </div>
            ) : (
              <div className="space-y-[var(--spacing-lg)]">
                 <div>
                    <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center justify-between">
                      当前画布配置 
                      <Settings className="w-3.5 h-3.5 text-gray-400" />
                    </h4>
                    <div className="bg-[var(--bg-app)] rounded-[var(--radius-lg)] p-4 border border-[var(--border-color)] shadow-inner">
                      <div className="flex justify-between items-center mb-3">
                         <span className="text-[12px] font-bold text-gray-600">全局色彩空间</span>
                         <div className="icon-lg rounded-md bg-[#e5e5f7] border border-[var(--border-color)] shadow-sm flex items-center justify-center">
                            <span className="text-[8px] font-bold">RGB</span>
                         </div>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-[12px] font-bold text-gray-600">目标输出尺寸 (HD)</span>
                         <span className="text-[12px] font-black text-[var(--text-main)] bg-[var(--bg-panel)] px-2 py-1 rounded shadow-sm border border-[var(--border-color)]">4096 × 2160 px</span>
                      </div>
                    </div>
                 </div>
                 
                 <div>
                    <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center justify-between">
                      在线 AI 计算节点群
                      <span className="bg-gray-100 text-[var(--text-main)] px-1.5 py-0.5 rounded text-[10px] font-bold">{nodes.length} 在线</span>
                    </h4>
                    <div className="space-y-3">
                      {nodes.map((node) => (
                        <div key={node.id} className="bg-[var(--bg-panel)] border-2 border-indigo-50 ring-2 ring-indigo-50 rounded-[var(--radius-lg)] p-3.5 shadow-sm flex flex-col group cursor-pointer hover:border-indigo-300 transition-colors">
                           <div className="flex items-start mb-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1 mr-2.5 shadow-[0_0_8px_#6366f1]"></div>
                              <div>
                                 <p className="text-[12px] font-black text-[var(--text-main)] leading-tight mb-1">{node.title}</p>
                                 <p className="text-[10px] text-[var(--text-muted)] font-bold bg-gray-50 inline-block px-1.5 py-0.5 rounded">ID: {node.id.slice(-4)}</p>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Infinite Canvas Background & Orchestration Area */}
      <div 
         id="canvas-bg" ref={canvasRef}
         className={`relative flex-1 z-0 overflow-hidden outline-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
         onWheel={handleWheel}
         onPointerDown={handlePointerDown}
         onPointerMove={handlePointerMove}
         onPointerUp={handlePointerUp}
         onDragOver={handleDragOver}
         onDragLeave={handleDragLeave}
         onDrop={handleDrop}
         onContextMenu={(e) => {
             e.preventDefault();
             // Find if a node was right-clicked (event delegation)
             const nodeElement = (e.target as Element).closest('[data-node-id]');
             if (nodeElement) {
                 const nodeId = nodeElement.getAttribute('data-node-id');
                 if (nodeId) {
                     setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
                     if (!selectedNodeIds.includes(nodeId)) {
                         setSelectedNodeId(nodeId);
                         setSelectedNodeIds([nodeId]);
                     }
                 }
             } else {
                 setContextMenu(null);
             }
         }}
         style={{ 
           backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', 
           backgroundSize: `${24 * zoomLevel}px ${24 * zoomLevel}px`,
           backgroundPosition: `${pan.x}px ${pan.y}px`,
           backgroundColor: '#f1f5f9'
         }}>

         {/* Fake Collaboration Cursors */}
         <div className="absolute pointer-events-none z-50 flex items-center transition-all duration-[2000ms] ease-in-out" style={{ left: '60%', top: '40%' }}>
            <MousePointer2 className="icon-sm text-rose-500 fill-rose-500 drop-shadow-md" />
            <div className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded opacity-90 shadow-md ml-1 font-bold">Alice</div>
         </div>
         <div className="absolute pointer-events-none z-50 flex items-center transition-all duration-[3000ms] ease-in-out" style={{ left: '30%', top: '65%' }}>
            <MousePointer2 className="icon-sm text-emerald-500 fill-emerald-500 drop-shadow-md" />
            <div className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded opacity-90 shadow-md ml-1 font-bold">Bob</div>
         </div>

         {/* Multi-select Floating Action */}
         {selectedNodeIds.length > 1 && (
             <div className="absolute top-[var(--spacing-lg)] left-1/2 transform -translate-x-1/2 bg-[var(--bg-panel)]/90 backdrop-blur-md rounded-[var(--radius-lg)] shadow-lg border border-indigo-200 p-1.5 z-40 flex items-center space-x-3 transition-all animate-in zoom-in-95 fade-in duration-200">
                 <span className="text-[11px] font-bold text-indigo-700 px-3">{selectedNodeIds.length} Nodes Selected</span>
                 <div className="w-px h-4 bg-indigo-100"></div>
                 <button 
                     onClick={handleGroupNodes}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-4 py-1.5 rounded-lg flex items-center transition-colors shadow-sm"
                 >
                     <Layers className="w-3.5 h-3.5 mr-1.5" />
                     Group into Macro Node
                 </button>
             </div>
         )}

         {/* Workflow Health Indicator */}
         <div className="absolute top-[var(--spacing-lg)] right-6 z-20 tooltip" title={hasCycle ? "循环依赖检查失败" : (hasTypeError ? "存在数据类型不匹配" : "工作流校验通过，随时可执行。")}>
             {hasCycle || hasTypeError ? (
                 <div className="bg-[var(--bg-panel)]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-200 shadow-sm flex items-center space-x-1.5">
                     <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                     <span className="text-[11px] font-bold text-red-600 tracking-wide uppercase">Issues Detected</span>
                 </div>
             ) : (
                 <div className="bg-[var(--bg-panel)]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center space-x-1.5">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                     <span className="text-[11px] font-bold text-emerald-600 tracking-wide uppercase">Valid Workflow</span>
                 </div>
             )}
         </div>
           
           <div 
             className="absolute left-1/2 top-1/2 transform-origin-center" 
             style={{ 
               transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoomLevel})` 
             }}>
              
              {alignmentGuides?.x !== undefined && (
                <div className="absolute top-[-2000px] bottom-[-2000px] border-l-2 border-indigo-400 border-dashed z-0 pointer-events-none" style={{ left: alignmentGuides.x }}></div>
              )}
              {alignmentGuides?.y !== undefined && (
                <div className="absolute left-[-2000px] right-[-2000px] border-t-2 border-indigo-400 border-dashed z-0 pointer-events-none" style={{ top: alignmentGuides.y }}></div>
              )}
              
              {previewNode && (
                 <div className="absolute transform w-[320px] border-2 border-blue-400 bg-[var(--bg-panel)]/70 backdrop-blur-md rounded-[var(--radius-xl)] shadow-lg flex flex-col overflow-hidden pointer-events-none opacity-80 z-30" style={{ top: previewNode.y, left: previewNode.x }}>
                    <div className="h-10 border-b border-blue-200 flex items-center justify-between px-4 bg-blue-50/50">
                       <div className="flex items-center text-[11px] font-black uppercase tracking-widest text-blue-800">
                         {NODE_TEMPLATES.find(t => t.type === previewNode.type)?.icon}
                         <span className="ml-2">{previewNode.title}</span>
                       </div>
                    </div>
                    <div className="p-4 font-mono text-[10px] text-gray-600 leading-relaxed bg-transparent">
                       <div className="mb-2 font-bold text-[var(--text-main)] flex items-center"><Settings className="w-3 h-3 mr-1"/>默认配置预览：</div>
                       <div className="space-y-1.5">
                         <div className="flex justify-between border-b border-[var(--border-color)]/50 pb-1"><span>Base Model</span> <span className="font-bold text-indigo-600">v1.5-Pro</span></div>
                         <div className="flex justify-between border-b border-[var(--border-color)]/50 pb-1"><span>Context Window</span> <span className="font-bold text-indigo-600">128k</span></div>
                         <div className="flex justify-between pb-1"><span>Execution Mode</span> <span className="font-bold text-indigo-600">Auto</span></div>
                       </div>
                    </div>
                 </div>
              )}

              {nodes.map(node => {
                  const nodeLatestLog = executionLogs.filter(l => l.sender === node.id).pop();
                  let nodeStatusIcon = null;
                  if (nodeLatestLog) {
                      if (nodeLatestLog.type === 'error') {
                          nodeStatusIcon = <AlertTriangle className="icon-sm text-red-500" />;
                      } else if (nodeLatestLog.type === 'success') {
                          nodeStatusIcon = <CheckCircle2 className="icon-sm text-green-500" />;
                      } else if (isExecuting) {
                          nodeStatusIcon = <Loader2 className="icon-sm text-amber-500 animate-spin" />;
                      }
                  }

                  let collabStyle = '';
                  let collabName = '';
                  if (node.id === 'node-1') {
                      collabStyle = '!ring-rose-400 !border-rose-400';
                      collabName = 'Alice';
                  } else if (node.id === 'node-2') {
                      collabStyle = '!ring-emerald-400 !border-emerald-400';
                      collabName = 'Bob';
                  }

                  return (
                <div 
                  key={node.id}
                  data-node-id={node.id}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        const newIds = selectedNodeIds.includes(node.id) ? selectedNodeIds.filter(id => id !== node.id) : [...selectedNodeIds, node.id];
                        setSelectedNodeIds(newIds);
                        setSelectedNodeId(newIds[newIds.length - 1] || null);
                    } else {
                        setSelectedNodeId(node.id); 
                        setSelectedNodeIds([node.id]);
                    }
                    setActiveTab('props'); 
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const canvasWidth = canvasRef.current?.offsetWidth || window.innerWidth;
                    const canvasHeight = canvasRef.current?.offsetHeight || window.innerHeight;
                    const nodeWidth = node.type === 'imageGen' ? 560 : node.type === 'nlp' ? 360 : node.type === 'macroNode' ? 420 : 320;
                    const nodeHeight = node.type === 'imageGen' ? 400 : 200;
                    const targetZoom = (canvasWidth * 0.5) / nodeWidth;
                    setZoomLevel(targetZoom);
                    setPan({
                        x: (canvasWidth / 2) - (node.x + nodeWidth / 2) * targetZoom,
                        y: (canvasHeight / 2) - (node.y + nodeHeight / 2) * targetZoom
                    });
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    setDraggingNode({ id: node.id, anchorX: e.clientX, anchorY: e.clientY, startX: node.x, startY: node.y });
                    if (!selectedNodeIds.includes(node.id)) {
                        setSelectedNodeId(node.id);
                        setSelectedNodeIds([node.id]);
                    }
                  }}
                  className={`absolute transform ${node.type === 'imageGen' ? 'w-[560px] h-[400px] border-4 border-blue-100 ring-blue-50' : node.type === 'nlp' ? 'w-[360px] border-amber-200 ring-amber-50' : node.type === 'macroNode' ? 'w-[420px] border-4 border-indigo-200 ring-indigo-50' : 'w-[320px] border-green-200 ring-green-50'} bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-xl hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] flex flex-col overflow-hidden ring-4 group transition-all duration-300 ${selectedNodeIds.includes(node.id) || node.config?.isHighlighted ? '!ring-indigo-400 !border-indigo-400 animate-glow-pulse z-40' : collabStyle ? `${collabStyle} z-30` : ''} ${hasCycle && edgeStatuses[edges.find(e => e.fromId === node.id || e.toId === node.id)?.id || '']?.cyclic ? '!ring-red-400 !border-red-400 animate-pulse' : ''}`} 
                  style={{ top: node.y, left: node.x, ...(node.config?.customColor ? { borderColor: node.config.customColor } : {}) }}>
                  
                  {collabName && !selectedNodeIds.includes(node.id) && (
                      <div className={`absolute -top-3 left-4 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm z-50 ${collabName === 'Alice' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                          {collabName} 正在编辑...
                      </div>
                  )}

                  {/* Node Header */}
                  <div className={`h-10 border-b flex items-center justify-between px-4 backdrop-blur-sm ${node.type === 'imageGen' ? 'bg-blue-50/80 border-blue-100' : node.type === 'nlp' ? 'bg-amber-50/80 border-amber-100' : node.type === 'macroNode' ? 'bg-indigo-50/80 border-indigo-100' : 'bg-green-50/80 border-green-100'}`}>
                     <div className={`flex items-center text-[11px] font-black uppercase tracking-widest ${node.type === 'imageGen' ? 'text-blue-800' : node.type === 'nlp' ? 'text-amber-800' : node.type === 'macroNode' ? 'text-indigo-800' : 'text-green-800'}`}>
                       {NODE_TEMPLATES.find(t => t.type === node.type)?.icon}
                       {nodeStatusIcon && <span className="ml-1.5 mr-1" title="Execution Status">{nodeStatusIcon}</span>}
                       <span className="ml-1.5">{node.title}</span>
                       {node.config?.tag && (
                           <span className="ml-2 px-1.5 py-0.5 bg-[var(--bg-panel)]/60 border border-gray-300 rounded text-[9px] text-gray-700 tracking-normal capitalize">{node.config.tag}</span>
                       )}
                     </div>
                     <div className="flex space-x-2">
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const canvasWidth = canvasRef.current?.offsetWidth || window.innerWidth;
                          const canvasHeight = canvasRef.current?.offsetHeight || window.innerHeight;
                          const nodeWidth = node.type === 'imageGen' ? 560 : node.type === 'nlp' ? 360 : node.type === 'macroNode' ? 420 : 320;
                          const nodeHeight = node.type === 'imageGen' ? 400 : 200;
                          const targetZoom = (canvasWidth * 0.5) / nodeWidth;
                          setZoomLevel(targetZoom);
                          setPan({
                              x: (canvasWidth / 2) - (node.x + nodeWidth / 2) * targetZoom,
                              y: (canvasHeight / 2) - (node.y + nodeHeight / 2) * targetZoom
                          });
                        }} className="icon-md flex items-center justify-center text-gray-400 hover:text-blue-500 tooltip transition-colors" title="Center & Focus (Double Click)"><Maximize className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const newNodes = nodes.map(n => n.id === node.id ? { ...n, config: { ...n.config, isHighlighted: !n.config.isHighlighted } } : n);
                          setNodes(newNodes);
                          saveHistory(newNodes, edges);
                        }} className={`icon-md flex items-center justify-center rounded tooltip transition-colors ${node.config?.isHighlighted ? 'text-indigo-600 bg-indigo-100' : 'text-gray-400 hover:text-indigo-500'}`} title="Highlight"><Sparkles className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const newNodes = nodes.map(n => n.id === node.id ? { ...n, config: { ...n.config, isNoteOpen: !n.config.isNoteOpen } } : n);
                          setNodes(newNodes);
                          saveHistory(newNodes, edges);
                        }} className={`icon-md flex items-center justify-center rounded tooltip transition-colors ${node.config?.isNoteOpen ? 'text-amber-600 bg-amber-100' : 'text-gray-400 hover:text-amber-500'}`} title="Notes"><StickyNote className="w-3.5 h-3.5" /></button>
                        <label className="icon-md flex items-center justify-center rounded tooltip transition-colors text-gray-400 hover:text-pink-500 cursor-pointer relative" title="Color Grouping">
                           <Palette className="w-3.5 h-3.5" />
                           <input type="color" className="absolute opacity-0 w-full h-full cursor-pointer"
                              value={node.config?.customColor || '#94a3b8'}
                              onChange={(e) => {
                                  const newNodes = nodes.map(n => n.id === node.id ? { ...n, config: { ...n.config, customColor: e.target.value } } : n);
                                  setNodes(newNodes);
                              }}
                              onBlur={() => saveHistory(nodes, edges)}
                           />
                        </label>
                        <button onClick={(e) => { 
                          e.stopPropagation(); 
                          const newNode = { ...node, id: 'node-' + Date.now() + Math.floor(Math.random()*1000), x: node.x + 40, y: node.y + 40 };
                          const newNodes = [...nodes, newNode];
                          setNodes(newNodes);
                          saveHistory(newNodes, edges);
                        }} className="icon-md flex items-center justify-center text-gray-400 hover:text-emerald-500 tooltip transition-colors" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { 
                          e.stopPropagation(); 
                          const url = `${window.location.origin}${window.location.pathname}?workflow=${node.id}`;
                          navigator.clipboard.writeText(url);
                          alert('Node configuration URL copied to clipboard!');
                        }} className="icon-md flex items-center justify-center text-gray-400 hover:text-blue-500 tooltip transition-colors" title="Share"><Share className="w-3.5 h-3.5" /></button>
                        {node.type === 'macroNode' && (
                           <button className="icon-md flex items-center justify-center text-indigo-500 hover:text-indigo-700 bg-indigo-100 rounded tooltip" title="展开宏节点"><Layers className="w-3.5 h-3.5" /></button>
                        )}
                        <button onClick={(e) => { 
                          e.stopPropagation(); 
                          const newNodes = nodes.filter(n => n.id !== node.id);
                          const newEdges = edges.filter(edg => edg.fromId !== node.id && edg.toId !== node.id);
                          setNodes(newNodes);
                          setEdges(newEdges);
                          saveHistory(newNodes, newEdges);
                        }} className="icon-md flex items-center justify-center text-gray-400 hover:text-red-500 tooltip" title="移除"><Trash2 className="w-3.5 h-3.5" /></button>
                     </div>
                  </div>
                  
                  {/* Note Block */}
                  {node.config?.isNoteOpen && (
                      <div className="bg-amber-50/50 p-3 border-b border-amber-100/50" onPointerDown={(e) => { e.stopPropagation(); (e.target as HTMLElement).focus(); }}>
                          <textarea 
                             className="w-full h-16 text-xs bg-[var(--bg-panel)]/80 backdrop-blur text-gray-700 border border-amber-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-700/30 resize-none shadow-inner"
                             placeholder="Enter team documentation or notes here..."
                             value={node.config?.note || ''}
                             onChange={(e) => {
                                 const newNodes = nodes.map(n => n.id === node.id ? { ...n, config: { ...n.config, note: e.target.value } } : n);
                                 setNodes(newNodes);
                             }}
                             onBlur={() => saveHistory(nodes, edges)}
                          />
                      </div>
                  )}

                  {/* Node Content */}
                  <div className="absolute top-12 right-2 flex flex-col gap-1 z-20 items-end pointer-events-none">
                     <div className={`bg-[var(--bg-panel)]/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm border flex items-center gap-1.5 ${node.type === 'imageGen' ? 'text-[var(--color-primary)] border-blue-100' : node.type === 'nlp' ? 'text-amber-600 border-amber-100' : node.type === 'macroNode' ? 'text-indigo-600 border-indigo-100' : 'text-emerald-600 border-emerald-100'}`}>
                       <span className="flex items-center"><Clock className="w-2.5 h-2.5 mr-0.5 opacity-70" /> {node.type === 'imageGen' ? '3.2s' : node.type === 'nlp' ? '0.8s' : node.type === 'videoGen' ? '15.0s' : node.type === 'macroNode' ? '5.2s' : '1.5s'}</span>
                       <span className="opacity-30">|</span>
                       <span className="flex items-center"><Sparkles className="w-2.5 h-2.5 mr-0.5 opacity-70" /> {node.type === 'imageGen' ? '1k' : node.type === 'nlp' ? '140' : node.type === 'videoGen' ? '4k' : node.type === 'macroNode' ? '5k' : '800'} toks</span>
                     </div>
                  </div>
                  
                  {node.type === 'imageGen' && (
                    <div className="flex-1 bg-gray-100 relative group-hover:opacity-95 transition-opacity overflow-hidden pointer-events-none">
                       <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" alt="Canvas item" className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700" />
                       <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white font-mono text-[10px] tracking-wide border border-white/20">
                          Seed: {node.config.seed || 84920015} • Steps: {node.config.steps || 40} • CFG: {node.config.cfg || 7.5}
                       </div>
                    </div>
                  )}

                  {node.type === 'nlp' && (
                     <div className="p-5 font-mono text-[12px] text-gray-700 leading-relaxed bg-[#FDFBF7] pointer-events-none">
                       &gt; 正在分析图像视效特征...<br/>
                       &gt; 提取核心概念：<span>"空间张力"</span>、<span>"极简主义"</span><br/>
                       <div className="w-full h-px bg-amber-100 my-3"></div>
                       <p className="font-bold text-[var(--text-main)] font-sans text-[14px]">
                         "打破视觉边界，重塑感官维度。"
                       </p>
                     </div>
                  )}
                  
                  {(node.type === 'vision' || node.type === 'videoGen' || node.type === 'modelSwap' || node.type === 'videoHighlight') && (
                     <div className="p-5 font-mono text-[12px] text-gray-700 leading-relaxed bg-[var(--bg-panel)] pointer-events-none">
                        <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                           <BoxSelect className="icon-xl mb-2 opacity-50" />
                           <span>等待输入流 (Wait for input)...</span>
                        </div>
                     </div>
                  )}

                  {(node.type === 'dataFarming' || node.type === 'knowledgeHarvest' || node.type === 'productTagging') && (
                     <div className="p-5 font-mono text-[11px] text-gray-700 leading-relaxed bg-slate-50 pointer-events-none">
                        <div className="flex space-x-2 mb-2">
                           <span className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">DATASET</span>
                           <span className="bg-slate-200 text-slate-600 px-1 py-0.5 rounded">0 Records</span>
                        </div>
                        <div className="text-gray-400">Connecting to data sources...</div>
                     </div>
                  )}
                  
                  {(node.type === 'socialMediaCopy' || node.type === 'seoCopy') && (
                     <div className="p-5 font-mono text-[12px] text-gray-700 leading-relaxed bg-[#FDFBF7] pointer-events-none">
                        <div className="animate-pulse space-y-2">
                           <div className="h-2.5 bg-gray-200 rounded w-full"></div>
                           <div className="h-2.5 bg-gray-200 rounded w-5/6"></div>
                           <div className="h-2.5 bg-gray-200 rounded w-4/6"></div>
                        </div>
                     </div>
                  )}
                  
                  {node.type === 'macroNode' && (
                     <div className="p-4 bg-gray-50 flex flex-col space-y-2 pointer-events-none">
                       <div className="border border-dashed border-gray-300 rounded p-2 flex items-center text-[10px] text-[var(--text-muted)] font-bold bg-[var(--bg-panel)]"><Settings className="w-3 h-3 mr-2 text-gray-400" />包含 4 个子节点</div>
                       <div className="border border-dashed border-gray-300 rounded p-2 flex items-center text-[10px] text-[var(--text-muted)] font-bold bg-[var(--bg-panel)]"><Sparkles className="w-3 h-3 mr-2 text-indigo-400" />已封装工作流</div>
                     </div>
                  )}

                  {/* I/O Ports */}
                  <div 
                    onPointerUp={(e) => {
                       e.stopPropagation();
                       if (tempEdge && tempEdge.originId !== node.id) {
                          const newEdges = [...edges, { id: `edge-${Date.now()}`, fromId: tempEdge.originId, toId: node.id }];
                          setEdges(newEdges);
                          saveHistory(nodes, newEdges);
                          setTempEdge(null);
                       }
                    }}
                    className="absolute -left-3 top-1/2 transform -translate-y-1/2 icon-lg bg-[var(--bg-panel)] border-[3px] border-gray-400 rounded-full cursor-crosshair hover:scale-125 transition-transform shadow-md z-10 group/port">
                      <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/port:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg border border-gray-700 font-mono">
                         IN: {nodeTypesEnv[node.type]?.in.join(', ') || 'Any'}
                      </div>
                  </div>
                  
                  <div 
                    onPointerDown={(e) => {
                       e.stopPropagation();
                       setTempEdge({ originId: node.id, endX: e.clientX, endY: e.clientY });
                       (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                    className="absolute -right-3 top-1/2 transform -translate-y-1/2 icon-lg bg-[var(--bg-panel)] border-[3px] border-blue-400 rounded-full cursor-crosshair hover:scale-125 transition-transform shadow-md z-10 group/port flex items-center justify-center">
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-[var(--color-primary)] text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/port:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg border border-blue-700 font-mono">
                         OUT: {nodeTypesEnv[node.type]?.out.join(', ') || 'Any'}
                      </div>
                  </div>
                </div>
              );
              })}
              
              {/* Dynamic SVG Curves Connecting Nodes */}
              
              {/* Collaborative Drawings */}
              <svg className="absolute top-[-2000px] left-[-2000px] z-10 overflow-visible origin-top-left pointer-events-none" style={{ width: '4000px', height: '4000px' }}>
                 {strokes.map((stroke, i) => (
                    <polyline key={i} points={stroke.points.map(p => `${p.x + 2000},${p.y + 2000}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                 ))}
                 {currentStroke.length > 0 && (
                    <polyline points={currentStroke.map(p => `${p.x + 2000},${p.y + 2000}`).join(' ')} fill="none" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                 )}
              </svg>
\n<svg className="absolute top-[-2000px] left-[-2000px] pointer-events-none z-0 overflow-visible origin-top-left" style={{ width: '4000px', height: '4000px' }}>
                <defs>
                   <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#F59E0B" />
                   </linearGradient>
                </defs>

                {edges.map(edge => {
                   const sourceNode = nodes.find(n => n.id === edge.fromId);
                   const targetNode = nodes.find(n => n.id === edge.toId);
                   if (!sourceNode || !targetNode) return null;
                   
                   const status = edgeStatuses[edge.id];
                   
                   let startX = sourceNode.x + 2000;
                   let startY = sourceNode.y + 2000;
                   if (sourceNode.type === 'imageGen') { startX += 560; startY += 200; }
                   else if (sourceNode.type === 'nlp') { startX += 360; startY += 100; }
                   else if (sourceNode.type === 'macroNode') { startX += 420; startY += 80; }
                   else { startX += 320; startY += 100; }

                   let endX = targetNode.x + 2000;
                   let endY = targetNode.y + 2000;
                   if (targetNode.type === 'imageGen') { endY += 200; }
                   else if (targetNode.type === 'macroNode') { endY += 80; }
                   else { endY += 100; }
                   
                   const isError = status?.typeError;
                   const isCyclic = status?.cyclic;

                   return (
                     <g key={edge.id}>
                       <path 
                         d={`M ${startX} ${startY} C ${startX + 100} ${startY}, ${endX - 100} ${endY}, ${endX} ${endY}`} 
                         fill="none" 
                         stroke={isCyclic ? "#EF4444" : isError ? "#EF4444" : "url(#flowGradient)"} 
                         strokeWidth={isCyclic ? "6" : "4"} 
                         strokeLinecap="round"
                         strokeDasharray={isError ? "8 8" : "12 12"}
                         className={isCyclic ? "animate-pulse" : "animate-flow-dash transition-all duration-75"}
                       />
                       {(isError || isCyclic) && (
                          <g transform={`translate(${(startX + endX)/2 - 10}, ${(startY + endY)/2 - 10})`}>
                            <circle cx="10" cy="10" r="12" fill="white" stroke="#EF4444" strokeWidth="2" />
                            <text x="10" y="14" fontSize="12" textAnchor="middle" fill="#EF4444" fontWeight="bold">!</text>
                            <title>{isCyclic ? "循环依赖检测冲突" : "数据类型不兼容"}</title>
                          </g>
                       )}
                     </g>
                   );
                })}

                {tempEdge && (() => {
                   const sourceNode = nodes.find(n => n.id === tempEdge.originId);
                   if (!sourceNode) return null;
                   
                   let startX = sourceNode.x + 2000;
                   let startY = sourceNode.y + 2000;
                   if (sourceNode.type === 'imageGen') { startX += 560; startY += 200; }
                   else if (sourceNode.type === 'nlp') { startX += 360; startY += 100; }
                   else if (sourceNode.type === 'macroNode') { startX += 420; startY += 80; }
                   else { startX += 320; startY += 100; }

                   // Convert tempEdge.endX/Y to canvas local coords
                   const rect = canvasRef.current?.getBoundingClientRect();
                   if (!rect) return null;
                   
                   const rawEndX = (tempEdge.endX - rect.left - pan.x - rect.width/2)/zoomLevel;
                   const rawEndY = (tempEdge.endY - rect.top - pan.y - rect.height/2)/zoomLevel;
                   const endX = rawEndX + 2000;
                   const endY = rawEndY + 2000;

                   return (
                     <path 
                       d={`M ${startX} ${startY} C ${startX + 100} ${startY}, ${endX - 100} ${endY}, ${endX} ${endY}`} 
                       fill="none" 
                       stroke="#9CA3AF" 
                       strokeWidth="3" 
                       strokeLinecap="round"
                       strokeDasharray="6 6"
                     />
                   );
                })()}
              </svg>
           </div>
      </div>

      {contextMenu && ((() => {
          const cNode = nodes.find(n => n.id === contextMenu.nodeId);
          if (!cNode) return null;
          return (
              <div 
                  className="fixed z-50 bg-[var(--bg-panel)]/90 backdrop-blur-md rounded-[var(--radius-lg)] shadow-2xl border border-[var(--border-color)] py-2 w-56 flex flex-col items-stretch text-[11px] text-gray-700 font-bold"
                  style={{ top: contextMenu.y, left: contextMenu.x }}
              >
                  <div className="px-3 py-1.5 border-b border-[var(--border-color)] flex items-center mb-1">
                      <span className="text-gray-400 font-mono tracking-widest uppercase">Agent Metadata</span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between">
                      <span className="text-gray-400">Author</span>
                      <span>System Admin</span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between">
                      <span className="text-gray-400">Created</span>
                      <span className="font-mono">2026-05-30T10:00Z</span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between">
                      <span className="text-gray-400">Updated</span>
                      <span className="font-mono">{new Date().toISOString().split('T')[0]}</span>
                  </div>
                  <div className="border-t border-[var(--border-color)] my-1"></div>
                  <button 
                      className="px-3 py-1.5 text-left text-indigo-600 hover:bg-indigo-50 font-bold w-full transition-colors flex items-center justify-between"
                      onClick={(e) => {
                          e.stopPropagation();
                          setLogFilterNodeId(contextMenu.nodeId);
                          setShowLogs(true);
                          setContextMenu(null);
                      }}
                  >
                      <span>View Logs</span>
                      <Terminal className="w-3.5 h-3.5" />
                  </button>
                  <button 
                      className="px-3 py-1.5 text-left text-red-600 hover:bg-red-50 font-bold w-full transition-colors flex items-center justify-between border-t border-[var(--border-color)]"
                      onClick={(e) => {
                          e.stopPropagation();
                          const newNodes = nodes.filter(n => n.id !== contextMenu.nodeId);
                          const newEdges = edges.filter(edg => edg.fromId !== contextMenu.nodeId && edg.toId !== contextMenu.nodeId);
                          setNodes(newNodes);
                          setEdges(newEdges);
                          saveHistory(newNodes, newEdges);
                          setContextMenu(null);
                      }}
                  >
                      <span>Delete Node</span>
                      <Trash2 className="w-3.5 h-3.5" />
                  </button>
              </div>
          );
      })())}

      {/* Run Logs Bottom Drawer */}
      {showLogs && (
         <div className="absolute left-6 right-[380px] bottom-6 h-64 bg-[#0a0a0a]/95 backdrop-blur-xl rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.2)] border border-gray-800 flex flex-col overflow-hidden z-20 animate-in slide-in-from-bottom-8 duration-300">
            <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 bg-black/40">
              <div className="flex items-center text-gray-400 font-mono text-[11px] uppercase tracking-widest font-bold">
                 <Terminal className="w-3.5 h-3.5 mr-2" />
                 实时执行日志 (Run Log) 
                 {logFilterNodeId && <span className="ml-2 pl-2 border-l border-gray-700 text-indigo-400 flex items-center">Filtered: {nodes.find(n => n.id === logFilterNodeId)?.title || logFilterNodeId} <button onClick={() => setLogFilterNodeId(null)} className="ml-2 text-[var(--text-muted)] hover:text-white"><Trash2 className="w-3 h-3" /></button></span>}
              </div>
              <button onClick={() => setShowLogs(false)} className="text-[var(--text-muted)] hover:text-white transition-colors">
                <ChevronDown className="icon-sm" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[12px] text-gray-300 leading-relaxed custom-scrollbar space-y-1 flex flex-col justify-end">
               <div className="space-y-1">
                 {hasTypeError && <div className="flex text-amber-400"><span className="text-blue-400 w-24 shrink-0 text-opacity-50">[{new Date().toLocaleTimeString('en-US', {hour12:false})}]</span><span className="mr-2 border border-amber-500/50 bg-amber-500/20 px-1 rounded text-amber-300 font-bold">WARN</span> Data type mismatch detected between connected AI agents! Review tooltip on error indicator.</div>}
                 {hasCycle && <div className="flex text-red-400"><span className="text-blue-400 w-24 shrink-0 text-opacity-50">[{new Date().toLocaleTimeString('en-US', {hour12:false})}]</span><span className="mr-2 border border-red-500/50 bg-red-500/20 px-1 rounded text-red-300 font-bold">CRITICAL</span> Cyclical dependency detected in the orchestrator! Aborting execution to prevent infinite loop.</div>}
                 
                 {executionLogs.filter(log => !logFilterNodeId || log.sender === logFilterNodeId || log.sender === 'SYSTEM').map((log, i) => (
                    <div key={i} className={`flex items-center ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : log.type === 'success' ? 'text-green-400' : ''}`}>
                       <span className="text-blue-400 w-24 shrink-0 text-opacity-50">[{log.time}]</span>
                       <span className={`mr-2 ${log.sender === 'SYSTEM' ? 'text-gray-400' : 'text-purple-400 font-bold'}`}>[{log.sender}]</span> 
                       <span className="flex-1">{log.text}</span>
                       {log.cpuUsage !== undefined && (
                           <span className={`ml-4 text-[10px] px-1.5 py-0.5 rounded border ${log.cpuUsage > 80 ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                               {log.cpuUsage > 80 && <AlertCircle className="w-3 h-3 inline mr-1" />}
                               CPU {log.cpuUsage}% · RAM {log.memUsage}MB
                           </span>
                       )}
                    </div>
                 ))}
                 
                 {!isExecuting && executionLogs.length === 0 && !hasTypeError && !hasCycle && (
                    <div className="flex"><span className="text-blue-400 w-24 shrink-0 text-opacity-50">...</span><span className="text-[var(--text-muted)] italic flex items-center gap-2"><Clock className="w-3 h-3"/> Awaiting execution triggers...</span></div>
                 )}
               </div>
            </div>
         </div>
      )}

      <style>{`
        @keyframes flow-dash {
           to { stroke-dashoffset: -24; }
        }
        .animate-flow-dash {
           animation: flow-dash 1s linear infinite;
        }
      `}</style>

      {/* Insights Overlay */}
      {showInsights && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
             <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-2xl w-[500px] overflow-hidden flex flex-col">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-purple-50/50">
                   <div className="flex items-center text-purple-700 font-bold tracking-tight">
                     <Sparkles className="icon-md mr-2 text-purple-500" />
                     Workflow Insights
                   </div>
                   <button onClick={() => setShowInsights(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                   </button>
                </div>
                <div className="p-[var(--spacing-lg)] space-y-[var(--spacing-md)]">
                   <div className="flex items-start">
                      <div className="bg-amber-100 text-amber-600 p-2 rounded-lg mr-4">
                         <Layers className="icon-md" />
                      </div>
                      <div>
                         <h4 className="text-[13px] font-bold text-[var(--text-main)] mb-1">Parallel Processing Opportunity</h4>
                         <p className="text-[12px] text-gray-600 leading-relaxed">
                            We've detected that several nodes (e.g., Vision analysis and OCR) in your current workflow are connected serially but have independent inputs. Grouping them into a parallel macro node could reduce total latency by ~45%.
                         </p>
                      </div>
                   </div>
                   <div className="border-t border-[var(--border-color)] my-2"></div>
                   <div className="flex items-start">
                      <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg mr-4">
                         <Save className="icon-md" />
                      </div>
                      <div>
                         <h4 className="text-[13px] font-bold text-[var(--text-main)] mb-1">Caching Opportunity</h4>
                         <p className="text-[12px] text-gray-600 leading-relaxed">
                            Consider enabling deterministic caching on the "Gemini 视觉文案转化" node to save token costs during repeated test runs with the same input seed.
                         </p>
                      </div>
                   </div>
                </div>
                <div className="bg-gray-50 border-t border-[var(--border-color)] p-4 px-6 flex justify-end">
                   <button onClick={() => setShowInsights(false)} className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-bold text-[13px] shadow-sm">
                      Acknowledge
                   </button>
                </div>
             </div>
          </div>
      )}
    </div>
  );
}
