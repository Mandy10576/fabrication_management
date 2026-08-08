import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Building2,
  Save,
  Lock,
  CreditCard,
  ImagePlus
} from 'lucide-react';

export const CompanySettings = () => {
  const toast = useToast();

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

  const fetchCompany = async () => {
    try {
      const res = await api.get('/company');
      setCompany(res);
      if (res.logoUrl) setLogoPreview(res.logoUrl);
    } catch (err) {
      console.error('Failed to load company details:', err);
      toast.error(err.message || 'Failed to load company details');
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      await api.put('/company', company);

      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const logoRes = await api.upload('/company/logo', formData);
        setLogoPreview(logoRes.logoUrl);
        setLogoFile(null);
      }

      toast.success('Company details updated successfully');
      fetchCompany();
    } catch (err) {
      toast.error(err.message || 'Failed to update company profile');
    } finally {
      setSavingCompany(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSavingPass(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Admin password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setSavingPass(false);
    }
  };

  const setField = (key) => (e) => setCompany((prev) => ({ ...prev, [key]: e.target.value }));
  const setUpperField = (key) => (e) =>
    setCompany((prev) => ({ ...prev, [key]: e.target.value.toUpperCase() }));

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <Building2 className="w-6 h-6 text-brand-500 shrink-0" />
          <span>Company Settings</span>
        </h2>
        <p className="page-subtitle">
          Configure GSTIN, PAN, bank details, logo, and default invoice terms
        </p>
      </div>

      {/* Company form */}
      <form onSubmit={handleCompanySubmit} className="space-y-4 sm:space-y-6">
        <div className="card card-pad space-y-4">
          <h3 className="section-label">Business Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="co-name" className="label">Company Name *</label>
              <input
                id="co-name"
                type="text"
                required
                value={company.companyName || ''}
                onChange={setField('companyName')}
                className="input font-bold"
              />
            </div>

            <div>
              <label htmlFor="co-owner" className="label">Owner Name *</label>
              <input
                id="co-owner"
                type="text"
                required
                value={company.ownerName || ''}
                onChange={setField('ownerName')}
                className="input font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="co-gstin" className="label">GSTIN (GST Number)</label>
              <input
                id="co-gstin"
                type="text"
                placeholder="27AAACA1234B1Z5"
                value={company.gstin || ''}
                onChange={setUpperField('gstin')}
                className="input font-mono font-bold"
              />
            </div>

            <div>
              <label htmlFor="co-pan" className="label">PAN Number</label>
              <input
                id="co-pan"
                type="text"
                placeholder="AAACA1234B"
                value={company.pan || ''}
                onChange={setUpperField('pan')}
                className="input font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="co-phone" className="label">Business Phone / Mobile</label>
              <input
                id="co-phone"
                type="tel"
                inputMode="tel"
                value={company.phone || ''}
                onChange={setField('phone')}
                className="input font-mono"
              />
            </div>

            <div>
              <label htmlFor="co-email" className="label">Official Email</label>
              <input
                id="co-email"
                type="email"
                inputMode="email"
                value={company.email || ''}
                onChange={setField('email')}
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="co-address" className="label">Registered Factory / Office Address</label>
            <textarea
              id="co-address"
              rows={3}
              value={company.address || ''}
              onChange={setField('address')}
              className="textarea"
            />
          </div>

          {/* Logo */}
          <div className="pt-1">
            <label htmlFor="co-logo" className="label">Company Logo (printed on A4 invoices)</label>
            <div className="flex flex-col xs:flex-row xs:items-center gap-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Company logo preview"
                  className="w-16 h-16 shrink-0 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1"
                />
              ) : (
                <div className="w-16 h-16 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                  <ImagePlus className="w-6 h-6" />
                </div>
              )}
              <input
                id="co-logo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                  }
                }}
                className="min-w-0 w-full text-sm text-slate-500 dark:text-slate-400 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5
                           file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold
                           file:bg-brand-50 file:text-brand-700 dark:file:bg-brand-950/60 dark:file:text-brand-300
                           hover:file:bg-brand-100 dark:hover:file:bg-brand-900/50 file:cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Bank details */}
        <div className="card card-pad space-y-4">
          <h3 className="section-label flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-500" />
            <span>Bank Account Details (printed on invoice)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="co-bank" className="label">Bank Name</label>
              <input
                id="co-bank"
                type="text"
                placeholder="HDFC Bank Ltd"
                value={company.bankName || ''}
                onChange={setField('bankName')}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="co-account" className="label">Account Number</label>
              <input
                id="co-account"
                type="text"
                inputMode="numeric"
                placeholder="50200012345678"
                value={company.accountNumber || ''}
                onChange={setField('accountNumber')}
                className="input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="co-ifsc" className="label">IFSC Code</label>
              <input
                id="co-ifsc"
                type="text"
                placeholder="HDFC0000123"
                value={company.ifscCode || ''}
                onChange={setUpperField('ifscCode')}
                className="input font-mono"
              />
            </div>

            <div>
              <label htmlFor="co-branch" className="label">Branch Name</label>
              <input
                id="co-branch"
                type="text"
                placeholder="Chakan Industrial Estate"
                value={company.branch || ''}
                onChange={setField('branch')}
                className="input"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="co-upi" className="label">UPI ID (QR / Payment)</label>
              <input
                id="co-upi"
                type="text"
                placeholder="business@hdfcbank"
                value={company.upiId || ''}
                onChange={setField('upiId')}
                className="input font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="co-terms" className="label">Default Terms & Conditions</label>
            <textarea
              id="co-terms"
              rows={3}
              value={company.termsConditions || ''}
              onChange={setField('termsConditions')}
              className="textarea"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={savingCompany} className="btn btn-primary w-full sm:w-auto">
            <Save className="w-4 h-4" />
            <span>{savingCompany ? 'Saving…' : 'Save Company Details'}</span>
          </button>
        </div>
      </form>

      {/* Password */}
      <div className="card card-pad space-y-4">
        <h3 className="section-label flex items-center gap-2">
          <Lock className="w-4 h-4 text-rose-500" />
          <span>Change Owner Password</span>
        </h3>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label htmlFor="co-curpass" className="label">Current Password</label>
            <input
              id="co-curpass"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="co-newpass" className="label">New Password</label>
            <input
              id="co-newpass"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
            />
          </div>

          <button type="submit" disabled={savingPass} className="btn btn-secondary w-full sm:w-auto">
            <Lock className="w-4 h-4" />
            <span>{savingPass ? 'Updating…' : 'Update Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
