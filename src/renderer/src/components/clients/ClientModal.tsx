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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-modal-title"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 id="client-modal-title" className="text-base font-semibold text-white">
                {editingClientId ? 'Edit Client' : 'New Client'}
              </h2>
              <p className="text-xs text-slate-400">
                Manage contact details &amp; Kenyan tax identifier (KRA PIN)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeClientModal}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Client Name */}
          <div>
            <label htmlFor="client-name" className="block text-xs font-medium text-slate-300">
              Client / Business Name <span className="text-rose-400">*</span>
            </label>
            <div className="mt-1">
              <input
                id="client-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Nairobi Tech Ventures Ltd"
                disabled={isLoading}
                className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                  errors.name ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Email */}
            <div>
              <label htmlFor="client-email" className="block text-xs font-medium text-slate-300">
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
                  className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    errors.email ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
                {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email}</p>}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="client-phone" className="block text-xs font-medium text-slate-300">
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
                  className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    errors.phone ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
                {errors.phone && <p className="mt-1 text-xs text-rose-400">{errors.phone}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* KRA PIN */}
            <div>
              <label htmlFor="client-kra-pin" className="block text-xs font-medium text-slate-300">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
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
                  className={`w-full font-mono uppercase rounded-lg border bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    errors.taxPin ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
                {errors.taxPin && <p className="mt-1 text-xs text-rose-400">{errors.taxPin}</p>}
              </div>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="client-address" className="block text-xs font-medium text-slate-300">
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
                  placeholder="e.g. Delta Corner, Nairobi"
                  disabled={isLoading}
                  className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    errors.address ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
                {errors.address && <p className="mt-1 text-xs text-rose-400">{errors.address}</p>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="client-notes" className="block text-xs font-medium text-slate-300">
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
                placeholder="Key stakeholders, payment terms, or VAT exemption notes..."
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={closeClientModal}
              disabled={isLoading}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 disabled:opacity-50"
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

