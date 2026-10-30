import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  X, 
  Eye, 
  EyeOff, 
  KeyRound, 
  AlertCircle,
  HelpCircle
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
      setErrorMessage('PIN salah. Silakan coba lagi (PIN bawaan: 1234).');
    }
  };

  const handleQuickKey = (digit: string) => {
    if (pinInput.length < 8) {
      setPinInput(prev => prev + digit);
      setErrorMessage('');
    }
  };

  const handleDeleteKey = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="w-full max-w-md bg-[#0e1424] border border-blue-500/30 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-950/40 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40 glow-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Login Menu Administrator</h3>
              <p className="text-xs text-slate-400">Akses khusus Guru &amp; Wali Kelas</p>
            </div>
          </div>

          <button
            onClick={() => {
              setPinInput('');
              setErrorMessage('');
              onClose();
            }}
            aria-label="Tutup Dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-xs text-slate-400 leading-relaxed">
            Halaman ini khusus untuk pengelola presensi. Masukkan PIN keamanan untuk membuka akses rekapitulasi lengkap, ekspor laporan, dan konfigurasi webhook.
          </p>

          {/* PIN Input field */}
          <div className="space-y-2">
            <label htmlFor="adminPinInput" className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-blue-400" />
                PIN Keamanan
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
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
                maxLength={8}
                placeholder="Masukkan PIN Admin..."
                className="w-full px-4 py-3.5 rounded-2xl glass-input text-center text-lg tracking-widest font-mono font-bold"
                autoFocus
                autoComplete="off"
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 text-xs text-[#ff0055] bg-pink-500/10 border border-pink-500/30 p-2.5 rounded-xl animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0" />
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
                className="py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] active:bg-blue-600/30 border border-white/5 font-mono text-base font-bold text-slate-200 transition-all select-none"
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
              className="py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-xs font-semibold text-slate-400 transition-all select-none"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleQuickKey('0')}
              className="py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] active:bg-blue-600/30 border border-white/5 font-mono text-base font-bold text-slate-200 transition-all select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDeleteKey}
              className="py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-xs font-semibold text-slate-400 transition-all select-none"
            >
              ⌫
            </button>
          </div>

          {/* Hint badge */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-400 shrink-0" />
            <span>PIN bawaan pengelola sekolah: <strong>1234</strong></span>
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
              className="w-1/3 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-bold text-xs transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5"
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
