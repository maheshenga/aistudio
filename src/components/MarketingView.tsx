import React from 'react';
import { ScanLine, SmartphoneNfc, Globe, Share2, ArrowUpRight, Copy, Code, LayoutTemplate, Plus, Check, Settings2, Download, Wand2, Image as ImageIcon, Video, ArrowLeft } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { createWorkspaceCampaign, updateWorkspaceCampaign, type WorkspaceCampaign } from '../lib/data/campaignRepository';
import { createOrUpdateWorkspaceCustomerLead } from '../lib/data/customerRepository';
import { createWorkspaceTask } from '../lib/data/taskRepository';
import { createGenerationJob, failGenerationJob, updateGenerationJob } from '../lib/data/generationJobRepository';
import { createWorkspaceAsset } from '../lib/data/assetRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { createPricedWorkspaceUsageEvent } from '../lib/data/usageRepository';
import { GenerationFailureRecoveryPanel } from './GenerationFailureRecoveryPanel';

interface MarketingViewProps {
  moduleId: string;
  onNavigate?: (id: any) => void;
}

const MARKETING_QR_PRINT_URL = 'https://aistudio.local/assets/marketing/spring-viral-qr-kit.pdf';
const MARKETING_NFC_CARD_URL = 'https://aistudio.local/assets/marketing/nfc-touchpoint-card.json';
const MARKETING_SITE_PREVIEW_URL = 'https://aistudio.local/sites/nexus-tech-landing';

type MarketingRepositoryContext = {
  workspaceId: string;
  userId: string;
};

interface MarketingLeadHandoffInput {
  campaign: WorkspaceCampaign;
  moduleId: 'marketing_viral' | 'marketing_nfc' | 'marketing_website';
  sourceChannel: 'viral_qr' | 'nfc_touchpoint' | 'website';
  leadName: string;
  company: string;
  role: string;
  landingPage?: string;
  touchpoint?: string;
  assetId?: string;
  followUpTitle: string;
  followUpType: string;
  followUpDate: string;
  metadata?: Record<string, unknown>;
}

function createMarketingLeadHandoff(
  input: MarketingLeadHandoffInput,
  context: MarketingRepositoryContext,
  session: ReturnType<typeof useSaasSession>,
) {
  const customer = createOrUpdateWorkspaceCustomerLead(
    {
      name: input.leadName,
      company: input.company,
      role: input.role,
      channel: input.sourceChannel,
      ownerId: session.user.id,
      tags: ['campaign', input.sourceChannel, input.moduleId],
      source: {
        moduleId: input.moduleId,
        campaignId: input.campaign.id,
        campaignName: input.campaign.name,
        sourceChannel: input.sourceChannel,
        landingPage: input.landingPage ?? input.campaign.landingUrl,
        touchpoint: input.touchpoint,
        assetId: input.assetId,
      },
      notes: `Marketing handoff from ${input.campaign.name}`,
      lastInteractionAt: Date.now(),
      metadata: {
        campaignStatus: input.campaign.status,
        campaignMetrics: input.campaign.metrics,
        ...(input.metadata ?? {}),
      },
    },
    context,
  );

  const task = createWorkspaceTask(
    {
      title: input.followUpTitle,
      column: 'todo',
      priority: 'High',
      type: input.followUpType,
      date: input.followUpDate,
      isAuto: true,
      status: 'queued',
      metadata: {
        source: 'marketing_lead_handoff',
        moduleId: input.moduleId,
        campaignId: input.campaign.id,
        campaignName: input.campaign.name,
        customerId: customer.id,
        sourceChannel: input.sourceChannel,
        landingPage: input.landingPage ?? input.campaign.landingUrl,
        touchpoint: input.touchpoint,
        assetId: input.assetId,
      },
    },
    context,
  );

  logAuditEvent({
    action: 'marketing_lead_create',
    moduleId: input.moduleId,
    targetType: 'customer',
    targetId: customer.id,
    metadata: {
      campaignId: input.campaign.id,
      campaignName: input.campaign.name,
      sourceChannel: input.sourceChannel,
      landingPage: input.landingPage ?? input.campaign.landingUrl,
      touchpoint: input.touchpoint,
      assetId: input.assetId,
      customerId: customer.id,
    },
  }, { session });
  logAuditEvent({
    action: 'marketing_followup_task_create',
    moduleId: input.moduleId,
    targetType: 'task',
    targetId: task.id,
    metadata: {
      campaignId: input.campaign.id,
      campaignName: input.campaign.name,
      sourceChannel: input.sourceChannel,
      customerId: customer.id,
      taskId: task.id,
    },
  }, { session });

  return { customer, task };
}

export function MarketingView({ moduleId, onNavigate }: MarketingViewProps) {
  switch (moduleId) {
    case 'marketing_viral':
      return <MarketingViral onNavigate={onNavigate} />;
    case 'marketing_nfc':
      return <MarketingNFC onNavigate={onNavigate} />;
    case 'marketing_website':
      return <MarketingWebsite onNavigate={onNavigate} />;
    default:
      return <MarketingViral onNavigate={onNavigate} />;
  }
}

function MarketingViral({ onNavigate }: { onNavigate?: (id: any) => void }) {
  const session = useSaasSession();
  const repositoryContext = React.useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [activeView, setActiveView] = React.useState<'list' | 'editor'>('list');
  const [publishStatus, setPublishStatus] = React.useState<string | null>(null);

  const handlePublishCampaign = () => {
    const campaign = createWorkspaceCampaign({
      name: '春季上新满减大促',
      channel: 'viral_qr',
      status: 'draft',
      moduleId: 'marketing_viral',
      metrics: {
        scans: 0,
        shares: 0,
        exposures: 0,
        conversions: 0,
      },
      metadata: {
        platform: 'douyin',
        offer: '50 CNY coupon',
        distribution: 'customer_authorized_video_matrix',
      },
    }, repositoryContext);
    const job = createGenerationJob({
      title: 'Marketing viral QR campaign kit',
      prompt: `Create QR print assets and video-matrix distribution rules for ${campaign.name}`,
      status: 'running',
      providerKind: 'mock',
      runtimeMode: 'web',
      moduleId: 'marketing_viral',
      progress: 0,
      metadata: {
        campaignId: campaign.id,
        channel: campaign.channel,
        offer: '50 CNY coupon',
      },
    }, repositoryContext);
    logAuditEvent({
      action: 'generation_job_start',
      moduleId: 'marketing_viral',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        campaignId: campaign.id,
        channel: campaign.channel,
      },
    }, { session });

    try {
      updateGenerationJob(job.id, { status: 'succeeded', progress: 100 }, repositoryContext);
      const asset = createWorkspaceAsset({
      name: 'spring-viral-qr-print-kit.pdf',
      type: 'document',
      size: '2.4 MB',
      source: 'generated',
      moduleId: 'marketing_viral',
      generationJobId: job.id,
      url: MARKETING_QR_PRINT_URL,
      previewUrl: MARKETING_QR_PRINT_URL,
      tags: ['campaign', 'viral-qr', 'print-kit'],
      metadata: {
        campaignId: campaign.id,
        channel: campaign.channel,
        offer: '50 CNY coupon',
      },
    }, repositoryContext);
    createPricedWorkspaceUsageEvent({
      moduleId: 'marketing_viral',
      pricingAction: 'generation',
      kind: 'generation',
      targetType: 'generation_job',
      targetId: job.id,
      providerKind: 'mock',
      runtimeMode: 'web',
      metadata: {
        campaignId: campaign.id,
        assetId: asset.id,
        assetType: asset.type,
      },
    }, repositoryContext);
    const publishedCampaign = updateWorkspaceCampaign(
      campaign.id,
      {
        status: 'active',
        linkedAssetIds: [asset.id],
        metrics: {
          scans: 1245,
          shares: 892,
          exposures: 120000,
          conversions: 148,
        },
        metadata: {
          ...campaign.metadata,
          generationJobId: job.id,
          printAssetId: asset.id,
        },
      },
      repositoryContext,
    );
    createMarketingLeadHandoff(
      {
        campaign: publishedCampaign ?? campaign,
        moduleId: 'marketing_viral',
        sourceChannel: 'viral_qr',
        leadName: 'Spring QR Campaign Lead',
        company: 'Viral Retail Lab',
        role: 'Campaign Owner',
        landingPage: 'https://aistudio.local/campaigns/spring-viral-qr',
        touchpoint: 'qr_print',
        assetId: asset.id,
        followUpTitle: `[Marketing Lead] Review QR conversions - ${campaign.name}`,
        followUpType: 'Marketing Lead',
        followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          offer: '50 CNY coupon',
          distribution: 'customer_authorized_video_matrix',
        },
      },
      repositoryContext,
      session,
    );
    logAuditEvent({
      action: 'generation_job_complete',
      moduleId: 'marketing_viral',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        campaignId: publishedCampaign?.id ?? campaign.id,
        assetId: asset.id,
      },
    }, { session });
    logAuditEvent({
      action: 'asset_create',
      moduleId: 'marketing_viral',
      targetType: 'asset',
      targetId: asset.id,
      metadata: {
        campaignId: campaign.id,
        generationJobId: job.id,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
      setPublishStatus('Campaign published, print asset saved, and usage recorded.');
      setActiveView('list');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Marketing provider failed before returning campaign assets.';
      failGenerationJob(job.id, {
        error: message,
        metadata: {
          campaignId: campaign.id,
          channel: campaign.channel,
          offer: '50 CNY coupon',
        },
      }, repositoryContext);
      logAuditEvent({
        action: 'generation_job_failed',
        moduleId: 'marketing_viral',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          campaignId: campaign.id,
          channel: campaign.channel,
          error: message,
        },
      }, { session });
      window.dispatchEvent(new Event('activity_logged'));
      setPublishStatus('Campaign generation failed. The job is saved for retry.');
    }
  };

  if (activeView === 'editor') {
    return (
      <div className="p-[var(--spacing-xl)] max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
        <div className="flex justify-between items-center bg-[var(--bg-panel)] p-4 rounded-[24px] border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setActiveView('list')} 
              className="p-2 hover:bg-gray-100 rounded-[var(--radius-lg)] transition-colors text-[var(--text-muted)]"
            >
              <ArrowLeft className="icon-md" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-main)]">配置爆款活动：春季上新满减大促</h2>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">设置顾客扫码后的矩阵玩法和利益点</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm">
               保存草稿
            </button>
            <button 
              onClick={handlePublishCampaign}
              className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center"
            >
               <Check className="icon-sm mr-2" /> 确认发布活动
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[var(--spacing-xl)]">
           <div className="col-span-2 space-y-[var(--spacing-lg)]">
              <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
                 <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] bg-gray-50">
                    <h3 className="font-bold text-[var(--text-main)]">执行策略配置</h3>
                 </div>
                 <div className="p-[var(--spacing-xl)] space-y-8">
                    <div>
                       <label className="block text-sm font-bold text-gray-700 mb-3">活动名称</label>
                       <input type="text" defaultValue="春季上新满减大促" className="w-full px-4 py-3 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-[var(--spacing-md)]">
                       <div>
                         <label className="block text-sm font-bold text-gray-700 mb-3">生效平台聚合</label>
                         <select className="w-full px-4 py-3 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium appearance-none">
                            <option>抖音 (主推)</option>
                            <option>快手</option>
                            <option>小红书</option>
                            <option>视频号</option>
                         </select>
                       </div>
                       <div>
                         <label className="block text-sm font-bold text-gray-700 mb-3">挂载团购链接/POI</label>
                         <select className="w-full px-4 py-3 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium appearance-none">
                            <option>招牌双人餐团购</option>
                            <option>门店 POI 地址</option>
                         </select>
                       </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border-color)]">
                       <label className="block text-sm font-bold text-gray-700 mb-4 inline-flex items-center">
                          <Settings2 className="icon-sm mr-2 text-blue-500" /> 用户利益点反馈 (吸引用户扫码授权)
                       </label>
                       <div className="space-y-[var(--spacing-md)]">
                          <label className="flex items-center p-4 border border-blue-200 bg-blue-50/50 rounded-[var(--radius-xl)] cursor-pointer">
                             <input type="radio" name="feedback" defaultChecked className="icon-md text-[var(--color-primary)] border-gray-300 focus:ring-blue-500" />
                             <span className="ml-3">
                                <span className="block text-sm font-bold text-[var(--text-main)]">随机抽取现金/代金券 (微信/抖音卡包)</span>
                                <span className="block text-xs text-[var(--text-muted)] mt-1">授权自动发布后，通过开放平台能力自动塞券，核销率提升 40%</span>
                             </span>
                          </label>
                          <label className="flex items-center p-4 border border-[var(--border-color)] hover:bg-gray-50 rounded-[var(--radius-xl)] cursor-pointer transition-colors">
                             <input type="radio" name="feedback" className="icon-md text-[var(--color-primary)] border-gray-300 focus:ring-blue-500" />
                             <span className="ml-3">
                                <span className="block text-sm font-bold text-[var(--text-main)]">线下门店人工核销 (送小菜单)</span>
                                <span className="block text-xs text-[var(--text-muted)] mt-1">发布完成后凭成功界面找服务员兑换实体奖励或小菜</span>
                             </span>
                          </label>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
                 <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-[var(--text-main)]">AI 智能混剪视频库素材</h3>
                    <span className="text-xs font-bold text-[var(--color-primary)] bg-blue-100 px-3 py-1 rounded-lg">共 120 条裂变素材等待分发</span>
                 </div>
                 <div className="p-[var(--spacing-lg)]">
                    <p className="text-sm font-medium text-gray-600 mb-[var(--spacing-md)] bg-gray-50 p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
                       顾客扫码后，系统将从以下素材库内<strong className="text-[var(--color-primary)]">随机抽取</strong>并组合片段，生成独一无二的专属视频发布至其账号，能够完美规避平台的搬运限流策略。
                    </p>
                    <div className="grid grid-cols-4 gap-[var(--spacing-md)]">
                       {[1,2,3,4,5,6,7].map(i => (
                          <div key={i} className="group relative aspect-[9/16] bg-gray-200 rounded-[var(--radius-lg)] overflow-hidden cursor-pointer shadow-sm">
                             <img src={`https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80&sig=${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Video cover" />
                             <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Video className="icon-xl text-white" />
                             </div>
                             {i <= 2 && <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">已验证爆款</div>}
                          </div>
                       ))}
                       <div className="aspect-[9/16] border-2 border-dashed border-gray-300 rounded-[var(--radius-lg)] flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-blue-400 cursor-pointer transition-colors text-gray-400 hover:text-blue-500">
                          <Plus className="icon-xl mb-2" />
                          <span className="text-xs font-bold">上传新素材</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="col-span-1 space-y-[var(--spacing-lg)]">
              <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden p-[var(--spacing-lg)] text-center">
                 <h3 className="font-bold text-[var(--text-main)] mb-[var(--spacing-md)] text-left">该活动的门店物料预览</h3>
                 
                 <div className="inline-block bg-[var(--bg-panel)] p-4 rounded-[var(--radius-xl)] shadow-xl border border-[var(--border-color)] relative max-w-[240px] mb-[var(--spacing-md)]">
                    <p className="text-xs font-black text-[var(--color-primary)] mb-4 tracking-widest">扫码领 50 元代金券</p>
                    
                    <div className="w-40 h-40 mx-auto bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-2 relative shrink-0 flex items-center justify-center shadow-inner overflow-hidden mb-4">
                       <div className="w-full h-full bg-slate-900 rounded-lg p-1.5 grid grid-cols-6 gap-0.5">
                          {Array.from({length: 36}).map((_, j) => (
                            <div key={j} className={`rounded-sm ${Math.random() > 0.4 ? 'bg-[var(--bg-panel)]' : 'bg-transparent'}`}></div>
                          ))}
                       </div>
                       <div className="absolute inset-0 m-auto w-10 h-10 bg-[var(--color-primary)] rounded-lg shadow-lg flex items-center justify-center border-[3px] border-white">
                          <span className="text-white text-[12px] font-black tracking-tighter">店</span>
                       </div>
                    </div>
                    
                    <h4 className="font-bold text-[var(--text-main)] text-lg mb-1">春季上新满减大促</h4>
                    <p className="text-xs text-[var(--text-muted)] font-medium">使用微信/抖音扫码即可参与</p>
                 </div>
                 
                 <button className="w-full bg-[var(--color-primary)] hover:bg-blue-700 text-white font-bold py-3 rounded-[var(--radius-lg)] transition-colors shadow-md flex items-center justify-center">
                    <Download className="icon-sm mr-2" /> 下载高清印刷物料 (PDF)
                 </button>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-[var(--spacing-xl)] max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">爆店码（同城裂变营销）</h2>
          <p className="text-[var(--text-muted)] text-sm">生成专属门店二维码，顾客扫码即可自动领取优惠并一键群发矩阵视频至其个人账号，实现同城裂变式曝光。</p>
        </div>
        <div className="flex space-x-3">
          <button 
             onClick={() => onNavigate && onNavigate('marketing_diy')}
             className="bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-[var(--text-main)] px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center"
          >
             <LayoutTemplate className="icon-sm mr-2" /> 扫码页 DIY 装修
          </button>
          <button 
             onClick={() => setActiveView('editor')}
             className="bg-[#1A73E8] hover:bg-[#1557B0] text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center"
          >
             <Plus className="icon-sm mr-2" /> 新建活动
          </button>
        </div>
      </div>
      {publishStatus && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 shadow-sm">
          {publishStatus}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-xl)]">
         <div className="bg-[var(--bg-panel)] p-5 rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between">
            <div className="flex items-center space-x-3 mb-2">
               <div className="w-10 h-10 bg-blue-50 rounded-[var(--radius-lg)] flex items-center justify-center text-[var(--color-primary)]"><ScanLine className="icon-md" /></div>
               <p className="text-xs text-[var(--text-muted)] font-bold uppercase">总扫码核销</p>
            </div>
            <h3 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">45,912 <span className="text-sm font-medium text-green-500">↑ 12%</span></h3>
         </div>
         <div className="bg-[var(--bg-panel)] p-5 rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between">
            <div className="flex items-center space-x-3 mb-2">
               <div className="w-10 h-10 bg-green-50 rounded-[var(--radius-lg)] flex items-center justify-center text-green-600"><Share2 className="icon-md" /></div>
               <p className="text-xs text-[var(--text-muted)] font-bold uppercase">成功发布视频</p>
            </div>
            <h3 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">32,840 <span className="text-sm font-medium text-green-500">↑ 8%</span></h3>
         </div>
         <div className="bg-[var(--bg-panel)] p-5 rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between">
            <div className="flex items-center space-x-3 mb-2">
               <div className="w-10 h-10 bg-orange-50 rounded-[var(--radius-lg)] flex items-center justify-center text-orange-600"><Globe className="icon-md" /></div>
               <p className="text-xs text-[var(--text-muted)] font-bold uppercase">同城曝光预估</p>
            </div>
            <h3 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">4.2M+ <span className="text-sm font-medium text-green-500">↑ 24%</span></h3>
         </div>
         <div className="bg-[var(--bg-panel)] p-5 rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between">
            <div className="flex items-center space-x-3 mb-2">
               <div className="w-10 h-10 bg-rose-50 rounded-[var(--radius-lg)] flex items-center justify-center text-rose-600"><ArrowUpRight className="icon-md" /></div>
               <p className="text-xs text-[var(--text-muted)] font-bold uppercase">团购转化预估</p>
            </div>
            <h3 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">¥ 12.4W</h3>
         </div>
      </div>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h3 className="text-lg font-bold text-[var(--text-main)]">爆款活动列表</h3>
        <div className="flex space-x-2">
           <select className="border-[var(--border-color)] rounded-lg text-sm bg-[var(--bg-panel)] shadow-sm font-medium focus:ring-blue-500">
             <option>全部门店</option>
             <option>旗舰店</option>
             <option>二店</option>
           </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)]">
        {[
           { id: 1, title: '春季上新满减大促', tag: 'A 级大促', scans: '1,245', shares: '892', exposure: '12W+', vids: 120, platform: '抖音' },
           { id: 2, title: '周末进店送小食', tag: '日常引流', scans: '450', shares: '380', exposure: '5W+', vids: 45, platform: '快手' },
           { id: 3, title: '会员日专属折扣码', tag: '会员专享', scans: '890', shares: '800', exposure: '8W+', vids: 80, platform: '小红书' }
        ].map(activity => (
          <div key={activity.id} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-shadow relative flex flex-col">
             <div className="absolute top-4 right-4 z-10 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded shadow-sm border border-green-200 flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                生效中
             </div>
             
             <div className="bg-gradient-to-br from-blue-50 to-blue-50 p-[var(--spacing-lg)] border-b border-blue-100 flex items-center space-x-5">
                <div className="w-20 h-20 bg-[var(--bg-panel)] border border-blue-200 rounded-[var(--radius-xl)] p-2 relative shrink-0 flex items-center justify-center shadow-inner overflow-hidden">
                   <div className="w-full h-full bg-slate-900 rounded-lg p-1 grid grid-cols-5 gap-[1px]">
                      {Array.from({length: 25}).map((_, j) => (
                        <div key={j} className={`rounded-[1px] ${Math.random() > 0.4 ? 'bg-[var(--bg-panel)]' : 'bg-transparent'}`}></div>
                      ))}
                   </div>
                   <div className="absolute inset-0 m-auto icon-lg bg-[var(--color-primary)] rounded drop-shadow flex items-center justify-center border-2 border-white">
                      <span className="text-white text-[9px] font-black tracking-tighter">店</span>
                   </div>
                </div>
                <div>
                   <span className="text-[10px] font-bold text-[var(--color-primary)] bg-blue-100 px-2 py-0.5 rounded uppercase tracking-wider border border-blue-200">{activity.tag}</span>
                   <h4 className="font-bold text-[var(--text-main)] text-lg mt-1">{activity.title}</h4>
                   <p className="text-xs text-gray-600 mt-1 font-medium">{activity.platform}矩阵视频库 ({activity.vids}条待分发)</p>
                </div>
             </div>
             
             <div className="p-5 flex-1 flex flex-col">
                <div className="grid grid-cols-3 divide-x divide-gray-100 mb-5 text-sm">
                   <div className="text-center">
                      <p className="text-gray-400 text-[11px] font-bold uppercase mb-1">扫描数</p>
                      <p className="font-black text-[var(--text-main)] text-lg">{activity.scans}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-gray-400 text-[11px] font-bold uppercase mb-1">成功发布</p>
                      <p className="font-black text-[var(--text-main)] text-lg">{activity.shares}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-gray-400 text-[11px] font-bold uppercase mb-1">预估曝光</p>
                      <p className="font-black text-green-600 text-lg">{activity.exposure}</p>
                   </div>
                </div>
                
                <div className="bg-gray-50 rounded-[var(--radius-lg)] p-3 mb-4 border border-[var(--border-color)]/80 flex-1">
                   <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wide">扫码执行动作</p>
                   <ul className="space-y-1.5 text-xs font-medium">
                      <li className="flex items-center text-gray-700"><Check className="w-3.5 h-3.5 text-green-500 mr-2 shrink-0" /> 顾客确认授权后自动发布门店视频</li>
                      <li className="flex items-center text-gray-700"><Check className="w-3.5 h-3.5 text-green-500 mr-2 shrink-0" /> 随机为顾客抽取 20-50 元代金券</li>
                      <li className="flex items-center text-gray-700"><Check className="w-3.5 h-3.5 text-green-500 mr-2 shrink-0" /> 视频自动挂载【{activity.platform}团购链接】</li>
                   </ul>
                </div>
                
                <div className="flex space-x-2 mt-auto">
                   <button 
                     onClick={() => setActiveView('editor')}
                     className="flex-1 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-bold py-2 rounded-[var(--radius-lg)] text-sm transition-colors flex items-center justify-center shadow-sm"
                   >
                      <Settings2 className="icon-sm mr-1.5" /> 策略设置
                   </button>
                   <button className="flex-1 bg-[var(--color-primary)] text-white shadow-sm shadow-blue-200 hover:bg-blue-700 font-bold py-2 rounded-[var(--radius-lg)] text-sm transition-colors flex items-center justify-center">
                      <Download className="icon-sm mr-1.5" /> 下载物料
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketingNFC({ onNavigate }: { onNavigate?: (id: any) => void }) {
  const session = useSaasSession();
  const repositoryContext = React.useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [saveStatus, setSaveStatus] = React.useState<string | null>(null);

  const handleSaveNfcCampaign = () => {
    const campaign = createWorkspaceCampaign({
      name: 'Guest Wi-Fi NFC touchpoint',
      channel: 'nfc_touchpoint',
      status: 'active',
      moduleId: 'marketing_nfc',
      metrics: {
        scans: 2491,
        shares: 0,
        exposures: 2491,
        conversions: 1041,
      },
      metadata: {
        ssid: 'Guest_Free_WIFI',
        security: 'WPA/WPA2',
        preConnectFollow: true,
      },
    }, repositoryContext);
    const asset = createWorkspaceAsset({
      name: 'guest-wifi-nfc-touchpoint.json',
      type: 'document',
      size: '18 KB',
      source: 'generated',
      moduleId: 'marketing_nfc',
      url: MARKETING_NFC_CARD_URL,
      previewUrl: MARKETING_NFC_CARD_URL,
      tags: ['campaign', 'nfc', 'touchpoint'],
      metadata: {
        campaignId: campaign.id,
        ssid: 'Guest_Free_WIFI',
        action: 'wifi_connect_and_follow',
      },
    }, repositoryContext);
    createPricedWorkspaceUsageEvent({
      moduleId: 'marketing_nfc',
      pricingAction: 'automation',
      kind: 'automation',
      targetType: 'asset',
      targetId: asset.id,
      providerKind: 'mock',
      runtimeMode: 'web',
      metadata: {
        campaignId: campaign.id,
        assetId: asset.id,
        touchpoint: 'guest_wifi',
      },
    }, repositoryContext);
    createMarketingLeadHandoff(
      {
        campaign,
        moduleId: 'marketing_nfc',
        sourceChannel: 'nfc_touchpoint',
        leadName: 'Guest Wi-Fi NFC Lead',
        company: 'In-store Guest Segment',
        role: 'NFC Visitor',
        touchpoint: 'guest_wifi',
        assetId: asset.id,
        followUpTitle: `[Marketing Lead] Contact NFC visitors - ${campaign.name}`,
        followUpType: 'Marketing Lead',
        followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          ssid: 'Guest_Free_WIFI',
          action: 'wifi_connect_and_follow',
        },
      },
      repositoryContext,
      session,
    );
    logAuditEvent({
      action: 'asset_create',
      moduleId: 'marketing_nfc',
      targetType: 'asset',
      targetId: asset.id,
      metadata: {
        campaignId: campaign.id,
        touchpoint: 'guest_wifi',
      },
    }, { session });
    logAuditEvent({
      action: 'general',
      moduleId: 'marketing_nfc',
      targetType: 'module',
      targetId: campaign.id,
      metadata: {
        campaignId: campaign.id,
        assetId: asset.id,
        action: 'nfc_touchpoint_saved',
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
    setSaveStatus('NFC touchpoint campaign saved with usage and audit evidence.');
  };

  return (
    <div className="p-[var(--spacing-xl)] max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      <GenerationFailureRecoveryPanel moduleId="marketing_viral" session={session} context={repositoryContext} />
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">NFC 碰一碰智能感应</h2>
          <p className="text-[var(--text-muted)] text-sm">将物理空间与线上服务无缝连接，通过手机轻碰即可执行短视频平台一键分发、自动连接 WIFI、展示自定义营销页等操作。</p>
        </div>
        <div className="flex space-x-3">
           <button 
             onClick={() => onNavigate && onNavigate('marketing_diy')}
             className={`px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-[var(--text-main)]`}
           >
              <LayoutTemplate className="icon-sm mr-2" />
              NFC 交互页 DIY 编辑
          </button>
        </div>
      </div>
      {saveStatus && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 shadow-sm">
          {saveStatus}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)]">
         <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[24px] border border-[var(--border-color)] shadow-sm flex items-center space-x-4 col-span-2">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-[var(--radius-xl)] flex items-center justify-center text-white shadow-md">
               <SmartphoneNfc className="icon-xl" />
            </div>
            <div>
               <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">NFC 点位设备大盘</p>
               <div className="flex items-end space-x-3">
                  <h3 className="text-2xl font-black text-[var(--text-main)]">124</h3>
                  <span className="text-sm font-bold text-green-600 mb-1 flex items-center"><div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></div> 在线活跃中</span>
               </div>
            </div>
         </div>
         <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[24px] border border-[var(--border-color)] shadow-sm">
             <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 border-b border-[var(--border-color)] pb-2">今日碰一碰次数 (PV)</p>
             <h3 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">2,491</h3>
             <p className="text-xs text-green-600 font-bold mt-1">↑ 12% 较昨日同时段</p>
         </div>
         <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[24px] border border-[var(--border-color)] shadow-sm">
             <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 border-b border-[var(--border-color)] pb-2">发布/发券转化率</p>
             <h3 className="text-[var(--text-main)]xl font-black text-[var(--color-primary)] mt-2">41.8%</h3>
             <p className="text-xs text-[var(--text-muted)] mt-1">触发核心营销动作</p>
         </div>
      </div>

      <div className="max-w-3xl">
         <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden animate-in zoom-in-95 duration-200">
           <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-gray-50">
             <h3 className="font-bold text-[var(--text-main)]">门店 WIFI 参数配置</h3>
             <button onClick={handleSaveNfcCampaign} className="text-sm bg-[var(--color-primary)] hover:bg-blue-700 text-white py-1.5 px-4 rounded-lg font-bold shadow-sm transition-colors">
                保存配置
             </button>
           </div>
           <div className="p-[var(--spacing-lg)] space-y-[var(--spacing-lg)]">
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">Wi-Fi 网络名称 (SSID)</label>
                 <input type="text" defaultValue="Guest_Free_WIFI" className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow bg-gray-50 font-medium" />
              </div>
              
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">网络密码</label>
                 <input type="password" defaultValue="welcome2026" className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow bg-gray-50 font-medium" />
              </div>
              
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">网络加密类型</label>
                 <select className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow bg-gray-50 font-medium appearance-none">
                    <option>WPA/WPA2 (推荐)</option>
                    <option>WEP</option>
                    <option>无密码 (开放网络)</option>
                 </select>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-100 rounded-[var(--radius-lg)] mt-4">
                 <Globe className="icon-md text-[var(--color-primary)] shrink-0 mt-0.5" />
                 <div>
                    <p className="text-sm font-bold text-blue-900">引导关注公众号 (WIFI 连通前置条件)</p>
                    <p className="text-xs text-blue-700 mt-1">开启此选项后，用户碰触 NFC 将打开小程序/H5引导关注，关注后即下发快速联网协议，直接调用系统 API 完成免密连接。</p>
                 </div>
              </div>
           </div>
         </div>
      </div>
    </div>
  );
}

function MarketingWebsite({ onNavigate }: { onNavigate?: (id: any) => void }) {
  const session = useSaasSession();
  const repositoryContext = React.useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [generationStatus, setGenerationStatus] = React.useState<string | null>(null);

  const handleGenerateWebsite = () => {
    const campaign = createWorkspaceCampaign({
      name: 'Nexus Tech AI landing page',
      channel: 'website',
      status: 'draft',
      moduleId: 'marketing_website',
      landingUrl: MARKETING_SITE_PREVIEW_URL,
      metrics: {
        scans: 0,
        shares: 0,
        exposures: 0,
        conversions: 0,
      },
      metadata: {
        domain: 'landing.nexus-tech.io',
        seoScoreTarget: 94,
      },
    }, repositoryContext);
    const job = createGenerationJob({
      title: 'Marketing website landing page',
      prompt: `Generate responsive SaaS landing page and SEO metadata for ${campaign.name}`,
      status: 'running',
      providerKind: 'mock',
      runtimeMode: 'web',
      moduleId: 'marketing_website',
      progress: 0,
      metadata: {
        campaignId: campaign.id,
        domain: 'landing.nexus-tech.io',
        seoScoreTarget: 94,
      },
    }, repositoryContext);
    logAuditEvent({
      action: 'generation_job_start',
      moduleId: 'marketing_website',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        campaignId: campaign.id,
        channel: campaign.channel,
      },
    }, { session });

    try {
      updateGenerationJob(job.id, { status: 'succeeded', progress: 100 }, repositoryContext);
      const asset = createWorkspaceAsset({
      name: 'nexus-tech-ai-landing-page.html',
      type: 'document',
      size: '96 KB',
      source: 'generated',
      moduleId: 'marketing_website',
      generationJobId: job.id,
      url: MARKETING_SITE_PREVIEW_URL,
      previewUrl: MARKETING_SITE_PREVIEW_URL,
      tags: ['campaign', 'website', 'landing-page'],
      metadata: {
        campaignId: campaign.id,
        domain: 'landing.nexus-tech.io',
        seoScore: 94,
      },
    }, repositoryContext);
    createPricedWorkspaceUsageEvent({
      moduleId: 'marketing_website',
      pricingAction: 'generation',
      kind: 'generation',
      targetType: 'generation_job',
      targetId: job.id,
      providerKind: 'mock',
      runtimeMode: 'web',
      metadata: {
        campaignId: campaign.id,
        assetId: asset.id,
        landingUrl: MARKETING_SITE_PREVIEW_URL,
      },
    }, repositoryContext);
    const publishedCampaign = updateWorkspaceCampaign(
      campaign.id,
      {
        status: 'active',
        linkedAssetIds: [asset.id],
        landingUrl: MARKETING_SITE_PREVIEW_URL,
        metrics: {
          scans: 3210,
          shares: 184,
          exposures: 22109,
          conversions: 312,
        },
        metadata: {
          ...campaign.metadata,
          generationJobId: job.id,
          siteAssetId: asset.id,
        },
      },
      repositoryContext,
    );
    createMarketingLeadHandoff(
      {
        campaign: publishedCampaign ?? campaign,
        moduleId: 'marketing_website',
        sourceChannel: 'website',
        leadName: 'Nexus Tech Website Lead',
        company: 'Nexus Tech',
        role: 'Demo Request Owner',
        landingPage: MARKETING_SITE_PREVIEW_URL,
        touchpoint: 'landing_page_form',
        assetId: asset.id,
        followUpTitle: `[Marketing Lead] Qualify landing page demos - ${campaign.name}`,
        followUpType: 'Marketing Lead',
        followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          domain: 'landing.nexus-tech.io',
          seoScore: 94,
        },
      },
      repositoryContext,
      session,
    );
    logAuditEvent({
      action: 'generation_job_complete',
      moduleId: 'marketing_website',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        campaignId: campaign.id,
        assetId: asset.id,
        landingUrl: MARKETING_SITE_PREVIEW_URL,
      },
    }, { session });
    logAuditEvent({
      action: 'asset_create',
      moduleId: 'marketing_website',
      targetType: 'asset',
      targetId: asset.id,
      metadata: {
        campaignId: campaign.id,
        generationJobId: job.id,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
      setGenerationStatus('Website campaign generated, saved, and usage recorded.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Website provider failed before returning a landing page.';
      failGenerationJob(job.id, {
        error: message,
        metadata: {
          campaignId: campaign.id,
          domain: 'landing.nexus-tech.io',
          seoScoreTarget: 94,
        },
      }, repositoryContext);
      logAuditEvent({
        action: 'generation_job_failed',
        moduleId: 'marketing_website',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          campaignId: campaign.id,
          channel: campaign.channel,
          error: message,
        },
      }, { session });
      window.dispatchEvent(new Event('activity_logged'));
      setGenerationStatus('Website generation failed. The job is saved for retry.');
    }
  };

  return (
    <div className="p-[var(--spacing-xl)] max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      <GenerationFailureRecoveryPanel moduleId="marketing_website" session={session} context={repositoryContext} />
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">AI 官网构建引擎</h2>
          <p className="text-[var(--text-muted)] text-sm">提供一句话生成智能响应式网站能力，内置 SEO 优化矩阵，助力超级个体快速上线业务落地页。</p>
        </div>
        <div className="flex space-x-3">
          <button 
             onClick={() => onNavigate && onNavigate('marketing_diy')}
             className="bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-[var(--text-main)] px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center"
          >
             <LayoutTemplate className="icon-sm mr-2" /> 官网 DIY 装修
          </button>
          <button onClick={handleGenerateWebsite} className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center">
             <Wand2 className="icon-sm mr-2" /> 生成全新网站
          </button>
        </div>
      </div>
      {generationStatus && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 shadow-sm">
          {generationStatus}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-xl)]">
        <div className="lg:col-span-2 space-y-[var(--spacing-lg)]">
           <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] overflow-hidden shadow-sm relative group">
              <div className="absolute top-4 right-4 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button className="bg-[var(--bg-panel)]/90 backdrop-blur text-[var(--text-main)] px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center hover:bg-[var(--bg-panel)]"><LayoutTemplate className="w-3.5 h-3.5 mr-1.5" /> 结构调整</button>
                 <button className="bg-[var(--bg-panel)]/90 backdrop-blur text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-blue-100 flex items-center hover:bg-blue-50"><Code className="w-3.5 h-3.5 mr-1.5" /> 源码级编辑</button>
              </div>
              <div className="aspect-[21/9] bg-gray-100 relative border-b border-[var(--border-color)] overflow-hidden">
                 <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover object-top opacity-90 transition-transform duration-700 group-hover:scale-105" alt="site" />
                 <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-[var(--spacing-lg)]">
                    <h3 className="text-2xl font-bold text-white drop-shadow-md">Nexus Tech - 旗舰版个人超级 IP 门户</h3>
                    <div className="flex items-center space-x-4 mt-3">
                       <span className="flex items-center text-white/90 text-sm font-medium"><Globe className="icon-sm mr-1.5 text-blue-400" /> www.nexus-tech.io</span>
                       <span className="px-2 py-0.5 bg-green-500/20 text-green-300 border border-green-500/30 text-xs font-bold rounded uppercase tracking-wider backdrop-blur-sm">Live (SSL Secure)</span>
                    </div>
                 </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100 p-2">
                 <div className="p-4 text-center">
                    <p className="text-xs text-[var(--text-muted)] font-bold uppercase mb-1">今日独立访客 (UV)</p>
                    <h4 className="text-xl font-black text-[var(--text-main)]">8,241</h4>
                    <span className="text-[10px] font-bold text-green-500">↑ 14% 环比增长</span>
                 </div>
                 <div className="p-4 text-center">
                    <p className="text-xs text-[var(--text-muted)] font-bold uppercase mb-1">页面浏览量 (PV)</p>
                    <h4 className="text-xl font-black text-[var(--text-main)]">22,109</h4>
                    <span className="text-[10px] font-bold text-green-500">↑ 8% 环比增长</span>
                 </div>
                 <div className="p-4 text-center">
                    <p className="text-xs text-[var(--text-muted)] font-bold uppercase mb-1">平均停留时长</p>
                    <h4 className="text-xl font-black text-[var(--text-main)]">2m 45s</h4>
                    <span className="text-[10px] font-bold text-gray-400">稳定波动</span>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-[var(--spacing-md)]">
               {[
                 { title: 'AI 营销微客页面', url: 'landing.nexus-tech.io', uv: '3,210', status: 'Active' },
                 { title: '2025 全球峰会报名表单', url: 'summit.nexus-tech.io', uv: '1,840', status: 'Draft' }
               ].map((site, i) => (
                 <div key={i} className="bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 hover:bg-[var(--bg-panel)] transition-colors cursor-pointer group shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-3">
                           <div className={`p-2 rounded-lg ${i === 0 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-[var(--color-primary)]'}`}>
                              <LayoutTemplate className="icon-md" />
                           </div>
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${site.status === 'Active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-200 text-gray-600'}`}>{site.status}</span>
                        </div>
                        <h4 className="font-bold text-[var(--text-main)]">{site.title}</h4>
                        <p className="text-[11px] font-medium text-[var(--color-primary)] mt-1.5 flex items-center">{site.url} <ArrowUpRight className="w-3 h-3 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--border-color)]/60 flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
                       <span>独立访客: <span className="text-[var(--text-main)] text-sm">{site.uv}</span></span>
                       <button className="text-gray-400 hover:text-[var(--color-primary)]"><Settings2 className="icon-sm" /></button>
                    </div>
                 </div>
               ))}
           </div>
        </div>
        
        <div className="space-y-[var(--spacing-lg)]">
           <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] overflow-hidden shadow-sm">
              <div className="p-5 border-b border-[var(--border-color)] bg-gray-50">
                 <h3 className="font-bold text-[var(--text-main)]">SEO 智能巡检雷达</h3>
              </div>
              <div className="p-5 space-y-[var(--spacing-md)]">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                       <div className="relative w-12 h-12 flex items-center justify-center">
                          <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="text-green-500" strokeDasharray="94, 100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          </svg>
                          <span className="text-sm font-black text-[var(--text-main)] relative">94</span>
                       </div>
                       <div>
                          <p className="text-sm font-bold text-[var(--text-main)]">总体优化评分</p>
                          <p className="text-[11px] text-green-600 font-bold mt-0.5">超过 85% 竞争对手</p>
                       </div>
                    </div>
                 </div>

                 <ul className="space-y-[var(--spacing-md)] pt-4 border-t border-[var(--border-color)]">
                    <li className="flex gap-3">
                       <div className="mt-0.5 text-amber-500 bg-amber-50 rounded-lg p-1.5"><Code className="icon-sm" /></div>
                       <div>
                          <p className="text-sm font-bold text-[var(--text-main)]">TDK 标签缺失</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">"关于我们"子页面缺失 Description，AI已自动为您生成 3 个备选文案。</p>
                          <button className="text-[11px] font-bold text-[var(--color-primary)] mt-2 hover:text-blue-800 flex items-center"><Wand2 className="w-3 h-3 mr-1" /> 一键套用修复</button>
                       </div>
                    </li>
                    <li className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                       <div className="mt-0.5 text-rose-500 bg-rose-50 rounded-lg p-1.5"><ArrowUpRight className="icon-sm" /></div>
                       <div>
                          <p className="text-sm font-bold text-[var(--text-main)]">404 死链警告</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">检测到 2 处引用的外部资源图片发生 404，影响页面加载权重。</p>
                          <button className="text-[11px] font-bold text-[var(--color-primary)] mt-2 hover:text-blue-800 flex items-center">查看详细报告</button>
                       </div>
                    </li>
                 </ul>
              </div>
           </div>

           <div className="bg-[var(--color-primary)] rounded-[24px] p-[var(--spacing-lg)] shadow-md text-white relative overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--bg-panel)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform"></div>
              <div className="w-10 h-10 bg-[var(--bg-panel)]/20 rounded-[var(--radius-lg)] flex items-center justify-center mb-4 backdrop-blur-sm">
                 <Wand2 className="icon-md text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">尝试使用 AI 自动运营？</h3>
              <p className="text-blue-100 text-xs leading-relaxed mb-4">开启自动运营引擎后，AI 将根据访客画像自动为您调整页面文案与商品排序（千人千面）。</p>
              <button className="bg-[var(--bg-panel)] text-blue-700 w-full font-bold text-sm py-2.5 rounded-[var(--radius-lg)] hover:bg-gray-50 transition-colors">
                 立即配置 AI 运营策略
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
