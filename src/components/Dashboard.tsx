import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, getOwnerId } from '../lib/firebase';
import { Receipt, Coins, Banknote, Calendar, Users, Calculator, Trash2, Edit2, Check, X } from 'lucide-react';
import { RecordData } from '../types';
import { PasswordModal } from './PasswordModal';

export default function Dashboard() {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Editing state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editAmountTHB, setEditAmountTHB] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editCashAmount, setEditCashAmount] = useState('');
  const [editBankingAmount, setEditBankingAmount] = useState('');

  // Password confirmation state
  const [passwordAction, setPasswordAction] = useState<{ action: () => void, title: string } | null>(null);

  useEffect(() => {
    const ownerId = getOwnerId();
    
    const q = query(
      collection(db, 'records'),
      where('ownerId', '==', ownerId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: RecordData[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as RecordData);
      });
      // Sort locally by createdAt desc
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setRecords(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching records: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const uniqueCustomers = useMemo(() => {
    const names = records.map(r => r.customerName).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Customer Filter
      if (customerFilter !== 'all' && record.customerName !== customerFilter) return false;

      // Date Filter
      if (dateFilter !== 'all') {
        const recordDateObj = record.createdAt?.toDate?.();
        if (!recordDateObj) return true;
        
        const recordDate = new Date(recordDateObj);
        recordDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          if (recordDate.getTime() !== today.getTime()) return false;
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (recordDate.getTime() !== yesterday.getTime()) return false;
        } else if (dateFilter === 'custom') {
          if (startDate) {
            const s = new Date(startDate);
            s.setHours(0, 0, 0, 0);
            if (recordDate < s) return false;
          }
          if (endDate) {
            const e = new Date(endDate);
            e.setHours(0, 0, 0, 0);
            if (recordDate > e) return false;
          }
        }
      }

      return true;
    });
  }, [records, customerFilter, dateFilter, startDate, endDate]);

  const { totalTHB, totalConvertedMMK, totalKyatMMK, differentAmount } = useMemo(() => {
    let thb = 0;
    let converted = 0;
    let kyat = 0;
    
    filteredRecords.forEach(r => {
      if (r.type === 'baht') {
        thb += (r.amountTHB || 0);
        converted += (r.amountMMK || 0);
      } else if (r.type === 'kyat') {
        kyat += (r.totalMMK || 0);
      }
    });

    return {
      totalTHB: thb,
      totalConvertedMMK: converted,
      totalKyatMMK: kyat,
      differentAmount: converted - kyat
    };
  }, [filteredRecords]);

  const handleDelete = (id: string) => {
    setPasswordAction({
      title: 'Confirm Delete Record',
      action: async () => {
        try {
          await deleteDoc(doc(db, 'records', id));
        } catch (e) {
          console.error("Error deleting record: ", e);
        }
      }
    });
  };

  const startEdit = (record: RecordData) => {
    setPasswordAction({
      title: 'Confirm Edit Record',
      action: () => {
        if (!record.id) return;
        setEditingRecordId(record.id);
        if (record.type === 'baht') {
          setEditAmountTHB(record.amountTHB?.toString() || '');
          setEditRate(record.rate?.toString() || '');
        } else {
          setEditCashAmount(record.cashAmount?.toString() || '');
          setEditBankingAmount(record.bankingAmount?.toString() || '');
        }
      }
    });
  };

  const saveEdit = async (record: RecordData) => {
    if (!record.id) return;
    try {
      const payload: any = {};
      if (record.type === 'baht') {
        const thb = parseFloat(editAmountTHB) || 0;
        const rate = parseFloat(editRate) || 0;
        payload.amountTHB = thb;
        payload.rate = rate;
        payload.amountMMK = thb * rate;
      } else {
        const cash = parseFloat(editCashAmount) || 0;
        const banking = parseFloat(editBankingAmount) || 0;
        payload.cashAmount = cash;
        payload.bankingAmount = banking;
        payload.totalMMK = cash + banking;
        
        if (cash > 0 && banking > 0) payload.paymentMethod = 'both';
        else if (cash > 0) payload.paymentMethod = 'cash';
        else if (banking > 0) payload.paymentMethod = 'banking';
      }
      await updateDoc(doc(db, 'records', record.id), payload);
      setEditingRecordId(null);
    } catch (e) {
      console.error("Error updating record", e);
    }
  };

  const cancelEdit = () => {
    setEditingRecordId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      </div>

      {/* Aggregate Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Coins className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Amount (THB)</p>
          <p className="text-2xl font-bold text-orange-600">
            ฿ {totalTHB.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Coins className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Converted Amount (MMK)</p>
          <p className="text-2xl font-bold text-blue-600">
            K {totalConvertedMMK.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        
        <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Banknote className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Amount (MMK)</p>
          <p className="text-2xl font-bold text-green-600">
            K {totalKyatMMK.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-5 relative overflow-hidden ${differentAmount >= 0 ? 'border-indigo-200' : 'border-red-200'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Calculator className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Different Amount</p>
          <p className={`text-2xl font-bold ${differentAmount >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
            K {differentAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 relative z-10">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Customer Name
          </label>
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Customers</option>
            {uniqueCustomers.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex-[2] flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {dateFilter === 'custom' && (
            <div className="flex-[2] flex gap-2 items-end">
              <div className="flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <span className="text-slate-400 pb-2">to</span>
              <div className="flex-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-500" />
            Filtered Activity
          </h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading records...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No records match the current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRecords.map((record) => {
              const dateStr = record.createdAt && record.createdAt.toDate 
                    ? `${record.createdAt.toDate().toLocaleDateString()} at ${record.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                    : 'Processing...';

              return (
                <div key={record.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-colors gap-3">
                  <div className="flex gap-3 items-start sm:items-center flex-1">
                    <div className={`p-2 rounded-full mt-1 sm:mt-0 shrink-0 ${record.type === 'baht' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                      {record.type === 'baht' ? <Coins className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-base">{record.customerName}</div>
                      
                      {editingRecordId === record.id ? (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {record.type === 'baht' ? (
                            <>
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-xs text-slate-400">฿</span>
                                <input type="number" value={editAmountTHB} onChange={e => setEditAmountTHB(e.target.value)} className="w-24 pl-5 pr-2 py-1 text-sm border rounded-lg bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Amount" />
                              </div>
                              <span className="text-slate-400 text-sm font-medium">@</span>
                              <input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} className="w-20 px-2 py-1 text-sm border rounded-lg bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Rate" />
                            </>
                          ) : (
                            <>
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-medium">Cash</span>
                                <input type="number" value={editCashAmount} onChange={e => setEditCashAmount(e.target.value)} className="w-28 pl-10 pr-2 py-1 text-sm border rounded-lg bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                              </div>
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-medium">Bank</span>
                                <input type="number" value={editBankingAmount} onChange={e => setEditBankingAmount(e.target.value)} className="w-28 pl-11 pr-2 py-1 text-sm border rounded-lg bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-slate-600">
                          {record.type === 'baht' ? (
                            <><span>฿{record.amountTHB}</span> <span className="text-slate-400 font-normal">(@ {record.rate})</span></>
                          ) : (
                            <span className="capitalize text-slate-600">
                             {record.paymentMethod} Payment — 
                             {record.paymentMethod === 'both' ? ` Cash K${record.cashAmount} / ${record.bankingCategory || 'Bank'} K${record.bankingAmount}`
                               : record.paymentMethod === 'cash' ? ` K${record.cashAmount}`
                               : ` ${record.bankingCategory || 'Bank'} K${record.bankingAmount}`}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="text-xs text-slate-400 mt-1">{dateStr}</div>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between ml-11 sm:ml-0 mt-3 sm:mt-0 gap-3 shrink-0">
                    <div className="flex flex-col items-start sm:items-end">
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Total MMK</div>
                      <div className={`text-lg sm:text-xl font-bold ${record.type === 'baht' ? 'text-blue-600' : 'text-green-600'}`}>
                        K {(record.type === 'baht' ? record.amountMMK : record.totalMMK)?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {editingRecordId === record.id ? (
                        <>
                          <button onClick={() => saveEdit(record)} title="Save" className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} title="Cancel" className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(record)} title="Edit" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(record.id!)} title="Delete" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PasswordModal 
        isOpen={!!passwordAction} 
        onClose={() => setPasswordAction(null)} 
        title={passwordAction?.title || ''}
        onSuccess={() => {
          if (passwordAction) passwordAction.action();
          setPasswordAction(null);
        }}
      />
    </motion.div>
  );
}

