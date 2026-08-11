import React from 'react';
import { Modal } from './ui/Modal';
import { AlertTriangle, Phone, MapPin, Building2, FileText, UserCheck, Plus, Info } from 'lucide-react';

const MatchCard = ({ client, tone, onUse, disabled, useLabel }) => {
  const ring =
    tone === 'exact'
      ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/20'
      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50';

  const invoiceCount = client._count?.invoices ?? 0;
  const quotationCount = client._count?.quotations ?? 0;

  return (
    <div className={`rounded-xl border p-3 ${ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-sm text-slate-900 dark:text-white truncate flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{client.companyName}</span>
          </div>

          {client.contactPerson && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {client.contactPerson}
            </div>
          )}

          <div className="mt-1.5 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            {client.mobile && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 shrink-0" />
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{client.mobile}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{client.address}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 shrink-0" />
              <span>
                {invoiceCount} invoice{invoiceCount === 1 ? '' : 's'} · {quotationCount} quotation
                {quotationCount === 1 ? '' : 's'}
                {client.financialYear?.year ? ` · FY ${client.financialYear.year}` : ''}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onUse(client)}
          disabled={disabled}
          className="btn btn-primary btn-sm shrink-0"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>{useLabel}</span>
        </button>
      </div>
    </div>
  );
};

/**
 * Shown before a possibly-duplicate client is created.
 *
 * Two distinct cases, because only one of them is actually a duplicate:
 *
 *   exact  - same name, mobile AND address. This is the same client, so
 *            using the existing record is the default action.
 *   mobile - same number at a different address. Legitimately common (one
 *            owner, several firms), so creating a new client is the default
 *            and the existing record is offered only as an alternative.
 *
 * Choosing an existing client only selects it — it never writes the typed
 * values back over that record.
 */
export const ClientDuplicateDialog = ({
  open,
  exactMatches = [],
  mobileMatches = [],
  onUseExisting,
  onCreateAnyway,
  onCancel,
  busy = false,
  useExistingLabel = 'Use This Client',
}) => {
  const isExact = exactMatches.length > 0;
  const matches = isExact ? exactMatches : mobileMatches;

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onCancel}
      size="lg"
      title={isExact ? 'This client already exists' : 'This mobile number is already in use'}
      subtitle={
        isExact
          ? 'Same name, mobile number and address as an existing client.'
          : 'The address is different, so this can still be a separate client.'
      }
      icon={isExact ? AlertTriangle : Info}
      iconClass={isExact ? 'text-amber-500' : 'text-brand-500'}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-secondary sm:min-w-[7rem]">
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreateAnyway}
            disabled={busy}
            className={`btn ${isExact ? 'btn-secondary' : 'btn-primary'} sm:min-w-[11rem]`}
          >
            <Plus className="w-4 h-4" />
            <span>{busy ? 'Saving…' : 'Create New Anyway'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {isExact
            ? 'Use the existing record instead of creating a duplicate. Its saved details will not be changed.'
            : matches.length === 1
              ? 'Another client already uses this number at a different address. Create a new client, or pick the existing one.'
              : 'Other clients already use this number at different addresses. Create a new client, or pick an existing one.'}
        </p>

        <div className="space-y-2">
          {matches.map((c) => (
            <MatchCard
              key={c.id}
              client={c}
              tone={isExact ? 'exact' : 'mobile'}
              onUse={onUseExisting}
              disabled={busy}
              useLabel={useExistingLabel}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default ClientDuplicateDialog;
