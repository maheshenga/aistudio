import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useDeveloperMode } from '../hooks/useDeveloperMode';

interface FlowNode extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  label: string;
  radius: number;
}

interface FlowLink extends d3.SimulationLinkDatum<FlowNode> {
  source: string;
  target: string;
  value: number;
}

const mapData: { nodes: FlowNode[]; links: FlowLink[] } = {
  nodes: [
    { id: 'dashboard', group: 1, label: 'Dashboard', radius: 30 },
    { id: 'chat', group: 2, label: 'Chat Agent', radius: 25 },
    { id: 'image', group: 3, label: 'Image Engine', radius: 25 },
    { id: 'video', group: 3, label: 'Video Engine', radius: 25 },
    { id: 'settings', group: 4, label: 'Settings', radius: 20 },
    { id: 'workflow', group: 1, label: 'Automation', radius: 25 },
    { id: 'store', group: 1, label: 'Storefront', radius: 25 }
  ],
  links: [
    { source: 'dashboard', target: 'chat', value: 3 },
    { source: 'dashboard', target: 'workflow', value: 4 },
    { source: 'dashboard', target: 'store', value: 2 },
    { source: 'chat', target: 'image', value: 5 },
    { source: 'chat', target: 'video', value: 3 },
    { source: 'workflow', target: 'store', value: 4 },
    { source: 'workflow', target: 'image', value: 2 },
    { source: 'dashboard', target: 'settings', value: 1 },
  ]
};

export function ModuleFlowMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous
    d3.select(containerRef.current).selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = 400;

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Setup defs for arrowheads
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 24) // offset for node radius
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#9ca3af')
      .style('stroke', 'none');

    const simulation = d3.forceSimulation(mapData.nodes)
      .force('link', d3.forceLink(mapData.links).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d: any) => d.radius + 10));

    const link = svg.append('g')
      .selectAll('line')
      .data(mapData.links)
      .enter().append('line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', d => Math.sqrt(d.value) * 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    const nodeGroup = svg.append('g')
      .selectAll('g')
      .data(mapData.nodes)
      .enter().append('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    nodeGroup.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => {
        if (d.group === 1) return '#eff6ff'; // blue-50
        if (d.group === 2) return '#f0fdf4'; // green-50
        if (d.group === 3) return '#faf5ff'; // purple-50
        return '#f9fafb'; // gray-50
      })
      .attr('stroke', d => {
        if (d.group === 1) return '#3b82f6'; // blue-500
        if (d.group === 2) return '#22c55e'; // green-500
        if (d.group === 3) return '#a855f7'; // purple-500
        return '#6b7280'; // gray-500
      })
      .attr('stroke-width', 2);

    nodeGroup.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text(d => d.label);

    // Particle effect on links
    const particlesGroup = svg.append('g');
    
    // Animate particles along links to represent data flow
    function animateParticles() {
      // Pick random links
      const activeLinks = mapData.links.filter(() => Math.random() > 0.5);
      
      const p = particlesGroup.selectAll('circle.particle')
        .data(activeLinks, (d:any) => d.source.id + "-" + d.target.id + Math.random());
        
      p.enter().append('circle')
        .attr('class', 'particle')
        .attr('r', 3)
        .attr('fill', '#3b82f6')
        .attr('cx', (d:any) => d.source.x)
        .attr('cy', (d:any) => d.source.y)
        .style('opacity', 0.8)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('cx', (d:any) => d.target.x)
        .attr('cy', (d:any) => d.target.y)
        .style('opacity', 0)
        .remove();
        
      setTimeout(animateParticles, 1000);
    }
    
    setTimeout(animateParticles, 1000);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

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

    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] w-full mt-6">
      <h2 className="text-lg font-bold text-[var(--text-main)] mb-2 border-l-4 border-indigo-500 pl-3">Cross-Module Data Flow</h2>
      <p className="text-xs text-[var(--text-muted)] mb-[var(--spacing-md)] pl-4">Active workflows and information routing map.</p>
      <div ref={containerRef} className="w-full relative rounded-[var(--radius-lg)] bg-gray-50/50 object-contain overflow-hidden border border-[var(--border-color)]">
        {/* D3 Content Renders Here */}
      </div>
    </div>
  );
}
