import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirm } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, getStatusBadgeClass } from '../utils/formatters';
import { Building2, ArrowLeft, DoorOpen, Plus, Edit2, Trash2, Zap, User, AlertCircle, MapPin } from 'lucide-react';

const EMPTY_FORM = { roomNumber: '', monthlyRent: '', notes: '' };

export const RentBuildingDetail = () => {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchBuilding = async () => {
    try {
      setLoading(true);
      setFailed(false);
      const res = await api.get(`/rent/buildings/${id}`);
      setBuilding(res);
    } catch (err) {
      setFailed(true);
      toast.error(err.message || 'Failed to load building');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuilding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setFormData(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setFormData({ roomNumber: room.roomNumber || '', monthlyRent: room.monthlyRent ?? '', notes: room.notes || '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      if (editingRoom) {
        await api.put(`/rent/rooms/${editingRoom.id}`, formData);
        toast.success(`Room ${formData.roomNumber} updated`);
      } else {
        await api.post(`/rent/buildings/${id}/rooms`, formData);
        toast.success(`Room ${formData.roomNumber} added`);
      }
      setShowModal(false);
      fetchBuilding();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room) => {
    const ok = await confirm({
      title: `Delete room "${room.roomNumber}"?`,
      message: 'Rooms with any current or past tenant cannot be deleted, to keep tenancy history intact.',
      confirmText: 'Delete room',
    });
    if (!ok) return;

    try {
      await api.delete(`/rent/rooms/${room.id}`);
      toast.success(`Room ${room.roomNumber} deleted`);
      fetchBuilding();
    } catch (err) {
      toast.error(err.message || 'Failed to delete room');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading building">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (failed || !building) {
    return (
      <div className="card p-10 sm:p-16 text-center">
        <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
        <div className="font-semibold text-slate-700 dark:text-slate-300">Building not found</div>
        <div className="flex justify-center gap-2 mt-5">
          <Link to="/rent/areas" className="btn btn-secondary">Back to Areas</Link>
          <button onClick={fetchBuilding} className="btn btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link to={`/rent/areas/${building.area.id}`} className="btn btn-sm btn-ghost self-start -ml-2">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to {building.area.name}</span>
      </Link>

      <div className="card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/25">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="page-title break-words">{building.name}</h2>
            <p className="page-subtitle flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{building.address}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="badge badge-neutral">{building.rooms.length} of {building.totalRooms} rooms added</span>
              {building.electricityBilling && (
                <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  <Zap className="w-3 h-3" />
                  ₹{building.electricityRate}/unit
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add Room</span>
        </button>
      </div>

      {building.rooms.length === 0 ? (
        <div className="card p-10 sm:p-16 text-center">
          <DoorOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">No rooms yet</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Add rooms one at a time with their number and monthly rent.
          </p>
          <button onClick={handleOpenAdd} className="btn btn-primary mt-5">
            <Plus className="w-4 h-4" />
            <span>Add Room</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {building.rooms.map((room) => (
            <div key={room.id} className="card card-interactive card-pad flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/rent/rooms/${room.id}`} className="min-w-0 group">
                  <div className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">
                    Room {room.roomNumber}
                  </div>
                </Link>
                <span className={`badge shrink-0 ${getStatusBadgeClass(room.status)}`}>{room.status}</span>
              </div>

              <Link to={`/rent/rooms/${room.id}`} className="flex-1 min-w-0">
                {room.currentTenancy ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 truncate">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{room.currentTenancy.tenant.name}</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">Vacant</div>
                )}
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(room.monthlyRent)}<span className="text-xs font-normal text-slate-400">/mo</span>
                </div>
              </Link>

              <div className="flex items-center gap-1 pt-2 mt-auto border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => handleOpenEdit(room)} className="btn-icon btn-icon-soft" aria-label={`Edit room ${room.roomNumber}`}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(room)} className="btn-icon btn-danger-soft" aria-label={`Delete room ${room.roomNumber}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingRoom ? 'Edit Room' : 'Add New Room'}
        icon={DoorOpen}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary sm:min-w-[7rem]">Cancel</button>
            <button type="submit" form="room-form" disabled={saving} className="btn btn-primary sm:min-w-[9rem]">
              {saving ? 'Saving…' : editingRoom ? 'Save Changes' : 'Create Room'}
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

        <form id="room-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="room-number" className="label">Room Number *</label>
            <input
              id="room-number"
              type="text"
              required
              placeholder="e.g. 101"
              value={formData.roomNumber}
              onChange={(e) => setFormData((p) => ({ ...p, roomNumber: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="room-rent" className="label">Monthly Rent (₹) *</label>
            <input
              id="room-rent"
              type="number"
              min="0"
              step="any"
              required
              placeholder="e.g. 6000"
              value={formData.monthlyRent}
              onChange={(e) => setFormData((p) => ({ ...p, monthlyRent: e.target.value }))}
              className="input font-semibold"
            />
          </div>
          <div>
            <label htmlFor="room-notes" className="label">Notes</label>
            <textarea
              id="room-notes"
              rows={2}
              placeholder="Optional notes"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              className="textarea"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
