// path: src/renderer/src/hooks/useDraftRecovery.ts
import { useCallback, useEffect, useState } from 'react';
import { DraftInvoiceData, RecoverableDraft } from '@shared/types';
import { useDraftStore } from '../store/useDraftStore';

export function useDraftRecovery(): {
  recoverableDrafts: RecoverableDraft[];
  activeRecoverableDraft: RecoverableDraft | null;
  isLoading: boolean;
  restoreDraft: (draft: RecoverableDraft) => Promise<void>;
  discardDraft: (draftId: string) => Promise<void>;
  dismissRecoveryBanner: () => void;
  saveSnapshot: (
    draftId: string,
    invoiceId: string | null,
    data: DraftInvoiceData
  ) => Promise<void>;
} {
  const [recoverableDrafts, setRecoverableDrafts] = useState<RecoverableDraft[]>([]);
  const [activeRecoverableDraft, setActiveRecoverableDraft] = useState<RecoverableDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadFromDraftData = useDraftStore(state => state.loadFromDraftData);

  const fetchRecoverable = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.api?.drafts?.listRecoverable) {
        const drafts = await window.api.drafts.listRecoverable();
        setRecoverableDrafts(drafts);
        if (drafts.length > 0) {
          setActiveRecoverableDraft(drafts[0]);
        }
      }
    } catch (err) {
      console.warn('[DraftRecovery] Failed to load recoverable drafts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecoverable();
  }, [fetchRecoverable]);

  const restoreDraft = async (draft: RecoverableDraft): Promise<void> => {
    // Populate the draft store with recovered data
    loadFromDraftData(
      {
        clientId: draft.data.clientId,
        issueDate: draft.data.issueDate,
        dueDate: draft.data.dueDate,
        currency: draft.data.currency,
        lineItems: draft.data.lineItems ?? [],
        notes: draft.data.notes,
        terms: draft.data.terms
      },
      draft.invoiceId
    );

    // Discard snapshot after user adopts it
    if (window.api?.drafts?.discardSnapshot) {
      await window.api.drafts.discardSnapshot(draft.draftId);
    }

    setRecoverableDrafts(prev => prev.filter(d => d.draftId !== draft.draftId));
    setActiveRecoverableDraft(null);
  };

  const discardDraft = async (draftId: string): Promise<void> => {
    try {
      if (window.api?.drafts?.discardSnapshot) {
        await window.api.drafts.discardSnapshot(draftId);
      }
      setRecoverableDrafts(prev => prev.filter(d => d.draftId !== draftId));
      setActiveRecoverableDraft(null);
    } catch (err) {
      console.error('[DraftRecovery] Failed to discard draft:', err);
    }
  };

  const dismissRecoveryBanner = (): void => {
    setActiveRecoverableDraft(null);
  };

  const saveSnapshot = async (
    draftId: string,
    invoiceId: string | null,
    data: DraftInvoiceData
  ): Promise<void> => {
    try {
      if (window.api?.drafts?.saveSnapshot) {
        await window.api.drafts.saveSnapshot({
          draftId,
          invoiceId,
          data,
          lastModified: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('[DraftRecovery] Background snapshot autosave failed:', err);
    }
  };

  return {
    recoverableDrafts,
    activeRecoverableDraft,
    isLoading,
    restoreDraft,
    discardDraft,
    dismissRecoveryBanner,
    saveSnapshot
  };
}
