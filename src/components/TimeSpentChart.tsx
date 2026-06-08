import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface TimeData {
  module: string;
  minutes: number;
}

export function TimeSpentChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<TimeData[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('module_time_tracker');
      if (stored) {
        const rawData = JSON.parse(stored);
        
        // Convert to array, map to minutes, sort desc, limit top 6
        const sortedData: TimeData[] = Object.keys(rawData)
          .map(k => ({ module: k, minutes: Math.round(rawData[k] / 60) }))
          .filter(d => d.minutes > 0)
          .sort((a, b) => b.minutes - a.minutes)
          .slice(0, 6);
        
        setData(sortedData);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // Clear previous
    d3.select(chartRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 60 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.module))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max<TimeData, number>(data, d => d.minutes) || 10])
      .nice()
      .range([height, 0]);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => (d as string).substring(0, 8))) // Trim long names
      .selectAll('text')
      .attr('class', 'text-xs text-[var(--text-muted)] font-sans')
      .attr('transform', 'rotate(-20)')
      .style('text-anchor', 'end');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .attr('class', 'text-xs text-[var(--text-muted)] font-sans');

    // Add bars
    svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: TimeData) => x(d.module) || 0)
      .attr('y', (d: TimeData) => y(d.minutes))
      .attr('width', x.bandwidth())
      .attr('height', (d: TimeData) => height - y(d.minutes))
      .attr('fill', '#3b82f6')
      .attr('rx', 2)
      .on('mouseover', function() { d3.select(this).attr('fill', '#2563eb'); })
      .on('mouseout', function() { d3.select(this).attr('fill', '#3b82f6'); });

  }, [data]);

  if (data.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">Not enough data to display chart. Explore more modules!</div>;
  }

  return (
    <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] mt-6">
      <h2 className="text-lg font-bold text-[var(--text-main)] mb-4 border-l-4 border-blue-500 pl-3">Module Usage Time (Minutes)</h2>
      <div ref={chartRef} className="w-full"></div>
    </div>
  );
}
