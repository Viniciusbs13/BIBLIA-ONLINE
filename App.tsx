
import React, { useState, useEffect, useMemo } from 'react';
import { getBibleContent } from './services/geminiService';
import { BiblePassage, UserStats, getRankTitle, BIBLE_BOOKS, BibleMarker } from './types';
import AudioPlayer from './components/AudioPlayer';

const XP_PER_LEVEL = 500;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('biblia_active_user'));
  const [loginInput, setLoginInput] = useState('');
  const [stats, setStats] = useState<UserStats | null>(null);

  const [currentBook, setCurrentBook] = useState('Gênesis');
  const [currentChapter, setCurrentChapter] = useState('1');
  const [content, setContent] = useState<BiblePassage | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'study' | 'read' | 'quiz' | 'stats'>('study');
  const [quizResults, setQuizResults] = useState<Record<number, number | null>>({});

  const [selectedVerse, setSelectedVerse] = useState<{number: number, text: string} | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [selectedColor, setSelectedColor] = useState<'yellow' | 'green' | 'red' | 'blue'>('yellow');

  useEffect(() => {
    if (currentUser) {
      const allUsers = JSON.parse(localStorage.getItem('biblia_db') || '{}');
      const userStats: UserStats = allUsers[currentUser] || {
        points: 0,
        xp: 0,
        level: 1,
        streak: 0,
        completedChapters: [],
        markers: [],
        activityDates: [],
        lastActivityDate: undefined
      };
      
      // Lógica de Streak Simples
      const today = new Date().toLocaleDateString();
      if (userStats.lastActivityDate && userStats.lastActivityDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (userStats.lastActivityDate !== yesterday.toLocaleDateString()) {
          userStats.streak = 0;
        }
      }
      
      setStats(userStats);
      
      if (userStats.completedChapters.length > 0) {
        const last = userStats.completedChapters[userStats.completedChapters.length - 1].split('-');
        setCurrentBook(last[0]);
        setCurrentChapter((parseInt(last[1]) + 1).toString());
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && stats) {
      const allUsers = JSON.parse(localStorage.getItem('biblia_db') || '{}');
      allUsers[currentUser] = stats;
      localStorage.setItem('biblia_db', JSON.stringify(allUsers));
    }
  }, [stats, currentUser]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    const name = loginInput.trim().toLowerCase();
    setCurrentUser(name);
    localStorage.setItem('biblia_active_user', name);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('biblia_active_user');
    setStats(null);
    setContent(null);
  };

  const loadBibleStudy = async (book?: string, chapter?: string) => {
    const b = book || currentBook;
    const c = chapter || currentChapter;
    setLoading(true);
    setView('study');
    setQuizResults({});
    try {
      const data = await getBibleContent(b, c);
      setContent(data);
    } catch (error) {
      console.error("Error loading bible study:", error);
    } finally {
      setLoading(false);
    }
  };

  const addXP = (amount: number) => {
    if (!stats) return;
    setStats(prev => {
      if (!prev) return null;
      let newXP = prev.xp + amount;
      let newLevel = prev.level;
      let newPoints = prev.points + amount;
      if (newXP >= XP_PER_LEVEL) {
        newLevel += 1;
        newXP -= XP_PER_LEVEL;
      }
      return { ...prev, xp: newXP, level: newLevel, points: newPoints };
    });
  };

  const markChapterAsDone = () => {
    const today = new Date().toLocaleDateString();
    const chapterId = `${currentBook}-${currentChapter}`;
    
    if (stats) {
      setStats(prev => {
        if (!prev) return null;
        const alreadyDoneToday = prev.lastActivityDate === today;
        const newActivityDates = [...prev.activityDates];
        const dateKey = new Date().toISOString().split('T')[0];
        
        if (!newActivityDates.includes(dateKey)) {
          newActivityDates.push(dateKey);
        }

        return { 
          ...prev, 
          completedChapters: prev.completedChapters.includes(chapterId) ? prev.completedChapters : [...prev.completedChapters, chapterId],
          streak: alreadyDoneToday ? prev.streak : prev.streak + 1,
          lastActivityDate: today,
          activityDates: newActivityDates
        };
      });
    }
  };

  const saveMarker = () => {
    if (!selectedVerse || !stats) return;
    const newMarker: BibleMarker = {
      id: Date.now().toString(),
      book: currentBook,
      chapter: currentChapter,
      verse: selectedVerse.number,
      color: selectedColor,
      note: noteInput,
      textSnippet: selectedVerse.text
    };
    setStats(prev => {
      if (!prev) return null;
      return { ...prev, markers: [...prev.markers, newMarker] };
    });
    setSelectedVerse(null);
    setNoteInput('');
  };

  const formattedVerses = useMemo(() => {
    if (!content?.fullText) return [];
    const parts = content.fullText.split(/(\d+)\s/g).filter(p => p.trim() !== "");
    const verses: {number: number, text: string}[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i] && parts[i+1]) {
        verses.push({ number: parseInt(parts[i]), text: parts[i+1].trim() });
      }
    }
    return verses;
  }, [content]);

  // Gerador de Calendário
  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, date: dateStr });
    }
    return days;
  }, []);

  if (!currentUser || !stats) {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center">
          <div className="text-5xl mb-4">🛡️</div>
          <h1 className="serif text-3xl font-bold text-stone-900 mb-2">Bem-vindo à Jornada</h1>
          <p className="text-stone-500 text-sm mb-8">Digite seu nome para salvar seu progresso e conquistas.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              autoFocus type="text" placeholder="Seu Nome ou Apelido" value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              className="w-full bg-stone-100 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-center text-lg"
            />
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg">
              Entrar na Jornada
            </button>
          </form>
        </div>
      </div>
    );
  }

  const progressPercentage = (stats.xp / XP_PER_LEVEL) * 100;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col pb-10">
      <header className="sticky top-0 bg-white border-b border-stone-200 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setView('stats')} className="text-xl hover:bg-stone-100 p-1 rounded-lg">📊</button>
              <div>
                <h1 className="text-sm font-bold text-stone-800 leading-none capitalize">{currentUser}</h1>
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{getRankTitle(stats.level)}</span>
              </div>
            </div>
            <div className="flex gap-2 text-[10px] font-bold">
              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md flex items-center gap-1">
                <span className="animate-bounce">🔥</span> {stats.streak} dias
              </span>
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md">⭐ {stats.points}</span>
              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">Lv. {stats.level}</span>
            </div>
          </div>
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full transition-all duration-700" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4">
        {view === 'stats' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h2 className="serif text-2xl font-bold">Seu Progresso</h2>
              <button onClick={() => setView('study')} className="text-sm text-indigo-600 font-bold">Voltar aos Estudos</button>
            </div>

            {/* Calendário de Streak */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-stone-800">Calendário de {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())}</h3>
                <div className="flex items-center gap-2 text-xs font-bold text-orange-600">
                  <span className="text-xl">🔥</span> {stats.streak} dias seguidos!
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2 text-center">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                  <div key={d} className="text-[10px] font-bold text-stone-400 mb-2">{d}</div>
                ))}
                {calendarDays.map((d, i) => {
                  if (!d) return <div key={`empty-${i}`} />;
                  const isDone = stats.activityDates.includes(d.date);
                  const isToday = d.date === new Date().toISOString().split('T')[0];
                  
                  return (
                    <div 
                      key={d.date} 
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl relative border ${isToday ? 'border-indigo-400 ring-1 ring-indigo-100' : 'border-stone-100'}`}
                    >
                      <span className={`text-[10px] font-bold ${isToday ? 'text-indigo-600' : 'text-stone-400'}`}>{d.day}</span>
                      {isDone && (
                        <div className="absolute inset-0 flex items-center justify-center bg-orange-50/50 rounded-xl overflow-hidden">
                          <span className="text-lg animate-pulse">🔥</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-[11px] text-stone-500 text-center leading-relaxed italic">
                "Não se aparte da tua boca o livro desta lei; antes medita nele dia e noite..." - Josué 1:8
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-600 text-white p-6 rounded-3xl">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Capítulos Lidos</p>
                <p className="text-3xl font-bold">{stats.completedChapters.length}</p>
              </div>
              <div className="bg-amber-500 text-white p-6 rounded-3xl">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Anotações Feitas</p>
                <p className="text-3xl font-bold">{stats.markers.length}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 mb-6 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Escolha o Livro</label>
                <select value={currentBook} onChange={(e) => setCurrentBook(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-2 text-sm">
                  {BIBLE_BOOKS.map(book => <option key={book} value={book}>{book}</option>)}
                </select>
              </div>
              <div className="w-20">
                <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Cap.</label>
                <input type="number" min="1" value={currentChapter} onChange={(e) => setCurrentChapter(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={() => loadBibleStudy()} disabled={loading} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold h-[38px]">
                {loading ? '...' : 'Ir'}
              </button>
            </div>

            {content && !loading ? (
              <div className="space-y-6">
                <div className="flex bg-stone-200 p-1 rounded-xl gap-1">
                  {['study', 'read', 'quiz'].map((v: any) => (
                    <button key={v} onClick={() => setView(v)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-stone-500'}`}>
                      {v === 'study' ? '1. ENTENDER' : v === 'read' ? '2. LER TEXTO' : '3. DESAFIO'}
                    </button>
                  ))}
                </div>

                {view === 'study' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="text-center py-2">
                      <h2 className="serif text-3xl font-bold text-stone-900">{content.reference}</h2>
                    </div>
                    <div className="bg-indigo-900 p-8 rounded-3xl text-white shadow-xl flex flex-col items-center relative overflow-hidden">
                      <h3 className="text-xl font-bold mb-4 z-10">Ouça o Estudo</h3>
                      <AudioPlayer text={`Resumo de ${content.reference}: ${content.summary}. Devocional: ${content.devotional}`} />
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-7xl">🔊</div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                        <h4 className="font-bold text-indigo-600 mb-2 text-sm">💡 O que aprenderemos</h4>
                        <p className="text-stone-700 text-sm leading-relaxed">{content.summary}</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                        <h4 className="font-bold text-amber-600 mb-2 text-sm">🙏 Palavra ao Coração</h4>
                        <p className="text-stone-700 text-sm leading-relaxed">{content.devotional}</p>
                      </div>
                    </div>
                  </div>
                )}

                {view === 'read' && (
                  <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="text-center py-2">
                      <h2 className="serif text-3xl font-bold text-stone-900">{content.reference}</h2>
                      <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mt-1 italic">Toque em um versículo para anotar</p>
                    </div>
                    <div className="bg-white p-8 md:p-12 rounded-3xl border border-stone-200 shadow-sm relative">
                      <div className="serif text-xl md:text-2xl text-stone-800 leading-[2.2] space-x-1">
                        {formattedVerses.map((v) => {
                          const marker = stats.markers.find(m => m.book === currentBook && m.chapter === currentChapter && m.verse === v.number);
                          const colorMap = { yellow: 'bg-yellow-100', green: 'bg-green-100', red: 'bg-red-100', blue: 'bg-blue-100' };
                          return (
                            <span key={v.number} onClick={() => setSelectedVerse(v)} className={`cursor-pointer transition-colors px-0.5 rounded ${marker ? colorMap[marker.color] : 'hover:bg-stone-50'}`}>
                              <sup className="text-stone-400 font-bold mr-1 text-[12px]">{v.number}</sup>
                              {v.text}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {view === 'quiz' && (
                  <div className="bg-stone-900 text-white p-6 rounded-3xl shadow-xl space-y-8 animate-in slide-in-from-bottom duration-300">
                    <h3 className="text-center font-bold text-indigo-300">DESAFIO DE CONHECIMENTO</h3>
                    {content.questions.map((q, qIndex) => {
                      const userAnswer = quizResults[qIndex];
                      return (
                        <div key={qIndex} className="space-y-3">
                          <p className="text-sm font-medium">{qIndex + 1}. {q.question}</p>
                          <div className="grid gap-2">
                            {q.options.map((opt, oIndex) => {
                              const isCorrect = oIndex === q.correctAnswer;
                              const isSelected = userAnswer === oIndex;
                              let btnClass = "text-left p-4 text-sm rounded-xl transition-all border ";
                              if (userAnswer !== undefined) {
                                if (isCorrect) btnClass += "bg-green-600 border-green-500 text-white";
                                else if (isSelected) btnClass += "bg-red-600 border-red-500 text-white scale-95";
                                else btnClass += "bg-stone-800 border-stone-700 opacity-40";
                              } else {
                                btnClass += "bg-stone-800 border-stone-700 hover:bg-stone-700";
                              }
                              return (
                                <button key={oIndex} disabled={userAnswer !== undefined} onClick={() => {
                                  if (quizResults[qIndex] !== undefined) return;
                                  setQuizResults(prev => ({ ...prev, [qIndex]: oIndex }));
                                  if (oIndex === q.correctAnswer) addXP(50);
                                }} className={btnClass}>{opt}</button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(quizResults).length === content.questions.length && (
                      <div className="pt-4 flex flex-col items-center">
                        <div className="text-4xl mb-2 animate-bounce">🔥</div>
                        <p className="text-xl font-bold text-green-400 mb-2">Capítulo Concluído!</p>
                        <button onClick={() => { 
                          markChapterAsDone(); 
                          const next = parseInt(currentChapter) + 1; 
                          setCurrentChapter(next.toString()); 
                          loadBibleStudy(currentBook, next.toString()); 
                        }} className="bg-white text-indigo-900 px-12 py-3 rounded-full font-bold shadow-xl">Continuar Jornada ➔</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32">
                {!content && !loading ? (
                  <button onClick={() => loadBibleStudy()} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-bold text-xl shadow-xl animate-bounce">
                    Começar Capítulo 📖
                  </button>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-stone-200 border-t-indigo-600 mb-4"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Consultando as Escrituras...</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal de Etiqueta/Nota */}
        {selectedVerse && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
              <h3 className="font-bold text-indigo-600 mb-1">Versículo {selectedVerse.number}</h3>
              <p className="text-xs text-stone-400 mb-4 italic">"{selectedVerse.text.substring(0, 80)}..."</p>
              
              <div className="flex gap-3 mb-6">
                {(['yellow', 'green', 'red', 'blue'] as const).map(color => (
                  <button 
                    key={color} onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${selectedColor === color ? 'border-stone-900 scale-110' : 'border-transparent opacity-60'}`}
                    style={{ backgroundColor: color === 'yellow' ? '#fef08a' : color === 'green' ? '#bbf7d0' : color === 'red' ? '#fecaca' : '#bfdbfe' }}
                  />
                ))}
              </div>
              <textarea 
                value={noteInput} onChange={(e) => setNoteInput(e.target.value)}
                placeholder="O que Deus falou com você?"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm mb-6 h-32 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button onClick={() => setSelectedVerse(null)} className="flex-1 py-3 text-sm font-bold text-stone-400">Cancelar</button>
                <button onClick={saveMarker} className="flex-[2] py-3 text-sm font-bold bg-indigo-600 text-white rounded-xl">Salvar Marcação</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
