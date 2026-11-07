// path: src/renderer/src/components/clients/ClientList.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  FileCheck,
  MapPin,
  FilePlus,
  Edit2,
  Trash2,
  Users
} from 'lucide-react';
import { Client } from '@shared/types';
import { useUiStore } from '../../store/useUiStore';
import { useDraftStore } from '../../store/useDraftStore';

export const ClientList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const openCreateClientModal = useUiStore(state => state.openCreateClientModal);
  const openEditClientModal = useUiStore(state => state.openEditClientModal);
  const setCurrentView = useUiStore(state => state.setCurrentView);
  const showToast = useUiStore(state => state.showToast);

  const resetDraft = useDraftStore(state => state.resetDraft);
  const setDraftField = useDraftStore(state => state.setField);

  const loadClients = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await window.api.clients.list({
        search: search.trim() || undefined,
        limit: 100
      });
      setClients(response.items);
      setTotal(response.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load clients';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const handleCreateInvoiceForClient = (clientId: string): void => {
    resetDraft();
    setDraftField('clientId', clientId);
    setCurrentView('editor');
  };

  const handleDeleteClient = async (client: Client): Promise<void> => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${client.name}"?\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await window.api.clients.delete(client.id);
      showToast(`Client "${client.name}" deleted`, 'success');
      void loadClients();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Cannot delete client with linked invoices';
      showToast(message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients by name, email, phone, or PIN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 shadow-sm"
          />
        </div>

        <button
          type="button"
          onClick={openCreateClientModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Clients Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex flex-col items-center gap-2 text-slate-400 text-sm">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            Loading clients...
          </div>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/20">
          <Users className="h-10 w-10 text-slate-400 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-200">
            No clients found
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {search
              ? `No clients match the query "${search}". Try checking the spelling or search by KRA PIN.`
              : 'Add your first Kenyan client to start generating gap-free sequential invoices.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={openCreateClientModal}
              className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {clients.map(client => (
            <div
              key={client.id}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-emerald-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold dark:bg-emerald-500/10 dark:text-emerald-400 shadow-sm">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {client.name}
                      </h4>
                      {client.taxPin && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 border border-slate-200 dark:border-emerald-500/20">
                            <FileCheck className="h-3 w-3" />
                            PIN: {client.taxPin}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditClientModal(client.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      title="Edit Client"
                      aria-label={`Edit ${client.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClient(client)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                      title="Delete Client"
                      aria-label={`Delete ${client.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                  {client.notes && (
                    <p className="mt-2 line-clamp-2 text-slate-500 dark:text-slate-400 italic">
                      “{client.notes}”
                    </p>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <span className="text-[11px] text-slate-400">
                  Added {new Date(client.createdAt).toLocaleDateString('en-KE')}
                </span>

                <button
                  type="button"
                  onClick={() => handleCreateInvoiceForClient(client.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  <FilePlus className="h-3.5 w-3.5" />
                  New Invoice
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Counter */}
      {!isLoading && clients.length > 0 && (
        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
          Showing {clients.length} of {total} client{total === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
};
