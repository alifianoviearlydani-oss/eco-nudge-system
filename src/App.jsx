import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Webcam from 'react-webcam';
import HomePoster from './HomePoster'; // <-- Mengimpor komponen Poster Baru
import { 
  Camera, Trash2, Droplet, Shield, LogOut, Trophy, 
  User, X, Upload, Leaf, Zap, Heart, Compass, MessageSquare, Image
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // <-- 'login', 'poster', 'dashboard', or 'mading'
  const [nimInput, setNimInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regForm, setRegForm] = useState({ nama: '', nim: '', prodi: '', email: '' });
  const [leaders, setLeaders] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  const webcamRef = useRef(null);

  // --- STATE KHUSUS MADING (PADLET STYLE) ---
  const [madingPosts, setMadingPosts] = useState([]);
  const [madingText, setMadingText] = useState('');
  const [madingImage, setMadingImage] = useState(null);
  const [madingPreviewUrl, setMadingPreviewUrl] = useState(null);
  const [madingLoading, setMadingLoading] = useState(false);

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
      setView('poster'); // Setelah login sukses, diarahkan ke halaman poster dulu!
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

  // --- AMBIL DATA MADING ---
  const fetchMadingPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('timeline_updates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setMadingPosts(data);
    } catch (err) {
      console.error("Gagal memuat mading:", err.message);
    }
  };

  // --- KIRIM POSTINGAN MADING ---
  const handleMadingImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMadingImage(file);
      setMadingPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSendMading = async (e) => {
    e.preventDefault();
    if (!madingText.trim() && !madingImage) return;

    setMadingLoading(true);
    let uploadedImageUrl = '';

    try {
      if (madingImage) {
        const fileExt = madingImage.name.split('.').pop();
        const fileName = `mading_${user.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('aktivitas')
          .upload(fileName, madingImage);
          
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('aktivitas').getPublicUrl(fileName);
        uploadedImageUrl = publicUrl;
      }

      const newPost = {
        username: user.nama,
        jurusan: user.prodi,
        text: madingText.trim(),
        image_url: uploadedImageUrl,
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('timeline_updates')
        .insert([newPost]);

      if (insertError) throw insertError;

      setMadingText('');
      setMadingImage(null); // <-- Di sini sudah diperbaiki menjadi setMadingImage ✅
      setMadingPreviewUrl(null);
      fetchMadingPosts();
    } catch (err) {
      alert('Gagal mengirim ke mading: ' + err.message);
    } finally {
      setMadingLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchMadingPosts();

    const channelProfiles = supabase.channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchLeaderboard();
      }).subscribe();

    const channelMading = supabase.channel('mading-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timeline_updates' }, () => {
        fetchMadingPosts();
      }).subscribe();

    return () => { 
      supabase.removeChannel(channelProfiles); 
      supabase.removeChannel(channelMading);
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchUserData(user.id);
    }
  }, [user?.id]); 

  // --- KONDISI 1: JIKA BELUM LOGIN ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex justify-center">
        <div className="w-full max-w-md bg-[#EBF3EE] min-h-screen flex flex-col justify-center p-4 shadow-2xl border-x border-slate-100">
          <div className="w-full bg-white rounded-2xl p-6 shadow-xl border border-gray-100 text-gray-800">
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
      </div>
    );
  }

  // --- KONDISI 2: TAMPILAN HALAMAN POSTER MATERI ---
  if (view === 'poster') {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen shadow-2xl border-x border-slate-100 overflow-y-auto relative">
          <HomePoster onComplete={() => setView('dashboard')} />

          {/* 💬 ICON CHAT FLOATING BUTTON DI SEBELAH KANAN POSTER */}
          <button 
            onClick={() => setView('mading')}
            className="absolute bottom-6 right-6 w-12 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 z-50 animate-bounce"
            title="Buka Mading Live"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // --- KONDISI 3: VIEW MADING / LIVE TIMELINE ---
  if (view === 'mading') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-2xl relative border-x border-slate-100">
          
          {/* HEADER MADING */}
          <div className="bg-[#006A4E] text-white p-4 sticky top-0 z-40 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <h1 className="font-bold text-base tracking-tight">Live Aksi Hijau</h1>
            </div>
            <button 
              onClick={() => setView('dashboard')}
              className="text-xs font-bold bg-[#004D38] hover:bg-[#003324] px-3 py-1.5 rounded-lg text-emerald-200 transition-all"
            >
              Kembali
            </button>
          </div>

          {/* KONTEN UTAMA MADING */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-28">
            {madingPosts.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-10">
                💬 Belum ada kiriman mading. Mulai sapa teman-temanmu!
              </div>
            ) : (
              madingPosts.map((post, idx) => (
                <div key={post.id || idx} className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 shadow-sm space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 bg-emerald-700 text-white rounded-full flex items-center justify-center text-xs font-bold uppercase">
                      {post.username ? post.username[0] : 'U'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{post.username || 'Anonymous'}</h4>
                      <p className="text-[10px] text-slate-400">{post.jurusan || 'FPMIPA UPI'}</p>
                    </div>
                  </div>
                  
                  {post.text && <p className="text-xs text-slate-700 break-words leading-relaxed">{post.text}</p>}
                  
                  {post.image_url && (
                    <div className="rounded-lg overflow-hidden border border-slate-200/60 bg-slate-100 max-h-52 flex items-center justify-center">
                      <img src={post.image_url} alt="Aksi Mading" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* BAR INPUT STICKY */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <form onSubmit={handleSendMading} className="space-y-2">
              {madingPreviewUrl && (
                <div className="relative inline-block">
                  <img src={madingPreviewUrl} alt="Preview Upload" className="w-14 h-14 object-cover rounded-lg border border-emerald-500" />
                  <button 
                    type="button"
                    onClick={() => { setMadingImage(null); setMadingPreviewUrl(null); }}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <label className="flex items-center justify-center w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer shrink-0 transition-all">
                  <Image className="w-4 h-4 text-slate-500" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleMadingImageChange}
                    disabled={madingLoading}
                  />
                </label>

                <input
                  type="text"
                  value={madingText}
                  onChange={(e) => setMadingText(e.target.value)}
                  placeholder="Ketik kiriman pesan kamu..."
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-full px-4 py-2 focus:outline-none focus:border-emerald-600"
                  disabled={madingLoading}
                />

                <button
                  type="submit"
                  disabled={madingLoading || (!madingText.trim() && !madingImage)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm disabled:opacity-40 transition-all shrink-0"
                >
                  {madingLoading ? '...' : 'Kirim'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    );
  }

  // --- KONDISI 4: TAMPILAN UTAMA DASHBOARD KAMERA ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-2xl relative border-x border-slate-100">
        
        {/* NAVBAR */}
        <nav className="bg-white/90 border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">EcoNudgeSystem</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setView('poster')}
              className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-all mr-1"
            >
              Poster
            </button>

            <div onClick={() => setIsProfileOpen(true)} className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 py-1 px-2.5 rounded-full border border-slate-200 cursor-pointer transition-all">
              <img 
                src={user.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                alt="Avatar" 
                className="w-5 h-5 rounded-full object-cover border border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[70px]">{user.nama ? user.nama.split(' ')[0] : 'User'}</span>
            </div>

            {/* 💬 ICON CHAT SIMPEL */}
            <button 
               onClick={() => setView('mading')}
               className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
               title="Mading"
            >
               <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </nav>

        {/* KONTEN UTAMA */}
        <main className="flex-1 px-4 py-5 space-y-5 pb-24 overflow-y-auto">
          
          {/* CARD UTAMA BINTASI */}
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
                  <span className="text-xs font-bold text-emerald-100">Bintang ⭐</span>
                </div>
              </div>
            </div>
          </div>

          {/* DAFTAR TOMBOL AKSI UTAMA */}
          {!cameraOpen && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Laporkan Aksi Hijau</h3>
              <div className="grid grid-cols-1 gap-2.5">
                
                <button onClick={() => setCameraOpen('tumbler')} className="flex items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-600 active:bg-slate-50 text-left transition-all">
                  <div className="bg-blue-50 text-blue-600 p-2.5 rounded-lg mr-3">
                    <Droplet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Tumbler</span>
                    <span className="text-[11px] text-slate-400">Selfie bareng Tumbler (+1 ⭐)</span>
                  </div>
                </button>

                <button onClick={() => setCameraOpen('pilih_sampah')} className="flex items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-600 active:bg-slate-50 text-left transition-all">
                  <div className="bg-amber-50 text-amber-600 p-2.5 rounded-lg mr-3">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Pengelolaan & Pemilahan Sampah</span>
                    <span className="text-[11px] text-slate-400">Foto aksi membuang dan memilah sampah (+1 ⭐)</span>
                  </div>
                </button>

                <button onClick={() => setCameraOpen('hemat_energi_transportasi')} className="flex items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-600 active:bg-slate-50 text-left transition-all">
                  <div className="bg-orange-50 text-orange-600 p-2.5 rounded-lg mr-3">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Hemat Energi & Transportasi Hijau</span>
                    <span className="text-[11px] text-slate-400">Foto jalan kaki / matikan alat elektronik (+1 ⭐)</span>
                  </div>
                </button>

                <button onClick={() => setCameraOpen('peduli_lingkungan_kampus')} className="flex items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-600 active:bg-slate-50 text-left transition-all">
                  <div className="bg-purple-50 text-purple-600 p-2.5 rounded-lg mr-3">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Peduli Lingkungan Kampus</span>
                    <span className="text-[11px] text-slate-400">Foto aksi bersih-bersih, rawat tanaman kampus (+1 ⭐)</span>
                  </div>
                </button>

              </div>
            </div>
          )}

          {/* SUB MENU: PILIH JENIS SAMPAH */}
          {cameraOpen === 'pilih_sampah' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <h3 className="text-xs font-bold text-slate-800 mb-2">Pilih Kategori Sampah yang Diolah</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={() => setCameraOpen('sampah_plastik')} className="p-2.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-lg">♳ Plastik</button>
                <button onClick={() => setCameraOpen('sampah_kertas')} className="p-2.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg">📄 Kertas</button>
                <button onClick={() => setCameraOpen('sampah_styrofoam')} className="p-2.5 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-lg">🍱 Styrofoam</button>
                <button onClick={() => setCameraOpen('sampah_kaca')} className="p-2.5 bg-teal-100 text-teal-800 text-[11px] font-bold rounded-lg">🍾 Kaca</button>
              </div>
              <button onClick={() => setCameraOpen(null)} className="text-[11px] text-slate-400 font-medium underline">Batal</button>
            </div>
          )}

          {/* WEBCAM AREA */}
          {cameraOpen && cameraOpen !== 'pilih_sampah' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-900 px-3 py-2 flex items-center justify-between text-white text-[11px]">
                <span className="font-mono">Kamera: {cameraOpen.replace(/_/g, ' ')}</span>
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
              <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Top 10 Peringkat FPMIPA</h2>
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
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Biodata</h4>
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nama</span>
                    <span className="font-semibold text-gray-800">{user.nama}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">NIM</span>
                    <span className="font-semibold text-gray-800">{user.nim}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Prodi</span>
                    <span className="font-semibold text-gray-800">{user.prodi}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
