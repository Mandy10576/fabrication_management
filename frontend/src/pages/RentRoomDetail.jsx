import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/SearchableSelect';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import {
  DoorOpen, ArrowLeft, User, Phone, MapPin, CreditCard, FileText, Upload, Camera,
  Trash2, Plus, LogOut, Wallet, History, Zap, AlertCircle, UserPlus, Search, Edit2, Receipt,
  CalendarDays, Gauge, ShieldCheck, X
} from 'lucide-react';

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const PAYMENT_MODE_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI / GPay / PhonePe' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/IMPS)' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

const DOC_TYPE_OPTIONS = [
  { value: 'AADHAAR', label: 'Aadhaar Card' },
  { value: 'PAN', label: 'PAN Card' },
  { value: 'OTHER', label: 'Other Document' },
];

const cycleLabel = (c) => `${formatDate(c.cycleStart)} – ${formatDate(c.cycleEnd)}`;

const EMPTY_TENANT_FORM = { name: '', mobile: '', address: '', aadhaarNumber: '', panNumber: '' };
const EMPTY_COMBINED_FORM = { rentAmount: '', rentCycleStart: '', electricityAmount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMode: 'CASH', referenceNo: '', notes: '' };
const EMPTY_EDIT_PAYMENT_FORM = { type: 'rent', billId: null, paymentId: null, amount: '', paymentDate: '', paymentMode: 'CASH', referenceNo: '', notes: '' };
const EMPTY_ELECTRICITY_FORM = { billDate: new Date().toISOString().split('T')[0], previousReading: '', currentReading: '', notes: '' };
const today = () => new Date().toISOString().split('T')[0];
const emptyBillPaymentForm = (pending) => ({
  amount: pending > 0.01 ? pending : '',
  paymentDate: today(),
  paymentMode: 'CASH',
  referenceNo: '',
  notes: ''
});

export const RentRoomDetail = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const duesCardRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Start tenancy
  const [showStartModal, setShowStartModal] = useState(false);
  const [useExisting, setUseExisting] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [tenantQuery, setTenantQuery] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantForm, setTenantForm] = useState(EMPTY_TENANT_FORM);
  const [tenancyStartDate, setTenancyStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [tenancyRent, setTenancyRent] = useState('');
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const aadhaarGalleryRef = useRef(null);
  const aadhaarCameraRef = useRef(null);
  const panGalleryRef = useRef(null);
  const panCameraRef = useRef(null);

  // Edit tenant
  const [showEditTenantModal, setShowEditTenantModal] = useState(false);
  const [editTenantForm, setEditTenantForm] = useState(EMPTY_TENANT_FORM);

  // End tenancy
  const [showEndModal, setShowEndModal] = useState(false);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Combined Record Payment
  const [showCombinedModal, setShowCombinedModal] = useState(false);
  const [combinedForm, setCombinedForm] = useState(EMPTY_COMBINED_FORM);

  // Correct/edit a single payment (rent or electricity)
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editPaymentForm, setEditPaymentForm] = useState(EMPTY_EDIT_PAYMENT_FORM);

  // Documents
  const [docType, setDocType] = useState('AADHAAR');
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  // Electricity
  const [showElectricityModal, setShowElectricityModal] = useState(false);
  const [electricityForm, setElectricityForm] = useState(EMPTY_ELECTRICITY_FORM);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [editBillForm, setEditBillForm] = useState({
    billDate: '',
    previousReading: '',
    currentReading: '',
    ratePerUnit: '',
    notes: '',
    status: 'PENDING',
    paymentMode: 'CASH',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  // Per-bill Record Payment — full ledger (add/edit/delete individual
  // payments) for one specific electricity bill, same pattern as the
  // cross-building Electricity page.
  const [showBillPaymentModal, setShowBillPaymentModal] = useState(false);
  const [payingBill, setPayingBill] = useState(null);
  const [billPaymentForm, setBillPaymentForm] = useState(emptyBillPaymentForm(0));
  const [editingBillPaymentId, setEditingBillPaymentId] = useState(null);
  const [billPaySaving, setBillPaySaving] = useState(false);
  const [billPayError, setBillPayError] = useState('');

  const fetchRoom = async () => {
    try {
      setLoading(true);
      setFailed(false);
      const res = await api.get(`/rent/rooms/${id}`);
      setRoom(res);
      return res;
    } catch (err) {
      setFailed(true);
      toast.error(err.message || 'Failed to load room');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (showStartModal && useExisting) {
      api.get(`/rent/tenants?search=${encodeURIComponent(tenantQuery)}`).then(setTenants).catch(() => {});
    }
  }, [showStartModal, useExisting, tenantQuery]);

  // -------------------------------------------------------------------------
  // Start / End tenancy
  // -------------------------------------------------------------------------

  const handleOpenStart = () => {
    setUseExisting(false);
    setSelectedTenantId('');
    setTenantForm(EMPTY_TENANT_FORM);
    setTenancyStartDate(new Date().toISOString().split('T')[0]);
    setTenancyRent(room?.monthlyRent ?? '');
    setAadhaarFile(null);
    setPanFile(null);
    setError('');
    setShowStartModal(true);
  };

  const handleStartTenancy = async (e) => {
    e.preventDefault();
    setError('');
    if (useExisting && !selectedTenantId) {
      setError('Please select an existing tenant, or switch to "New Tenant".');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        startDate: tenancyStartDate,
        monthlyRent: tenancyRent,
        ...(useExisting ? { tenantId: selectedTenantId } : tenantForm)
      };
      const created = await api.post(`/rent/rooms/${id}/tenancies`, payload);

      if (!useExisting && created?.tenant?.id) {
        if (aadhaarFile) await uploadDocumentsFor(created.tenant.id, [aadhaarFile], 'AADHAAR');
        if (panFile) await uploadDocumentsFor(created.tenant.id, [panFile], 'PAN');
      }

      toast.success('Tenancy started');
      setShowStartModal(false);
      fetchRoom();
    } catch (err) {
      setError(err.message || 'Failed to start tenancy');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditTenant = () => {
    const t = room.currentTenancy.tenant;
    setEditTenantForm({
      name: t.name || '',
      mobile: t.mobile || '',
      address: t.address || '',
      aadhaarNumber: t.aadhaarNumber || '',
      panNumber: t.panNumber || ''
    });
    setError('');
    setShowEditTenantModal(true);
  };

  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      await api.put(`/rent/tenants/${room.currentTenancy.tenant.id}`, editTenantForm);
      toast.success('Tenant details updated');
      setShowEditTenantModal(false);
      fetchRoom();
    } catch (err) {
      setError(err.message || 'Failed to update tenant details');
    } finally {
      setSaving(false);
    }
  };

  const handleEndTenancy = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch(`/rent/tenancies/${room.currentTenancy.id}/end`, { endDate });
      toast.success('Tenancy ended — room is now vacant');
      setShowEndModal(false);
      fetchRoom();
    } catch (err) {
      toast.error(err.message || 'Failed to end tenancy');
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Combined Rent + Electricity payment — the single "Record Payment" action.
  // Each side still lands as a normal rent/electricity payment row; only a
  // shared batchId ties them together as "one payment" for display.
  // -------------------------------------------------------------------------

  const pendingCycles = room?.currentTenancy?.summary?.cycles?.filter((c) => c.pending > 0) || [];
  // Cycles are newest-first, so the oldest unpaid one — the arrears to clear
  // first — is the last entry.
  const oldestPendingCycle = pendingCycles[pendingCycles.length - 1] || null;
  const electricityDue = room?.currentDues?.electricityDue || 0;
  const combinedTotal = round2((parseFloat(combinedForm.rentAmount) || 0) + (parseFloat(combinedForm.electricityAmount) || 0));

  const handleOpenCombined = () => {
    setCombinedForm({
      rentAmount: oldestPendingCycle ? oldestPendingCycle.pending : '',
      rentCycleStart: oldestPendingCycle ? new Date(oldestPendingCycle.cycleStart).toISOString() : '',
      electricityAmount: electricityDue > 0 ? electricityDue : '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
      referenceNo: '',
      notes: ''
    });
    setError('');
    setShowCombinedModal(true);
  };

  const handleSubmitCombined = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      await api.post(`/rent/tenancies/${room.currentTenancy.id}/combined-payments`, combinedForm);
      toast.success('Payment recorded');
      setShowCombinedModal(false);
      fetchRoom();
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  // Deep-link support for the Rent Dashboard's row actions — ?action=pay
  // opens the combined payment modal immediately; ?action=edit scrolls to
  // the dues/payment section so the admin can pick a specific entry to
  // correct below. Runs once the room (and so currentTenancy) has loaded.
  useEffect(() => {
    if (!room || !room.currentTenancy) return;
    const action = searchParams.get('action');
    if (!action) return;
    if (action === 'pay') {
      handleOpenCombined();
    } else if (action === 'edit') {
      duesCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('action');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // -------------------------------------------------------------------------
  // Payment correction — edit or delete an already-recorded rent or
  // electricity payment; totals/balances are always derived fresh from the
  // ledger, so a correction here recalculates everything automatically.
  // -------------------------------------------------------------------------

  const handleOpenEditPayment = (type, payment, billId) => {
    setEditPaymentForm({
      type,
      billId: billId || null,
      paymentId: payment.id,
      amount: payment.amount,
      paymentDate: payment.paymentDate.split('T')[0],
      paymentMode: payment.paymentMode,
      referenceNo: payment.referenceNo || '',
      notes: payment.notes || ''
    });
    setError('');
    setShowEditPaymentModal(true);
  };

  const handleSaveEditPayment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      const { type, billId, paymentId, ...body } = editPaymentForm;
      if (type === 'rent') {
        await api.put(`/rent/tenancies/${room.currentTenancy.id}/payments/${paymentId}`, body);
      } else {
        await api.put(`/rent/electricity/${billId}/payments/${paymentId}`, body);
      }
      toast.success('Payment updated');
      setShowEditPaymentModal(false);
      fetchRoom();
    } catch (err) {
      setError(err.message || 'Failed to update payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (type, paymentId, billId) => {
    const ok = await confirm({ title: 'Delete this payment?', message: 'This removes the payment record and recalculates the balance due.', confirmText: 'Delete payment' });
    if (!ok) return;
    try {
      if (type === 'rent') {
        await api.delete(`/rent/tenancies/${room.currentTenancy.id}/payments/${paymentId}`);
      } else {
        await api.delete(`/rent/electricity/${billId}/payments/${paymentId}`);
      }
      toast.success('Payment deleted');
      fetchRoom();
    } catch (err) {
      toast.error(err.message || 'Failed to delete payment');
    }
  };

  // -------------------------------------------------------------------------
  // Documents
  // -------------------------------------------------------------------------

  const uploadDocumentsFor = async (tenantId, files, type) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('documents', f));
    formData.append('docType', type);
    await api.upload(`/rent/tenants/${tenantId}/documents`, formData);
  };

  const handleUploadDocuments = async (files) => {
    if (!files || files.length === 0) return;
    try {
      setUploadingDocs(true);
      await uploadDocumentsFor(room.currentTenancy.tenant.id, files, docType);
      toast.success('Document uploaded');
      fetchRoom();
    } catch (err) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploadingDocs(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (documentId) => {
    const ok = await confirm({ title: 'Delete this document?', message: 'This permanently removes the uploaded file.', confirmText: 'Delete document' });
    if (!ok) return;
    try {
      await api.delete(`/rent/tenants/${room.currentTenancy.tenant.id}/documents/${documentId}`);
      toast.success('Document deleted');
      fetchRoom();
    } catch (err) {
      toast.error(err.message || 'Failed to delete document');
    }
  };

  // -------------------------------------------------------------------------
  // Electricity
  // -------------------------------------------------------------------------

  const lastElectricityBill = room?.electricityBills?.[0] || null;
  const electricityRate = room?.building?.electricityRate || 0;
  const electricityPrevious = lastElectricityBill ? lastElectricityBill.currentReading : parseFloat(electricityForm.previousReading) || 0;
  const electricityUnits = electricityForm.currentReading !== ''
    ? Math.max(0, (parseFloat(electricityForm.currentReading) || 0) - electricityPrevious)
    : 0;
  const electricityAmount = Math.round(electricityUnits * electricityRate * 100) / 100;

  const handleOpenElectricity = () => {
    setElectricityForm(EMPTY_ELECTRICITY_FORM);
    setError('');
    setShowElectricityModal(true);
  };

  const handleAddElectricityBill = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      await api.post(`/rent/rooms/${id}/electricity`, electricityForm);
      toast.success('Electricity bill added');
      setShowElectricityModal(false);
      setElectricityForm(EMPTY_ELECTRICITY_FORM);
      fetchRoom();
    } catch (err) {
      setError(err.message || 'Failed to add electricity bill');
    } finally {
      setSaving(false);
    }
  };

  // The very first bill for a room is the only one whose "previous reading"
  // is a typed value rather than derived from an earlier bill's current
  // reading — every other bill's previous reading is locked to that chain.
  const isAnchorBill = (bill) => {
    if (!bill || !room?.electricityBills?.length) return true;
    return room.electricityBills[room.electricityBills.length - 1].id === bill.id;
  };

  const handleOpenEditBill = (bill) => {
    setEditingBill(bill);
    setEditBillForm({
      billDate: bill.billDate ? bill.billDate.split('T')[0] : '',
      previousReading: bill.previousReading ?? '',
      currentReading: bill.currentReading ?? '',
      ratePerUnit: bill.ratePerUnit ?? '',
      notes: bill.notes || '',
      status: bill.status === 'PAID' ? 'PAID' : 'PENDING',
      paymentMode: bill.paymentMode || 'CASH',
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setError('');
    setShowEditBillModal(true);
  };

  const editBillAnchor = isAnchorBill(editingBill);
  const editBillPrevious = editBillAnchor
    ? (editBillForm.previousReading !== '' ? parseFloat(editBillForm.previousReading) || 0 : 0)
    : (editingBill ? editingBill.previousReading : 0);
  const editBillRate = editBillForm.ratePerUnit !== '' ? (parseFloat(editBillForm.ratePerUnit) || 0) : 0;
  const editBillUnits = editingBill && editBillForm.currentReading !== ''
    ? Math.max(0, (parseFloat(editBillForm.currentReading) || 0) - editBillPrevious)
    : 0;
  const editBillAmount = round2(editBillUnits * editBillRate);

  const handleSaveEditBill = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      const payload = {
        billDate: editBillForm.billDate,
        previousReading: editBillForm.previousReading,
        currentReading: editBillForm.currentReading,
        ratePerUnit: editBillForm.ratePerUnit,
        notes: editBillForm.notes
      };
      const originalStatus = editingBill.status === 'PAID' ? 'PAID' : 'PENDING';
      if (editBillForm.status !== originalStatus) {
        payload.status = editBillForm.status;
        payload.paymentMode = editBillForm.paymentMode;
        payload.paymentDate = editBillForm.paymentDate;
      }
      await api.patch(`/rent/electricity/${editingBill.id}`, payload);
      toast.success('Electricity bill updated');
      setShowEditBillModal(false);
      fetchRoom();
    } catch (err) {
      setError(err.message || 'Failed to update bill');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteElectricityBill = async (billId) => {
    const ok = await confirm({ title: 'Delete this bill?', message: 'This permanently removes the electricity bill record.', confirmText: 'Delete bill' });
    if (!ok) return;
    try {
      await api.delete(`/rent/electricity/${billId}`);
      toast.success('Electricity bill deleted');
      fetchRoom();
    } catch (err) {
      toast.error(err.message || 'Failed to delete bill');
    }
  };

  const handleOpenBillPayment = (bill) => {
    setPayingBill(bill);
    setEditingBillPaymentId(null);
    setBillPaymentForm(emptyBillPaymentForm(round2(bill.amount - bill.amountPaid)));
    setBillPayError('');
    setShowBillPaymentModal(true);
  };

  const handleEditBillPaymentRow = (p) => {
    setEditingBillPaymentId(p.id);
    setBillPaymentForm({
      amount: p.amount,
      paymentDate: p.paymentDate ? p.paymentDate.split('T')[0] : today(),
      paymentMode: p.paymentMode,
      referenceNo: p.referenceNo || '',
      notes: p.notes || ''
    });
    setBillPayError('');
  };

  const handleCancelEditBillPaymentRow = () => {
    setEditingBillPaymentId(null);
    setBillPaymentForm(emptyBillPaymentForm(round2(payingBill.amount - payingBill.amountPaid)));
    setBillPayError('');
  };

  const refreshPayingBill = async (billId) => {
    const fresh = await fetchRoom();
    const updatedBill = fresh?.electricityBills?.find((b) => b.id === billId) || null;
    setPayingBill(updatedBill);
    return updatedBill;
  };

  const handleSubmitBillPayment = async (e) => {
    e.preventDefault();
    setBillPayError('');
    try {
      setBillPaySaving(true);
      if (editingBillPaymentId) {
        await api.put(`/rent/electricity/${payingBill.id}/payments/${editingBillPaymentId}`, billPaymentForm);
        toast.success('Payment updated');
      } else {
        await api.post(`/rent/electricity/${payingBill.id}/payments`, billPaymentForm);
        toast.success('Payment recorded');
      }
      const updated = await refreshPayingBill(payingBill.id);
      setEditingBillPaymentId(null);
      setBillPaymentForm(emptyBillPaymentForm(updated ? round2(updated.amount - updated.amountPaid) : 0));
    } catch (err) {
      setBillPayError(err.message || 'Failed to save payment');
    } finally {
      setBillPaySaving(false);
    }
  };

  const handleDeleteBillPaymentRow = async (p) => {
    const ok = await confirm({ title: 'Delete this payment?', message: 'This removes the payment record and recalculates the bill balance.', confirmText: 'Delete payment' });
    if (!ok) return;
    try {
      await api.delete(`/rent/electricity/${payingBill.id}/payments/${p.id}`);
      toast.success('Payment deleted');
      const updated = await refreshPayingBill(payingBill.id);
      if (editingBillPaymentId === p.id) {
        setEditingBillPaymentId(null);
        setBillPaymentForm(emptyBillPaymentForm(updated ? round2(updated.amount - updated.amountPaid) : 0));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete payment');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading room">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (failed || !room) {
    return (
      <div className="card p-10 sm:p-16 text-center">
        <DoorOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
        <div className="font-semibold text-slate-700 dark:text-slate-300">Room not found</div>
        <button onClick={fetchRoom} className="btn btn-primary mt-5">Try Again</button>
      </div>
    );
  }

  const { building, currentTenancy, tenancyHistory, electricityBills } = room;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link to={`/rent/buildings/${building.id}`} className="btn btn-sm btn-ghost self-start -ml-2">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to {building.name}</span>
      </Link>

      {/* Room header */}
      <div className="card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/25">
            <DoorOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="page-title">Room {room.roomNumber}</h2>
              <span className={`badge ${getStatusBadgeClass(room.status)}`}>{room.status}</span>
            </div>
            <p className="page-subtitle flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {building.name} · {building.area.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase text-slate-400">Monthly Rent</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(room.monthlyRent)}</div>
          </div>
        </div>
      </div>

      {/* Current tenant / vacant CTA */}
      {!currentTenancy ? (
        <div className="card p-10 sm:p-16 text-center">
          <User className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">This room is vacant</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Start a new tenancy to assign a tenant and begin tracking rent.
          </p>
          <button onClick={handleOpenStart} className="btn btn-primary mt-5">
            <UserPlus className="w-4 h-4" />
            <span>Start Tenancy</span>
          </button>
        </div>
      ) : (
        <>
          {/* Tenant profile */}
          <div className="card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-extrabold flex items-center justify-center">
                  {currentTenancy.tenant.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white">{currentTenancy.tenant.name}</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <a href={`tel:${currentTenancy.tenant.mobile}`} className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400">
                      <Phone className="w-3.5 h-3.5 text-brand-500" />
                      <span className="font-mono font-semibold">{currentTenancy.tenant.mobile}</span>
                    </a>
                    {currentTenancy.tenant.address && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {currentTenancy.tenant.address}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {currentTenancy.tenant.aadhaarNumber && (
                      <span className="badge badge-neutral font-mono normal-case">Aadhaar: {currentTenancy.tenant.aadhaarNumber}</span>
                    )}
                    {currentTenancy.tenant.panNumber && (
                      <span className="badge badge-neutral font-mono normal-case">PAN: {currentTenancy.tenant.panNumber}</span>
                    )}
                    <span className="badge badge-neutral">Since {formatDate(currentTenancy.startDate)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button onClick={handleOpenEditTenant} className="btn btn-secondary flex-1 sm:flex-none">
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button onClick={() => setShowEndModal(true)} className="btn btn-danger-soft flex-1 sm:flex-none">
                  <LogOut className="w-4 h-4" />
                  <span>End Tenancy</span>
                </button>
              </div>
            </div>

            {/* Documents */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="section-label mb-2.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Documents
              </h3>

              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="sm:w-56">
                  <SearchableSelect mode="button" value={docType} options={DOC_TYPE_OPTIONS} onSelect={(opt) => setDocType(opt.value)} />
                </div>
                <button
                  type="button"
                  disabled={uploadingDocs}
                  onClick={() => galleryInputRef.current?.click()}
                  className="btn btn-secondary"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload from Gallery</span>
                </button>
                <button
                  type="button"
                  disabled={uploadingDocs}
                  onClick={() => cameraInputRef.current?.click()}
                  className="btn btn-secondary"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Photo</span>
                </button>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUploadDocuments(e.target.files)}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleUploadDocuments(e.target.files)}
                />
              </div>

              {currentTenancy.tenant.documents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No documents uploaded yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentTenancy.tenant.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                        <FileText className="w-3.5 h-3.5" />
                        {doc.docType === 'AADHAAR' ? 'Aadhaar' : doc.docType === 'PAN' ? 'PAN' : 'Document'}
                      </a>
                      <button onClick={() => handleDeleteDocument(doc.id)} className="btn-icon w-6 h-6 text-slate-400 hover:text-rose-500" aria-label="Delete document">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current dues — rent + electricity together, one Record Payment action */}
          <div ref={duesCardRef} className="card p-4 sm:p-6 scroll-mt-20">
            <h3 className="section-label mb-3 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Current Dues
            </h3>
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-slate-400">Rent Due</div>
                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 break-words">{formatCurrency(room.currentDues.rentDue)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-slate-400">Electricity Due</div>
                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 break-words">{formatCurrency(room.currentDues.electricityDue)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-slate-400">Total Due</div>
                <div className={`text-sm sm:text-base font-bold mt-0.5 break-words ${room.currentDues.totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatCurrency(room.currentDues.totalDue)}
                </div>
              </div>
            </div>
            {room.currentDues.totalDue > 0 ? (
              <button onClick={handleOpenCombined} className="btn btn-emerald w-full sm:w-auto mt-4">
                <Plus className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
            ) : (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 font-semibold">All dues settled.</p>
            )}
          </div>

          {/* Rent cycles */}
          <div className="card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-brand-500" />
                <span>Rent Cycles</span>
              </h3>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentTenancy.summary.cycles.map((c) => (
                <li key={c.cycleStart} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{cycleLabel(c)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Expected {formatCurrency(c.expected)} · Paid {formatCurrency(c.paid)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.pending > 0 ? (
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(c.pending)} due</span>
                    ) : (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Settled</span>
                    )}
                    <span className={`badge ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Combined payment receipts */}
          {currentTenancy.combinedPayments.length > 0 && (
            <div className="card overflow-hidden">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-500" />
                <span>Combined Payments</span>
              </h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentTenancy.combinedPayments.map((b) => (
                  <li key={b.batchId} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(b.paymentDate)} · {b.paymentMode.replace('_', ' ')}
                        {b.referenceNo && <span> · Ref: {b.referenceNo}</span>}
                      </div>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(b.totalAmount)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {b.rentAmount > 0 && <span>Rent: <strong className="text-slate-900 dark:text-white">{formatCurrency(b.rentAmount)}</strong></span>}
                      {b.electricityAmount > 0 && <span>Electricity: <strong className="text-slate-900 dark:text-white">{formatCurrency(b.electricityAmount)}</strong></span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rent payment history — correctable */}
          {currentTenancy.payments.length > 0 && (
            <div className="card overflow-hidden">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-500" />
                <span>Rent Payment History</span>
              </h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentTenancy.payments.map((p) => (
                  <li key={p.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(p.paymentDate)} · {p.paymentMode.replace('_', ' ')}
                      {p.referenceNo && <span> · Ref: {p.referenceNo}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount)}</span>
                      <button onClick={() => handleOpenEditPayment('rent', p)} className="btn-icon w-7 h-7 text-slate-400 hover:text-brand-500" aria-label="Edit payment" title="Correct payment">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeletePayment('rent', p.id)} className="btn-icon w-7 h-7 text-slate-400 hover:text-rose-500" aria-label="Delete payment">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Tenancy history — always visible, never removed */}
      <div className="card overflow-hidden">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" />
          <span>Tenant History ({tenancyHistory.length})</span>
        </h3>
        {tenancyHistory.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No previous tenants for this room yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Tenant</th>
                  <th scope="col">Rent</th>
                  <th scope="col">Start</th>
                  <th scope="col">End</th>
                  <th scope="col" className="text-right">Total Paid</th>
                </tr>
              </thead>
              <tbody>
                {tenancyHistory.map((t) => (
                  <tr key={t.id}>
                    <td className="font-bold text-slate-900 dark:text-white">{t.tenant.name}</td>
                    <td className="text-slate-600 dark:text-slate-300">{formatCurrency(t.monthlyRent)}</td>
                    <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(t.startDate)}</td>
                    <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(t.endDate)}</td>
                    <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(t.summary.totalPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Electricity — only when the building has it enabled */}
      {building.electricityBilling && (
        <div className="card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Electricity</span>
            </h3>
            <button onClick={handleOpenElectricity} className="btn btn-sm btn-indigo">
              <Plus className="w-4 h-4" />
              <span>Add Bill</span>
            </button>
          </div>
          {electricityBills.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No electricity bills recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {electricityBills.map((b) => (
                <li key={b.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(b.billDate)}
                      {b.previousReading !== null && b.currentReading !== null && (
                        <span className="text-slate-400 font-normal"> · {b.previousReading} → {b.currentReading} ({b.unitsConsumed} units × ₹{b.ratePerUnit})</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Paid {formatCurrency(b.amountPaid)} of {formatCurrency(b.amount)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(b.amount)}</span>
                    <span className={`badge ${getStatusBadgeClass(b.status)}`}>{b.status}</span>
                    <button onClick={() => handleOpenBillPayment(b)} className="btn-icon w-7 h-7 text-slate-400 hover:text-emerald-500" aria-label="Record payment" title={b.status === 'PAID' ? 'View payments' : 'Record payment'}>
                      <Wallet className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleOpenEditBill(b)} className="btn-icon w-7 h-7 text-slate-400 hover:text-brand-500" aria-label="Edit bill" title="Edit bill">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteElectricityBill(b.id)} className="btn-icon w-7 h-7 text-slate-400 hover:text-rose-500" aria-label="Delete bill">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Electricity payment history — correctable, independent of which
          tenancy was current when each payment landed */}
      {building.electricityBilling && room.electricityPaymentHistory.length > 0 && (
        <div className="card overflow-hidden">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Electricity Payment History</span>
          </h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {room.electricityPaymentHistory.map((p) => (
              <li key={p.id} className="p-4 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(p.paymentDate)} · {p.paymentMode.replace('_', ' ')}
                  {p.referenceNo && <span> · Ref: {p.referenceNo}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount)}</span>
                  <button onClick={() => handleOpenEditPayment('electricity', p, p.billId)} className="btn-icon w-7 h-7 text-slate-400 hover:text-brand-500" aria-label="Edit payment" title="Correct payment">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeletePayment('electricity', p.id, p.billId)} className="btn-icon w-7 h-7 text-slate-400 hover:text-rose-500" aria-label="Delete payment">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Start Tenancy modal */}
      <Modal
        open={showStartModal}
        onClose={() => setShowStartModal(false)}
        size="xl"
        title="Start Tenancy"
        icon={UserPlus}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowStartModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="start-tenancy-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : 'Start Tenancy'}
            </button>
          </div>
        }
      >
        {error && (
          <div role="alert" className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        <form id="start-tenancy-form" onSubmit={handleStartTenancy} className="space-y-4">
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-800/50 text-sm font-semibold">
            <button type="button" onClick={() => setUseExisting(false)} className={`flex-1 py-1.5 rounded-lg transition-colors ${!useExisting ? 'bg-white dark:bg-slate-900 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}>
              New Tenant
            </button>
            <button type="button" onClick={() => setUseExisting(true)} className={`flex-1 py-1.5 rounded-lg transition-colors ${useExisting ? 'bg-white dark:bg-slate-900 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}>
              Existing Tenant
            </button>
          </div>

          {useExisting ? (
            <div>
              <label className="label">Search Tenant *</label>
              <SearchableSelect
                mode="typeahead"
                icon={Search}
                value={tenantQuery}
                onValueChange={setTenantQuery}
                options={tenants}
                getOptionValue={(t) => t.id}
                getOptionLabel={(t) => `${t.name} (${t.mobile})`}
                onSelect={(t) => { setSelectedTenantId(t.id); setTenantQuery(t.name); }}
                placeholder="Type a tenant's name or mobile…"
                searchable={false}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tn-name" className="label">Tenant Name *</label>
                  <input id="tn-name" type="text" required value={tenantForm.name} onChange={(e) => setTenantForm((p) => ({ ...p, name: e.target.value }))} className="input" />
                </div>
                <div>
                  <label htmlFor="tn-mobile" className="label">Mobile Number *</label>
                  <input id="tn-mobile" type="tel" required value={tenantForm.mobile} onChange={(e) => setTenantForm((p) => ({ ...p, mobile: e.target.value }))} className="input font-mono" />
                </div>
              </div>
              <div>
                <label htmlFor="tn-address" className="label">Address</label>
                <textarea id="tn-address" rows={2} value={tenantForm.address} onChange={(e) => setTenantForm((p) => ({ ...p, address: e.target.value }))} className="textarea" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tn-aadhaar" className="label">Aadhaar Number *</label>
                  <input id="tn-aadhaar" type="text" required placeholder="e.g. 1234 5678 9012" value={tenantForm.aadhaarNumber} onChange={(e) => setTenantForm((p) => ({ ...p, aadhaarNumber: e.target.value }))} className="input font-mono" />
                  <div className="flex items-center gap-2 mt-2">
                    <button type="button" onClick={() => aadhaarGalleryRef.current?.click()} className="btn btn-sm btn-secondary flex-1">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Gallery</span>
                    </button>
                    <button type="button" onClick={() => aadhaarCameraRef.current?.click()} className="btn btn-sm btn-secondary flex-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                    </button>
                  </div>
                  {aadhaarFile && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">{aadhaarFile.name}</span>
                      <button type="button" onClick={() => setAadhaarFile(null)} className="text-slate-400 hover:text-rose-500" aria-label="Remove Aadhaar file"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                  <input ref={aadhaarGalleryRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
                  <input ref={aadhaarCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <label htmlFor="tn-pan" className="label">PAN Number</label>
                  <input id="tn-pan" type="text" placeholder="Optional" value={tenantForm.panNumber} onChange={(e) => setTenantForm((p) => ({ ...p, panNumber: e.target.value }))} className="input font-mono" />
                  <div className="flex items-center gap-2 mt-2">
                    <button type="button" onClick={() => panGalleryRef.current?.click()} className="btn btn-sm btn-secondary flex-1">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Gallery</span>
                    </button>
                    <button type="button" onClick={() => panCameraRef.current?.click()} className="btn btn-sm btn-secondary flex-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                    </button>
                  </div>
                  {panFile && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">{panFile.name}</span>
                      <button type="button" onClick={() => setPanFile(null)} className="text-slate-400 hover:text-rose-500" aria-label="Remove PAN file"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                  <input ref={panGalleryRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setPanFile(e.target.files?.[0] || null)} />
                  <input ref={panCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setPanFile(e.target.files?.[0] || null)} />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label htmlFor="tn-start" className="label">Rent Start Date *</label>
              <input id="tn-start" type="date" required value={tenancyStartDate} onChange={(e) => setTenancyStartDate(e.target.value)} className="input" />
              <p className="text-[11px] text-slate-400 mt-1">Rent cycles begin on this day each month.</p>
            </div>
            <div>
              <label htmlFor="tn-rent" className="label">Monthly Rent (₹) *</label>
              <input id="tn-rent" type="number" min="0" step="any" required value={tenancyRent} onChange={(e) => setTenancyRent(e.target.value)} className="input font-semibold" />
            </div>
          </div>
        </form>
      </Modal>

      {/* End Tenancy modal */}
      <Modal
        open={showEndModal}
        onClose={() => setShowEndModal(false)}
        title="End Tenancy"
        icon={LogOut}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowEndModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="end-tenancy-form" disabled={saving} className="btn btn-danger sm:min-w-[9rem]">
              {saving ? 'Ending…' : 'End Tenancy'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          This moves {currentTenancy?.tenant?.name} out and marks the room vacant. Their rent and payment history is kept permanently.
        </p>
        <form id="end-tenancy-form" onSubmit={handleEndTenancy}>
          <label htmlFor="tn-end" className="label">Move-out Date</label>
          <input id="tn-end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
        </form>
      </Modal>

      {/* Edit Tenant Details modal */}
      <Modal
        open={showEditTenantModal}
        onClose={() => setShowEditTenantModal(false)}
        title="Edit Tenant Details"
        icon={Edit2}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowEditTenantModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="edit-tenant-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        }
      >
        {error && (
          <div role="alert" className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}
        <form id="edit-tenant-form" onSubmit={handleUpdateTenant} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="et-name" className="label">Tenant Name *</label>
              <input id="et-name" type="text" required value={editTenantForm.name} onChange={(e) => setEditTenantForm((p) => ({ ...p, name: e.target.value }))} className="input" />
            </div>
            <div>
              <label htmlFor="et-mobile" className="label">Mobile Number *</label>
              <input id="et-mobile" type="tel" required value={editTenantForm.mobile} onChange={(e) => setEditTenantForm((p) => ({ ...p, mobile: e.target.value }))} className="input font-mono" />
            </div>
          </div>
          <div>
            <label htmlFor="et-address" className="label">Address</label>
            <textarea id="et-address" rows={2} value={editTenantForm.address} onChange={(e) => setEditTenantForm((p) => ({ ...p, address: e.target.value }))} className="textarea" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="et-aadhaar" className="label">Aadhaar Number *</label>
              <input id="et-aadhaar" type="text" required value={editTenantForm.aadhaarNumber} onChange={(e) => setEditTenantForm((p) => ({ ...p, aadhaarNumber: e.target.value }))} className="input font-mono" />
            </div>
            <div>
              <label htmlFor="et-pan" className="label">PAN Number</label>
              <input id="et-pan" type="text" placeholder="Optional" value={editTenantForm.panNumber} onChange={(e) => setEditTenantForm((p) => ({ ...p, panNumber: e.target.value }))} className="input font-mono" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">Documents can be managed below, under the tenant's Documents section.</p>
        </form>
      </Modal>

      {/* Record Payment modal — combined Rent + Electricity, partial-payment split */}
      <Modal
        open={showCombinedModal}
        onClose={() => setShowCombinedModal(false)}
        title="Record Payment"
        icon={Wallet}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowCombinedModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="combined-payment-form" disabled={saving || combinedTotal <= 0} className="btn btn-emerald sm:min-w-[9rem]">
              {saving ? 'Saving…' : `Record ${formatCurrency(combinedTotal)}`}
            </button>
          </div>
        }
      >
        {error && (
          <div role="alert" className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}
        {currentTenancy && (
          <form id="combined-payment-form" onSubmit={handleSubmitCombined} className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-slate-400">Rent Due</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(room.currentDues.rentDue)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-slate-400">Electricity Due</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(electricityDue)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-slate-400">Total Due</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(room.currentDues.totalDue)}</div>
              </div>
            </div>

            {oldestPendingCycle && (
              <div>
                <label className="label">Rent Cycle</label>
                <SearchableSelect
                  mode="button"
                  value={combinedForm.rentCycleStart}
                  options={pendingCycles}
                  getOptionValue={(c) => new Date(c.cycleStart).toISOString()}
                  getOptionLabel={(c) => `${cycleLabel(c)} — ${formatCurrency(c.pending)} pending`}
                  onSelect={(c) => setCombinedForm((p) => ({ ...p, rentCycleStart: new Date(c.cycleStart).toISOString(), rentAmount: c.pending }))}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cp-rent" className="label">Rent Amount (₹)</label>
                <input
                  id="cp-rent"
                  type="number"
                  min="0"
                  step="any"
                  disabled={!oldestPendingCycle}
                  value={combinedForm.rentAmount}
                  onChange={(e) => setCombinedForm((p) => ({ ...p, rentAmount: e.target.value }))}
                  className="input font-semibold"
                />
              </div>
              <div>
                <label htmlFor="cp-electricity" className="label">Electricity Amount (₹)</label>
                <input
                  id="cp-electricity"
                  type="number"
                  min="0"
                  step="any"
                  disabled={!(electricityDue > 0)}
                  value={combinedForm.electricityAmount}
                  onChange={(e) => setCombinedForm((p) => ({ ...p, electricityAmount: e.target.value }))}
                  className="input font-semibold"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 -mt-2">Reduce either amount for a partial payment — the split is up to you.</p>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Total Payment</span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(combinedTotal)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cp-date" className="label">Payment Date</label>
                <input id="cp-date" type="date" value={combinedForm.paymentDate} onChange={(e) => setCombinedForm((p) => ({ ...p, paymentDate: e.target.value }))} className="input" />
              </div>
              <div>
                <label htmlFor="cp-mode" className="label">Payment Mode</label>
                <SearchableSelect id="cp-mode" mode="button" value={combinedForm.paymentMode} options={PAYMENT_MODE_OPTIONS} onSelect={(opt) => setCombinedForm((p) => ({ ...p, paymentMode: opt.value }))} />
              </div>
            </div>
            <div>
              <label htmlFor="cp-ref" className="label">Reference No.</label>
              <input id="cp-ref" type="text" placeholder="Optional" value={combinedForm.referenceNo} onChange={(e) => setCombinedForm((p) => ({ ...p, referenceNo: e.target.value }))} className="input" />
            </div>
          </form>
        )}
      </Modal>

      {/* Correct a payment — rent or electricity */}
      <Modal
        open={showEditPaymentModal}
        onClose={() => setShowEditPaymentModal(false)}
        title={`Correct ${editPaymentForm.type === 'rent' ? 'Rent' : 'Electricity'} Payment`}
        icon={Edit2}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowEditPaymentModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="edit-payment-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        }
      >
        {error && (
          <div role="alert" className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}
        <form id="edit-payment-form" onSubmit={handleSaveEditPayment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ep-amount" className="label">Amount (₹) *</label>
              <input id="ep-amount" type="number" min="0.01" step="any" required value={editPaymentForm.amount} onChange={(e) => setEditPaymentForm((p) => ({ ...p, amount: e.target.value }))} className="input font-semibold" />
            </div>
            <div>
              <label htmlFor="ep-date" className="label">Payment Date</label>
              <input id="ep-date" type="date" value={editPaymentForm.paymentDate} onChange={(e) => setEditPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ep-mode" className="label">Payment Mode</label>
              <SearchableSelect id="ep-mode" mode="button" value={editPaymentForm.paymentMode} options={PAYMENT_MODE_OPTIONS} onSelect={(opt) => setEditPaymentForm((p) => ({ ...p, paymentMode: opt.value }))} />
            </div>
            <div>
              <label htmlFor="ep-ref" className="label">Reference No.</label>
              <input id="ep-ref" type="text" placeholder="Optional" value={editPaymentForm.referenceNo} onChange={(e) => setEditPaymentForm((p) => ({ ...p, referenceNo: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="ep-notes" className="label">Notes</label>
            <textarea id="ep-notes" rows={2} placeholder="Optional" value={editPaymentForm.notes} onChange={(e) => setEditPaymentForm((p) => ({ ...p, notes: e.target.value }))} className="textarea" />
          </div>
        </form>
      </Modal>

      {/* Add Electricity Bill modal */}
      <Modal
        open={showElectricityModal}
        onClose={() => setShowElectricityModal(false)}
        title="Add Electricity Bill"
        icon={Zap}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowElectricityModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="electricity-form" disabled={saving} className="btn btn-indigo sm:min-w-[9rem]">
              {saving ? 'Saving…' : 'Add Bill'}
            </button>
          </div>
        }
      >
        {error && (
          <div role="alert" className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}
        <form id="electricity-form" onSubmit={handleAddElectricityBill} className="space-y-4">
          <div>
            <label htmlFor="el-date" className="label">Bill Date</label>
            <input id="el-date" type="date" value={electricityForm.billDate} onChange={(e) => setElectricityForm((p) => ({ ...p, billDate: e.target.value }))} className="input" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="el-previous" className="label">Previous Reading</label>
              {lastElectricityBill ? (
                <div className="input flex items-center bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                  {lastElectricityBill.currentReading}
                </div>
              ) : (
                <input
                  id="el-previous"
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="Starting meter reading"
                  value={electricityForm.previousReading}
                  onChange={(e) => setElectricityForm((p) => ({ ...p, previousReading: e.target.value }))}
                  className="input"
                />
              )}
              {lastElectricityBill && <p className="text-[11px] text-slate-400 mt-1">Carried forward from the last bill.</p>}
              {!lastElectricityBill && <p className="text-[11px] text-slate-400 mt-1">First bill for this room — enter the starting reading.</p>}
            </div>
            <div>
              <label htmlFor="el-current" className="label">Current Reading *</label>
              <input
                id="el-current"
                type="number"
                min="0"
                step="any"
                required
                placeholder="e.g. 560"
                value={electricityForm.currentReading}
                onChange={(e) => setElectricityForm((p) => ({ ...p, currentReading: e.target.value }))}
                className="input font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Units Consumed</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{electricityUnits}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Rate / Unit</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(electricityRate)}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Bill Amount</div>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(electricityAmount)}</div>
            </div>
          </div>

          <div>
            <label htmlFor="el-notes" className="label">Notes</label>
            <textarea id="el-notes" rows={2} placeholder="Optional" value={electricityForm.notes} onChange={(e) => setElectricityForm((p) => ({ ...p, notes: e.target.value }))} className="textarea" />
          </div>
        </form>
      </Modal>

      {/* Edit Electricity Bill modal */}
      <Modal
        open={showEditBillModal}
        onClose={() => setShowEditBillModal(false)}
        title="Edit Electricity Bill"
        icon={Edit2}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowEditBillModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="edit-bill-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        }
      >
        {error && (
          <div role="alert" className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}
        {editingBill && (
          <form id="edit-bill-form" onSubmit={handleSaveEditBill} className="space-y-5">
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400">
                <CalendarDays className="w-3.5 h-3.5" />
                Bill Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="eb-date" className="label">Bill Date</label>
                  <input
                    id="eb-date"
                    type="date"
                    value={editBillForm.billDate}
                    onChange={(e) => setEditBillForm((p) => ({ ...p, billDate: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="eb-rate" className="label">Rate / Unit (₹)</label>
                  <input
                    id="eb-rate"
                    type="number"
                    min="0"
                    step="any"
                    value={editBillForm.ratePerUnit}
                    onChange={(e) => setEditBillForm((p) => ({ ...p, ratePerUnit: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400">
                <Gauge className="w-3.5 h-3.5" />
                Meter Reading
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="eb-previous" className="label">Previous Reading{!editBillAnchor && <span className="text-slate-400 font-normal"> (auto-carried)</span>}</label>
                  {editBillAnchor ? (
                    <input
                      id="eb-previous"
                      type="number"
                      min="0"
                      step="any"
                      value={editBillForm.previousReading}
                      onChange={(e) => setEditBillForm((p) => ({ ...p, previousReading: e.target.value }))}
                      className="input"
                    />
                  ) : (
                    <div className="input flex items-center bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                      {editingBill.previousReading}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="eb-current" className="label">Current Reading *</label>
                  <input
                    id="eb-current"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editBillForm.currentReading}
                    onChange={(e) => setEditBillForm((p) => ({ ...p, currentReading: e.target.value }))}
                    className="input font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Units</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{editBillUnits}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Rate</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(editBillRate)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Amount</div>
                  <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(editBillAmount)}</div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Payment Status
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditBillForm((p) => ({ ...p, status: 'PENDING' }))}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    editBillForm.status === 'PENDING'
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setEditBillForm((p) => ({ ...p, status: 'PAID' }))}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    editBillForm.status === 'PAID'
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Paid
                </button>
              </div>
              {editBillForm.status !== (editingBill.status === 'PAID' ? 'PAID' : 'PENDING') && (
                <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                  editBillForm.status === 'PAID'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                }`}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    {editBillForm.status === 'PAID'
                      ? 'This will record a payment for the full bill amount.'
                      : 'This will remove the payment(s) recorded against this bill.'}
                  </span>
                </div>
              )}

              {editBillForm.status === 'PAID' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label htmlFor="eb-pmode" className="label">Payment Mode</label>
                    <SearchableSelect id="eb-pmode" mode="button" value={editBillForm.paymentMode} options={PAYMENT_MODE_OPTIONS} onSelect={(opt) => setEditBillForm((p) => ({ ...p, paymentMode: opt.value }))} />
                  </div>
                  <div>
                    <label htmlFor="eb-pdate" className="label">Payment Date</label>
                    <input
                      id="eb-pdate"
                      type="date"
                      value={editBillForm.paymentDate}
                      onChange={(e) => setEditBillForm((p) => ({ ...p, paymentDate: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="eb-notes" className="label">Notes</label>
              <textarea id="eb-notes" rows={2} placeholder="Optional" value={editBillForm.notes} onChange={(e) => setEditBillForm((p) => ({ ...p, notes: e.target.value }))} className="textarea" />
            </div>
          </form>
        )}
      </Modal>

      {/* Record Payment modal — full ledger for one specific electricity
          bill (existing payments correctable/deletable, plus an add form),
          so a bill can be paid in full, in installments, and every payment
          fixed later without going through the FIFO combined-payment flow. */}
      <Modal
        open={showBillPaymentModal}
        onClose={() => setShowBillPaymentModal(false)}
        title="Record Payment"
        icon={Wallet}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowBillPaymentModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Close</button>
            {payingBill && (round2(payingBill.amount - payingBill.amountPaid) > 0.01 || editingBillPaymentId) && (
              <button type="submit" form="bill-payment-form" disabled={billPaySaving} className="btn btn-primary sm:min-w-[9rem]">
                {billPaySaving ? 'Saving…' : editingBillPaymentId ? 'Update Payment' : 'Record Payment'}
              </button>
            )}
          </div>
        }
      >
        {payingBill && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(payingBill.billDate)}</p>

            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Bill Amount</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(payingBill.amount)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Paid</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(payingBill.amountPaid)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Pending</div>
                <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(round2(payingBill.amount - payingBill.amountPaid))}</div>
              </div>
            </div>

            {payingBill.payments && payingBill.payments.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-2">
                  <Receipt className="w-3.5 h-3.5" />
                  Payments Recorded
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                  {payingBill.payments.map((p) => (
                    <li key={p.id} className={`p-3 flex items-center justify-between gap-3 ${editingBillPaymentId === p.id ? 'bg-brand-50 dark:bg-brand-950/30' : ''}`}>
                      <div className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(p.amount)}</div>
                        {formatDate(p.paymentDate)} · {p.paymentMode.replace('_', ' ')}
                        {p.referenceNo && <span> · Ref: {p.referenceNo}</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => handleEditBillPaymentRow(p)} className="btn-icon w-7 h-7 text-slate-400 hover:text-brand-500" aria-label="Edit payment" title="Correct payment">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDeleteBillPaymentRow(p)} className="btn-icon w-7 h-7 text-slate-400 hover:text-rose-500" aria-label="Delete payment">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {billPayError && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">{billPayError}</span>
              </div>
            )}

            {round2(payingBill.amount - payingBill.amountPaid) <= 0.01 && !editingBillPaymentId ? (
              <p className="text-sm text-slate-400 text-center py-2">This bill is fully paid. Edit or delete a payment above to make changes.</p>
            ) : (
              <form id="bill-payment-form" onSubmit={handleSubmitBillPayment} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400">
                    <Wallet className="w-3.5 h-3.5" />
                    {editingBillPaymentId ? 'Edit Payment' : 'New Payment'}
                  </div>
                  {editingBillPaymentId && (
                    <button type="button" onClick={handleCancelEditBillPaymentRow} className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      Cancel edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="bp-amount" className="label">Amount *</label>
                    <input
                      id="bp-amount"
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={billPaymentForm.amount}
                      onChange={(e) => setBillPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                      className="input font-semibold"
                    />
                  </div>
                  <div>
                    <label htmlFor="bp-date" className="label">Payment Date</label>
                    <input
                      id="bp-date"
                      type="date"
                      value={billPaymentForm.paymentDate}
                      onChange={(e) => setBillPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="bp-mode" className="label">Payment Mode</label>
                    <SearchableSelect id="bp-mode" mode="button" value={billPaymentForm.paymentMode} options={PAYMENT_MODE_OPTIONS} onSelect={(opt) => setBillPaymentForm((p) => ({ ...p, paymentMode: opt.value }))} />
                  </div>
                  <div>
                    <label htmlFor="bp-ref" className="label">Reference No.</label>
                    <input id="bp-ref" type="text" placeholder="Optional" value={billPaymentForm.referenceNo} onChange={(e) => setBillPaymentForm((p) => ({ ...p, referenceNo: e.target.value }))} className="input" />
                  </div>
                </div>

                <div>
                  <label htmlFor="bp-notes" className="label">Notes</label>
                  <textarea id="bp-notes" rows={2} placeholder="Optional" value={billPaymentForm.notes} onChange={(e) => setBillPaymentForm((p) => ({ ...p, notes: e.target.value }))} className="textarea" />
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
