import React from 'react';
import { Sparkles, ArrowRight, Lightbulb, ShieldCheck } from 'lucide-react';

export default function HomePoster({ onComplete }) {

  return (
    <div className="min-h-screen flex flex-col items-center pt-8 pb-32 px-4 font-sans select-none overflow-x-hidden relative mx-auto max-w-md shadow-2xl" style={{ backgroundColor: '#9DD6FF' }}>
      
      {/* DEKORASI LATAR BELAKANG (EFEK RAMAI LEMBUT ALA AWAN) */}
      <div className="absolute top-[5%] left-[-60px] w-64 h-64 bg-white/40 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute top-[45%] right-[-60px] w-72 h-72 bg-white/30 rounded-full blur-[90px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-[-40px] w-56 h-56 bg-emerald-200/30 rounded-full blur-[70px] pointer-events-none"></div>

      {/* HEADER AREA */}
      <div className="text-center w-full mb-6 z-10 px-2">
        <div className="inline-flex items-center space-x-2 bg-emerald-600/10 text-emerald-800 text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-emerald-600/20 mb-3.5 shadow-inner">
          <Sparkles className="w-3 h-3" />
          <span>MISSION BRIEFING AREA</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tighter mb-2.5">
          Spill Core Action:<br />
          <span className="bg-gradient-to-r from-emerald-700 to-teal-800 bg-clip-text text-transparent">
            Sustainable Campus
          </span>
        </h1>
        <p className="text-xs text-slate-800 max-w-sm mx-auto leading-relaxed font-semibold">
          Fix no debat, bumi kita butuh pro-environmental behavior kamu. Yuk, baca materi penting ini sampai tuntas sebelum gaspol mulai aksi penyelamatan lingkungan kampus kamu! No ghosting, no skip.
        </p>
      </div>

      {/* KONTAINER POSTER AREA */}
      <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl p-3 shadow-xl border border-white/50 mb-6 z-10">
        <div className="bg-white rounded-2xl p-1 w-full overflow-hidden shadow-sm">
          <img 
            src="/images/poster-sustainable-campus.jpeg" 
            alt="Sustainable Campus Infografis" 
            className="w-full h-auto rounded-xl object-contain block"
            onError={(e) => {
              e.target.onerror = null;
              e.target.parentNode.innerHTML = `
                <div className="text-center py-24 text-slate-600 h-full flex flex-col justify-center bg-slate-50 rounded-xl px-4">
                  <p className="text-xs font-bold text-slate-800">🖼️ Gambar Poster Belum Terbaca</p>
                  <p className="text-[11px] text-slate-500 mt-2 max-w-xs mx-auto">
                    Pastikan file poster ditaruh di folder: <br/>
                    <span className="text-emerald-700 font-mono font-bold block mt-1">public/images/poster-sustainable-campus.jpeg</span>
                  </p>
                </div>
              `;
            }}
          />
        </div>
      </div>

      {/* KATA-KATA DI BAWAH POSTER (GEN Z STYLE) */}
      <div className="w-full z-10 px-2 mb-6 text-center space-y-4">
        <div className="bg-white/40 border border-white/60 rounded-2xl p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-center space-x-1.5 text-emerald-800 font-black text-xs uppercase tracking-wider mb-1.5">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Core Memory Unlocked</span>
          </div>
          <p className="text-xs text-slate-800 leading-relaxed font-semibold">
            Gimana? Udah dapet semua insight-nya kan? Langkah kecil kita di kampus bakalan jadi penentu masa depan yang lebih green dan sehat. Real action* dimulai dari kesadaran diri sendiri!
          </p>
        </div>

        <div className="bg-emerald-950/10 border border-emerald-900/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-center space-x-1.5 text-emerald-900 font-black text-xs uppercase tracking-wider mb-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Valid No Debat</span>
          </div>
          <p className="text-xs text-slate-800 leading-relaxed font-semibold">
            Jangan cuma di-stuck jadi teori doang. Yuk gabung bareng squad mahasiswa lainnya buat langsung buktiin aksi nyata kamu sekarang!
          </p>
        </div>
      </div>

      {/* FIXED BOTTOM NAVIGATION BAR (MENGUNCI SISI UKURAN MOBILE) */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-900 py-4 px-4 flex justify-center items-center shadow-[0_-8px_20px_rgba(0,0,0,0.3)] rounded-t-2xl">
        <button
          onClick={onComplete} 
          className="group w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black py-3.5 px-6 rounded-xl text-xs tracking-wider transition-all duration-300 shadow-md shadow-emerald-500/10 active:scale-[0.98] focus:outline-none"
        >
          <span>MULAI AKSI SEKARANG!</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>

    </div>
  );
}