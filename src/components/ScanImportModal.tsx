import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Camera, Upload, Trash2, Plus, AlertCircle, Loader2, 
  CheckCircle2, TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { parseOCRText } from '../utils/receiptParser';


interface ScanImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAdd: (txs: {
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
    splitWithPartner?: boolean;
  }[]) => Promise<void>;
  partnerProfile: { id: string; name: string; email: string } | null;
}

const EXPENSE_CATEGORIES = ['Rent & Housing', 'Groceries', 'Utilities', 'Dining Out', 'Leisure', 'Transport', 'Other Out'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Other In'];

export const ScanImportModal: React.FC<ScanImportModalProps> = ({
  isOpen,
  onClose,
  onBulkAdd,
  partnerProfile
}) => {
  const [mode, setMode] = useState<'auto' | 'receipt' | 'statement'>('auto');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState('');
  
  const [extractedItems, setExtractedItems] = useState<{
    tempId: string;
    date: string;
    description: string;
    amount: string;
    type: 'income' | 'expense';
    category: string;
    splitWithPartner: boolean;
  }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Clear state on open/close
  useEffect(() => {
    if (!isOpen) {
      setExtractedItems([]);
      setIsScanning(false);
      setScanProgress(0);
      setScanError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScan = async (file: File) => {
    setIsScanning(true);
    setScanProgress(0);
    setScanError('');
    try {
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setScanProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      if (!text || text.trim() === '') {
        throw new Error('No readable text could be detected in the image.');
      }

      const parsed = parseOCRText(text, mode);
      if (parsed.length === 0) {
        throw new Error('Could not find any clear transaction amounts or merchant details. Try switching modes or entering manually.');
      }

      const newItems = parsed.map((item, idx) => ({
        tempId: `${Date.now()}-${idx}-${Math.random()}`,
        date: item.date,
        description: item.description,
        amount: item.amount.toFixed(2),
        type: item.type,
        category: item.category,
        splitWithPartner: false
      }));

      setExtractedItems(prev => [...prev, ...newItems]);
    } catch (err: any) {
      console.error('Scan Error:', err);
      setScanError(err.message || 'Scanning failed. Please make sure the image is clear and try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleScan(file);
  };

  const triggerUpload = () => fileInputRef.current?.click();
  const triggerCamera = () => cameraInputRef.current?.click();

  const handleItemChange = (tempId: string, field: string, value: any) => {
    setExtractedItems(prev =>
      prev.map(item => {
        if (item.tempId !== tempId) return item;
        
        const updated = { ...item, [field]: value };
        
        // If switching types, ensure the category defaults to a valid category for that type
        if (field === 'type') {
          const list = value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
          updated.category = list[0];
        }
        return updated;
      })
    );
  };

  const handleDeleteItem = (tempId: string) => {
    setExtractedItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleAddRow = () => {
    const newItem = {
      tempId: `${Date.now()}-${Math.random()}`,
      date: new Date().toISOString().split('T')[0],
      description: 'New Transaction',
      amount: '0.00',
      type: 'expense' as const,
      category: EXPENSE_CATEGORIES[0],
      splitWithPartner: false
    };
    setExtractedItems(prev => [...prev, newItem]);
  };

  const handleSubmitAll = async () => {
    // Validate amounts
    const validItems = extractedItems.map(item => {
      const parsedAmount = parseFloat(item.amount.replace(/,/g, ''));
      return {
        ...item,
        parsedAmount: isNaN(parsedAmount) ? 0 : parsedAmount
      };
    });

    const itemsToLog = validItems.filter(item => item.parsedAmount > 0 && item.description.trim() !== '');
    if (itemsToLog.length === 0) {
      setScanError('Please enter a valid description and amount for at least one transaction.');
      return;
    }

    try {
      const payload = itemsToLog.map(item => ({
        description: item.description,
        amount: item.parsedAmount,
        type: item.type,
        category: item.category,
        date: item.date,
        splitWithPartner: item.splitWithPartner
      }));

      await onBulkAdd(payload);
      onClose();
    } catch (err: any) {
      setScanError(err.message || 'Error logging transactions. Please try again.');
    }
  };

  // Compute stats
  const totalItems = extractedItems.length;
  const totalOutflow = extractedItems
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + (parseFloat(item.amount.replace(/,/g, '')) || 0), 0);
  const totalInflow = extractedItems
    .filter(item => item.type === 'income')
    .reduce((sum, item) => sum + (parseFloat(item.amount.replace(/,/g, '')) || 0), 0);
  const netImpact = totalInflow - totalOutflow;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: '1.75rem', width: '100%', maxWidth: '850px', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-color)', fontFamily: 'var(--font-sans)' }}>
              Scan & Import Entries
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
              Auto-log multiple receipts or transaction histories in one go.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px', borderRadius: '9999px', background: 'var(--nav-pill-bg)',
              border: '1px solid var(--border-color)', color: 'var(--ink-color)', cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {scanError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px', color: 'var(--coral-losses)', fontSize: '0.8rem', fontWeight: 550
            }}>
              <AlertCircle size={14} className="shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Mode toggle + Import zone when empty */}
          {extractedItems.length === 0 && !isScanning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* iOS style Segmented Control */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-muted)' }}>
                  Processing Mode
                </label>
                <div style={{
                  display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                  borderRadius: '9999px', padding: '3px', position: 'relative'
                }}>
                  {(['auto', 'receipt', 'statement'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      style={{
                        flex: 1, padding: '7px 0', fontSize: '0.8rem', fontWeight: mode === m ? 600 : 500,
                        borderRadius: '9999px', border: 'none', background: mode === m ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: mode === m ? 'var(--ink-color)' : 'var(--ink-muted)', cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
                      }}
                    >
                      {m === 'auto' ? 'Auto-Detect' : m === 'receipt' ? 'Single Receipt' : 'Bank Statement'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: '220px', border: '2px dashed var(--border-color)', borderRadius: '1.25rem',
                  padding: '2rem', background: 'rgba(255,255,255,0.01)', transition: 'all 0.2s', textAlign: 'center'
                }}
              >
                <div style={{
                  width: '54px', height: '54px', borderRadius: '9999px', background: 'var(--nav-pill-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
                  border: '1px solid var(--border-color)', color: 'var(--ink-color)'
                }}>
                  <Upload size={22} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink-color)' }}>
                  Upload transaction photo or screenshot
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', maxWidth: '380px', marginTop: '4px', marginBottom: '1.5rem' }}>
                  Supports camera photos of paper receipts, and screenshots of bank transaction logs, SMS, or accounts.
                </p>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={triggerCamera}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                      borderRadius: '9999px', border: '1px solid var(--border-color)', background: 'var(--ink-color)',
                      color: 'var(--bg-color)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    <Camera size={14} />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={triggerUpload}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                      borderRadius: '9999px', border: '1px solid var(--border-color)', background: 'var(--nav-pill-bg)',
                      color: 'var(--ink-color)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    <Upload size={14} />
                    <span>Select Screenshot</span>
                  </button>
                </div>

                {/* Hidden input tags */}
                <input
                  type="file" ref={fileInputRef} accept="image/*"
                  onChange={handleFileChange} style={{ display: 'none' }}
                />
                <input
                  type="file" ref={cameraInputRef} accept="image/*" capture="environment"
                  onChange={handleFileChange} style={{ display: 'none' }}
                />
              </div>
            </div>
          )}

          {/* Loader when scanning */}
          {isScanning && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '3rem 1rem', gap: '1rem', textAlign: 'center'
            }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--emerald-gains)' }} />
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink-color)' }}>
                  Analyzing Image with OCR...
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  Reading text to extract transaction dates, descriptions, and amounts.
                </p>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', maxWidth: '280px', height: '5px', borderRadius: '9999px', background: 'var(--border-color)', overflow: 'hidden', marginTop: '4px' }}>
                <motion.div
                  style={{ height: '100%', background: 'var(--emerald-gains)' }}
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--ink-muted)' }}>{scanProgress}%</span>
            </div>
          )}

          {/* Review List / Table */}
          {extractedItems.length > 0 && !isScanning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Review Extracted Data ({totalItems} items found)
                </span>
                <button
                  type="button"
                  onClick={() => setExtractedItems([])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none',
                    color: 'var(--coral-losses)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={11} /> Clear All & Re-Scan
                </button>
              </div>

              {/* Table Container */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink-muted)', width: '130px' }}>Date</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink-muted)' }}>Description</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink-muted)', width: '110px' }}>Type</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink-muted)', width: '160px' }}>Category</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink-muted)', width: '110px', textAlign: 'right' }}>Amount (Rs.)</th>
                      {partnerProfile && <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink-muted)', width: '60px', textAlign: 'center' }}>Split</th>}
                      <th style={{ padding: '10px 12px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedItems.map((item) => (
                      <tr key={item.tempId} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                        {/* Date */}
                        <td style={{ padding: '8px' }}>
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => handleItemChange(item.tempId, 'date', e.target.value)}
                            style={{
                              width: '100%', background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)',
                              borderRadius: '6px', padding: '5px 8px', color: 'var(--ink-color)', fontSize: '0.78rem', outline: 'none'
                            }}
                          />
                        </td>

                        {/* Description */}
                        <td style={{ padding: '8px' }}>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(item.tempId, 'description', e.target.value)}
                            style={{
                              width: '100%', background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)',
                              borderRadius: '6px', padding: '5px 8px', color: 'var(--ink-color)', fontSize: '0.78rem', outline: 'none'
                            }}
                          />
                        </td>

                        {/* Type Toggle */}
                        <td style={{ padding: '8px' }}>
                          <select
                            value={item.type}
                            onChange={(e) => handleItemChange(item.tempId, 'type', e.target.value)}
                            style={{
                              width: '100%', background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)',
                              borderRadius: '6px', padding: '5px 8px', color: 'var(--ink-color)', fontSize: '0.78rem', outline: 'none'
                            }}
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                        </td>

                        {/* Category Dropdown */}
                        <td style={{ padding: '8px' }}>
                          <select
                            value={item.category}
                            onChange={(e) => handleItemChange(item.tempId, 'category', e.target.value)}
                            style={{
                              width: '100%', background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)',
                              borderRadius: '6px', padding: '5px 8px', color: 'var(--ink-color)', fontSize: '0.78rem', outline: 'none'
                            }}
                          >
                            {item.type === 'income' 
                              ? INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                              : EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                            }
                          </select>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '8px' }}>
                          <input
                            type="text"
                            value={item.amount}
                            onChange={(e) => handleItemChange(item.tempId, 'amount', e.target.value)}
                            style={{
                              width: '100%', background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)',
                              borderRadius: '6px', padding: '5px 8px', color: 'var(--ink-color)', fontSize: '0.78rem',
                              textAlign: 'right', fontWeight: 600, outline: 'none'
                            }}
                          />
                        </td>

                        {/* Partner Split 50/50 */}
                        {partnerProfile && (
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {item.type === 'expense' ? (
                              <input
                                type="checkbox"
                                checked={item.splitWithPartner}
                                onChange={(e) => handleItemChange(item.tempId, 'splitWithPartner', e.target.checked)}
                                style={{ transform: 'scale(1.15)', cursor: 'pointer' }}
                              />
                            ) : (
                              <span style={{ color: 'var(--ink-light)', fontSize: '0.7rem' }}>-</span>
                            )}
                          </td>
                        )}

                        {/* Delete Row */}
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.tempId)}
                            style={{ background: 'none', border: 'none', color: 'var(--ink-light)', cursor: 'pointer', padding: '4px' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--coral-losses)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-light)'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add row manually button */}
              <button
                type="button"
                onClick={handleAddRow}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '9px', border: '1px dashed var(--border-color)', borderRadius: '10px',
                  background: 'none', color: 'var(--ink-muted)', fontSize: '0.78rem', fontWeight: 550,
                  cursor: 'pointer', width: '100%', transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <Plus size={13} /> Add Manual Row
              </button>
            </div>
          )}
        </div>

        {/* Footer Summary / Stats */}
        {extractedItems.length > 0 && !isScanning && (
          <div style={{
            padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-color)',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Entries</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink-color)' }}>{totalItems}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Outflow</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--coral-losses)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <TrendingDown size={13} /> Rs. {totalOutflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Inflow</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--emerald-gains)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <TrendingUp size={13} /> Rs. {totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Net Balance Impact</span>
              <span style={{
                fontSize: '1rem', fontWeight: 700,
                color: netImpact >= 0 ? 'var(--emerald-gains)' : 'var(--coral-losses)'
              }}>
                {netImpact >= 0 ? '+' : ''}Rs. {netImpact.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Modal Action Bar */}
        <div style={{
          padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)',
          display: 'flex', gap: '12px', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.01)'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-color)',
              background: 'transparent', color: 'var(--ink-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          {extractedItems.length > 0 && !isScanning && (
            <button
              type="button"
              onClick={handleSubmitAll}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 22px', borderRadius: '12px', border: 'none',
                background: 'var(--ink-color)', color: 'var(--bg-color)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={14} />
              <span>Confirm & Log {totalItems} Entries</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
