import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { listAuditLogs } from '../lib/data/auditLogRepository';
import { useSaasSession } from '../saas/SaasAuthContext';

export function ActivityHeatmap() {
  const d3Container = useRef(null);
  const session = useSaasSession();

  useEffect(() => {
    if (d3Container.current) {
      // Clear any previous rendering
      d3.select(d3Container.current).selectAll('*').remove();

      const width = 300;
      const height = 180;
      const cellSize = 18;
      const cellMargin = 4;

      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`);

      // Read real data
      let data = Array(7).fill(0).map(() => Array(8).fill(0));
      try {
        const logs = listAuditLogs({ workspaceId: session.workspace.id });
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

        logs.forEach((log) => {
          if (log.timestamp > thirtyDaysAgo) {
            const date = new Date(log.timestamp);
            let day = date.getDay() - 1; // 0 is Sunday, convert to Monday=0
            if (day === -1) day = 6;
            const hour = date.getHours();
            const period = Math.floor(hour / 3);
            if (day >= 0 && day < 7 && period >= 0 && period < 8) {
              data[day][period]++;
            }
          }
        });
      } catch (e) {
        console.error("Failed to parse activity logs", e);
      }

      // If no data to show, generate some mock so it's not empty, or leave empty
      const maxVal = Math.max(1, d3.max(data.map(row => d3.max(row))) || 1);

      const xLabels = ['0-3', '3-6', '6-9', '9-12', '12-15', '15-18', '18-21', '21-24'];
      const yLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

      const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, maxVal]);

      svg.append('g')
        .selectAll('text')
        .data(xLabels)
        .enter()
        .append('text')
        .text(d => d)
        .attr('x', (d, i) => i * (cellSize + cellMargin) + 60 + cellSize / 2)
        .attr('y', 15)
        .style('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', 'var(--text-muted)');

      svg.append('g')
        .selectAll('text')
        .data(yLabels)
        .enter()
        .append('text')
        .text(d => d)
        .attr('x', 50)
        .attr('y', (d, i) => i * (cellSize + cellMargin) + 30 + cellSize / 2 + 3)
        .style('text-anchor', 'end')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', 'var(--text-muted)');

      const tooltip = d3.select('body').append('div')
        .style('position', 'absolute')
        .style('padding', '6px 10px')
        .style('background', 'var(--bg-panel)')
        .style('color', 'var(--text-main)')
        .style('border', '1px solid var(--border-color)')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('border-radius', '6px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 100);

      data.forEach((row, i) => {
        svg.append('g')
          .selectAll('rect')
          .data(row)
          .enter()
          .append('rect')
          .attr('x', (d, j) => j * (cellSize + cellMargin) + 60)
          .attr('y', i * (cellSize + cellMargin) + 30)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr('rx', 4)
          .attr('fill', d => d === 0 ? 'var(--bg-hover)' : colorScale(d as number))
          .style('stroke', 'var(--border-color)')
          .style('stroke-width', '1px')
          .on('mouseover', function(event, d) {
            d3.select(this)
              .style('stroke', 'var(--color-primary)')
              .style('stroke-width', '2px');
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip.html(`互动次数: ${d}`)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 20) + 'px');
          })
          .on('mouseout', function(event, d) {
            d3.select(this)
              .style('stroke', 'var(--border-color)')
              .style('stroke-width', '1px');
            tooltip.transition().duration(200).style('opacity', 0);
          });
      });

      return () => {
         tooltip.remove();
      }
    }
  }, [session.workspace.id]);

  return (
    <div className="w-full flex justify-center items-center h-full min-h-[160px]">
      <div ref={d3Container} className="w-full h-full max-w-[320px]"></div>
    </div>
  );
}
