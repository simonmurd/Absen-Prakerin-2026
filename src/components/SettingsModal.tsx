import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Link, 
  Database, 
  RotateCcw, 
  Download, 
  Upload, 
  Check, 
  AlertCircle,
  Loader2,
  Lock,
  KeyRound
} from 'lucide-react';
import { DEFAULT_SCRIPT_POST_URL, DEFAULT_SCRIPT_GET_REKAP_URL } from '../data/students';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptPostUrl: string;
  onSaveScriptPostUrl: (url: string) => void;
  scriptGetRekapUrl: string;
  onSaveScriptGetRekapUrl: (url: string) => void;
  onResetToDefault: () => void;
  onExportJson: () => void;
  onImportJson: (jsonData: string) => boolean;
  adminPin: string;
  onSaveAdminPin: (pin: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  scriptPostUrl,
  onSaveScriptPostUrl,
  scriptGetRekapUrl,
  onSaveScriptGetRekapUrl,
  onResetToDefault,
  onExportJson,
  onImportJson,
  adminPin,
  onSaveAdminPin,
}) => {
  if (!isOpen) return null;

  const [postUrlInput, setPostUrlInput] = useState<string>(scriptPostUrl);
  const [getUrlInput, setGetUrlInput] = useState<string>(scriptGetRekapUrl);
  const [pinInput, setPinInput] = useState<string>(adminPin);
  const [pinSuccess, setPinSuccess] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'fail'; message: string }>({
    status: 'idle',
    message: '',
  });

  const handleSaveUrls = () => {
    onSaveScriptPostUrl(postUrlInput);
    onSaveScriptGetRekapUrl(getUrlInput);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult({ status: 'idle', message: '' });

    try {
      // Test the GET rekap endpoint
      const res = await fetch(getUrlInput, { mode: 'no-cors' });
      setTestResult({
        status: 'success',
        message: 'Endpoint Google Apps Script dapat diakses dengan baik.',
      });
    } catch (err: any) {
      setTestResult({
        status: 'fail',
        message: 'Tidak dapat menjangkau Apps Script. Periksa koneksi internet atau permission Google Script.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = onImportJson(content);
        if (ok) {
          alert('Database presensi berhasil dipulihkan dari file JSON!');
        } else {
          alert('Format file JSON tidak valid.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="w-full max-w-xl bg-[#0e1424] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pengaturan Integrasi &amp; Database</h3>
              <p className="text-xs text-slate-400">
                Konfigurasi Google Apps Script Webhook &amp; Backup Data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup Dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          
          {/* Section: Google Apps Script POST URL */}
          <div className="space-y-2">
            <label className="font-bold text-slate-200 flex items-center gap-1.5">
              <Link className="h-4 w-4 text-blue-400" />
              URL Webhook Kirim Presensi (Google Apps Script POST)
            </label>
            <input
              type="text"
              value={postUrlInput}
              onChange={(e) => setPostUrlInput(e.target.value)}
              className="w-full p-3 rounded-xl glass-input text-xs font-mono"
              placeholder="https://script.google.com/macros/s/.../exec"
            />
            <p className="text-[11px] text-slate-500">
              Digunakan saat menekan tombol "Kirim Data Absensi" di halaman kalender.
            </p>
          </div>

          {/* Section: Google Apps Script GET Rekap URL */}
          <div className="space-y-2">
            <label className="font-bold text-slate-200 flex items-center gap-1.5">
              <Link className="h-4 w-4 text-emerald-400" />
              URL Webhook Ambil Rekap (Google Apps Script GET)
            </label>
            <input
              type="text"
              value={getUrlInput}
              onChange={(e) => setGetUrlInput(e.target.value)}
              className="w-full p-3 rounded-xl glass-input text-xs font-mono"
              placeholder="https://script.google.com/macros/s/.../exec?action=getRekap"
            />
          </div>

          {/* Test & Save buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleSaveUrls}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20"
            >
              {savedSuccess ? <Check className="h-4 w-4 text-white" /> : null}
              <span>{savedSuccess ? 'Tersimpan!' : 'Simpan URL'}</span>
            </button>

            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 font-bold text-xs border border-white/10 flex items-center gap-1.5 transition-colors"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Uji Koneksi Script</span>
            </button>

            <button
              onClick={() => {
                setPostUrlInput(DEFAULT_SCRIPT_POST_URL);
                setGetUrlInput(DEFAULT_SCRIPT_GET_REKAP_URL);
              }}
              className="text-xs text-slate-400 hover:text-white underline ml-auto"
            >
              Kembalikan URL Default
            </button>
          </div>

          {testResult.message && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.status === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-[#00ff9d]' 
                : 'bg-pink-500/10 border-pink-500/20 text-[#ff0055]'
            }`}>
              {testResult.status === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Section: PIN Keamanan Admin */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-emerald-400" />
              PIN Keamanan Akses Admin
            </h4>
            <p className="text-xs text-slate-400">
              PIN ini digunakan untuk mengunci menu admin dari orang awam/siswa. (Bawaan: 1234)
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={8}
                className="w-40 p-2.5 rounded-xl glass-input text-center text-sm font-mono font-bold"
                placeholder="4-8 digit PIN"
              />
              <button
                type="button"
                onClick={() => {
                  if (pinInput.trim().length >= 4) {
                    onSaveAdminPin(pinInput.trim());
                    setPinSuccess(true);
                    setTimeout(() => setPinSuccess(false), 2000);
                  } else {
                    alert('PIN minimal 4 karakter.');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-[#00ff9d] border border-emerald-500/40 text-xs font-bold transition-all"
              >
                {pinSuccess ? 'PIN Diperbarui!' : 'Simpan PIN Baru'}
              </button>
            </div>
          </div>

          {/* Section: Database & Local Backup */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-purple-400" />
              Cadangan &amp; Pemulihan Data Lokal
            </h4>
            <p className="text-xs text-slate-400">
              Data absensi tersimpan otomatis secara lokal di peramban Anda dan tersinkron ke cloud Google Sheets.
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={onExportJson}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold text-xs border border-white/10 flex items-center gap-1.5 transition-all"
              >
                <Download className="h-4 w-4" />
                <span>Unduh Cadangan JSON</span>
              </button>

              <label className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold text-xs border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer">
                <Upload className="h-4 w-4" />
                <span>Pulihkan dari File JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin mengatur ulang data ke data demo awal?')) {
                    onResetToDefault();
                    alert('Data berhasil di-reset ke nilai awal.');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-[#ff0055] font-semibold text-xs border border-pink-500/20 flex items-center gap-1.5 transition-all ml-auto"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset ke Data Awal</span>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-bold transition-colors"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
