import React, { useState, useEffect, useMemo } from 'react';
import { Image as ImageIcon, Sparkles, Wand2, Download, Copy, Play, Check, ImageOff, Plus, Minus, Upload, Video, LayoutTemplate, RotateCcw, Clock, Trash2, Save, X, Smartphone, Monitor, ChevronDown, ChevronRight, AlignLeft, Tags, Layers } from 'lucide-react';

interface ECommerceViewProps {
  title: string;
  moduleId: string;
}

// ----------------------------------------------------------------------
// Modular Config & Types
// ----------------------------------------------------------------------

const getModuleFlags = (moduleId: string) => ({
  isVideo: moduleId === 'e_video',
  isDetailPage: moduleId === 'e_detail_page',
  isPoster: moduleId === 'e_poster',
  isWhiteBg: moduleId === 'e_white_bg',
  isClone: moduleId === 'e_clone',
});

const getModuleConfig = (moduleId: string) => {
  const flags = getModuleFlags(moduleId);
  
  const baseAdvanced = {
    tones: ['带货感十足', '生活化种草', '痛点刺激', '客观评测', '发疯文学(吸睛)'],
    lighting: ['自然日光', '影棚硬光', '赛博霓虹', '温馨暖光', '高级暗调'],
    angles: ['平视特写', '俯拍全景', '微距细节', '仰拍大气', '第一人称视角']
  };

  if (flags.isVideo) {
    return {
      hasGenMethod: true,
      nameLabel: '产品名称',
      namePlaceholder: '产品名称',
      textLabel: '视频脚本 / 核心卖点',
      textPlaceholder: "【核心卖点】\n【目标人群】\n【期望画面 / 口播】",
      textAiBtn: 'AI智能爆款脚本',
      typesTitle: '视频类型',
      types: ['产品展示', '卖点讲解', '场景使用', '开箱视频', '对比测评', '口播带货'],
      ratioTitle: '画面比例',
      ratios: ['9:16 (抖音/小红书)', '16:9 (B站/西瓜)', '1:1 (主图视频)'],
      ...baseAdvanced
    };
  } else if (flags.isDetailPage) {
    return {
      hasGenMethod: true,
      nameLabel: '商品类目',
      namePlaceholder: '如：美妆护肤、3C数码',
      textLabel: '核心卖点 (分点描述)',
      textPlaceholder: "1. 卖点一：...\n2. 卖点二：...\n3. 补充描述：...",
      textAiBtn: 'AI一键提炼卖点',
      typesTitle: '详情页模块结构',
      types: ['头图展示', '痛点场景', '核心卖点详解', '参数对比表', '使用教程', '资质与背书', '买家秀展示'],
      ratioTitle: '长图宽度比例',
      ratios: ['750宽 (淘宝/拼多多)', '1080宽 (京东/小红书)'],
      ...baseAdvanced
    };
  } else if (flags.isPoster) {
    return {
      hasGenMethod: true,
      nameLabel: '营销大促主题',
      namePlaceholder: '如：双十一全场五折狂欢',
      textLabel: '营销文案与利益点',
      textPlaceholder: "【主标题】\n【促销利益点 (满减/买赠)】\n【行动召唤 (立即抢购等)】",
      textAiBtn: 'AI生成营销海报文案',
      typesTitle: '海报类型',
      types: ['大促主会场', '单品秒杀', '新品预发布', '品牌氛围', '倒计时海报', '直播预告'],
      ratioTitle: '尺寸比例',
      ratios: ['9:16 (手机全屏)', '3:4 (小红书)', '1:1 (朋友圈)', '16:9 (网页横幅)'],
      ...baseAdvanced
    };
  } else if (flags.isClone) {
    return {
      hasGenMethod: false,
      nameLabel: '你的产品图',
      namePlaceholder: '',
      textLabel: '替换与融合说明',
      textPlaceholder: "例如：把参考图里的瓶子换成我的面霜罐，保留同样的倒影和暖光氛围",
      textAiBtn: '',
      typesTitle: 'AI接管强度',
      types: ['严格像素级还原', '智能光影融合', '全局风格重绘'],
      ratioTitle: '生成约束',
      ratios: ['保持原图比例', '重新裁剪构图'],
      ...baseAdvanced
    };
  } else if (flags.isWhiteBg) {
    return {
      hasGenMethod: false,
      nameLabel: '上传商品图',
      namePlaceholder: '',
      textLabel: '',
      textPlaceholder: "",
      textAiBtn: '',
      typesTitle: '极速处理模式',
      types: ['纯白底 (淘宝规范)', '透明底 PNG', '保留原始真实投影', '生成高光反射倒影'],
      ratioTitle: '输出规范尺寸',
      ratios: ['800×800 (主图)', '1080×1080', '保持原比例'],
      ...baseAdvanced
    };
  } else {
    // defaults to main image
    return {
      hasGenMethod: true,
      nameLabel: '产品核心词',
      namePlaceholder: '如：便携式挂脖风扇',
      textLabel: '主图打动点',
      textPlaceholder: "输入产品想突出的最大优势，AI将把它呈现在画面或文案中...",
      textAiBtn: 'AI自动挖掘主图痛点',
      typesTitle: '主图类型规划',
      types: ['点击率引流图', '核心卖点图', '真实场景代入', '直观竞品对比', '局部细节放大', '权威认证背书'],
      ratioTitle: '生成规范比例',
      ratios: ['1:1', '4:3', '3:4 (小红书/服饰主图)'],
      ...baseAdvanced
    };
  }
};

const getPreviewStyle = (aspectRatio: string) => {
  if (aspectRatio.includes('1:1') || aspectRatio.includes('800×800') || aspectRatio.includes('1080×1080')) return 'aspect-square';
  if (aspectRatio.includes('9:16') || aspectRatio.includes('3:4') || aspectRatio.includes('2:3')) return 'aspect-[9/16] max-h-[60vh]';
  if (aspectRatio.includes('16:9') || aspectRatio.includes('4:3') || aspectRatio.includes('3:2')) return 'aspect-video';
  if (aspectRatio.includes('宽')) return 'aspect-[1/2] max-h-[60vh]';
  return 'aspect-square'; 
};

// ----------------------------------------------------------------------
// Modular UI Components
// ----------------------------------------------------------------------

const FormSection = ({ title, subtitle, extra, icon: Icon, children, className = '' }: any) => (
  <div className={`space-y-3 block py-5 border-b border-[var(--border-color)] last:border-b-0 first:pt-4 ${className}`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex flex-col space-y-1.5">
        <label className="text-[14px] font-black text-[var(--text-main)] tracking-wide flex items-center">
          {Icon && <Icon className="icon-md mr-2 text-[var(--color-primary)]" />} {title}
        </label>
        {subtitle && <p className="text-[12px] text-[var(--text-muted)] font-medium leading-relaxed">{subtitle}</p>}
      </div>
      {extra && <div className="ml-4 flex-shrink-0">{extra}</div>}
    </div>
    {children}
  </div>
);

const UploadArea = ({ title, subtitle, icon, desc1, desc2, files = [], onUpload, onRemove }: any) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file: File) => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      onUpload(newFiles);
    }
  };

  return (
    <FormSection title={title} subtitle={subtitle} className="animate-in fade-in duration-200">
      <input 
        type="file" 
        multiple 
        accept="image/*,video/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      
      {files.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
           {files.map((fileObj: any, idx: number) => (
             <div key={idx} className="relative group rounded-lg overflow-hidden border border-[var(--border-color)] aspect-square shadow-sm">
               <img src={fileObj.preview} alt="upload" className="w-full h-full object-cover" />
               <button 
                 onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                 className="absolute top-1 right-1 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500 shadow"
               >
                 <X className="w-3 h-3" />
               </button>
             </div>
           ))}
           {files.length < 5 && (
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-[var(--bg-panel)] hover:border-gray-900 hover:text-[var(--text-main)] text-gray-400 cursor-pointer aspect-square transition-all shadow-sm"
             >
               <Plus className="icon-md" />
             </div>
           )}
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-[1.5px] border-dashed border-gray-300 rounded-[24px] p-[var(--spacing-xl)] flex flex-col items-center justify-center bg-gray-50/30 hover:bg-[var(--bg-panel)] hover:border-blue-400 hover:shadow-md hover:text-[var(--color-primary)] transition-all cursor-pointer text-center group relative overflow-hidden"
        >
           <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/50 transition-colors pointer-events-none"></div>
           <div className="bg-[var(--bg-panel)] p-3 border border-[var(--border-color)] rounded-[var(--radius-xl)] mb-4 shadow-sm group-hover:scale-110 group-hover:border-blue-200 group-hover:text-blue-500 transition-all pointer-events-none text-[var(--text-muted)] relative z-10">
             {icon}
           </div>
           <p className="text-[14px] font-black text-[var(--text-main)] pointer-events-none tracking-wide group-hover:text-[var(--color-primary)] transition-colors relative z-10">{desc1}</p>
           <p className="text-[12px] text-[var(--text-muted)] mt-2 leading-relaxed max-w-[200px] pointer-events-none relative z-10">{desc2}</p>
        </div>
      )}
    </FormSection>
  );
};

const SelectableGrid = ({ options, selectedValues, onSelect, columns = 2, isMultiple = true }: any) => {
  const colClass = columns === 1 ? 'grid-cols-1' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div className={`grid ${colClass} gap-2 items-stretch`}>
      {options.map((option: string) => {
        const isSelected = selectedValues.includes(option);
        return (
          <button
            key={option}
            onClick={() => onSelect(option, isMultiple)}
            className={`relative py-3.5 px-4 text-[13px] h-full flex flex-col justify-center font-black tracking-wide rounded-[20px] border-[1.5px] transition-all duration-300 text-left overflow-hidden group ${
              isSelected 
                ? 'bg-blue-50/50 text-blue-700 border-blue-600 shadow-[0_4px_12px_rgba(26,115,232,0.12)] ring-1 ring-blue-600/50 scale-[1.02] transform z-10' 
                : 'bg-[var(--bg-panel)] text-gray-600 border-[var(--border-color)] hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <span className="relative z-10 pr-4 block leading-tight">{option}</span>
            {isSelected && (
              <div className="absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-blue-100/90 to-transparent flex items-center justify-end pr-2.5 z-0">
                <Check className="icon-sm text-[var(--color-primary)]" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

export function ECommerceView({ title, moduleId }: ECommerceViewProps) {
  const flags = useMemo(() => getModuleFlags(moduleId), [moduleId]);
  const config = useMemo(() => getModuleConfig(moduleId), [moduleId]);

  const [genMethod, setGenMethod] = useState<'text2img' | 'img2img' | 'text2video' | 'img2video'>('text2img');
  const [productName, setProductName] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState('');
  
  // Advanced Styles (E-commerce + Social Media)
  const [selectedTone, setSelectedTone] = useState(config.tones[0]);
  const [selectedLighting, setSelectedLighting] = useState(config.lighting[0]);
  const [selectedAngle, setSelectedAngle] = useState(config.angles[0]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [platform, setPlatform] = useState('淘宝/天猫');
  const [batchCount, setBatchCount] = useState(4);
  const [videoDuration, setVideoDuration] = useState('5秒');
  const [voiceVoice, setVoiceVoice] = useState('女声-亲和');
  const [subtitles, setSubtitles] = useState('自动带特效字幕');
  
  const [cloneStrength, setCloneStrength] = useState('');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Upload States
  const [referenceFiles, setReferenceFiles] = useState<any[]>([]);
  const [productFiles, setProductFiles] = useState<any[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mockHistory, setMockHistory] = useState([1, 2, 3]);

  // Extra states for requested features
  const [compareSliderValue, setCompareSliderValue] = useState(50);
  const [seoMetadata, setSeoMetadata] = useState<{title: string, keywords: string, desc: string} | null>(null);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);

  const initDefaults = () => {
    if (flags.isVideo) {
      setGenMethod('text2video');
      setSelectedTypes([config.types[0]]);
      setAspectRatio(config.ratios[0]);
    } else if (flags.isDetailPage) {
      setGenMethod('text2img');
      setSelectedTypes([config.types[0]]);
      setAspectRatio(config.ratios[0]);
    } else if (flags.isPoster) {
      setGenMethod('text2img');
      setSelectedTypes([config.types[0]]);
      setAspectRatio(config.ratios[0]);
    } else if (flags.isWhiteBg) {
      setGenMethod('img2img');
      setSelectedTypes([config.types[0]]);
      setAspectRatio(config.ratios[0]);
    } else if (flags.isClone) {
      setGenMethod('img2img');
      setSelectedTypes([]);
      setCloneStrength(config.types[0]);
      setAspectRatio(config.ratios[0]);
    } else {
      setGenMethod('text2img');
      setSelectedTypes([config.types[0]]);
      setAspectRatio(config.ratios[0]);
    }
    setSelectedLighting(config.lighting[0]);
    setSelectedAngle(config.angles[0]);
    setSelectedTone(config.tones[0]);
  }

  useEffect(() => {
    initDefaults();
    setProductName('');
    setSellingPoints('');
    setResult(null);
  }, [flags]);

  const handleReset = () => {
    initDefaults();
    setProductName('');
    setSellingPoints('');
    setResult(null);
    setReferenceFiles([]);
    setProductFiles([]);
  };

  const handleSaveDraft = () => {
    setMockHistory(prev => [prev.length + 1, ...prev]);
    triggerToast();
  };

  const toggleType = (type: string, isMultiple = true) => {
    if (!isMultiple) {
       setSelectedTypes([type]);
       return;
    }
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleSingleSelect = (setter: React.Dispatch<React.SetStateAction<string>>) => (val: string) => {
    setter(val);
  };

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCopyParams = () => {
    navigator.clipboard.writeText(generatedCopy || '');
    triggerToast();
  };

  const handleGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setProgress(0);
    setResult(null);
    setHasError(false);

    const interval = setInterval(() => {
      setProgress(prev => {
         // simulate varied progress speed
        const jump = Math.floor(Math.random() * 8) + 2; 
        if (prev + jump >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          
          if (Math.random() < 0.2) {
             setHasError(true);
          } else {
             setResult('Generated');
             triggerToast();
          }
          return 100;
        }
        return prev + jump;
      });
    }, 400);
  };

  const handleGenerateSeo = () => {
     if (isGeneratingSeo) return;
     setIsGeneratingSeo(true);
     // Mock Gemini API call
     setTimeout(() => {
        setIsGeneratingSeo(false);
        setSeoMetadata({
           title: `【高能降压】${productName || '多功能新品'} | ${sellingPoints || '轻量透气 · 智能防静电'} (官方正品)`,
           keywords: '百搭, 治愈系, 销量冠军, 高端平替',
           desc: '这款宝贝绝对是今年最大的黑马！结合了顶级材质与智能设计，不仅解决受众痛点，还能在各种场合展示独特质感。'
        });
     }, 1500);
  };

  const isImgMethod = genMethod === 'img2img' || genMethod === 'img2video';

  const previewImageSrc = useMemo(() => {
    if (productFiles.length > 0) return productFiles[0].preview;
    if (referenceFiles.length > 0) return referenceFiles[0].preview;
    return null;
  }, [productFiles, referenceFiles]);

  const resultImageSrc = useMemo(() => {
    if (previewImageSrc) return previewImageSrc;
    return flags.isDetailPage 
      ? "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=750"
      : "https://images.unsplash.com/photo-1627384113743-6bd5a479fffd?auto=format&fit=crop&q=80&w=1200";
  }, [previewImageSrc, flags.isDetailPage]);

  // Mock generated social copy
  const generatedCopy = useMemo(() => {
     if (!result) return null;
     return `🔥 ${productName || '神仙开挂单品'}终于被我找到了！\n\n✨ ${sellingPoints || '质感无敌，包装直接拉满高级感！不仅颜值抗打，实力也完全在线。'}\n\n💡 这波设计风格走的【${selectedLighting}】+【${selectedAngle}】，完全长在我的审美点上！不得不说这品控绝了，细节控福音～\n\n🛒 ${flags.isPoster ? '大促马上开启，赶紧冲别犹豫！' : '已经加入购物车，家人们谁懂啊！'}\n\n#${productName ? productName.slice(0,4) : '好物推荐'} #购物分享 #高颜值实用 #神仙设计`;
  }, [result, productName, sellingPoints, selectedLighting, selectedAngle, flags.isPoster]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] h-auto min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] bg-[var(--bg-app)] overflow-y-auto custom-scrollbar lg:overflow-hidden">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="bg-gray-900 border border-gray-700 text-white px-5 py-3 rounded-[var(--radius-lg)] shadow-2xl flex items-center">
            <div className="icon-lg bg-green-500/20 rounded-full flex items-center justify-center mr-3">
               <Check className="w-3.5 h-3.5 text-green-400 font-bold" />
            </div>
            <span className="text-sm font-medium tracking-wide">操作已成功完成</span>
          </div>
        </div>
      )}

      {/* Left Config Panel */}
      <div className="bg-[var(--bg-panel)] border-r border-[#E5E7EB] flex flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative z-10 transition-all min-w-0">
        <div className="h-16 border-b border-[var(--border-color)]/80 flex items-center justify-between px-5 bg-[var(--bg-panel)] shrink-0 relative z-20 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
           <div className="flex items-center space-x-3">
             <div className="icon-xl rounded-[var(--radius-lg)] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm flex items-center justify-center">
               <Settings className="icon-sm text-white" />
             </div>
             <h3 className="text-[16px] font-black tracking-wide text-[var(--text-main)]">{title}创作配置</h3>
           </div>
           <div className="flex space-x-1.5">
             <button onClick={handleReset} className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-lg transition-colors tooltip" title="重置参数">
               <RotateCcw className="icon-sm" />
             </button>
             <button onClick={handleSaveDraft} className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-lg transition-colors tooltip" title="保存草稿">
               <Save className="icon-sm" />
             </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full px-5 py-2 custom-scrollbar pb-40 bg-[#FDFDFE]">
          
          {config.hasGenMethod && (
            <FormSection title="内容创作方式" className="pb-6">
              <div className="flex bg-gray-50 p-1.5 rounded-[20px] border border-[var(--border-color)]/80 shadow-inner">
                <button 
                  onClick={() => setGenMethod(flags.isVideo ? 'text2video' : 'text2img')}
                  className={`flex-1 py-2.5 text-[13px] font-bold tracking-wide rounded-[var(--radius-lg)] flex items-center justify-center transition-all ${!isImgMethod ? 'bg-[var(--bg-panel)] text-[var(--color-primary)] shadow-sm ring-1 ring-black/5' : 'text-[var(--text-muted)] hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> {flags.isVideo ? '文生视频' : '文生图宣发'}
                </button>
                <button 
                  onClick={() => setGenMethod(flags.isVideo ? 'img2video' : 'img2img')}
                  className={`flex-1 py-2.5 text-[13px] font-bold tracking-wide rounded-[var(--radius-lg)] flex items-center justify-center transition-all ${isImgMethod ? 'bg-[var(--bg-panel)] text-[var(--color-primary)] shadow-sm ring-1 ring-black/5' : 'text-[var(--text-muted)] hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  {flags.isVideo ? <Video className="w-3.5 h-3.5 mr-1.5" /> : <ImageIcon className="w-3.5 h-3.5 mr-1.5" />} {flags.isVideo ? '图生视频' : '图生图衍生'}
                </button>
              </div>
            </FormSection>
          )}

          {flags.isClone && (
            <UploadArea 
              title="参考设计/竞品图" 
              subtitle="必填 · 可多张" 
              icon={<Upload className="icon-lg" />}
              desc1="上传参考设计"
              desc2="可传多张竞品风格 (最多5张)"
              files={referenceFiles}
              onUpload={(newFiles: any[]) => setReferenceFiles(prev => [...prev, ...newFiles].slice(0, 5))}
              onRemove={(idx: number) => setReferenceFiles(prev => prev.filter((_, i) => i !== idx))}
            />
          )}

          {((config.hasGenMethod && isImgMethod) || flags.isWhiteBg || flags.isClone) && (
            <UploadArea 
              title={flags.isWhiteBg ? '待处理绿/白幕图' : flags.isClone ? '核心产品主体' : (flags.isVideo ? '商品主视屏首帧图' : '风格参考垫图')}
              subtitle="必填 · JPG/PNG" 
              icon={<Upload className="icon-lg" />}
              desc1="点击或拖拽上传"
              desc2={flags.isWhiteBg ? '精准AI抠图剔除杂乱背景' : flags.isClone ? '将其自然融入场景' : (flags.isVideo ? '作视频首帧，保障物理一致性' : '强化生图结果约束')}
              files={productFiles}
              onUpload={(newFiles: any[]) => setProductFiles(prev => [...prev, ...newFiles].slice(0, 5))}
              onRemove={(idx: number) => setProductFiles(prev => prev.filter((_, i) => i !== idx))}
            />
          )}

          <div className="py-3">
            <div className="space-y-3 bg-blue-50/30 p-3 rounded-[var(--radius-xl)] border border-blue-100/50">
              {!flags.isWhiteBg && !flags.isClone && (
                 <FormSection title={config.nameLabel} className="!py-0">
                   <input 
                     type="text" 
                     value={productName}
                     onChange={(e) => setProductName(e.target.value)}
                     placeholder={config.namePlaceholder} 
                     className="w-full px-4 py-3 border-[1.5px] border-[var(--border-color)] rounded-[var(--radius-xl)] text-[14px] font-medium outline-none focus:ring-[4px] focus:ring-blue-500/10 focus:border-blue-500 shadow-sm bg-gray-50/50 transition-all placeholder:text-gray-400"
                   />
                 </FormSection>
              )}

              {!flags.isWhiteBg && (
                 <FormSection 
                    title={config.textLabel} 
                    subtitle={flags.isClone ? '要突出的视觉效果' : '输入亮点,AI自配文案'}
                    className="!py-0 pt-4"
                    extra={
                      !flags.isClone && (
                        <button className="text-blue-700 hover:text-blue-800 font-bold text-[11px] flex items-center bg-blue-50/80 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-200 shadow-sm relative -top-1">
                          <Wand2 className="w-3.5 h-3.5 mr-1" /> {config.textAiBtn}
                        </button>
                      )
                    }
                 >
                   <textarea 
                     value={sellingPoints}
                     onChange={(e) => setSellingPoints(e.target.value)}
                     placeholder={config.textPlaceholder} 
                     className="w-full px-4 py-3 border-[1.5px] border-[var(--border-color)] rounded-[var(--radius-xl)] text-[14px] font-medium outline-none focus:ring-[4px] focus:ring-blue-500/10 focus:border-blue-500 min-h-[110px] resize-none shadow-sm bg-gray-50/50 transition-all leading-relaxed custom-scrollbar placeholder:text-gray-400"
                   />
                 </FormSection>
              )}
            </div>
          </div>

          <FormSection 
            title={config.typesTitle} 
            subtitle={flags.isClone ? '重现程度' : flags.isWhiteBg ? '选择模式' : '推荐多选组合'}
          >
            <SelectableGrid 
              columns={flags.isClone ? 1 : 2}
              options={config.types}
              selectedValues={flags.isClone ? [cloneStrength] : selectedTypes}
              onSelect={flags.isClone ? handleSingleSelect(setCloneStrength) : toggleType}
              isMultiple={!flags.isClone && !flags.isWhiteBg}
            />
          </FormSection>
          
          <FormSection title={config.ratioTitle}>
             <SelectableGrid 
                columns={2}
                options={config.ratios}
                selectedValues={[aspectRatio]}
                onSelect={handleSingleSelect(setAspectRatio)}
                isMultiple={false}
             />
          </FormSection>

          {/* Advanced Visual & Copy Settings (Collapsible) */}
          {!flags.isWhiteBg && (
            <div className="py-3">
              <div className="border-[1.5px] border-[var(--border-color)] rounded-[24px] overflow-hidden bg-[var(--bg-panel)] shadow-sm transition-all hover:border-gray-300">
                 <button 
                   onClick={() => setShowAdvanced(!showAdvanced)}
                   className={`w-full px-5 py-4 flex items-center justify-between bg-gray-50/50 hover:bg-gray-100/80 transition-colors ${showAdvanced ? 'border-b border-[var(--border-color)]' : ''}`}
                 >
                 <span className="text-[14px] font-black text-[var(--text-main)] flex items-center">
                   <Settings className="icon-sm mr-2 text-[var(--color-primary)]" /> 
                   高阶渲染与文案设置 
                   <span className="ml-2 text-[10px] font-black tracking-widest text-[var(--color-primary)] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded uppercase">Pro</span>
                 </span>
                 {showAdvanced ? <ChevronDown className="icon-md text-gray-400" /> : <ChevronRight className="icon-md text-gray-400" />}
               </button>
               
               {showAdvanced && (
                 <div className="p-[var(--spacing-lg)] space-y-8 animate-in slide-in-from-top-2 duration-200">
                    <FormSection title="镜头角度预设" className="mb-0">
                       <SelectableGrid columns={2} options={config.angles} selectedValues={[selectedAngle]} onSelect={handleSingleSelect(setSelectedAngle)} isMultiple={false} />
                    </FormSection>
                    
                    <FormSection title="光影氛围预设" className="mb-0">
                       <SelectableGrid columns={2} options={config.lighting} selectedValues={[selectedLighting]} onSelect={handleSingleSelect(setSelectedLighting)} isMultiple={false} />
                    </FormSection>

                     {!flags.isClone && (
                        <FormSection title="同步生成社媒文案语气" className="!py-4 border-t border-[var(--border-color)]">
                           <div className="flex flex-wrap gap-2 mt-4 text-[12px]">
                           {config.tones.map((t: string) => (
                             <button
                               key={t}
                               onClick={() => setSelectedTone(t)}
                               className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                                 selectedTone === t 
                                 ? 'bg-[var(--color-primary)] text-white shadow-md' 
                                 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                               }`}
                             >
                               {t}
                             </button>
                           ))}
                         </div>
                      </FormSection>
                    )}
                 </div>
               )}
            </div>
          </div>
          )}
          
          {flags.isVideo && (
            <div className="grid grid-cols-2 gap-3 py-3">
              <FormSection title="视频时长" className="!py-0">
                 <select 
                   value={videoDuration}
                   onChange={(e) => setVideoDuration(e.target.value)}
                   className="w-full px-4 py-3 border-[1.5px] border-[var(--border-color)] rounded-[var(--radius-xl)] text-[14px] font-medium outline-none focus:ring-[4px] focus:ring-blue-500/10 focus:border-blue-500 shadow-sm bg-gray-50/50 transition-all cursor-pointer"
                 >
                   <option>5秒 (短平快)</option>
                   <option>10秒 (标准宣发)</option>
                   <option>15秒 (带货尾板)</option>
                   <option>30秒 (深度种草)</option>
                 </select>
              </FormSection>
              <FormSection title="智能配音" className="!py-0">
                <select 
                  value={voiceVoice}
                  onChange={(e) => setVoiceVoice(e.target.value)}
                  className="w-full px-4 py-3 border-[1.5px] border-[var(--border-color)] rounded-[var(--radius-xl)] text-[14px] font-medium outline-none focus:ring-[4px] focus:ring-blue-500/10 focus:border-blue-500 shadow-sm bg-gray-50/50 transition-all cursor-pointer"
                >
                  <option>女声-亲和种草</option>
                  <option>男声-专业测评</option>
                  <option>搞怪-发疯文学</option>
                </select>
              </FormSection>
            </div>
          )}

          <FormSection 
            title={flags.isVideo ? '底层 AI 视频模型' : '底层 AI 图像引擎'} 
            extra={<span className="text-[10px] text-[var(--text-main)] bg-[var(--bg-panel)] px-2 py-0.5 rounded shadow-sm font-black tracking-wide border border-[var(--border-color)] uppercase">Gemini Pro 1.5</span>}
          >
            {!flags.isVideo ? (
               <div className="border-[1.5px] border-[var(--border-color)] shadow-sm rounded-[20px] p-4 relative cursor-pointer group hover:border-blue-400 hover:shadow-md transition-all bg-[var(--bg-panel)] overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50/50 rounded-bl-full -z-10 group-hover:bg-blue-50/50 transition-colors"></div>
                 <div className="flex justify-between items-start">
                   <div>
                     <p className="text-[14px] font-black text-[var(--text-main)] group-hover:text-[var(--color-primary)] leading-tight transition-colors">商用级高保真合成管线</p>
                     <p className="text-[11px] text-[var(--text-muted)] font-medium mt-1.5 uppercase tracking-wide">Multi-modal AI Pipeline</p>
                   </div>
                   <div className="text-gray-600 bg-gray-100/80 p-2 rounded-[var(--radius-lg)] group-hover:bg-blue-100 group-hover:text-[var(--color-primary)] transition-colors">
                      <Layers className="icon-md" />
                   </div>
                 </div>
               </div>
            ) : (
               <div className="border-[1.5px] border-gray-900 shadow-md rounded-[20px] p-4 relative cursor-pointer group bg-gray-50 overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/50 rounded-bl-full -z-10"></div>
                 <div className="flex justify-between items-start">
                   <div>
                     <p className="text-[14px] font-black text-[var(--text-main)] leading-tight">Sora级动态扩散引擎 <span className="inline-block align-middle ml-1 bg-gradient-to-r from-gray-700 to-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded tracking-wider">V2</span></p>
                     <p className="text-[11px] text-[var(--text-muted)] font-medium mt-1.5 uppercase tracking-wide">Video Generation Native</p>
                   </div>
                   <div className="text-white bg-gray-900 p-2 rounded-[var(--radius-lg)] shadow-inner">
                      <Video className="icon-md" />
                   </div>
                 </div>
               </div>
            )}
          </FormSection>

        </div>

        {/* Generate Button area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[var(--bg-panel)]/95 backdrop-blur-md border-t border-[var(--border-color)]/50 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-50">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-[var(--color-primary)] hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-[var(--color-primary)] text-white font-black text-[15px] tracking-wide py-4 rounded-[var(--radius-xl)] transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center transform hover:-translate-y-0.5 active:translate-y-0 group"
          >
            {isGenerating ? (
              <span className="flex items-center">
                <Spinner className="icon-sm mr-2 animate-spin" /> 智能构建中...
              </span>
            ) : (
              <span className="flex items-center">
                <Wand2 className="icon-md mr-2 group-hover:scale-110 group-hover:rotate-12 transition-transform" /> 
                执行智能创作
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Right Canvas / Results */}
      <div className="flex-1 flex flex-col bg-[#F3F4F6] overflow-hidden relative min-w-0">
        <div className="h-14 border-b border-[var(--border-color)]/80 flex items-center justify-between px-5 bg-[var(--bg-panel)] flex-shrink-0 z-20 relative shadow-sm">
           <div className="flex items-center space-x-4">
             <h2 className="text-[14px] font-black tracking-wide text-[var(--text-main)]">渲染沉浸视界</h2>
             <span className="text-[10px] bg-gray-100 text-[var(--text-muted)] px-2 py-0.5 rounded font-mono font-bold">{previewDevice.toUpperCase()} PREVIEW</span>
           </div>
           
           <div className="flex items-center space-x-4">
             <div className="flex bg-gray-100 p-1 rounded-lg border border-[var(--border-color)]">
               <button onClick={() => setPreviewDevice('mobile')} className={`px-3 py-1 flex items-center rounded-md text-[11px] font-bold transition-all ${previewDevice === 'mobile' ? 'bg-[var(--bg-panel)] shadow pointer-events-none text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-gray-200/50'}`}>
                 <Smartphone className="w-3.5 h-3.5 mr-1.5" /> 手机
               </button>
               <button onClick={() => setPreviewDevice('desktop')} className={`px-3 py-1 flex items-center rounded-md text-[11px] font-bold transition-all ${previewDevice === 'desktop' ? 'bg-[var(--bg-panel)] shadow pointer-events-none text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-gray-200/50'}`}>
                 <Monitor className="w-3.5 h-3.5 mr-1.5" /> PC/大屏
               </button>
             </div>
             
             <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center text-[12px] font-bold transition-all px-3 py-1.5 rounded-lg border shadow-sm ${showHistory ? 'bg-gray-800 text-white border-gray-800' : 'bg-[var(--bg-panel)] text-gray-600 hover:text-[var(--text-main)] border-[var(--border-color)] hover:bg-gray-50'}`}
             >
                <Clock className="icon-sm mr-1.5" /> 追溯历史
             </button>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-[var(--spacing-lg)] pt-12 md:pt-20 flex flex-col items-center custom-scrollbar z-0 relative">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[#F3F4F6] pointer-events-none opacity-60" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

          {/* History Sliding Panel */}
          {showHistory && (
            <div className="absolute inset-y-0 right-0 w-[320px] bg-[var(--bg-panel)] shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-[var(--border-color)]">
               <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-5">
                  <h3 className="text-sm font-black text-[var(--text-main)] flex items-center">库存档案</h3>
                  <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-[var(--text-main)] p-1.5 rounded-md hover:bg-gray-100 transition-colors">
                     <Plus className="icon-md transform rotate-45" />
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-3 space-y-3">
                 {mockHistory.map(i => (
                    <div key={i} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-3 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
                       <div className="flex space-x-3">
                          <div className="w-20 h-20 bg-gray-100 rounded-[var(--radius-lg)] flex-shrink-0 flex items-center justify-center border border-[var(--border-color)] overflow-hidden relative">
                             <img src={`https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200&h=200&crop=faces`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Draft" />
                             {flags.isVideo && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Play className="icon-lg text-white" fill="currentColor"/></div>}
                          </div>
                          <div className="flex-1 flex flex-col justify-center">
                             <p className="text-[13px] font-bold text-[var(--text-main)] line-clamp-1">{config.namePlaceholder}尝试_{i}</p>
                             <p className="text-[11px] text-gray-400 mt-1 flex items-center"><Clock className="w-3 h-3 mr-1"/> 2026-05-{29-i} 14:00</p>
                             <div className="mt-2 text-left">
                               <span className="text-[10px] text-[var(--text-main)] font-black bg-gray-100 px-2 py-0.5 rounded-md uppercase tracking-wider">{flags.isVideo ? 'HD VIDEO' : 'STATIC IMG'}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
               </div>
            </div>
         )}

          <div className="relative z-10 w-full h-full flex flex-col items-center max-w-5xl mx-auto pb-10 min-h-0">
            {hasError ? (
               <div className="w-full h-full flex flex-col items-center justify-start pt-10 animate-in fade-in duration-500 mt-16 p-[var(--spacing-lg)]">
                 <div className="max-w-[440px] w-full bg-[var(--bg-panel)] rounded-3xl p-[var(--spacing-xl)] text-center shadow-xl border border-red-100 flex flex-col items-center relative overflow-hidden">
                   <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500"></div>
                   <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-[var(--spacing-md)] border-8 border-white shadow-sm">
                     <span className="text-[var(--text-main)]xl">⚠️</span>
                   </div>
                   <h3 className="text-[20px] font-black text-[var(--text-main)] mb-2 tracking-tight">网络接口超时</h3>
                   <p className="text-[13px] text-[var(--text-muted)] font-medium mb-[var(--spacing-xl)] leading-relaxed px-4">
                     Gemini 模型集群当前返回的数据格式异常响应或超时，可能是网络波动引起，请不必担心，参数已经安全保存。
                   </p>
                   <div className="w-full space-y-3">
                     <button onClick={handleGenerate} className="w-full bg-[var(--color-primary)] hover:bg-blue-700 text-white font-black tracking-wide py-3.5 rounded-[var(--radius-lg)] shadow-md transition-all flex items-center justify-center group">
                       <RotateCcw className="icon-sm mr-2 group-hover:-rotate-90 transition-transform duration-300" />
                       再次尝试生成
                     </button>
                     <button onClick={() => setHasError(false)} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3.5 rounded-[var(--radius-lg)] transition-all border border-[var(--border-color)]">
                       返回编辑配置
                     </button>
                   </div>
                 </div>
               </div>
            ) : !isGenerating && !result ? (
               <div className="w-full h-full flex flex-col items-center justify-start pt-10 animate-in fade-in duration-500 mt-16">
                  <div className={`w-full ${previewDevice === 'mobile' ? 'max-w-[400px]' : 'max-w-[900px]'} ${getPreviewStyle(aspectRatio)} bg-[var(--bg-panel)] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[var(--border-color)]/60 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}>
                     {previewImageSrc ? (
                       <>
                         <img src={previewImageSrc} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-10 blur-xl scale-110" />
                         <img src={previewImageSrc} alt="Preview" className="relative z-10 max-w-[90%] max-h-[90%] object-contain drop-shadow-2xl rounded-lg" />
                       </>
                     ) : (
                       <div className="flex flex-col items-center justify-center text-gray-300">
                         <LayoutTemplate className="w-16 h-16 mb-4 opacity-50" strokeWidth={1} />
                         <span className="text-[14px] font-black tracking-widest text-gray-400">EMPTY CANVAS ({aspectRatio} 比例)</span>
                       </div>
                     )}
                  </div>
               </div>
            ) : isGenerating ? (
                <div className="w-full flex-1 flex flex-col items-center justify-start pt-20 text-center animate-in zoom-in-95 duration-500 min-h-[500px]">
                  <div className="relative w-40 h-40 mb-10">
                    <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 100 100">
                      <circle className="text-gray-200 stroke-current" strokeWidth="4" cx="50" cy="50" r="46" fill="transparent"></circle>
                      <circle className="text-[var(--text-main)] stroke-current transition-all duration-300 ease-out" strokeWidth="6" strokeDasharray="289" strokeDashoffset={289 - (289 * progress) / 100} strokeLinecap="round" cx="50" cy="50" r="46" fill="transparent"></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[var(--text-main)]xl font-black text-[var(--text-main)] tracking-tighter">{progress}%</span>
                      <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Rendering</span>
                    </div>
                  </div>
                  
                  <div className="bg-[var(--bg-panel)] px-8 py-3 rounded-[var(--radius-xl)] shadow-lg border border-[var(--border-color)] max-w-sm w-full text-left">
                     <div className="space-y-3">
                        <div className={`flex items-start transition-opacity duration-300 ${progress > 5 ? 'opacity-100 text-[var(--text-main)]' : 'opacity-40 text-gray-400'}`}>
                           <div className={`icon-md rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 ${progress > 5 ? 'bg-gray-100 text-[var(--text-main)]' : 'bg-gray-100'}`}>
                             {progress > 40 ? <Check className="w-3.5 h-3.5 font-bold" /> : <Spinner className="w-3.5 h-3.5 animate-spin" />}
                           </div>
                           <div>
                             <p className="text-[13px] font-bold">图层语义分析与拆解</p>
                             <p className="text-[11px] text-[var(--text-muted)] mt-0.5">解析 {selectedLighting} 光影与 {selectedAngle} 构图</p>
                           </div>
                        </div>
                        <div className={`flex items-start transition-opacity duration-300 ${progress > 40 ? 'opacity-100 text-[var(--text-main)]' : 'opacity-40 text-gray-400'}`}>
                           <div className={`icon-md rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 ${progress > 40 ? 'bg-gray-100 text-[var(--text-main)]' : 'bg-gray-100'}`}>
                             {progress > 80 ? <Check className="w-3.5 h-3.5 font-bold" /> : (progress > 40 ? <Spinner className="w-3.5 h-3.5 animate-spin"/> : <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>)}
                           </div>
                           <div>
                             <p className="text-[13px] font-bold">高保真细节渲染纹理</p>
                             <p className="text-[11px] text-[var(--text-muted)] mt-0.5">执行 {flags.isVideo ? '关键帧插值填充' : '高清修复重绘 (2x Upscale)'}</p>
                           </div>
                        </div>
                        {!flags.isWhiteBg && (
                          <div className={`flex items-start transition-opacity duration-300 ${progress > 80 ? 'opacity-100 text-[var(--text-main)]' : 'opacity-40 text-gray-400'}`}>
                             <div className={`icon-md rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 ${progress > 80 ? 'bg-gray-100 text-[var(--text-main)]' : 'bg-gray-100'}`}>
                               {progress === 100 ? <Check className="w-3.5 h-3.5 font-bold" /> : (progress > 80 ? <Spinner className="w-3.5 h-3.5 animate-spin"/> : <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>)}
                             </div>
                             <div>
                               <p className="text-[13px] font-bold">智写引流营销文案</p>
                               <p className="text-[11px] text-[var(--text-muted)] mt-0.5">构建 {selectedTone} 社交分享排版</p>
                             </div>
                          </div>
                        )}
                     </div>
                  </div>
                </div>
            ) : (
              <div className={`w-full ${previewDevice === 'mobile' ? 'max-w-lg' : 'max-w-5xl'} animate-in slide-in-from-bottom-12 duration-700 ease-out`}>
                 <div className="bg-[var(--bg-panel)] border-b border-[var(--border-color)] px-5 py-4 flex justify-between items-center shadow-sm rounded-t-[28px]">
                    <div className="flex items-center space-x-3">
                       <span className="relative flex h-3 w-3">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                       </span>
                       <h3 className="text-[15px] font-black text-[var(--text-main)] tracking-wide">生成工作台</h3>
                    </div>
                    <div className="flex space-x-3">
                      <button onClick={handleReset} className="px-4 py-2 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 text-[13px] font-bold rounded-[var(--radius-lg)] transition-colors flex items-center">
                        <Trash2 className="icon-sm mr-1.5" /> 清除
                      </button>
                      <button onClick={triggerToast} className="px-4 py-2 bg-[var(--color-primary)] text-white hover:bg-black text-[13px] font-bold rounded-[var(--radius-lg)] transition-colors flex items-center shadow-md">
                        <Download className="icon-sm mr-1.5" /> 存至资产库
                      </button>
                    </div>
                 </div>
                 
                 <div className={`bg-[var(--bg-panel)] rounded-b-[28px] shadow-xl border border-t-0 border-[var(--border-color)] overflow-hidden grid ${previewDevice === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[1fr_1fr] min-h-[660px]'}`}>
                    
                    {/* Media Result Area */}
                    <div className={`${previewDevice === 'mobile' ? 'w-full aspect-[3/4] border-b' : flags.isWhiteBg ? 'w-full' : 'w-full h-full min-h-0 border-b xl:border-b-0 border-r-0 xl:border-r'} border-[var(--border-color)] bg-gray-50 flex items-center justify-center p-3 md:p-[var(--spacing-lg)] relative group overflow-hidden min-h-[400px]`}>
                       <div className="absolute inset-0 bg-[#F3F4F6] opacity-50" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                       
                       <div className={`relative z-10 w-full h-full flex items-center justify-center`}>
                          <div className={`w-full max-w-[500px] ${getPreviewStyle(aspectRatio) || 'aspect-[3/4]'} bg-[var(--bg-panel)] rounded-[var(--radius-xl)] overflow-hidden shadow-2xl border-4 border-white relative transition-all duration-500 max-h-full`}>
                             {flags.isDetailPage && previewImageSrc ? (
                               <>
                                 <img src={previewImageSrc} alt="Original" className={`absolute inset-0 w-full h-full object-contain bg-[var(--bg-panel)]`} />
                                 <div 
                                   className="absolute inset-0 h-full overflow-hidden" 
                                   style={{ width: `${compareSliderValue}%` }}
                                 >
                                    <img src={resultImageSrc} alt="Generated Result" className={`absolute inset-0 w-[500px] max-w-none h-full object-contain bg-[var(--bg-panel)]`} />
                                 </div>
                                 <div 
                                   className="absolute top-0 bottom-0 w-1 bg-[var(--bg-panel)] cursor-ew-resize drop-shadow-md z-20 flex items-center justify-center "
                                   style={{ left: `${compareSliderValue}%` }}
                                 >
                                    <input 
                                      type="range" 
                                      min="0" max="100" 
                                      value={compareSliderValue} 
                                      onChange={(e) => setCompareSliderValue(Number(e.target.value))}
                                      className="absolute inset-0 opacity-0 cursor-ew-resize w-[40px] -ml-[20px] z-30" 
                                    />
                                    <div className="icon-lg bg-[var(--bg-panel)] rounded-full shadow border border-[var(--border-color)] flex items-center justify-center pointer-events-none absolute">
                                       <span className="w-1 h-3 border-l border-r border-gray-300"></span>
                                    </div>
                                 </div>
                                 <div className="absolute top-3 space-x-2 w-full flex justify-between px-4 pointer-events-none z-10 drop-shadow-md">
                                    <span className={`text-[10px] font-black text-white bg-black/40 px-2 py-1 rounded backdrop-blur-sm transition-opacity ${compareSliderValue < 20 ? 'opacity-0' : 'opacity-100'}`}>AI 构图强化</span>
                                    <span className={`text-[10px] font-black text-white bg-black/40 px-2 py-1 rounded backdrop-blur-sm transition-opacity ${compareSliderValue > 80 ? 'opacity-0' : 'opacity-100'}`}>原图参考</span>
                                 </div>
                               </>
                             ) : (
                               <img src={resultImageSrc} alt="Generated Result" className={`w-full h-full ${flags.isDetailPage || flags.isWhiteBg ? 'object-contain bg-[var(--bg-panel)]' : 'object-cover'}`} />
                             )}
                             
                             {flags.isVideo && (
                               <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors cursor-pointer">
                                 <div className="w-16 h-16 bg-[var(--bg-panel)]/95 rounded-full flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform duration-300 backdrop-blur-md">
                                    <Play className="icon-xl text-[var(--text-main)] ml-1" fill="currentColor" />
                                 </div>
                               </div>
                             )}
                             
                             {/* Optional Promo Overlay rendering if it's a poster */}
                             {flags.isPoster && (
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-red-600 via-red-500/80 to-transparent pt-12 pb-6 px-5 text-white text-center">
                                   <p className="text-[28px] font-black italic tracking-wider drop-shadow-md">{productName || '限时抢购狂欢'}</p>
                                   <div className="mt-2 inline-block bg-yellow-400 text-red-900 px-4 py-1 rounded-full text-[14px] font-black shadow-md">
                                      点击立享 5 折优惠
                                   </div>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>

                    {/* Meta & Copywriting Panel */}
                    {!flags.isWhiteBg && (
                       <div className={`${previewDevice === 'mobile' ? 'w-full' : 'w-full h-full'} flex flex-col bg-[var(--bg-panel)] overflow-hidden max-h-[660px]`}>
                          <div className="flex-1 overflow-y-auto p-3 md:p-[var(--spacing-lg)] custom-scrollbar">
                             
                             {flags.isDetailPage ? (
                               // SEO Section for Detail Page
                               <>
                                 <div className="mb-[var(--spacing-md)] flex items-center justify-between">
                                   <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-blue-50 text-[var(--color-primary)] rounded-[var(--radius-lg)] flex items-center justify-center"><Tags className="icon-md" /></div>
                                      <div>
                                         <h4 className="text-[16px] font-black text-[var(--text-main)]">SEO 详情页优化</h4>
                                         <p className="text-[12px] text-[var(--text-muted)]">自动提炼核心卖点 & 高引流搜索词</p>
                                      </div>
                                   </div>
                                   <div className="flex items-center space-x-2">
                                     {!seoMetadata ? (
                                       <button 
                                         onClick={handleGenerateSeo} 
                                         disabled={isGeneratingSeo}
                                         className="px-3 py-1.5 bg-[var(--color-primary)] hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-bold rounded-lg transition-all flex items-center"
                                       >
                                         {isGeneratingSeo ? <Spinner className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1.5" />} 一键生成 SEO 数据
                                       </button>
                                     ) : (
                                       <button 
                                         onClick={() => navigator.clipboard.writeText(JSON.stringify(seoMetadata, null, 2))} 
                                         className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[12px] font-bold rounded-lg transition-all flex items-center shadow-sm"
                                       >
                                         <Copy className="w-3.5 h-3.5 mr-1.5" /> 复制 JSON
                                       </button>
                                     )}
                                   </div>
                                 </div>

                                 {seoMetadata ? (
                                   <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                      <div className="bg-gray-50/80 border border-[var(--border-color)] rounded-[var(--radius-xl)] p-4">
                                        <label className="text-[11px] font-black tracking-wider text-[var(--text-muted)] uppercase mb-2 block">优化标题 (Title)</label>
                                        <p className="text-[14px] font-bold text-[var(--text-main)] leading-relaxed">{seoMetadata.title}</p>
                                      </div>
                                      <div className="bg-gray-50/80 border border-[var(--border-color)] rounded-[var(--radius-xl)] p-4">
                                        <label className="text-[11px] font-black tracking-wider text-[var(--text-muted)] uppercase mb-2 block">搜索长尾词 (Keywords)</label>
                                        <div className="flex flex-wrap gap-2">
                                          {seoMetadata.keywords.split(',').map(tag => (
                                            <span key={tag} className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--color-primary)] px-3 py-1 rounded-md text-[12px] font-bold shadow-sm">
                                              {tag.trim()}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="bg-gray-50/80 border border-[var(--border-color)] rounded-[var(--radius-xl)] p-4">
                                        <label className="text-[11px] font-black tracking-wider text-[var(--text-muted)] uppercase mb-2 block">详情描述 (Description)</label>
                                        <p className="text-[13px] text-gray-700 leading-relaxed">{seoMetadata.desc}</p>
                                      </div>
                                   </div>
                                 ) : (
                                   <div className="h-[300px] border-2 border-dashed border-[var(--border-color)] rounded-[var(--radius-xl)] flex flex-col items-center justify-center text-center p-[var(--spacing-lg)] bg-gray-50/50">
                                     <div className="w-12 h-12 bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--border-color)] flex items-center justify-center mb-4">
                                        <Sparkles className="icon-lg text-blue-400" />
                                     </div>
                                     <h5 className="text-[14px] font-black text-[var(--text-main)] mb-1">未生成 SEO 数据</h5>
                                     <p className="text-[12px] text-[var(--text-muted)] max-w-[200px]">点击右上角使用 Gemini 大模型自动提取转化关键词与最优排版标题。</p>
                                   </div>
                                 )}
                               </>
                             ) : (
                               // Normal Text Section
                               <>
                                 <div className="mb-[var(--spacing-md)] flex items-center space-x-3">
                                   <div className="w-10 h-10 bg-gray-100 text-[var(--text-main)] rounded-[var(--radius-lg)] flex items-center justify-center"><AlignLeft className="icon-md" /></div>
                                   <div>
                                      <h4 className="text-[16px] font-black text-[var(--text-main)]">智能社交文案</h4>
                                      <p className="text-[12px] text-[var(--text-muted)]">{selectedTone}风格 | 自动排版优化</p>
                                   </div>
                                 </div>
                                 
                                 <div className="form-control w-full relative">
                                   <div className="absolute top-3 right-4 text-gray-400 z-10 flex space-x-2">
                                      <button onClick={handleCopyParams} className="p-2 bg-gray-100 hover:bg-gray-200 hover:text-[var(--text-main)] rounded-lg transition-colors shadow-sm" title="一键复制文案">
                                        <Copy className="icon-sm" />
                                      </button>
                                   </div>
                                   <textarea 
                                     readOnly
                                     value={generatedCopy || ''}
                                     className="w-full bg-gray-50/50 border border-[var(--border-color)] rounded-[var(--radius-xl)] p-[var(--spacing-lg)] text-[14px] leading-loose text-gray-700 min-h-[320px] focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none font-medium custom-scrollbar relative shadow-inner"
                                   />
                                 </div>

                                 <div className="mt-6 flex flex-wrap gap-2.5">
                                   {['#好物推荐', `#${productName.slice(0,6) || '新品首发'}`, '#颜值即正义', '#居家必备'].map(tag => (
                                     <span key={tag} className="bg-gray-100 text-gray-600 px-3.5 py-1.5 rounded-full text-[12px] font-bold hover:bg-gray-200 cursor-pointer transition-colors shrink-0 flex items-center">
                                       {tag}
                                     </span>
                                   ))}
                                 </div>
                               </>
                             )}
                          </div>

                          <div className="p-[var(--spacing-lg)] border-t border-[var(--border-color)] bg-[var(--bg-panel)] shadow-[0_-4px_10px_rgba(0,0,0,0.02)] mt-auto">
                             <div className="flex justify-between items-center text-[12px] text-[var(--text-muted)] font-bold mb-4">
                               <span className="flex items-center"><Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500"/> SEO & Algo Optimized</span>
                               <span className="font-mono bg-gray-100 px-2.5 py-1 rounded-md text-gray-600">ID: 84FA92X</span>
                             </div>
                             
                             {flags.isPoster ? (
                               <div className="grid grid-cols-2 gap-2">
                                 <button onClick={handleCopyParams} className="w-full py-3.5 bg-gray-900 hover:bg-black text-white border-transparent font-bold rounded-[var(--radius-lg)] text-[14px] transition-all shadow-md flex justify-center items-center">
                                   <LayoutTemplate className="icon-sm mr-2" /> 多端比例自动适配
                                 </button>
                                 <button onClick={handleCopyParams} className="w-full py-3.5 bg-[var(--color-primary)] hover:bg-blue-700 text-white border-transparent font-bold rounded-[var(--radius-lg)] text-[14px] transition-all shadow-md flex justify-center items-center">
                                   <Check className="icon-sm mr-2" /> 确认使用该物料
                                 </button>
                               </div>
                             ) : (
                               <button onClick={handleCopyParams} className="w-full py-3.5 bg-[var(--color-primary)] hover:bg-blue-700 text-white border-transparent font-bold rounded-[var(--radius-lg)] text-[14px] transition-all shadow-md flex justify-center items-center">
                                 <Check className="icon-sm mr-2" /> 确认使用该文案与物料
                               </button>
                             )}
                             {!flags.isPoster && (
                               <button onClick={handleCopyParams} className="w-full mt-3 py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-gray-300 text-gray-700 font-bold rounded-[var(--radius-lg)] text-[14px] transition-all shadow-sm flex justify-center items-center">
                                 重新生成{flags.isDetailPage ? 'SEO变体' : '文案变体'} (A/B Test)
                               </button>
                             )}
                          </div>
                       </div>
                    )}
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper SVG
function Settings({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
}

function Spinner({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
}
