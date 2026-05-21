import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Webcam from 'react-webcam';
import { Camera, Trash2, Droplet, Shield, LogOut, Trophy, User, X, Upload } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [nimInput, setNimInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regForm, setRegForm] = useState({ nama: '', nim: '', prodi: '', email: '' });
  const [leaders, setLeaders] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  const webcamRef = useRef(null);

  // --- AMBIL DATA PROFIL TERBARU ---
  const fetchUserData = async (userId) => {
    if (!userId) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (profile) setUser(profile);
  };

  // --- LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const nimBersih = nimInput.trim();
    if (!nimBersih) return alert('Masukkan NIM Anda!');
    
    const nimAngka = Number(nimBersih);
    if (isNaN(nimAngka)) return alert('NIM harus berupa angka murni!');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('nim', nimAngka)
      .maybeSingle();

    if (error) return alert('Terjadi kesalahan database: ' + error.message);
    
    if (!data) {
      alert(`NIM ${nimAngka} tidak ditemukan di database. Pastikan terdaftar.`);
    } else {
      setUser(data);
    }
  };

  // --- REGISTRASI ---
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.nama || !regForm.nim || !regForm.prodi || !regForm.email) {
      return alert('Mohon isi semua biodata!');
    }
    
    const nimAngka = Number(regForm.nim.trim());
    if (isNaN(nimAngka)) return alert('NIM harus berupa angka murni!');

    const { data: cekNim } = await supabase
      .from('profiles')
      .select('nim')
      .eq('nim', nimAngka)
      .maybeSingle();

    if (cekNim) return alert('NIM ini sudah terdaftar! Silakan langsung login.');

    const uuidBaru = self.crypto.randomUUID();

    const { error } = await supabase.from('profiles').insert([
      { 
        id: uuidBaru, 
        nama: regForm.nama, 
        nim: nimAngka, 
        prodi: regForm.prodi, 
        email: regForm.email, 
        total_bintang: 0,
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
      }
    ]);
    
    if (error) {
      alert('Gagal Registrasi: ' + error.message);
    } else {
      alert('Registrasi Berhasil! Silakan masuk menggunakan NIM Anda.');
      setIsRegistering(false);
      setNimInput(regForm.nim);
    }
  };

  // --- UBAH FOTO PROFIL ---
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('aktivitas').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('aktivitas').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      alert('Foto profil Anda berhasil diperbarui!');
      fetchUserData(user.id);
    } catch (err) {
      alert('Gagal ubah foto profil: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // --- CAMERA CAPTURE & TAMBAH BINTANG ---
  const captureAndUpload = async () => {
    if (!webcamRef.current) return;
    setUploading(true);
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Gagal mengambil gambar dari kamera.");
      
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      
      const fileName = `${cameraOpen}_${user.nim}_${Date.now()}.jpg`;
      
      const { error: storageError } = await supabase.storage
        .from('aktivitas')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
        
      if (storageError) throw storageError;

      // Update total bintang di tabel profiles secara langsung
      const bintangSaatIni = Number(user.total_bintang) || 0;
      const bintangBaru = bintangSaatIni + 1;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ total_bintang: bintangBaru })
        .eq('id', user.id);

      if (profileError) throw profileError;

      alert(`Aksi Berhasil Tercatat!\nPoin Anda bertambah +1 Bintang ⭐`);
      setCameraOpen(null);
      await fetchUserData(user.id);
      
    } catch (err) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // --- LEADERBOARD ---
  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, prodi, total_bintang, avatar_url')
        .order('total_bintang', { ascending: false, nullsFirst: false })
        .limit(10);

      if (error) throw error;
      if (data) setLeaders(data);
    } catch (err) {
      console.error("Gagal memuat leaderboard:", err.message);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchLeaderboard();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchUserData(user.id);
    }
  }, [user?.id]); 

  // --- TAMPILAN JIKA BELUM LOGIN ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EBF3EE] p-4 font-sans">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-gray-100 text-gray-800">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-[#29513C]/10 text-[#29513C] rounded-full text-[10px] font-semibold uppercase tracking-wider mb-2">
              FPMIPA UPI
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Eco Nudge System</h1>
            <p className="text-xs text-gray-500 mt-1">Intervensi Perilaku Pro-Lingkungan Mahasiswa</p>
          </div>

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1 uppercase">NIM</label>
                <input type="text" placeholder="Masukkan NIM Anda" value={nimInput} onChange={(e) => setNimInput(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#29513C]" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#29513C] text-white font-semibold rounded-xl text-sm shadow-md">
                Masuk Aplikasi
              </button>
              <div className="text-center text-xs text-gray-500 pt-2">
                Belum terdaftar? <span onClick={() => setIsRegistering(true)} className="text-[#3D795A] font-semibold underline cursor-pointer">Registrasi di sini</span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <input type="text" placeholder="Nama Lengkap" value={regForm.nama} onChange={(e) => setRegForm({...regForm, nama: e.target.value})} className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#29513C]" />
              <input type="text" placeholder="NIM" value={regForm.nim} onChange={(e) => setRegForm({...regForm, nim: e.target.value})} className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#29513C]" />
              <input type="text" placeholder="Program Studi" value={regForm.prodi} onChange={(e) => setRegForm({...regForm, prodi: e.target.value})} className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#29513C]" />
              <input type="email" placeholder="Email Student UPI" value={regForm.email} onChange={(e) => setRegForm({...regForm, email: e.target.value})} className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#29513C]" />
              <button type="submit" className="w-full py-2.5 bg-[#29513C] text-white font-semibold rounded-xl text-sm shadow-md">
                Daftar Akun
              </button>
              <div className="text-center text-xs text-gray-500 pt-1">
                Sudah punya akun? <span onClick={() => setIsRegistering(false)} className="text-[#3D795A] font-semibold underline cursor-pointer">Login</span>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- TAMPILAN UTAMA ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-2xl relative border-x border-slate-100">
        
        {/* NAVBAR */}
        <nav className="bg-white/90 border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">EcoNudge</span>
          </div>
          
          <div onClick={() => setIsProfileOpen(true)} className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 py-1 px-2.5 rounded-full border border-slate-200 cursor-pointer transition-all">
            <img 
              src={user.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
              alt="Avatar" 
              className="w-5 h-5 rounded-full object-cover border border-slate-300"
            />
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[70px]">{user.nama ? user.nama.split(' ')[0] : 'User'}</span>
          </div>
        </nav>

        {/* KONTEN UTAMA */}
        <main className="flex-1 px-4 py-5 space-y-5 pb-24 overflow-y-auto">
          
          {/* CARD UTAMA BINTANG */}
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-900 text-white rounded-xl p-5 shadow-md relative overflow-hidden">
            <span className="text-emerald-200 text-[10px] font-bold tracking-wider uppercase bg-emerald-700/50 px-2 py-0.5 rounded-full">
              Dashboard Mahasiswa
            </span>
            <h1 className="text-xl font-black mt-2 truncate">{user.nama}</h1>
            <p className="text-emerald-100/70 text-xs mt-0.5 truncate">{user.prodi} • {user.nim}</p>
            
            <div className="mt-4 pt-4 border-t border-emerald-700/40 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-200/70 font-medium uppercase tracking-wider">Apresiasi Terkumpul</p>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="text-3xl font-black text-amber-300">{user.total_bintang || 0}</span>
                  <span className="text-xs font-bold text-emerald-100">Bintang Emas ⭐</span>
                </div>
              </div>
            </div>
          </div>

          {/* TOMBOL AKSI UTAMA */}
          {!cameraOpen && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Laporkan Aksi Hijau</h3>
              <div className="grid grid-cols-1 gap-2.5">
                
                <button onClick={() => setCameraOpen('tumbler')} className="flex items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-600 active:bg-slate-50 text-left transition-all">
                  <div className="bg-blue-50 text-blue-600 p-2.5 rounded-lg mr-3">
                    <Droplet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Bawa Tumbler Sendiri</span>
                    <span className="text-[11px] text-slate-400">Selfie bareng tumbler kesayangan (+1 ⭐)</span>
                  </div>
                </button>

                <button onClick={() => setCameraOpen('pilih_sampah')} className="flex items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-600 active:bg-slate-50 text-left transition-all">
                  <div className="bg-amber-50 text-amber-600 p-2.5 rounded-lg mr-3">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Buang & Pilah Sampah</span>
                    <span className="text-[11px] text-slate-400">Foto pemilahan sampah di kampus (+1 ⭐)</span>
                  </div>
                </button>

              </div>
            </div>
          )}

          {/* PILIH SAMPAH */}
          {cameraOpen === 'pilih_sampah' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <h3 className="text-xs font-bold text-slate-800 mb-2">Pilih Jenis Sampah</h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button onClick={() => setCameraOpen('sampah_organik')} className="p-2 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg">🍃 Organik</button>
                <button onClick={() => setCameraOpen('sampah_anorganik')} className="p-2 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-lg">♳ Anorganik</button>
                <button onClick={() => setCameraOpen('sampah_b3')} className="p-2 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-lg">⚠️ B3</button>
              </div>
              <button onClick={() => setCameraOpen(null)} className="text-[11px] text-slate-400 font-medium underline">Batal</button>
            </div>
          )}

          {/* WEBCAM AREA */}
          {cameraOpen && cameraOpen !== 'pilih_sampah' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-900 px-3 py-2 flex items-center justify-between text-white text-[11px]">
                <span className="font-mono">Kamera: {cameraOpen.replace('_', ' ')}</span>
                <span onClick={() => setCameraOpen(null)} className="underline cursor-pointer">Tutup</span>
              </div>
              <div className="bg-black aspect-video relative">
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" videoConstraints={{ facingMode: "user" }} />
              </div>
              <div className="p-3 bg-slate-50 text-center">
                <button disabled={uploading} onClick={captureAndUpload} className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm disabled:opacity-50">
                  {uploading ? 'Memproses...' : 'Ambil & Kirim Foto'}
                </button>
              </div>
            </div>
          )}

          {/* LEADERBOARD */}
          <div className="space-y-3">
            <div className="flex items-center space-x-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Top 10 Peringkat Kampus</h2>
            </div>

            <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200/60">
              {leaders.map((leader, index) => (
                <div key={leader.id || index} className={`flex items-center justify-between p-2.5 rounded-lg bg-white border ${leader.id === user?.id ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-100'}`}>
                  <div className="flex items-center space-x-2.5 truncate">
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-black ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400'}`}>
                      {index + 1}
                    </span>
                    <img 
                      src={leader.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                      alt="Leader" 
                      className="w-6 h-6 rounded-full object-cover border border-slate-200"
                    />
                    <div className="truncate">
                      <span className="font-bold text-xs text-slate-800 block truncate max-w-[130px]">{leader.nama}</span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">{leader.prodi || 'Mahasiswa'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-0.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 text-[11px] font-bold text-amber-700">
                    {leader.total_bintang || 0} ⭐
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>

        {/* MODAL PROFIL */}
        {isProfileOpen && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
            <div className="w-full bg-white rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl relative">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">Profil Saya</h3>
                </div>
                <button onClick={() => setIsProfileOpen(false)} className="p-1 rounded-full bg-slate-100 text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center py-2 space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="relative">
                  <img 
                    src={user.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                    alt="Profil" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                  />
                  <label className="absolute bottom-0 right-0 bg-emerald-600 text-white p-1 rounded-full cursor-pointer hover:bg-emerald-700 shadow-md">
                    <Upload className="w-3 h-3" />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Klik ikon kamera untuk ganti foto profil</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Data Biodata</h4>
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Nama Lengkap</span> <span className="font-bold text-slate-800 text-right">{user.nama}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">NIM</span> <span className="font-mono font-bold text-slate-800">{user.nim}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Program Studi</span> <span className="font-bold text-slate-800 text-right">{user.prodi}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Email UPI</span> <span className="font-bold text-slate-800 text-right truncate max-w-[180px]">{user.email}</span></div>
                </div>
              </div>

              <button 
                onClick={() => { setUser(null); setIsProfileOpen(false); }}
                className="w-full py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 border border-rose-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun (Logout)</span>
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
