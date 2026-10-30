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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Pengaturan Webhook &amp; Database</h3>
              <p className="text-xs text-slate-500 font-medium">
                Konfigurasi Google Apps Script Webhook &amp; Backup Data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup Dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          
          {/* Section: Google Apps Script POST URL */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Link className="h-4 w-4 text-blue-600" />
              URL Webhook Kirim Presensi (Google Apps Script POST)
            </label>
            <input
              type="text"
              value={postUrlInput}
              onChange={(e) => setPostUrlInput(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              placeholder="https://script.google.com/macros/s/.../exec"
            />
            <p className="text-[11px] text-slate-500 font-medium">
              Digunakan saat menekan tombol "Kirim Data Absensi" di halaman kalender presensi.
            </p>
          </div>

          {/* Section: Google Apps Script GET Rekap URL */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Link className="h-4 w-4 text-emerald-600" />
              URL Webhook Ambil Rekap (Google Apps Script GET)
            </label>
            <input
              type="text"
              value={getUrlInput}
              onChange={(e) => setGetUrlInput(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              placeholder="https://script.google.com/macros/s/.../exec?action=getRekap"
            />
          </div>

          {/* Test & Save buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleSaveUrls}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              {savedSuccess ? <Check className="h-4 w-4 text-white" /> : null}
              <span>{savedSuccess ? 'Tersimpan!' : 'Simpan URL'}</span>
            </button>

            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : null}
              <span>Uji Koneksi Script</span>
            </button>

            <button
              onClick={() => {
                setPostUrlInput('https://script.google.com/macros/s/AKfycbyhgB0SSJjnfxh3UMM5Me6NmX9RveRZTP6g_261JM_GKM_htyxANqnNl7a3UR51zMXX2A/exec');
                setGetUrlInput('https://script.google.com/macros/s/AKfycbxFIRwEd3XrYx00hZOljYXt9alJracAH_APABCPUeYKhtMJNxkRwrL2oOmmDv92RKiR/exec?action=getRekap');
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all cursor-pointer"
            >
              Gunakan URL Baru (...AKfycbyhg)
            </button>

            <button
              onClick={() => {
                setPostUrlInput(DEFAULT_SCRIPT_POST_URL);
                setGetUrlInput(DEFAULT_SCRIPT_GET_REKAP_URL);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline ml-auto cursor-pointer"
            >
              Reset ke Default
            </button>
          </div>

          {testResult.message && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.status === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testResult.status === 'success' ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Section: PIN Keamanan Admin */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-emerald-600" />
              PIN Keamanan Akses Admin
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              PIN ini digunakan untuk mengunci menu admin dari siswa/orang awam.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={12}
                className="w-48 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-center text-sm font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                placeholder="PIN Keamanan"
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
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                {pinSuccess ? 'PIN Diperbarui!' : 'Simpan PIN Baru'}
              </button>
            </div>
          </div>

          {/* Section: Database & Local Backup */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-indigo-600" />
              Cadangan &amp; Pemulihan Data Lokal
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Data absensi tersimpan otomatis secara lokal di peramban Anda dan tersinkron ke cloud Google Sheets.
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={onExportJson}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="h-4 w-4 text-slate-500" />
                <span>Unduh Cadangan JSON</span>
              </button>

              <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer">
                <Upload className="h-4 w-4 text-slate-500" />
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
                  if (confirm('Apakah Anda yakin ingin mengatur ulang data ke data awal?')) {
                    onResetToDefault();
                    alert('Data berhasil di-reset ke nilai awal.');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 flex items-center gap-1.5 transition-all ml-auto cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset ke Data Awal</span>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
