import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Filter,
  Link as LinkIcon,
  MoreVertical,
  Package,
  Plus,
  Search,
  Share2,
  Star,
} from 'lucide-react';

import { toast } from './Toast';
import { useWorkspaceAssets } from '../hooks/useWorkspaceAssets';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { getSetting, saveSetting } from '../lib/data/settingsRepository';
import {
  createWorkspaceProject,
  hydrateWorkspaceProjects,
  loadWorkspaceProjects,
  updateWorkspaceProject,
  type WorkspaceProject,
} from '../lib/data/projectRepository';
import { useSaasSession } from '../saas/SaasAuthContext';

const PROJECT_ASSET_LINKS_SETTING_KEY = 'project_asset_links';

type ProjectAssetLinksSetting = Record<string, string[]>;

function formatProjectUpdatedAt(project: WorkspaceProject) {
  return new Date(project.updatedAt).toISOString().slice(0, 10);
}

function getStatusLabel(status: WorkspaceProject['status']) {
  if (status === 'active') return 'Active';
  if (status === 'archived') return 'Archived';
  return 'Draft';
}

function getStatusClass(status: WorkspaceProject['status']) {
  if (status === 'active') return 'bg-[#E6F4EA] text-[#1E8E3E]';
  if (status === 'archived') return 'bg-[#F1F3F4] text-gray-600';
  return 'bg-[#FEF7E0] text-[#B06000]';
}

export function ProjectsView() {
  const session = useSaasSession();
  const assets = useWorkspaceAssets();
  const projectContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [draggedOverId, setDraggedOverId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadProjects = () => setProjects(loadWorkspaceProjects(projectContext));
    const handleProjectsUpdated = (event: Event) => {
      const workspaceId = (event as CustomEvent<{ workspaceId?: string }>).detail?.workspaceId;
      if (workspaceId && workspaceId !== projectContext.workspaceId) return;
      loadProjects();
    };

    loadProjects();
    // When VITE_DATA_API_URL is configured this fetches from the API into the cache;
    // hydrate dispatches workspace_projects_updated, so the listener below refreshes automatically.
    void hydrateWorkspaceProjects(projectContext);
    window.addEventListener('workspace_projects_updated', handleProjectsUpdated);
    return () => window.removeEventListener('workspace_projects_updated', handleProjectsUpdated);
  }, [projectContext]);

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return project.name.toLowerCase().includes(query) || project.type.toLowerCase().includes(query);
  });

  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  const logProjectAudit = (
    action: 'project_asset_link',
    project: WorkspaceProject,
    assetId: string,
    metadata: Record<string, unknown> = {},
  ) => {
    logAuditEvent({
      action,
      moduleId: 'projects',
      targetType: 'asset',
      targetId: assetId,
      metadata: {
        projectId: project.id,
        projectName: project.name,
        assetId,
        linkedAssetIds: project.linkedAssetIds,
        ...metadata,
      },
    }, { session });
  };

  const refreshProjects = () => setProjects(loadWorkspaceProjects(projectContext));

  const handleCreateProject = () => {
    const project = createWorkspaceProject(
      {
        name: `Workspace Project ${projects.length + 1}`,
        type: 'Workspace',
        status: 'active',
        metadata: { source: 'projects_view' },
      },
      projectContext,
    );
    toast(`Created project: ${project.name}`, 'success');
    refreshProjects();
  };

  const handleToggleFavorite = (project: WorkspaceProject) => {
    updateWorkspaceProject(project.id, { favorite: !project.favorite }, projectContext);
    refreshProjects();
  };

  const handleDragOver = (event: React.DragEvent, id: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDraggedOverId(id);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDraggedOverId(null);
  };

  const handleDrop = (event: React.DragEvent, project: WorkspaceProject) => {
    event.preventDefault();
    setDraggedOverId(null);
    const assetId =
      event.dataTransfer.getData('application/x-aistudio-asset') ||
      event.dataTransfer.getData('text/plain');
    if (!assetId || !assetById.has(assetId)) {
      toast('Drop a saved workspace asset onto this project.', 'warning');
      return;
    }

    const linkedAssetIds = [...new Set([...project.linkedAssetIds, assetId])];
    const updatedProject = updateWorkspaceProject(project.id, { linkedAssetIds }, projectContext);
    if (!updatedProject) {
      toast('Project link failed. Previous project state was kept.', 'error');
      return;
    }

    const projectAssetLinks = getSetting<ProjectAssetLinksSetting>(
      PROJECT_ASSET_LINKS_SETTING_KEY,
      {},
      projectContext,
    );
    saveSetting<ProjectAssetLinksSetting>(
      PROJECT_ASSET_LINKS_SETTING_KEY,
      {
        ...projectAssetLinks,
        [updatedProject.id]: updatedProject.linkedAssetIds,
      },
      projectContext,
    );

    logProjectAudit('project_asset_link', updatedProject, assetId, {
      linkCount: updatedProject.linkedAssetIds.length,
      assetName: assetById.get(assetId)?.name,
      settingsKey: PROJECT_ASSET_LINKS_SETTING_KEY,
    });
    toast(`Linked ${assetById.get(assetId)?.name ?? assetId} to ${project.name}`, 'success');
    refreshProjects();
  };

  return (
    <div className="p-[var(--spacing-lg)] max-w-[1600px] mx-auto space-y-8 bg-[var(--bg-panel)] min-h-[calc(100vh-4rem)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
            Projects
            <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded shadow-sm border border-blue-200 uppercase tracking-widest flex items-center">
              Asset Knowledge
            </span>
          </h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">
            Workspace projects hold linked generated, imported, and exported assets without duplicating asset records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 sm:mt-0">
          <div className="relative group">
            <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--text-main)] transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search projects..."
              className="pl-9 pr-4 py-2 bg-[#F1F3F4] border-transparent focus:bg-[var(--bg-panel)] border rounded-full text-sm font-medium focus:outline-none focus:border-gray-900 w-64 transition-all shadow-sm"
            />
          </div>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] border border-[var(--border-color)] p-2 rounded-full shadow-sm hover:shadow transition-all flex items-center justify-center">
            <Filter className="icon-sm" />
          </button>
          <button
            onClick={handleCreateProject}
            className="flex items-center space-x-1.5 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="icon-sm" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--border-color)]">
        <button className="border-b-[3px] border-gray-900 text-[var(--text-main)] font-bold px-4 py-3 text-[14px]">
          Recent
        </button>
        <button className="border-b-[3px] border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold px-4 py-3 text-[14px] transition-colors">
          Starred ({projects.filter((project) => project.favorite).length})
        </button>
        <button className="border-b-[3px] border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold px-4 py-3 text-[14px] transition-colors">
          Linked Assets ({projects.reduce((sum, project) => sum + project.linkedAssetIds.length, 0)})
        </button>
      </div>

      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-[var(--spacing-md)] pt-2">
          {filteredProjects.map((project) => {
            const linkedAssets = project.linkedAssetIds
              .map((assetId) => assetById.get(assetId))
              .filter(Boolean);
            const coverUrl = project.coverImageUrl ?? linkedAssets.find((asset) => asset?.previewUrl || asset?.url)?.previewUrl ?? linkedAssets.find((asset) => asset?.url)?.url;
            return (
              <div
                key={project.id}
                onDragOver={(event) => handleDragOver(event, project.id)}
                onDragLeave={handleDragLeave}
                onDrop={(event) => handleDrop(event, project)}
                className={`bg-[var(--bg-panel)] rounded-[24px] border ${
                  draggedOverId === project.id ? 'border-blue-500 ring-4 ring-blue-500/20 scale-[1.02]' : 'border-[var(--border-color)]'
                } shadow-sm overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {coverUrl ? (
                    <img src={coverUrl} alt={project.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                      <Package className="icon-xl" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1F2937]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <div className="flex gap-2">
                      <button className="bg-[var(--bg-panel)]/20 backdrop-blur-md p-2 rounded-[var(--radius-lg)] hover:bg-[var(--bg-panel)]/40 transition-colors text-white tooltip" title="Share project">
                        <Share2 className="icon-sm" />
                      </button>
                      <button className="bg-[var(--bg-panel)]/20 backdrop-blur-md p-2 rounded-[var(--radius-lg)] hover:bg-[var(--bg-panel)]/40 transition-colors text-white tooltip" title="Copy link">
                        <LinkIcon className="icon-sm" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleFavorite(project)}
                    className="absolute top-3 right-3 text-white drop-shadow-md transition-transform hover:scale-110"
                  >
                    <Star className={`icon-md ${project.favorite ? 'fill-yellow-400 text-yellow-400' : 'opacity-80 hover:opacity-100'}`} />
                  </button>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-[var(--text-main)] leading-tight pr-2 text-[15px] group-hover:text-black transition-colors">
                      {project.name}
                    </h3>
                    <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full">
                      <MoreVertical className="icon-sm" />
                    </button>
                  </div>
                  <div className="flex items-center text-[12px] text-[var(--text-muted)] mb-5 space-x-2 font-medium">
                    <span className="flex items-center">
                      <Package className="w-3.5 h-3.5 mr-1 text-gray-400" /> {project.type}
                    </span>
                    <span className="text-gray-300">/</span>
                    <span>{formatProjectUpdatedAt(project)}</span>
                  </div>
                  <div className="mb-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-color)] bg-gray-50 px-3 py-2 text-[12px] font-bold text-[var(--text-muted)]">
                    Drop assets here / {project.linkedAssetIds.length} linked
                  </div>
                  {linkedAssets.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {linkedAssets.slice(0, 4).map((asset) => asset && (
                        <span key={asset.id} className="rounded-md bg-blue-50 border border-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
                          {asset.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[var(--text-main)] font-bold text-[10px] z-20 shadow-sm">
                        {session.user.name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-md tracking-wider ${getStatusClass(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={handleCreateProject}
            className="bg-[var(--bg-app)] border-2 border-dashed border-gray-300 rounded-[24px] flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-gray-900 transition-all cursor-pointer min-h-[280px] group hover:bg-gray-100/50"
          >
            <div className="p-4 bg-[var(--bg-panel)] rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
              <Plus className="icon-lg" />
            </div>
            <p className="font-bold text-[15px]">Create project</p>
          </button>
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] p-12 text-center">
          <Package className="icon-xl mx-auto mb-4 text-[var(--text-muted)]" />
          <p className="text-lg font-black text-[var(--text-main)]">No projects yet</p>
          <p className="text-sm font-medium text-[var(--text-muted)] mt-2">
            Create a project, then drag saved workspace assets from Assets into it.
          </p>
          <button
            onClick={handleCreateProject}
            className="mt-5 inline-flex items-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Plus className="icon-sm mr-2" />
            New Project
          </button>
        </div>
      )}

      <div className="mt-12 pt-10 border-t border-[var(--border-color)] pb-10">
        <h3 className="text-lg font-black text-[var(--text-main)] mb-[var(--spacing-xl)] flex items-center">
          <Calendar className="icon-md mr-2 text-[var(--color-primary)]" />
          Project Timeline
        </h3>
        <div className="relative max-w-4xl mx-auto px-10 min-h-[120px]">
          <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gray-100 -translate-y-1/2 rounded-full" />
          <div className="absolute top-1/2 left-0 w-1/2 h-1.5 bg-[var(--color-primary)] -translate-y-1/2 rounded-l-full shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
          <div className="flex justify-between items-center relative z-10">
            {projects.slice(0, 5).map((project) => (
              <div key={project.id} className="flex flex-col items-center group relative cursor-pointer">
                <div className={`icon-md rounded-full border-[5px] border-white shadow-md mb-4 transition-transform group-hover:scale-125 duration-300 ${project.status === 'active' ? 'bg-[var(--color-primary)]' : project.status === 'archived' ? 'bg-gray-400' : 'bg-yellow-500'}`} />
                <div className="bg-[var(--bg-panel)] p-3 rounded-[var(--radius-lg)] shadow-sm border border-[var(--border-color)] w-36 flex flex-col items-center text-center absolute top-10 opacity-70 group-hover:opacity-100 group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-1">
                  <span className="text-[10px] font-bold text-gray-400 mb-1 tracking-wider uppercase">{project.type}</span>
                  <span className="text-xs font-black text-[var(--text-main)] line-clamp-2 leading-tight">{project.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
