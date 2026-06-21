import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings2, Users, Plus, Trash2, Edit2, Check, X, Landmark } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, getOwnerId } from '../lib/firebase';
import { Customer, BankingCategory } from '../types';

interface SettingsPageProps {
  rate: number;
  setRate: (rate: number) => void;
  key?: React.Key;
}

export default function SettingsPage({ rate, setRate }: SettingsPageProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomer, setNewCustomer] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [banks, setBanks] = useState<BankingCategory[]>([]);
  const [newBank, setNewBank] = useState('');
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editBankName, setEditBankName] = useState('');

  useEffect(() => {
    const ownerId = getOwnerId();
    const q = query(collection(db, 'customers'), where('ownerId', '==', ownerId));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Customer[] = [];
      snapshot.forEach(d => data.push({ id: d.id, name: d.data().name }));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(data);
    });

    const bq = query(collection(db, 'bankingCategories'), where('ownerId', '==', ownerId));
    const unsubBanks = onSnapshot(bq, (snapshot) => {
      const data: BankingCategory[] = [];
      snapshot.forEach(d => data.push({ id: d.id, name: d.data().name }));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setBanks(data);
    });

    return () => {
      unsub();
      unsubBanks();
    };
  }, []);

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... logic for rate if exists, otherwise omitted but we should probably keep existing function 
    const newRate = parseFloat(e.target.value);
    if (!isNaN(newRate)) {
      setRate(newRate);
    } else if (e.target.value === '') {
      setRate(0);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.trim()) return;
    try {
      await addDoc(collection(db, 'customers'), {
        ownerId: getOwnerId(),
        name: newCustomer.trim(),
        createdAt: Date.now()
      });
      setNewCustomer('');
    } catch (e) {
      console.error("Error adding customer:", e);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (e) {
      console.error("Error deleting customer:", e);
    }
  };

  const startEdit = (c: Customer) => {
    setEditingId(c.id);
    setEditName(c.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateDoc(doc(db, 'customers', editingId), {
        name: editName.trim()
      });
      setEditingId(null);
      setEditName('');
    } catch (e) {
      console.error("Error updating customer:", e);
    }
  };

  const handleAddBank = async () => {
    if (!newBank.trim()) return;
    try {
      await addDoc(collection(db, 'bankingCategories'), {
        ownerId: getOwnerId(),
        name: newBank.trim(),
        createdAt: Date.now()
      });
      setNewBank('');
    } catch (e) {
      console.error("Error adding bank:", e);
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banking category?")) return;
    try {
      await deleteDoc(doc(db, 'bankingCategories', id));
    } catch (e) {
      console.error("Error deleting bank:", e);
    }
  };

  const startEditBank = (b: BankingCategory) => {
    setEditingBankId(b.id);
    setEditBankName(b.name);
  };

  const saveEditBank = async () => {
    if (!editingBankId || !editBankName.trim()) return;
    try {
      await updateDoc(doc(db, 'bankingCategories', editingBankId), {
        name: editBankName.trim()
      });
      setEditingBankId(null);
      setEditBankName('');
    } catch (e) {
      console.error("Error updating bank:", e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 text-slate-700 mb-4 pb-4 border-b border-slate-100">
          <Users className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold">Customer Name Category</h2>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newCustomer}
            onChange={(e) => setNewCustomer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomer()}
            placeholder="Add Customer Name Category"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <button
            onClick={handleAddCustomer}
            disabled={!newCustomer.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-3 rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 mt-4">
          {customers.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4">No customers added yet.</p>
          ) : (
            customers.map((c) => (
              <div key={c.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                {editingId === c.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1 mr-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <span className="font-medium text-slate-700 break-all">{c.name}</span>
                )}
                
                <div className="flex items-center gap-1 shrink-0 mt-2 sm:mt-0">
                  {editingId === c.id ? (
                    <>
                      <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCustomer(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Banking Category */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 flex-1">
        <div className="flex items-center gap-3 text-slate-700 mb-4 pb-4 border-b border-slate-100">
          <Landmark className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold">Banking Category</h2>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newBank}
            onChange={(e) => setNewBank(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddBank()}
            placeholder="Add Banking Category (e.g. KPay)"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <button
            onClick={handleAddBank}
            disabled={!newBank.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-3 rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 mt-4">
          {banks.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4">No banking categories added yet.</p>
          ) : (
            banks.map((b) => (
              <div key={b.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                {editingBankId === b.id ? (
                  <input
                    type="text"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    className="flex-1 px-3 py-1 mr-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <span className="font-medium text-slate-700 break-all">{b.name}</span>
                )}
                
                <div className="flex items-center gap-1 shrink-0 mt-2 sm:mt-0">
                  {editingBankId === b.id ? (
                    <>
                      <button onClick={saveEditBank} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingBankId(null)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditBank(b)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteBank(b.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
