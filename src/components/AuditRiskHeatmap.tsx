import React, { useEffect, useRef } from 'react';
import { AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import * as d3 from 'd3';

export function AuditRiskHeatmap() {
  const d3Container = useRef<SVGSVGElement | null>(null);

  const riskCategories = [
    { name: '业务招待费比例', current: 18, industry: 12, risk: 'high', explanation: '大幅超出[通用软件行业]平均 12% 比例上限，可能引发特别纳税调整核查' },
    { name: '研发加计扣除', current: 45, industry: 30, risk: 'medium', explanation: '研发费用占比略高，建议补充留存核心技术人员工资银行流水及社保凭证' },
    { name: '广告宣传费', current: 15, industry: 15, risk: 'low', explanation: '符合税前扣除限额标准' },
    { name: '职工福利费', current: 14, industry: 14, risk: 'low', explanation: '最高不超过工资薪金总额14%，无税收风险' },
  ];

  useEffect(() => {
    if (d3Container.current) {
      // Clear previous
      d3.select(d3Container.current).selectAll("*").remove();

      const margin = { top: 20, right: 30, bottom: 40, left: 100 };
      const width = document.getElementById("d3-heatmap-wrapper")?.clientWidth || 500;
      const innerWidth = width - margin.left - margin.right;
      const height = 250 - margin.top - margin.bottom;

      const svg = d3.select(d3Container.current)
        .attr('width', width)
        .attr('height', 250)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear()
        .domain([0, 50])
        .range([0, innerWidth]);

      const y = d3.scaleBand()
        .domain(riskCategories.map(d => d.name))
        .range([0, height])
        .padding(0.3);

      // Add X axis
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + '%'))
        .selectAll("text")
        .style("font-size", "10px")
        .style("color", "#64748b");

      // Add Y axis
      svg.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll("text")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .style("color", "#334155")
        .attr("dx", "-5px");
        
      svg.select(".domain").remove();

      // Plot Industry Average
      svg.selectAll("myrect")
        .data(riskCategories)
        .enter()
        .append("rect")
        .attr("x", x(0))
        .attr("y", d => y(d.name)!)
        .attr("width", d => x(d.industry))
        .attr("height", y.bandwidth())
        .attr("fill", "#e2e8f0")
        .attr("rx", 4);

      // Plot Current Value
      svg.selectAll("myrect2")
        .data(riskCategories)
        .enter()
        .append("rect")
        .attr("x", x(0))
        .attr("y", d => y(d.name)! + y.bandwidth() / 4)
        .attr("width", d => x(d.current))
        .attr("height", y.bandwidth() / 2)
        .attr("fill", d => d.risk === 'high' ? '#f43f5e' : d.risk === 'medium' ? '#f59e0b' : '#10b981')
        .attr("rx", y.bandwidth() / 4);

      // Legend
      const legend = svg.append("g").attr("transform", `translate(${innerWidth - 150}, -15)`);
      legend.append("rect").attr("x", 0).attr("y", 0).attr("width", 10).attr("height", 10).attr("fill", "#e2e8f0").attr("rx", 2);
      legend.append("text").attr("x", 15).attr("y", 9).text("行业基准").style("font-size", "10px").attr("fill", "#64748b");
      legend.append("rect").attr("x", 70).attr("y", 3).attr("width", 10).attr("height", 4).attr("fill", "#94a3b8").attr("rx", 2);
      legend.append("text").attr("x", 85).attr("y", 9).text("本期实发").style("font-size", "10px").attr("fill", "#64748b");
    }
  }, [riskCategories]);

  return (
    <div className="bg-white rounded-2xl border border-[var(--border-color)] p-6 shadow-sm mb-6 print:break-inside-avoid">
       <div className="flex items-center justify-between mb-4">
           <h3 className="text-sm font-bold text-gray-800 flex items-center">
             <Activity className="w-5 h-5 text-rose-500 mr-2" /> 稽查风险热力图 (Audit Risk Heatmap)
           </h3>
           <div className="flex space-x-3 text-[11px] font-bold">
               <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5"></span> 高风险</span>
               <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5"></span> 中度预警</span>
               <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></span> 健康安全</span>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
           <div className="lg:col-span-3" id="d3-heatmap-wrapper">
              <svg ref={d3Container} className="w-full text-gray-800" />
           </div>
           
           <div className="lg:col-span-2 space-y-3">
               {riskCategories.slice(0, 2).map((item, idx) => (
                 <div key={idx} className={`p-3 rounded-xl border flex items-start ${
                     item.risk === 'high' ? 'bg-rose-50 border-rose-200' :
                     item.risk === 'medium' ? 'bg-amber-50 border-amber-200' :
                     'bg-emerald-50 border-emerald-100'
                 }`}>
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-3 mt-0.5 ${
                         item.risk === 'high' ? 'bg-white text-rose-500 border border-rose-100' :
                         item.risk === 'medium' ? 'bg-white text-amber-500 border border-amber-100' :
                         'bg-white text-emerald-500 border border-emerald-100'
                     }`}>
                         {item.risk === 'high' ? <AlertTriangle className="w-3 h-3" /> : item.risk === 'medium' ? <AlertTriangle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                     </div>
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <h4 className={`text-[12px] font-bold ${
                                item.risk === 'high' ? 'text-rose-800' :
                                item.risk === 'medium' ? 'text-amber-800' :
                                'text-emerald-800'
                            }`}>{item.name}</h4>
                        </div>
                        <p className={`text-[10px] font-medium leading-relaxed ${
                             item.risk === 'high' ? 'text-rose-700' :
                             item.risk === 'medium' ? 'text-amber-700' :
                             'text-emerald-700'
                        }`}>{item.explanation}</p>
                     </div>
                 </div>
               ))}
           </div>
       </div>
    </div>
  );
}
