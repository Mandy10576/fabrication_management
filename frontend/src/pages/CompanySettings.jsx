import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Building2,
  Upload,
  Save,
  Lock,
  CheckCircle,
  CreditCard,
  ShieldCheck
} from 'lucide-react';

export const CompanySettings = () => {
  const [company, setCompany] = useState({
    companyName: '',
    ownerName: '',
    gstin: '',
    pan: '',
    email: '',
    phone: '',
    address: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    upiId: '',
    termsConditions: ''
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const [msg, setMsg] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [error, setError] = useState('');

  const fetchCompany = async () => {
    try {
      const res = await api.get('/company');
      setCompany(res);
      if (res.logoUrl) setLogoPreview(res.logoUrl);
    } catch (err) {
      console.error('Failed to load company details:', err);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    setMsg('');
    setError('');
    try {
      await api.put('/company', company);

      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const logoRes = await api.upload('/company/logo', formData);
        setLogoPreview(logoRes.logoUrl);
      }

      setMsg('Company details updated successfully!');
      fetchCompany();
    } catch (err) {
      setError(err.message || 'Failed to update company profile');
    } finally {
      setSavingCompany(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSavingPass(true);
    setPassMsg('');
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPassMsg('Admin password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      alert(err.message || 'Failed to change password');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl 2xl:max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-brand-500" />
          <span>Company & Owner Settings</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure company GSTIN, PAN, bank details, logo, and default invoice terms
        </p>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
          {error}
        </div>
      )}

      {/* Company Form */}
      <form onSubmit={handleCompanySubmit} className="space-y-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">
            Business Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={company.companyName || ''}
                onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Owner Name *
              </label>
              <input
                type="text"
                required
                value={company.ownerName || ''}
                onChange={(e) => setCompany({ ...company, ownerName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                GSTIN (GST Number)
              </label>
              <input
                type="text"
                placeholder="27AAACA1234B1Z5"
                value={company.gstin || ''}
                onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                placeholder="AAACA1234B"
                value={company.pan || ''}
                onChange={(e) => setCompany({ ...company, pan: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Business Phone / Mobile
              </label>
              <input
                type="text"
                value={company.phone || ''}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={company.email || ''}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
              Registered Factory / Office Address
            </label>
            <textarea
              rows={3}
              value={company.address || ''}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* Logo Upload */}
          <div className="pt-2">
            <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-2">
              Company Logo (For A4 GST Invoices)
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img src={logoPreview} alt="Company Logo" className="w-16 h-16 object-contain rounded-xl border border-slate-200 dark:border-slate-700 p-1" />
              ) : (
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-bold">
                  LOGO
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    setLogoFile(e.target.files[0]);
                    setLogoPreview(URL.createObjectURL(e.target.files[0]));
                  }
                }}
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
              />
            </div>
          </div>
        </div>

        {/* Bank Details Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-500" />
            <span>Bank Account Details (Printed on Invoice)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                placeholder="HDFC Bank Ltd"
                value={company.bankName || ''}
                onChange={(e) => setCompany({ ...company, bankName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Account Number
              </label>
              <input
                type="text"
                placeholder="50200012345678"
                value={company.accountNumber || ''}
                onChange={(e) => setCompany({ ...company, accountNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="HDFC0000123"
                value={company.ifscCode || ''}
                onChange={(e) => setCompany({ ...company, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Branch Name
              </label>
              <input
                type="text"
                placeholder="Chakan Industrial Estate"
                value={company.branch || ''}
                onChange={(e) => setCompany({ ...company, branch: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                UPI ID (QR / Payment)
              </label>
              <input
                type="text"
                placeholder="apexsteel@hdfcbank"
                value={company.upiId || ''}
                onChange={(e) => setCompany({ ...company, upiId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
              Default Terms & Conditions
            </label>
            <textarea
              rows={3}
              value={company.termsConditions || ''}
              onChange={(e) => setCompany({ ...company, termsConditions: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingCompany}
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-xl shadow-brand-600/30 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{savingCompany ? 'Saving Profile...' : 'Save Company Details'}</span>
          </button>
        </div>
      </form>

      {/* Change Password Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
        <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-rose-500" />
          <span>Change Owner Password</span>
        </h3>

        {passMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 font-semibold">
            {passMsg}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={savingPass}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs shadow-md"
          >
            {savingPass ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
