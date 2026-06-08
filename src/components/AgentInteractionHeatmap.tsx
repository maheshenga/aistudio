import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export function AgentInteractionHeatmap() {
  const d3Container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (d3Container.current) {
      // Clear previous drawing
      d3.select(d3Container.current).selectAll('*').remove();

      const agents = ['全局助手', '开发Agent', '视觉Agent', '编导Agent', '文案Agent', '数据分析'];
      const times = Array.from({ length: 24 }, (_, i) => `${i}h`);

      // Generate dummy heatmap data
      const data: { agent: string, time: string, value: number, successRate: number }[] = [];
      agents.forEach(agent => {
        times.forEach(time => {
          data.push({
            agent,
            time,
            value: Math.floor(Math.random() * 100), // frequency
            successRate: 80 + Math.random() * 20 // success rate 80-100%
          });
        });
      });

      const margin = { top: 30, right: 30, bottom: 30, left: 80 };
      const width = d3Container.current.clientWidth - margin.left - margin.right;
      const height = Number(d3Container.current.clientHeight) || 300 - margin.top - margin.bottom;

      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .range([0, width])
        .domain(times)
        .padding(0.05);
      
      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .select('.domain').remove();
      
      svg.selectAll(".tick text")
        .style("fill", "#6B7280")
        .style("font-size", "10px")
        .style("font-weight", "500");

      const y = d3.scaleBand()
        .range([height, 0])
        .domain(agents)
        .padding(0.05);

      svg.append('g')
        .call(d3.axisLeft(y).tickSizeOuter(0))
        .select('.domain').remove();
        
      svg.selectAll(".tick text")
        .style("fill", "#374151")
        .style("font-size", "11px")
        .style("font-weight", "bold");

      const myColor = d3.scaleLinear<string>()
        .range(['#EEF2FF', '#4F46E5'])
        .domain([0, 100]);

      // Tooltip inside a react ref could be done using d3 directly:
      const tooltip = d3.select(d3Container.current)
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip bg-gray-900 text-white text-xs px-3 py-2 rounded shadow-lg absolute pointer-events-none")
        .style("z-index", "100");

      svg.selectAll()
        .data(data, (d: any) => d.agent + ':' + d.time)
        .enter()
        .append('rect')
        .attr('x', (d: any) => x(d.time)!)
        .attr('y', (d: any) => y(d.agent)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .style('fill', (d: any) => myColor(d.value))
        .style('stroke-width', 1)
        .style('stroke', 'none')
        .attr('rx', 4)
        .attr('ry', 4)
        .on("mouseover", function(event, d) {
          d3.select(this)
            .style("stroke", "#000")
            .style("opacity", 1);
          tooltip.transition()
            .duration(200)
            .style("opacity", .9);
          tooltip.html(`${d.agent}<br>时段: ${d.time}<br>调用频次: <span class="font-bold text-indigo-400">${d.value}</span> 次<br>成功率: <span class="font-bold ${d.successRate > 95 ? 'text-green-400' : 'text-amber-400'}">${d.successRate.toFixed(1)}%</span>`)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", function(event) {
          tooltip.style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function(event, d: any) {
          d3.select(this)
            .style("stroke", "none")
            .style("opacity", 0.8);
          tooltip.transition()
            .duration(500)
            .style("opacity", 0);
        });

      // Simple animation
      svg.selectAll('rect')
         .style("opacity", 0)
         .transition()
         .duration(1000)
         .delay((d: any, i) => i * 3)
         .style("opacity", 0.8);

    }
  }, []);

  return (
    <div className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] shadow-sm p-[var(--spacing-lg)] mt-6">
       <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-black text-[var(--text-main)] leading-tight">Agent 并发交互热力图</h3>
            <p className="text-[12px] text-[var(--text-muted)] font-medium mt-1">24小时粒度全局调度频次与成功率 (D3.js 驱动)</p>
          </div>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-gray-400">
             <span>低频</span>
             <div className="w-24 h-1.5 rounded-full bg-gradient-to-r from-[#EEF2FF] to-[#4F46E5]"></div>
             <span>高频</span>
          </div>
       </div>
       <div className="relative w-full h-[320px]" ref={d3Container}></div>
    </div>
  );
}
