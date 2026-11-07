// path: src/renderer/src/components/clients/ClientModal.tsx
import React, { useEffect, useState } from 'react';
import { X, Building2, Mail, Phone, FileCheck, MapPin, AlignLeft, Save } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { CreateClientSchema } from '@shared/schemas/client';

interface ClientModalProps {
  onSuccess?: () => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({ onSuccess }) => {
  const isClientModalOpen = useUiStore(state => state.isClientModalOpen);
  const editingClientId = useUiStore(state => state.editingClientId);
  const closeClientModal = useUiStore(state => state.closeClientModal);
  const showToast = useUiStore(state => state.showToast);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taxPin, setTaxPin] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isClientModalOpen) return;

    if (editingClientId) {
      setIsLoading(true);
      window.api.clients
        .get(editingClientId)
        .then(client => {
          setName(client.name);
          setEmail(client.email || '');
          setPhone(client.phone || '');
          setTaxPin(client.taxPin || '');
          setAddress(client.address || '');
          setNotes(client.notes || '');
        })
        .catch(err => {
          showToast(`Failed to load client: ${err.message}`, 'error');
          closeClientModal();
        })
        .finally(() => setIsLoading(false));
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setTaxPin('');
      setAddress('');
      setNotes('');
      setErrors({});
    }
  }, [isClientModalOpen, editingClientId, showToast, closeClientModal]);

  if (!isClientModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrors({});

    const formData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      taxPin: taxPin.trim().toUpperCase(),
      address: address.trim(),
      notes: notes.trim()
    };

    const result = CreateClientSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsLoading(true);
      if (editingClientId) {
        await window.api.clients.update({
          id: editingClientId,
          ...result.data
        });
        showToast('Client updated successfully', 'success');
      } else {
        await window.api.clients.create(result.data);
        showToast('Client created successfully', 'success');
      }
      closeClientModal();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save client';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-modal-title"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 id="client-modal-title" className="text-base font-semibold text-slate-900 dark:text-white">
                {editingClientId ? 'Edit Client' : 'New Client'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage contact details &amp; Kenyan tax identifier (KRA PIN)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeClientModal}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Client Name */}
          <div>
            <label htmlFor="client-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Client / Business Name <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1">
              <input
                id="client-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Nairobi Tech Ventures Ltd"
                disabled={isLoading}
                className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 ${
                  errors.name
                    ? 'border-rose-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Email */}
            <div>
              <label htmlFor="client-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  Email Address
                </span>
              </label>
              <div className="mt-1">
                <input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="billing@example.co.ke"
                  disabled={isLoading}
                  className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 ${
                    errors.email
                      ? 'border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white'
                  }`}
                />
                {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="client-phone" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  Phone Number (KE)
                </span>
              </label>
              <div className="mt-1">
                <input
                  id="client-phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+254712345678 or 0712..."
                  disabled={isLoading}
                  className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 ${
                    errors.phone
                      ? 'border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white'
                  }`}
                />
                {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* KRA PIN */}
            <div>
              <label htmlFor="client-kra-pin" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
                  KRA Tax PIN
                </span>
              </label>
              <div className="mt-1">
                <input
                  id="client-kra-pin"
                  type="text"
                  value={taxPin}
                  onChange={e => setTaxPin(e.target.value.toUpperCase())}
                  placeholder="P051234567A"
                  maxLength={11}
                  disabled={isLoading}
                  className={`w-full font-mono uppercase rounded-xl border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 ${
                    errors.taxPin
                      ? 'border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white'
                  }`}
                />
                {errors.taxPin && <p className="mt-1 text-xs text-rose-500">{errors.taxPin}</p>}
              </div>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="client-address" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  Physical / Billing Address
                </span>
              </label>
              <div className="mt-1">
                <input
                  id="client-address"
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. Delta Corner, Westlands, Nairobi"
                  disabled={isLoading}
                  className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 ${
                    errors.address
                      ? 'border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white'
                  }`}
                />
                {errors.address && <p className="mt-1 text-xs text-rose-500">{errors.address}</p>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="client-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <AlignLeft className="h-3.5 w-3.5 text-slate-400" />
                Internal Notes / Contact Persons
              </span>
            </label>
            <div className="mt-1">
              <textarea
                id="client-notes"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Key stakeholders, payment terms, or VAT notes..."
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={closeClientModal}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Saving...' : editingClientId ? 'Update Client' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
