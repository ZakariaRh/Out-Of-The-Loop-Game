/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Users, Trophy, Settings as SettingsIcon, Plus, Trash2, ArrowLeft, Moon, Sun, RotateCcw, Check, X, Globe } from 'lucide-react';
import { DICTIONARY, LANGUAGES, CATEGORY_QUESTIONS } from './data';

type Player = { id: string; name: string; score: number };
type GameState = 'menu' | 'players' | 'scores' | 'settings' | 'category_select' | 'pass_phone' | 'reveal' | 'discussion_questions' | 'final_discussion' | 'pass_phone_vote' | 'voting_individual' | 'voting_results' | 'scoring';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue] as const;
}

export default function App() {
  const [players, setPlayers] = useLocalStorage<Player[]>('out-of-the-loop-players', [
    { id: '1', name: 'Player 1', score: 0 },
    { id: '2', name: 'Player 2', score: 0 },
    { id: '3', name: 'Player 3', score: 0 },
  ]);
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('out-of-the-loop-dark-mode', true);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentCategory, setCurrentCategory] = useState<string>('');
  const [isRandomCategory, setIsRandomCategory] = useState<boolean>(false);
  const [secretWordObj, setSecretWordObj] = useState<Record<string, string> | null>(null);
  const [outPlayerId, setOutPlayerId] = useState<string>('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [revealLanguage, setRevealLanguage] = useState<string>('en');
  
  // New state for discussion and voting
  const [questionSequence, setQuestionSequence] = useState<{asker: Player, answerer: Player}[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);
  
  const [scoringStep, setScoringStep] = useState(1);
  const [showMinPlayersError, setShowMinPlayersError] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newName, setNewName] = useState('');
  const [isLangOpen, setIsLangOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handlePlayClick = () => {
    if (players.length < 3) {
      setShowMinPlayersError(true);
      setTimeout(() => setShowMinPlayersError(false), 3000);
    } else {
      setGameState('category_select');
    }
  };

  const addPlayer = () => {
    if (newName.trim()) {
      setPlayers([...players, { id: Date.now().toString(), name: newName.trim(), score: 0 }]);
      setNewName('');
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const resetData = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setPlayers(players.map(p => ({ ...p, score: 0 })));
    setShowResetConfirm(false);
  };

  const startGame = (category: string) => {
    const categories = Object.keys(DICTIONARY);
    let selectedCategory = category;
    if (category === 'Random') {
      selectedCategory = categories[Math.floor(Math.random() * categories.length)];
      setIsRandomCategory(true);
    } else {
      setIsRandomCategory(false);
    }

    const words = DICTIONARY[selectedCategory as keyof typeof DICTIONARY];
    const selectedWordObj = words[Math.floor(Math.random() * words.length)];
    const outPlayer = players[Math.floor(Math.random() * players.length)];

    // Shuffle players for passing the phone
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    setCurrentCategory(selectedCategory);
    setSecretWordObj(selectedWordObj);
    setOutPlayerId(outPlayer.id);
    setPlayers(shuffledPlayers);
    setCurrentPlayerIndex(0);
    
    // Reset discussion and voting state
    setVotes({});
    setCurrentVoterIndex(0);
    setCurrentQuestionIndex(0);
    setQuestionSequence([]);
    
    setGameState('pass_phone');
  };

  const handleRevealNext = () => {
    setRevealLanguage('en');
    setIsLangOpen(false);
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setGameState('pass_phone');
    } else {
      // Generate question sequence
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const seq = [];
      for (let i = 0; i < shuffled.length; i++) {
        seq.push({
          asker: shuffled[i],
          answerer: shuffled[(i + 1) % shuffled.length]
        });
      }
      setQuestionSequence(seq);
      setCurrentQuestionIndex(0);
      setGameState('discussion_questions');
    }
  };

  const finishRound = (outPlayerGuessed: boolean) => {
    const updatedPlayers = players.map(p => {
      let newScore = p.score;
      if (p.id === outPlayerId) {
        if (outPlayerGuessed) newScore += 2;
      } else {
        if (votes[p.id] === outPlayerId) newScore += 1;
      }
      return { ...p, score: newScore };
    });
    setPlayers(updatedPlayers);
    setGameState('scores');
    setScoringStep(1);
    setVotes({});
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const currentPlayer = players[currentPlayerIndex];
  const isOut = currentPlayer?.id === outPlayerId;
  const word = secretWordObj ? secretWordObj[revealLanguage] || secretWordObj['en'] : '';
  const outPlayer = players.find(p => p.id === outPlayerId);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white font-sans selection:bg-blue-200 dark:selection:bg-blue-900 flex justify-center">
      <div className="w-full max-w-md h-[100dvh] relative overflow-hidden bg-white dark:bg-gray-900 shadow-2xl sm:border-x border-gray-200 dark:border-gray-800">
        <AnimatePresence mode="wait">
          
          {gameState === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-6">
              <h1 className="text-5xl font-extrabold text-center mb-8 text-gray-900 dark:text-white tracking-tight">
                Out of the <span className="text-blue-600 dark:text-blue-400">Loop</span>
              </h1>
              <button onClick={handlePlayClick} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xl font-semibold transition-colors flex items-center justify-center space-x-3 shadow-lg shadow-blue-600/20">
                <Play size={24} /> <span>Play</span>
              </button>
              <button onClick={() => setGameState('players')} className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-4 rounded-2xl text-xl font-semibold transition-colors flex items-center justify-center space-x-3">
                <Users size={24} /> <span>Players</span>
              </button>
              <button onClick={() => setGameState('scores')} className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-4 rounded-2xl text-xl font-semibold transition-colors flex items-center justify-center space-x-3">
                <Trophy size={24} /> <span>Scores</span>
              </button>
              <button onClick={() => setGameState('settings')} className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-4 rounded-2xl text-xl font-semibold transition-colors flex items-center justify-center space-x-3">
                <SettingsIcon size={24} /> <span>Settings</span>
              </button>

              <AnimatePresence>
                {showMinPlayersError && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-8 left-6 right-6 bg-red-600 text-white p-4 rounded-xl text-center font-medium shadow-lg">
                    Need at least 3 players to play!
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {gameState === 'players' && (
            <motion.div key="players" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col p-6">
              <div className="flex items-center mb-6">
                <button onClick={() => setGameState('menu')} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold ml-2">Players</h2>
              </div>
              <div className="flex space-x-2 mb-6">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                  placeholder="New player name..."
                  className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
                <button onClick={addPlayer} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-colors">
                  <Plus size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-auto-hide space-y-2 pb-6">
                <AnimatePresence>
                  {players.map(player => (
                    <motion.div key={player.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
                      <span className="text-lg font-medium">{player.name}</span>
                      <button onClick={() => removePlayer(player.id)} className="text-red-500 hover:text-red-600 p-2 transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {gameState === 'scores' && (
            <motion.div key="scores" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col p-6">
              <div className="flex items-center mb-6">
                <button onClick={() => setGameState('menu')} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold ml-2">Leaderboard</h2>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-auto-hide space-y-3 pb-6">
                {sortedPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <span className={`text-xl font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-500 dark:text-gray-500'}`}>
                        #{index + 1}
                      </span>
                      <span className="text-lg font-medium">{player.name}</span>
                    </div>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{player.score}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {gameState === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col p-6">
              <div className="flex items-center mb-6">
                <button onClick={() => setGameState('menu')} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold ml-2">Settings</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
                  <span className="text-lg font-medium">Dark Mode</span>
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white transition-colors">
                    {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                  </button>
                </div>
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
                  <span className="text-lg font-medium">Reset Data</span>
                  <button onClick={resetData} className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                    <RotateCcw size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'category_select' && (
            <motion.div key="category_select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col p-6">
              <div className="flex items-center mb-6">
                <button onClick={() => setGameState('menu')} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold ml-2">Select Category</h2>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-auto-hide space-y-3 pb-6">
                {Object.keys(DICTIONARY).map(cat => (
                  <button key={cat} onClick={() => startGame(cat)} className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-4 px-6 rounded-2xl text-xl font-semibold transition-colors text-left flex justify-between items-center">
                    <span>{cat}</span>
                  </button>
                ))}
                <button onClick={() => startGame('Random')} className="w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-800 dark:text-blue-200 py-4 px-6 rounded-2xl text-xl font-semibold transition-colors text-left flex justify-between items-center mt-4 border border-blue-100 dark:border-blue-800/50">
                  <span>Random Category</span>
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'pass_phone' && (
            <motion.div key="pass_phone" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} transition={{ duration: 0.3 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <h2 className="text-3xl font-bold text-gray-500 dark:text-gray-400 mb-8">Pass the phone to</h2>
              <div className="text-5xl font-extrabold text-blue-600 dark:text-blue-400 mb-12">{currentPlayer?.name}</div>
              <button onClick={() => setGameState('reveal')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xl font-semibold transition-colors shadow-lg shadow-blue-600/20">
                I am {currentPlayer?.name}
              </button>
            </motion.div>
          )}

          {gameState === 'reveal' && (
            <motion.div key="reveal" initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: -90 }} transition={{ duration: 0.4 }} className="absolute inset-0 flex flex-col p-6">
              <div className="absolute top-6 right-6 z-10">
                <div className="relative">
                  <button onClick={() => setIsLangOpen(!isLangOpen)} className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 px-3 rounded-lg text-gray-900 dark:text-white transition-colors border border-gray-200 dark:border-gray-700">
                    <Globe size={18} />
                    <span className="uppercase text-sm font-bold">{revealLanguage}</span>
                  </button>
                  <AnimatePresence>
                    {isLangOpen && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        {LANGUAGES.map(lang => (
                          <button key={lang.code} onClick={() => { setRevealLanguage(lang.code); setIsLangOpen(false); }} className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${revealLanguage === lang.code ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-900 dark:text-white'}`}>
                            {lang.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center mt-12">
                <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400 mb-8">Category: {currentCategory}</h3>
                {isOut ? (
                  <div className="space-y-6">
                    <h2 className="text-4xl font-bold text-red-600 dark:text-red-400">You are Out of the Loop!</h2>
                    <p className="text-xl text-gray-700 dark:text-gray-300">Try to figure out the secret word from the others.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-medium text-gray-700 dark:text-gray-300">The secret word is:</h2>
                    <div className="text-5xl font-extrabold text-blue-600 dark:text-blue-400">{word}</div>
                  </div>
                )}
              </div>

              <button onClick={handleRevealNext} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl text-xl font-semibold transition-colors mt-auto shadow-lg">
                Got it, Next
              </button>
            </motion.div>
          )}

          {gameState === 'discussion_questions' && (
            <motion.div key="discussion_questions" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="absolute inset-0 flex flex-col p-6 text-center justify-center">
              <div className="absolute top-6 right-6 z-10">
                <div className="relative">
                  <button onClick={() => setIsLangOpen(!isLangOpen)} className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 px-3 rounded-lg text-gray-900 dark:text-white transition-colors border border-gray-200 dark:border-gray-700">
                    <Globe size={18} />
                    <span className="uppercase text-sm font-bold">{revealLanguage}</span>
                  </button>
                  <AnimatePresence>
                    {isLangOpen && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        {LANGUAGES.map(lang => (
                          <button key={lang.code} onClick={() => { setRevealLanguage(lang.code); setIsLangOpen(false); }} className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${revealLanguage === lang.code ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-900 dark:text-white'}`}>
                            {lang.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-500 dark:text-gray-400 mb-8 mt-12">Question {currentQuestionIndex + 1} of {players.length}</h2>
              <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-4">{questionSequence[currentQuestionIndex]?.asker.name}</div>
              <div className="text-xl text-gray-600 dark:text-gray-300 mb-4">asks</div>
              <div className="text-4xl font-extrabold text-purple-600 dark:text-purple-400 mb-8">{questionSequence[currentQuestionIndex]?.answerer.name}</div>
              
              {!isRandomCategory && CATEGORY_QUESTIONS[currentCategory] && (
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl text-left mb-8 overflow-y-auto scrollbar-auto-hide max-h-48">
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Example Questions</h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    {CATEGORY_QUESTIONS[currentCategory].map((q, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{q[revealLanguage] || q['en']}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={() => {
                if (currentQuestionIndex < questionSequence.length - 1) {
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                } else {
                  setGameState('final_discussion');
                }
              }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xl font-semibold transition-colors shadow-lg shadow-blue-600/20 mt-auto">
                Next
              </button>
            </motion.div>
          )}

          {gameState === 'final_discussion' && (
            <motion.div key="final_discussion" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="absolute inset-0 flex flex-col p-6 text-center justify-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Open Discussion</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
                Anyone can ask anyone! But be careful not to reveal the word to the outsider.
              </p>
              <button onClick={() => {
                setVotes({});
                setCurrentVoterIndex(0);
                setGameState('pass_phone_vote');
              }} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl text-xl font-semibold transition-colors shadow-lg shadow-red-600/20 mt-auto">
                Start Voting
              </button>
            </motion.div>
          )}

          {gameState === 'pass_phone_vote' && (
            <motion.div key="pass_phone_vote" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <h2 className="text-3xl font-bold text-gray-500 dark:text-gray-400 mb-8">Pass the phone to</h2>
              <div className="text-5xl font-extrabold text-blue-600 dark:text-blue-400 mb-12">{players[currentVoterIndex]?.name}</div>
              <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">to cast their vote secretly.</p>
              <button onClick={() => setGameState('voting_individual')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xl font-semibold transition-colors shadow-lg shadow-blue-600/20">
                I am {players[currentVoterIndex]?.name}
              </button>
            </motion.div>
          )}

          {gameState === 'voting_individual' && (
            <motion.div key="voting_individual" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="absolute inset-0 flex flex-col p-6">
              <div className="text-center mb-8 mt-4">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Who is the Outsider?</h2>
                <p className="text-base text-gray-600 dark:text-gray-400">Select the player you think is out of the loop.</p>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-auto-hide space-y-3 pb-6">
                {players.filter(p => p.id !== players[currentVoterIndex]?.id).map(player => (
                  <button key={player.id} onClick={() => {
                    const newVotes = { ...votes, [players[currentVoterIndex].id]: player.id };
                    setVotes(newVotes);
                    if (currentVoterIndex < players.length - 1) {
                      setCurrentVoterIndex(currentVoterIndex + 1);
                      setGameState('pass_phone_vote');
                    } else {
                      setGameState('voting_results');
                    }
                  }} className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white p-5 rounded-xl text-xl font-medium transition-colors text-left flex justify-between items-center border border-transparent hover:border-gray-300 dark:hover:border-gray-600">
                    <span>{player.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {gameState === 'voting_results' && (
            <motion.div key="voting_results" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">All votes are in!</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">It's time to see who the outsider is.</p>
              <button onClick={() => {
                setGameState('scoring');
                setScoringStep(1);
              }} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl text-xl font-semibold transition-colors shadow-lg shadow-purple-600/20 mt-auto">
                Reveal the Outsider
              </button>
            </motion.div>
          )}

          {gameState === 'scoring' && (
            <motion.div key="scoring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              {scoringStep === 1 && (() => {
                const correctVoters = players.filter(p => p.id !== outPlayerId && votes[p.id] === outPlayerId);

                return (
                  <div className="flex-1 flex flex-col items-center justify-center w-full">
                    <h2 className="text-3xl font-bold text-gray-500 dark:text-gray-400 mb-4">The Outsider was...</h2>
                    <div className="text-5xl font-extrabold text-red-600 dark:text-red-400 mb-8">{outPlayer?.name}</div>
                    
                    <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl w-full mb-8">
                      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Who guessed correctly?</h3>
                      {correctVoters.length > 0 ? (
                        <ul className="space-y-2">
                          {correctVoters.map(p => (
                            <li key={p.id} className="text-lg text-green-600 dark:text-green-400 font-medium flex items-center justify-center">
                              <Check size={20} className="mr-2" /> {p.name} (+1 pt)
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-lg text-red-500 dark:text-red-400 font-medium">Nobody! The outsider fooled everyone.</p>
                      )}
                    </div>

                    <button onClick={() => setScoringStep(2)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xl font-semibold transition-colors mt-auto shadow-lg shadow-blue-600/20">
                      Next
                    </button>
                  </div>
                );
              })()}

              {scoringStep === 2 && (
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Did {outPlayer?.name} guess the secret word?</h2>
                  <div className="text-2xl font-medium text-blue-600 dark:text-blue-400 mb-12">Word: {secretWordObj?.en}</div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button onClick={() => finishRound(true)} className="bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-800 dark:text-green-200 py-8 rounded-2xl text-2xl font-bold transition-colors flex flex-col items-center justify-center border border-green-200 dark:border-green-800/50">
                      <Check size={40} className="mb-3" /> Yes
                    </button>
                    <button onClick={() => finishRound(false)} className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-800 dark:text-red-200 py-8 rounded-2xl text-2xl font-bold transition-colors flex flex-col items-center justify-center border border-red-200 dark:border-red-800/50">
                      <X size={40} className="mb-3" /> No
                    </button>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mt-8">If yes, they get +2 points.</p>
                </div>
              )}
            </motion.div>
          )}

          {showResetConfirm && (
            <motion.div
              key="reset_confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-gray-200 dark:border-gray-700"
              >
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RotateCcw size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset Scores?</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Are you sure you want to reset? All players will lose their current scores and return to 0. This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-3 rounded-xl font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmReset}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
