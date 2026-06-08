import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { X, Activity, MessageCircle, BarChart } from 'lucide-react';

const MOCK_GRAPH_DATA = {
  nodes: [
    { id: '1', name: '泛星跃动传媒', group: 1, type: 'company', value: 30, scoreSpan: '↑ 12%', history: '昨天完成高层战略对齐' },
    { id: '2', name: '王梦璇 (Sarah)', group: 2, type: 'person', value: 20, scoreSpan: '↑ 5%', history: '刚刚通了电话确认需求' },
    { id: '3', name: '曾总 (Leo)', group: 2, type: 'person', value: 15, scoreSpan: '无变动', history: '上周微信沟通' },
    { id: '4', name: '第一次现场拜访', group: 3, type: 'event', value: 10, scoreSpan: null, history: '现场需求调研确认' },
    { id: '5', name: '季度复盘会', group: 3, type: 'event', value: 10, scoreSpan: null, history: 'Q2 总结及计划' },
    
    { id: '6', name: '云创未来科技', group: 1, type: 'company', value: 25, scoreSpan: '↓ 3%', history: '合同推进中' },
    { id: '7', name: '李智 (Leo)', group: 2, type: 'person', value: 15, scoreSpan: null, history: '发送产品白皮书' },
    { id: '8', name: '产品演示', group: 3, type: 'event', value: 8, scoreSpan: null, history: '展示核心功能' },
  ],
  links: [
    { source: '2', target: '1', value: 2, label: '采购主管' },
    { source: '3', target: '1', value: 2, label: '技术总监' },
    { source: '4', target: '2', value: 1, label: '参与者' },
    { source: '4', target: '3', value: 1, label: '参与者' },
    { source: '5', target: '2', value: 1, label: '组织者' },
    
    { source: '7', target: '6', value: 2, label: '项目经理' },
    { source: '8', target: '7', value: 1, label: '参与者' }
  ]
};

export function CustomerGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedNode, setFocusedNode] = useState<any>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const { width } = container.getBoundingClientRect() || { width: 800 };
    const height = 600;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    svg.selectAll("*").remove();
    
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const simulation = d3.forceSimulation(MOCK_GRAPH_DATA.nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(MOCK_GRAPH_DATA.links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.append("g")
      .attr("stroke", "#9ca3af")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(MOCK_GRAPH_DATA.links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .selectAll("circle")
      .data(MOCK_GRAPH_DATA.nodes)
      .join("circle")
      .attr("r", (d: any) => d.value)
      .attr("fill", (d: any) => d.type === 'company' ? '#3b82f6' : d.type === 'person' ? '#10b981' : '#f59e0b')
      .style("cursor", "pointer")
      .call(drag(simulation) as any);
      
    const isConnected = (a: any, b: any) => {
       return MOCK_GRAPH_DATA.links.some((l: any) => (l.source.id === a.id && l.target.id === b.id) || (l.source.id === b.id && l.target.id === a.id));
    };

    node.on("click", (event, d: any) => {
       event.stopPropagation();
       const scale = 1.8;
       const x = width / 3 - d.x * scale;
       const y = height / 2 - d.y * scale;
       
       svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
          
       setFocusedNode(d);
       
       node.attr("opacity", (n: any) => (n === d || isConnected(d, n)) ? 1 : 0.2);
       link.attr("opacity", (l: any) => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);
    });
    
    svg.on("click", () => {
       setFocusedNode(null);
       svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity);
       node.attr("opacity", 1);
       link.attr("opacity", 0.6);
    });

    node.append("title")
      .text((d: any) => d.name);
      
    const labels = g.append("g")
      .selectAll("text")
      .data(MOCK_GRAPH_DATA.nodes)
      .join("text")
      .attr("dy", 4)
      .attr("dx", (d: any) => d.value + 4)
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "#4b5563")
      .style("pointer-events", "none")
      .text((d: any) => d.name);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
        
      labels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, []);

  const drag = (simulation: any) => {
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  // Get connections for the focused node
  const connections = focusedNode ? MOCK_GRAPH_DATA.links.filter((l: any) => l.source.id === focusedNode.id || l.target.id === focusedNode.id) : [];

  return (
    <div className="w-full bg-white rounded-[20px] border border-[var(--border-color)] overflow-hidden shadow-sm h-[600px] flex relative" ref={containerRef}>
        <div className="flex-1 w-full relative">
            <div className="absolute top-4 left-6 z-10 pointer-events-none bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-xs font-black text-gray-800 mb-2">客户交互关系图谱图例</h3>
                <div className="flex space-x-4 mt-2 text-[12px] font-medium text-gray-500">
                   <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-1.5 flex-shrink-0"></span>公司节点</span>
                   <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-1.5 flex-shrink-0"></span>关键联系人</span>
                   <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-amber-500 mr-1.5 flex-shrink-0"></span>核心事件</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">提示：点击节点进入「聚焦模式」</p>
            </div>
            <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
        </div>

      {/* Focus Mode Popover */}
      {focusedNode && (
         <div className="absolute right-0 top-0 bottom-0 w-[350px] bg-white border-l border-gray-100 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right-4 duration-300 z-20">
             <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-lg font-black text-gray-800">{focusedNode.name}</h2>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase mt-1 inline-block">{focusedNode.type}</span>
                 </div>
                 <button onClick={() => setFocusedNode(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                    <X className="w-4 h-4" />
                 </button>
             </div>

             <div className="space-y-6">
                <div>
                   <h3 className="text-[12px] font-bold text-gray-400 mb-2 flex items-center"><Activity className="w-3.5 h-3.5 mr-1" /> 状态变动与评分</h3>
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="text-[13px] font-bold text-gray-700">互动频次热度：高</div>
                      {focusedNode.scoreSpan && (
                         <div className="text-[12px] font-medium text-emerald-600 mt-1">评分环比: {focusedNode.scoreSpan}</div>
                      )}
                   </div>
                </div>

                <div>
                   <h3 className="text-[12px] font-bold text-gray-400 mb-2 flex items-center"><MessageCircle className="w-3.5 h-3.5 mr-1" /> 近期动态关联</h3>
                   <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <p className="text-[13px] text-blue-800 font-medium leading-relaxed">{focusedNode.history}</p>
                   </div>
                </div>

                <div>
                   <h3 className="text-[12px] font-bold text-gray-400 mb-2 flex items-center"><BarChart className="w-3.5 h-3.5 mr-1" /> 关联节点记录 ({connections.length})</h3>
                   <div className="space-y-2">
                       {connections.map((c: any, i: number) => {
                          const targetNode = c.source.id === focusedNode.id ? c.target : c.source;
                          return (
                             <div key={i} className="flex flex-col p-3 border border-gray-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors cursor-pointer group">
                                <span className="text-[13px] font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">{targetNode.name}</span>
                                <span className="text-[11px] text-gray-500 font-medium">关系: {c.label || '关联'}</span>
                             </div>
                          )
                       })}
                   </div>
                </div>
             </div>
         </div>
      )}
    </div>
  );
}
