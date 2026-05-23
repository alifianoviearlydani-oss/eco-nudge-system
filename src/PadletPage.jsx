import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Send, MessageSquare, Sparkles } from 'lucide-react';

export default function PadletMini({ user }) {
  const [messages, setMessages] = useState([]);
  const [inputPesan, setInputPesan] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // 1. Ambil data chat pertama kali (di-join dengan tabel profiles biar dapet Nama & Avatar)
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('timeline_updates')
      .select(`
        id,
        pesan,
        created_at,
        profiles ( nama, avatar_url, prodi )
      `)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) console.error('Gagal memuat timeline:', error.message);
    else setMessages(data || []);
  };

  useEffect(() => {
    fetchMessages();

    // 2. NYALAKAN FITUR REALTIME SUPABASE 🚀
    const channel = supabase
      .channel('live-timeline')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'timeline_updates' },
        () => {
          // Jika ada data baru masuk, ambil ulang data terupdate
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto scroll ke bawah kalau ada pesan baru
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Fungsi Kirim Update Kegiatan
  const handleKirim = async (e) => {
    e.preventDefault();
    if (!inputPesan.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('timeline_updates').insert([
      {
        profile_id: user.id,
        pesan: inputPesan.trim(),
      },
    ]);

    if (error) {
      alert('Gagal kirim: ' + error.message);
    } else {
      setInputPesan('');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-800 p-3 text-white flex items-center space-x-2">
        <MessageSquare className="w-4 h-4 text-emerald-300" />
        <div className="flex-1">
          <h3 className="text-xs font-black uppercase tracking-wider">Live 📣</h3>
          <p className="text-[10px] text-emerald-200">Saling sapa & update aksi ijo kamu hari ini!</p>
        </div>
      </div>

      {/* Area List Chat / Padlet */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 text-xs py-10">Belum ada obrolan. Yuk jadi yang pertama menyapa! 👋</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex items-start space-x-2 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
              <img
                src={msg.profiles?.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover border border-slate-200 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                    {msg.profiles?.nama ? msg.profiles.nama.split(' ')[0] : 'Anonim'}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className="text-[9px] text-emerald-700 font-medium block truncate">{msg.profiles?.prodi || 'Mahasiswa'}</span>
                <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap break-words font-medium bg-slate-50 p-1.5 rounded-lg border border-slate-100">{msg.pesan}</p>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Form Input Kirim */}
      <form onSubmit={handleKirim} className="p-2 bg-white border-t border-slate-100 flex items-center space-x-1.5">
        <input
          type="text"
          placeholder="Tulis sesuatu / update aksi harimu..."
          value={inputPesan}
          onChange={(e) => setInputPesan(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all text-slate-800"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={loading || !inputPesan.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}