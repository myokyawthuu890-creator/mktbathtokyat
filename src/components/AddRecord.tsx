import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db, getOwnerId } from '../lib/firebase';
import { Save, Coins, Banknote } from 'lucide-react';
import { Customer, BankingCategory } from '../types';
import { PasswordModal } from './PasswordModal';

interface AddRecordProps {
  rate: number;
  key?: React.Key;
}

export default function AddRecord({ rate: globalRate }: AddRecordProps) {
  const [type, setType] = useState<'baht' | 'kyat'>('baht');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankingCategories, setBankingCategories] = useState<BankingCategory[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Baht State
  const [amountTHB, setAmountTHB] = useState<string>('');
  const [customRate, setCustomRate] = useState<string>(globalRate.toString());

  // Kyat State
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'banking'|'both'>('cash');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [bankingAmount, setBankingAmount] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  const [passwordAction, setPasswordAction] = useState<{ action: () => void, title: string } | null>(null);

  // Setup live sync for Customers and Banking Categories
  useEffect(() => {
    const ownerId = getOwnerId();
    const q = query(collection(db, 'customers'), where('ownerId', '==', ownerId));
    const unsubCustomers = onSnapshot(q, (snapshot) => {
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
      setBankingCategories(data);
    });

    return () => {
      unsubCustomers();
      unsubBanks();
    };
  }, []);

  // Sync prop changes
  useEffect(() => {
    setCustomRate(globalRate.toString());
  }, [globalRate]);

  // Derived Values
  const parsedTHB = parseFloat(amountTHB) || 0;
  const parsedRate = parseFloat(customRate) || 0;
  const calculatedMMK = parsedTHB * parsedRate;

  const parsedCash = parseFloat(cashAmount) || 0;
  const parsedBanking = parseFloat(bankingAmount) || 0;
  const calculatedTotalMMK = (paymentMethod === 'cash' ? parsedCash : 
                              paymentMethod === 'banking' ? parsedBanking : 
                              (parsedCash + parsedBanking));

  const isFormValid = useMemo(() => {
    if (!selectedCustomerId) return false;
    
    if (type === 'baht') {
      return parsedTHB > 0 && parsedRate > 0;
    } else {
      if (paymentMethod === 'cash') return parsedCash > 0;
      if (paymentMethod === 'banking') return parsedBanking > 0 && !!selectedBankId;
      if (paymentMethod === 'both') return (parsedCash > 0 || parsedBanking > 0) && (parsedBanking > 0 ? !!selectedBankId : true);
    }
    return false;
  }, [type, selectedCustomerId, parsedTHB, parsedRate, paymentMethod, parsedCash, parsedBanking, selectedBankId]);

  const handleSaveBtnClick = () => {
    if (!isFormValid) return;
    setPasswordAction({
      title: 'Confirm Save Record',
      action: handleSave
    });
  };

  const handleSave = async () => {
    
    setSaving(true);
    setSuccessMsg('');
    try {
      const customerName = customers.find(c => c.id === selectedCustomerId)?.name || 'Unknown';
      const bankingCategoryName = bankingCategories.find(b => b.id === selectedBankId)?.name || '';
      
      const payload: any = {
        ownerId: getOwnerId(),
        type,
        customerName,
        createdAt: serverTimestamp()
      };

      if (type === 'baht') {
        payload.amountTHB = parsedTHB;
        payload.rate = parsedRate;
        payload.amountMMK = calculatedMMK;
      } else {
        payload.paymentMethod = paymentMethod;
        if (paymentMethod === 'cash' || paymentMethod === 'both') {
          payload.cashAmount = parsedCash;
        }
        if (paymentMethod === 'banking' || paymentMethod === 'both') {
          payload.bankingAmount = parsedBanking;
          if (selectedBankId) {
            payload.bankingCategory = bankingCategoryName;
          }
        }
        payload.totalMMK = calculatedTotalMMK;
      }

      await addDoc(collection(db, 'records'), payload);
      
      // Reset form but keep customer selection
      setAmountTHB('');
      setCashAmount('');
      setBankingAmount('');
      setSelectedBankId('');
      setSuccessMsg('Record saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error("Error saving record: ", error);
      alert("Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-slate-800">Add Record</h1>
      
      {/* Type Toggle */}
      <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner">
        <button
          onClick={() => setType('baht')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
            type === 'baht' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" /> Baht Record
        </button>
        <button
          onClick={() => setType('kyat')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
            type === 'kyat' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Banknote className="w-4 h-4" /> Kyat Record
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col space-y-6 min-h-[400px]">
        {/* Common Field: Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">
            Customer Name
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
          >
            <option value="" disabled>Select a customer...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {customers.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">No customers available. Please add them in Settings.</p>
          )}
        </div>

        {type === 'baht' ? (
          /* Baht Form */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 flex-1 flex flex-col"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Amount (THB)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 font-medium">฿</span>
                  <input
                    type="number"
                    value={amountTHB}
                    onChange={(e) => setAmountTHB(e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Exchange Rate
                </label>
                <input
                  type="number"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex-1 flex flex-col justify-end">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Converted Amount (MMK)
              </label>
              <div className="text-3xl font-bold text-slate-800 flex items-baseline">
                <span className="text-xl text-slate-400 mr-2">K</span>
                {calculatedMMK.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Kyat Form */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 flex-1 flex flex-col"
          >
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Payment Method
              </label>
              <div className="flex gap-2">
                {(['cash', 'banking', 'both'] as const).map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize border transition-all ${
                      paymentMethod === method 
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {(paymentMethod === 'cash' || paymentMethod === 'both') && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Cash Amount (MMK)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 font-medium">K</span>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </motion.div>
              )}

              {(paymentMethod === 'banking' || paymentMethod === 'both') && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Banking Category</label>
                    <select
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-slate-800"
                    >
                      <option value="" disabled>Select a bank...</option>
                      {bankingCategories.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Banking Amount (MMK)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 font-medium">K</span>
                      <input
                        type="number"
                        value={bankingAmount}
                        onChange={(e) => setBankingAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100 mt-auto flex flex-col justify-end">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Total Amount (MMK)
              </label>
              <div className="text-3xl font-bold text-slate-800 flex items-baseline">
                <span className="text-xl text-slate-400 mr-2">K</span>
                {calculatedTotalMMK.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <button
        onClick={handleSaveBtnClick}
        disabled={saving || !isFormValid}
        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-4 px-4 rounded-xl flex items-center justify-center transition-colors gap-2 shadow-sm"
      >
        <Save className="w-5 h-5" />
        {saving ? 'Saving...' : 'Save Record'}
      </button>
      
      {successMsg && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-600 text-center font-medium text-sm">
          {successMsg}
        </motion.p>
      )}

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
