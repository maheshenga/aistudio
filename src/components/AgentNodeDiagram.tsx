import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { PencilLine, X } from 'lucide-react';

interface Note {
  id: string;
  nodeId: string;
  text: string;
}

export function AgentNodeDiagram({ canaryEnabled }: { canaryEnabled?: boolean }) {
  const d3Container = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeInputNodeId, setActiveInputNodeId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [nodePositions, setNodePositions] = useState<{ [id: string]: { x: number, y: number } }>({});

  useEffect(() => {
    if (d3Container.current) {
      d3.select(d3Container.current).selectAll('svg').remove();

      const width = d3Container.current.clientWidth;
      const height = 400;

      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height].join(' '))
        .attr('style', 'max-width: 100%; height: auto;');

      const nodesBase = [
        { id: '1', name: '全能助手 (Global)', group: 1, radius: 24 },
        { id: '2', name: 'UI Copilot', group: 2, radius: 18 },
        { id: '3', name: 'Data Analyst', group: 3, radius: 18 },
        { id: '4', name: 'CodeAssist', group: 4, radius: 18 },
        { id: '5', name: 'Video Gen', group: 5, radius: 18 }
      ];

      const linksBase = [
        { source: '1', target: '2', value: 3, type: 'normal' },
        { source: '1', target: '3', value: 2, type: 'normal' },
        { source: '1', target: '4', value: 5, type: 'normal' },
        { source: '1', target: '5', value: 1, type: 'normal' },
        { source: '2', target: '4', value: 2, type: 'normal' },
        { source: '3', target: '4', value: 4, type: 'normal' }
      ];

      if (canaryEnabled) {
         nodesBase.push({ id: 'canary-1', name: 'UI Copilot v2.0 (Canary)', group: 6, radius: 18 });
         linksBase.push({ source: '1', target: 'canary-1', value: 3, type: 'canary' });
         linksBase.push({ source: 'canary-1', target: '4', value: 2, type: 'canary' });
      }

      const data = { nodes: nodesBase, links: linksBase };
      const color = d3.scaleOrdinal(d3.schemeTableau10);

      const simulation = d3.forceSimulation(data.nodes as any)
        .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(120))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius((d: any) => d.radius + 15));

      const link = svg.append('g')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('stroke', d => d.type === 'canary' ? '#ec4899' : '#9CA3AF')
        .attr('stroke-opacity', d => d.type === 'canary' ? 1 : 0.6)
        .attr('stroke-dasharray', d => d.type === 'canary' ? '5,5' : 'none')
        .attr('stroke-width', d => Math.sqrt(d.value));

      if (canaryEnabled) {
         // Label for canary route
         svg.append('g')
            .selectAll('text')
            .data(data.links.filter(l => l.type === 'canary'))
            .join('text')
            .attr('class', 'canary-label')
            .style('fill', '#ec4899')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .text('5% 流量探针');
      }

      const nodeGroup = svg.append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended) as any);

      nodeGroup.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => d.id.startsWith('canary') ? '#fbcfe8' : color(d.group.toString()))
        .attr('stroke', d => d.id.startsWith('canary') ? '#ec4899' : '#fff')
        .attr('stroke-width', d => d.id.startsWith('canary') ? 3 : 1.5);
      
      // Interactive add note indicator
      nodeGroup.append('circle')
        .attr('r', 8)
        .attr('cx', (d: any) => d.radius + 2)
        .attr('cy', (d: any) => -d.radius)
        .attr('fill', '#fbbf24')
        .attr('stroke', '#fff')
        .attr('class', 'cursor-pointer hover:fill-amber-500 transition-colors')
        .on('click', (event, d: any) => {
           event.stopPropagation();
           setActiveInputNodeId(d.id);
           setInputText('');
        });
        
      nodeGroup.append('text')
        .text('+')
        .attr('x', (d: any) => d.radius + 2)
        .attr('y', (d: any) => -d.radius + 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '900')
        .attr('fill', '#92400e')
        .attr('stroke', 'none')
        .style('pointer-events', 'none');

      nodeGroup.append('text')
        .text(d => d.name)
        .attr('x', d => d.radius + 12)
        .attr('y', 4)
        .attr('fill', d => d.id.startsWith('canary') ? '#be185d' : '#374151')
        .attr('stroke', 'none')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold');

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        svg.selectAll('.canary-label')
           .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
           .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 5);

        nodeGroup
          .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
          
        // Store positions for React overlays
        const pos: any = {};
        data.nodes.forEach((n: any) => {
           if (n.x && n.y) pos[n.id] = { x: n.x, y: n.y, radius: n.radius };
        });
        setNodePositions(pos);
      });

      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
    }
  }, [canaryEnabled]);

  const handleAddNote = () => {
     if (activeInputNodeId && inputText.trim()) {
        setNotes(prev => [...prev, { id: Math.random().toString(), nodeId: activeInputNodeId, text: inputText }]);
     }
     setActiveInputNodeId(null);
  };

  return (
    <div className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] shadow-sm p-[var(--spacing-lg)] mb-[var(--spacing-xl)]">
       <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-black text-[var(--text-main)] leading-tight">系统节点拓扑图 (Agent Topology)</h3>
            <p className="text-[12px] text-[var(--text-muted)] font-medium mt-1">呈现 Multi-Agent 并行任务调度、信令握手及数据消费链路流转。</p>
          </div>
          {canaryEnabled && (
             <div className="bg-pink-50 text-pink-700 px-3 py-1.5 rounded-lg border border-pink-200 text-xs font-bold animate-pulse">
                Canary Route Active ↗
             </div>
          )}
       </div>
       <div className="relative w-full h-[400px]" ref={d3Container}>
          {/* Render Sticky Notes Overlay */}
          {notes.map(note => {
             const pos = nodePositions[note.nodeId];
             if (!pos) return null;
             return (
                <div 
                   key={note.id} 
                   className="absolute bg-amber-200 shadow-md p-2 rounded rounded-bl-none text-amber-900 text-[10px] font-bold w-32 border border-amber-300 z-10"
                   style={{ left: pos.x + pos.radius + 15, top: pos.y - pos.radius - 20 }}
                >
                   <div className="flex justify-between items-start mb-1 border-b border-amber-300/50 pb-1">
                      <span className="flex items-center"><PencilLine className="w-3 h-3 mr-1" /> 注记</span>
                      <button onClick={() => setNotes(n => n.filter(x => x.id !== note.id))}><X className="w-3 h-3 text-amber-700 hover:text-amber-900" /></button>
                   </div>
                   <p className="leading-snug">{note.text}</p>
                </div>
             );
          })}
          
          {/* Note Input Tooltip Overlay */}
          {activeInputNodeId && nodePositions[activeInputNodeId] && (
             <div 
               className="absolute z-20 bg-[var(--bg-panel)] shadow-xl rounded-lg border border-[var(--border-color)] p-2 w-48 flex flex-col"
               style={{ left: nodePositions[activeInputNodeId].x + 20, top: nodePositions[activeInputNodeId].y - 40 }}
             >
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-bold text-[var(--text-muted)]">添加便签 (Sticky Note)</span>
                   <button onClick={() => setActiveInputNodeId(null)}><X className="w-3 h-3 text-gray-400" /></button>
                </div>
                <textarea 
                   autoFocus
                   value={inputText}
                   onChange={e => setInputText(e.target.value)}
                   onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); }
                   }}
                   className="w-full h-16 bg-amber-50 border border-amber-200 resize-none text-[10px] p-2 rounded focus:outline-none focus:ring-1 focus:ring-amber-400 font-medium"
                   placeholder="输入备忘录并按回车..."
                />
                <button onClick={handleAddNote} className="mt-2 text-[10px] font-bold bg-amber-100 text-amber-800 py-1 rounded hover:bg-amber-200 transition-colors">
                   贴上
                </button>
             </div>
          )}
       </div>
    </div>
  );
}
