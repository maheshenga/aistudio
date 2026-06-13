import { useEffect, useMemo, useState } from 'react';

import { hydrateWorkspaceAssets, loadWorkspaceAssets, type WorkspaceAsset } from '../lib/data/assetRepository';
import { useSaasSession } from '../saas/SaasAuthContext';

export function useWorkspaceAssets(): WorkspaceAsset[] {
  const session = useSaasSession();
  const assetContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [assets, setAssets] = useState<WorkspaceAsset[]>(() => loadWorkspaceAssets(assetContext));

  useEffect(() => {
    const refreshAssets = () => setAssets(loadWorkspaceAssets(assetContext));
    const handleAssetsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== assetContext.workspaceId) return;
      refreshAssets();
    };

    refreshAssets();
    void hydrateWorkspaceAssets(assetContext);
    window.addEventListener('assets_updated', handleAssetsUpdated);
    return () => window.removeEventListener('assets_updated', handleAssetsUpdated);
  }, [assetContext]);

  return assets;
}
