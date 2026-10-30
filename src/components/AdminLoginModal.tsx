import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  X, 
  Eye, 
  EyeOff, 
  KeyRound, 
  AlertCircle
} from 'lucide-react';
import { verifyAdminPin } from '../utils/auth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  storedPin: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  storedPin,
}) => {
  if (!isOpen) return null;

  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      setErrorMessage('Harap masukkan PIN Admin.');
      return;
    }

    if (verifyAdminPin(pinInput, storedPin)) {
      setErrorMessage('');
      setPinInput('');
      onLoginSuccess();
    } else {
      setErrorMessage('PIN salah. Silakan coba lagi.');
    }
  };

  const handleQuickKey = (digit: string) => {
    if (pinInput.length < 12) {
      setPinInput(prev => prev + digit);
      setErrorMessage('');
    }
  };

  const handleDeleteKey = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Login Administrator</h3>
              <p className="text-xs text-slate-500 font-medium">Akses khusus Guru &amp; Wali Kelas</p>
            </div>
          </div>

          <button
            onClick={() => {
              setPinInput('');
              setErrorMessage('');
              onClose();
            }}
            aria-label="Tutup Dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Masukkan PIN pengelola presensi untuk membuka akses manajemen siswa lengkap, rekapitulasi kelas, serta integrasi webhook Google Apps Script.
          </p>

          {/* PIN Input field */}
          <div className="space-y-2">
            <label htmlFor="adminPinInput" className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-blue-600" />
                PIN Keamanan
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{showPin ? 'Sembunyikan' : 'Tampilkan'}</span>
              </button>
            </label>

            <div className="relative">
              <input
                id="adminPinInput"
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setErrorMessage('');
                }}
                maxLength={12}
                placeholder="Masukkan PIN Admin..."
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 text-center text-lg tracking-widest font-mono font-bold focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-sm"
                autoFocus
                autoComplete="off"
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Virtual Quick Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleQuickKey(num)}
                className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-blue-50 border border-slate-200 font-mono text-base font-bold text-slate-800 transition-all select-none shadow-sm cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPinInput('');
                setErrorMessage('');
              }}
              className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-600 transition-all select-none cursor-pointer"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleQuickKey('0')}
              className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-blue-50 border border-slate-200 font-mono text-base font-bold text-slate-800 transition-all select-none shadow-sm cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDeleteKey}
              className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-600 transition-all select-none cursor-pointer"
            >
              ⌫
            </button>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setPinInput('');
                setErrorMessage('');
                onClose();
              }}
              className="w-1/3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              <span>Buka Menu Admin</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
