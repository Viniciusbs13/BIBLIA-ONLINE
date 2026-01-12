
import React, { useState, useEffect, useMemo } from 'react';
import { getBibleContent } from './services/geminiService';
import { BiblePassage, UserStats, getRankTitle, BIBLE_BOOKS, BibleMarker } from './types';
import AudioPlayer from './components/AudioPlayer';

const XP_PER_LEVEL = 500;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('biblia_active_user'));
  const [loginInput, setLoginInput] = useState('');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

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
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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
        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 shadow-2xl text-center">
          <div className="text-5xl mb-4">🛡️</div>
          <h1 className="serif text-3xl font-bold text-stone-900 dark:text-white mb-2">Bem-vindo à Jornada</h1>
          <p className="text-stone-500 dark:text-slate-400 text-sm mb-8">Digite seu nome para salvar seu progresso e conquistas.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              autoFocus type="text" placeholder="Seu Nome ou Apelido" value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              className="w-full bg-stone-100 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-center text-lg"
            />
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95">
              Entrar na Jornada
            </button>
          </form>
        </div>
      </div>
    );
  }

  const progressPercentage = (stats.xp / XP_PER_LEVEL) * 100;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-stone-50 text-stone-900'} flex flex-col pb-10`}>
      <header className={`sticky top-0 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'} border-b z-20 shadow-sm`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setView('stats')} className="text-xl hover:bg-stone-100 dark:hover:bg-slate-800 p-1 rounded-lg">📊</button>
              <div>
                <h1 className="text-sm font-bold leading-none capitalize">{currentUser}</h1>
                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{getRankTitle(stats.level)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-yellow-400' : 'bg-stone-100 text-indigo-600'}`}
              >
                {darkMode ? '🌙' : '☀️'}
              </button>
              <div className="flex gap-2 text-[10px] font-bold">
                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded-md flex items-center gap-1">
                  <span className="animate-bounce">🔥</span> {stats.streak}d
                </span>
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md">Lv. {stats.level}</span>
              </div>
              <button onClick={handleLogout} className="text-xs opacity-50 hover:opacity-100">Sair</button>
            </div>
          </div>
          <div className={`w-full ${darkMode ? 'bg-slate-800' : 'bg-stone-100'} h-1.5 rounded-full overflow-hidden`}>
            <div className="bg-indigo-500 h-full transition-all duration-700" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4">
        {view === 'stats' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h2 className="serif text-2xl font-bold">Seu Progresso</h2>
              <button onClick={() => setView('study')} className="text-sm text-indigo-500 font-bold">Voltar aos Estudos</button>
            </div>

            <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'} p-6 rounded-3xl border shadow-sm`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold">Calendário de Atividades</h3>
                <div className="flex items-center gap-2 text-xs font-bold text-orange-500">
                  <span className="text-xl">🔥</span> {stats.streak} dias seguidos!
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2 text-center">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                  <div key={d} className="text-[10px] font-bold opacity-40 mb-2">{d}</div>
                ))}
                {calendarDays.map((d, i) => {
                  if (!d) return <div key={`empty-${i}`} />;
                  const isDone = stats.activityDates.includes(d.date);
                  const isToday = d.date === new Date().toISOString().split('T')[0];
                  
                  return (
                    <div 
                      key={d.date} 
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl relative border ${isToday ? 'border-indigo-500 ring-1 ring-indigo-500/20' : darkMode ? 'border-slate-800' : 'border-stone-100'}`}
                    >
                      <span className={`text-[10px] font-bold ${isToday ? 'text-indigo-500' : 'opacity-40'}`}>{d.day}</span>
                      {isDone && (
                        <div className={`absolute inset-0 flex items-center justify-center ${darkMode ? 'bg-orange-900/20' : 'bg-orange-50/50'} rounded-xl overflow-hidden`}>
                          <span className="text-lg animate-pulse">🔥</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-lg">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Capítulos Lidos</p>
                <p className="text-3xl font-bold">{stats.completedChapters.length}</p>
              </div>
              <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-amber-500 text-white'} border p-6 rounded-3xl shadow-lg`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-amber-500' : 'opacity-70'}`}>Anotações</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : ''}`}>{stats.markers.length}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'} p-4 rounded-2xl shadow-sm border mb-6 flex flex-wrap gap-3 items-end`}>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] font-bold opacity-40 uppercase mb-1 block">Livro</label>
                <select value={currentBook} onChange={(e) => setCurrentBook(e.target.value)} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-stone-50 border-stone-200'} border rounded-lg px-2 py-2 text-sm outline-none`}>
                  {BIBLE_BOOKS.map(book => <option key={book} value={book}>{book}</option>)}
                </select>
              </div>
              <div className="w-20">
                <label className="text-[10px] font-bold opacity-40 uppercase mb-1 block">Cap.</label>
                <input type="number" min="1" value={currentChapter} onChange={(e) => setCurrentChapter(e.target.value)} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-stone-50 border-stone-200'} border rounded-lg px-3 py-2 text-sm outline-none`} />
              </div>
              <button onClick={() => loadBibleStudy()} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold h-[38px] transition-all disabled:opacity-50">
                {loading ? '...' : 'Ir'}
              </button>
            </div>

            {content && !loading ? (
              <div className="space-y-6">
                <div className={`${darkMode ? 'bg-slate-900' : 'bg-stone-200'} p-1 rounded-xl flex gap-1`}>
                  {['study', 'read', 'quiz'].map((v: any) => (
                    <button key={v} onClick={() => setView(v)} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${view === v ? (darkMode ? 'bg-slate-800 text-white' : 'bg-white text-indigo-600') : 'opacity-50'}`}>
                      {v === 'study' ? '1. ENTENDER' : v === 'read' ? '2. LER TEXTO' : '3. DESAFIO'}
                    </button>
                  ))}
                </div>

                {view === 'study' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="text-center py-2">
                      <h2 className="serif text-3xl font-bold">{content.reference}</h2>
                    </div>
                    <div className="bg-indigo-900 p-8 rounded-3xl text-white shadow-xl flex flex-col items-center relative overflow-hidden">
                      <h3 className="text-xl font-bold mb-4 z-10">Resumo em Áudio</h3>
                      <AudioPlayer text={`Resumo de ${content.reference}: ${content.summary}. Devocional: ${content.devotional}`} />
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-7xl">🔊</div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'} p-6 rounded-2xl border shadow-sm`}>
                        <h4 className="font-bold text-indigo-500 mb-2 text-sm uppercase tracking-wide">💡 Resumo</h4>
                        <p className="text-sm leading-relaxed opacity-80">{content.summary}</p>
                      </div>
                      <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'} p-6 rounded-2xl border shadow-sm`}>
                        <h4 className="font-bold text-amber-500 mb-2 text-sm uppercase tracking-wide">🙏 Devocional</h4>
                        <p className="text-sm leading-relaxed opacity-80">{content.devotional}</p>
                      </div>
                    </div>
                  </div>
                )}

                {view === 'read' && (
                  <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="text-center py-2">
                      <h2 className="serif text-3xl font-bold">{content.reference}</h2>
                      <p className="opacity-40 text-[10px] font-bold uppercase tracking-widest mt-1 italic">Toque no versículo para anotar</p>
                    </div>
                    <div className={`${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-stone-200 text-stone-800'} p-8 md:p-12 rounded-3xl border shadow-sm relative`}>
                      <div className="serif text-xl md:text-2xl leading-[2.2] space-x-1">
                        {formattedVerses.map((v) => {
                          const marker = stats.markers.find(m => m.book === currentBook && m.chapter === currentChapter && m.verse === v.number);
                          
                          // Ajuste de cores para modo noturno nas marcações
                          const colorMap = darkMode ? {
                            yellow: 'bg-yellow-900/40 text-yellow-200',
                            green: 'bg-green-900/40 text-green-200',
                            red: 'bg-red-900/40 text-red-200',
                            blue: 'bg-blue-900/40 text-blue-200'
                          } : {
                            yellow: 'bg-yellow-100',
                            green: 'bg-green-100',
                            red: 'bg-red-100',
                            blue: 'bg-blue-100'
                          };

                          return (
                            <span key={v.number} onClick={() => setSelectedVerse(v)} className={`cursor-pointer transition-colors px-0.5 rounded ${marker ? colorMap[marker.color] : (darkMode ? 'hover:bg-slate-800' : 'hover:bg-stone-50')}`}>
                              <sup className={`opacity-40 font-bold mr-1 text-[12px]`}>{v.number}</sup>
                              {v.text}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {view === 'quiz' && (
                  <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-stone-900 text-white'} p-6 rounded-3xl shadow-xl space-y-8 animate-in slide-in-from-bottom duration-300`}>
                    <h3 className={`text-center font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-300'}`}>VALIDAÇÃO DO APRENDIZADO</h3>
                    {content.questions.map((q, qIndex) => {
                      const userAnswer = quizResults[qIndex];
                      return (
                        <div key={qIndex} className="space-y-3">
                          <p className="text-sm font-medium opacity-90">{qIndex + 1}. {q.question}</p>
                          <div className="grid gap-2">
                            {q.options.map((opt, oIndex) => {
                              const isCorrect = oIndex === q.correctAnswer;
                              const isSelected = userAnswer === oIndex;
                              let btnClass = `text-left p-4 text-sm rounded-xl transition-all border `;
                              
                              if (userAnswer !== undefined) {
                                if (isCorrect) btnClass += "bg-green-600 border-green-500 text-white";
                                else if (isSelected) btnClass += "bg-red-600 border-red-500 text-white scale-95";
                                else btnClass += `${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-stone-800 border-stone-700'} opacity-30`;
                              } else {
                                btnClass += `${darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500 text-slate-300' : 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-white'}`;
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
                        <div className="text-4xl mb-2 animate-bounce">✨</div>
                        <p className="text-xl font-bold text-green-400 mb-2">Lição Concluída!</p>
                        <button onClick={() => { 
                          markChapterAsDone(); 
                          const next = parseInt(currentChapter) + 1; 
                          setCurrentChapter(next.toString()); 
                          loadBibleStudy(currentBook, next.toString()); 
                        }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-3 rounded-full font-bold shadow-xl transition-all active:scale-95">Avançar Capítulo ➔</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32">
                {!content && !loading ? (
                  <button onClick={() => loadBibleStudy()} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-bold text-xl shadow-xl animate-bounce">
                    Ler Capítulo 📖
                  </button>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent mb-4"></div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">Abrindo as Escrituras...</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {selectedVerse && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200 border ${darkMode ? 'border-slate-800' : 'border-stone-100'}`}>
              <h3 className="font-bold text-indigo-500 mb-1 uppercase text-xs tracking-wider">Versículo {selectedVerse.number}</h3>
              <p className="text-sm opacity-50 mb-6 italic">"{selectedVerse.text.substring(0, 100)}..."</p>
              
              <div className="flex gap-3 mb-6">
                {(['yellow', 'green', 'red', 'blue'] as const).map(color => (
                  <button 
                    key={color} onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${selectedColor === color ? 'border-indigo-500 scale-110 shadow-lg' : 'border-transparent opacity-60'}`}
                    style={{ backgroundColor: color === 'yellow' ? '#fde047' : color === 'green' ? '#4ade80' : color === 'red' ? '#f87171' : '#60a5fa' }}
                  />
                ))}
              </div>
              <textarea 
                value={noteInput} onChange={(e) => setNoteInput(e.target.value)}
                placeholder="O que Deus revelou a você neste texto?"
                className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-stone-50 border-stone-200'} border rounded-xl p-4 text-sm mb-6 h-32 outline-none focus:ring-2 focus:ring-indigo-500 resize-none`}
              />
              <div className="flex gap-2">
                <button onClick={() => setSelectedVerse(null)} className="flex-1 py-3 text-sm font-bold opacity-50">Cancelar</button>
                <button onClick={saveMarker} className="flex-[2] py-3 text-sm font-bold bg-indigo-600 text-white rounded-xl shadow-lg">Salvar Anotação</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
