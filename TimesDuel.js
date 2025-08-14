import React, { useState, useEffect, useRef } from 'react';

const getRandomQuestion = () => {
  const a = Math.floor(Math.random() * 12) + 1;
  const b = Math.floor(Math.random() * 12) + 1;
  return { a, b, answer: a * b, timestamp: Date.now() };
};

const createConfetti = () => {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  const confettiContainer = document.createElement('div');
  confettiContainer.style.position = 'fixed';
  confettiContainer.style.top = '0';
  confettiContainer.style.left = '0';
  confettiContainer.style.width = '100%';
  confettiContainer.style.height = '100%';
  confettiContainer.style.pointerEvents = 'none';
  confettiContainer.style.zIndex = '9999';
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'absolute';
    confetti.style.width = '8px';
    confetti.style.height = '8px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.top = '-10px';
    confetti.style.borderRadius = '50%';
    confetti.style.animation = `confetti-fall ${Math.random() * 2 + 1}s linear forwards`;
    confettiContainer.appendChild(confetti);
  }
  
  document.body.appendChild(confettiContainer);
  
  if (!document.getElementById('confetti-styles')) {
    const style = document.createElement('style');
    style.id = 'confetti-styles';
    style.textContent = `
      @keyframes confetti-fall {
        0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  setTimeout(() => {
    if (document.body.contains(confettiContainer)) {
      document.body.removeChild(confettiContainer);
    }
  }, 3000);
};

const playSound = (type) => {
  try {
    if (type === 'win') {
      createConfetti();
    }
  } catch (e) {
    // Ignore errors
  }
};

const vibrate = (pattern = [100]) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export default function TimesDuel() {
  const [playerWins, setPlayerWins] = useState(0);
  const [opponentWins, setOpponentWins] = useState(0);
  const [playerTime, setPlayerTime] = useState(30);
  const [opponentTime, setOpponentTime] = useState(30);
  const [question, setQuestion] = useState(getRandomQuestion());
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [gameMode, setGameMode] = useState('cpu');
  const [gameActive, setGameActive] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [totalGameTime, setTotalGameTime] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [totalGames, setTotalGames] = useState(0);
  const [fastestWin, setFastestWin] = useState(999);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [gameStats, setGameStats] = useState({ totalQuestions: 0, correctAnswers: 0, duration: 0 });
  const [newAchievements, setNewAchievements] = useState([]);
  const [roomCode, setRoomCode] = useState('');
  const [waitingForFriend, setWaitingForFriend] = useState(false);
  
  const musicRef = useRef(null);
  const inputRef = useRef(null);

  const achievements = [
    { id: 'first_win', title: 'First Victory', description: 'Win your first game', icon: '🎯', unlocked: playerWins >= 1 },
    { id: 'streak_5', title: 'Hot Streak', description: 'Get 5 correct in a row', icon: '🔥', unlocked: bestStreak >= 5 },
    { id: 'streak_10', title: 'On Fire', description: 'Get 10 correct in a row', icon: '🚀', unlocked: bestStreak >= 10 },
    { id: 'games_10', title: 'Veteran', description: 'Play 10 games', icon: '⭐', unlocked: totalGames >= 10 },
    { id: 'speed_demon', title: 'Speed Demon', description: 'Win in under 30 seconds', icon: '⚡', unlocked: fastestWin < 30 },
  ];

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const startGame = () => {
    setGameActive(true);
    setCountdown(3);
    setHasStarted(false);
    setStatus('counting');
    setPlayerTime(30);
    setOpponentTime(30);
    setTotalGameTime(0);
    setInput('');
    setQuestion(getRandomQuestion());
    setStreak(0);
    setFeedback(null);
    setQuestionHistory([]);
    setGameStats({ totalQuestions: 0, correctAnswers: 0, duration: 0 });
  };

  const hostGame = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setWaitingForFriend(true);
    setGameMode('friend');
  };

  const joinGame = (code) => {
    setRoomCode(code);
    setGameMode('friend');
    setWaitingForFriend(false);
    startGame();
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setHasStarted(true);
      setStatus('Playing...');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (!hasStarted || status !== 'Playing...') return;
    const interval = setInterval(() => {
      setPlayerTime(t => Math.max(0, t - 1));
      if (gameMode === 'cpu') {
        setOpponentTime(t => Math.max(0, t - 1));
      }
      setTotalGameTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasStarted, status, gameMode]);

  useEffect(() => {
    if (!hasStarted || status !== 'Playing...') return;
    
    let winner = null;
    if (playerTime <= 0) {
      winner = 'opponent';
      setOpponentWins(w => w + 1);
    } else if (opponentTime <= 0) {
      winner = 'player';
      setPlayerWins(w => w + 1);
      playSound('win');
    } else if (totalGameTime >= 180) {
      if (playerTime > opponentTime) {
        winner = 'player';
        setPlayerWins(w => w + 1);
        playSound('win');
      } else if (playerTime < opponentTime) {
        winner = 'opponent';
        setOpponentWins(w => w + 1);
      } else {
        winner = 'tie';
      }
    }

    if (winner) {
      setStatus(winner === 'player' ? 'You Won!' : winner === 'opponent' ? 'You Lost!' : "It's a Tie!");
      
      const finalGameStats = {
        totalQuestions: questionHistory.length,
        correctAnswers: questionHistory.filter(q => q.correct).length,
        duration: totalGameTime,
        won: winner === 'player',
        accuracy: questionHistory.length > 0 ? Math.round((questionHistory.filter(q => q.correct).length / questionHistory.length) * 100) : 0
      };
      
      setGameStats(finalGameStats);
      setTotalGames(prev => prev + 1);
      
      if (streak > bestStreak) {
        setBestStreak(streak);
      }
      
      if (winner === 'player' && totalGameTime < fastestWin) {
        setFastestWin(totalGameTime);
      }
      
      setTimeout(() => {
        setShowWinnerModal(true);
        vibrate([200, 100, 200]);
      }, 1500);
    }
  }, [playerTime, opponentTime, totalGameTime, hasStarted, status, questionHistory, streak, bestStreak, totalGames, fastestWin]);

  useEffect(() => {
    if (gameMode !== 'cpu' || status !== 'Playing...') return;
    const cpuInterval = setInterval(() => {
      if (status !== 'Playing...') return;
      if (Math.random() < 0.85) {
        setOpponentTime(t => Math.min(60, t + 2));
        setPlayerTime(t => Math.max(0, t - 2));
      }
    }, 1600);
    return () => clearInterval(cpuInterval);
  }, [gameMode, status]);

  const handleSubmit = () => {
    if (!input.trim() || status !== 'Playing...') return;
    
    const isCorrect = parseInt(input) === question.answer;
    
    const questionResult = {
      ...question,
      userAnswer: parseInt(input),
      correct: isCorrect,
      responseTime: Date.now() - question.timestamp
    };
    
    setQuestionHistory(prev => [...prev, questionResult]);
    setGameStats(prev => ({
      ...prev,
      totalQuestions: prev.totalQuestions + 1,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0)
    }));
    
    if (isCorrect) {
      setPlayerTime(t => t + 2);
      if (gameMode === 'cpu') {
        setOpponentTime(t => Math.max(0, t - 2));
      }
      setStreak(s => s + 1);
      setFeedback('✅');
      playSound('correct');
      vibrate([50]);
    } else {
      setStreak(0);
      setFeedback('❌');
      playSound('wrong');
      vibrate([100, 50, 100]);
    }
    
    setTimeout(() => setFeedback(null), 800);
    setQuestion(getRandomQuestion());
    setInput('');
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const resetTally = () => {
    setPlayerWins(0);
    setOpponentWins(0);
  };

  const total = playerTime + opponentTime || 1;
  const playerPercent = (playerTime / total) * 100;
  const opponentPercent = 100 - playerPercent;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 py-8 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-200 font-sans">
      <audio ref={musicRef} src="/hungarian_dance_no5.mp3" loop preload="auto" />

      <div className="text-center">
        <h1 className="text-6xl font-extrabold tracking-wide text-indigo-700 drop-shadow-xl animate-pulse">
          × Duel
        </h1>
        <div className="text-sm text-gray-600 mt-1">Multiplication Battle Arena</div>
      </div>

      <div className="flex flex-wrap gap-4 text-lg font-medium text-gray-800 items-center justify-center">
        <span className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
          🏆 You: <span className="text-green-700 font-bold">{playerWins}</span>
        </span>
        <span className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded-full">
          🤖 {gameMode === 'cpu' ? 'CPU' : 'Friend'}: <span className="text-red-700 font-bold">{opponentWins}</span>
        </span>
        {bestStreak > 0 && (
          <span className="flex items-center gap-2 bg-yellow-100 px-3 py-1 rounded-full">
            🔥 Best: <span className="text-orange-700 font-bold">{bestStreak}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <button 
          onClick={resetTally} 
          className="px-3 py-1 border text-sm rounded-full bg-white hover:bg-gray-200 transition shadow-sm"
        >
          Reset Tally
        </button>
        <button 
          onClick={() => setShowHistory(true)} 
          className="px-3 py-1 border text-sm rounded-full bg-white hover:bg-gray-200 transition shadow-sm"
          disabled={questionHistory.length === 0}
        >
          History ({questionHistory.length})
        </button>
        <button 
          onClick={() => setShowAchievements(true)} 
          className="px-3 py-1 border text-sm rounded-full bg-white hover:bg-gray-200 transition shadow-sm"
        >
          🏆 Achievements
        </button>
      </div>

      {!gameActive && !waitingForFriend && (
        <div className="flex flex-col gap-4 items-center">
          <div className="flex gap-4">
            <button 
              onClick={startGame} 
              className="px-8 py-4 bg-gradient-to-r from-green-400 to-green-600 text-white text-xl rounded-full shadow-xl hover:scale-105 transition-all"
            >
              vs CPU 🤖
            </button>
            <button 
              onClick={hostGame}
              className="px-8 py-4 bg-gradient-to-r from-blue-400 to-blue-600 text-white text-xl rounded-full shadow-xl hover:scale-105 transition-all"
            >
              vs Friend 👥
            </button>
          </div>
          
          <div className="text-center">
            <input 
              type="text" 
              placeholder="Enter room code" 
              className="border-2 border-gray-300 px-4 py-2 rounded-lg mr-2"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  joinGame(e.target.value.trim().toUpperCase());
                }
              }}
            />
            <span className="text-sm text-gray-600">or enter room code</span>
          </div>
        </div>
      )}

      {waitingForFriend && (
        <div className="text-center animate-bounce">
          <div className="text-4xl mb-4">🎮</div>
          <div className="text-2xl font-bold mb-2">Room Code: {roomCode}</div>
          <div className="text-gray-600">Share this code with your friend!</div>
          <button 
            onClick={() => {setWaitingForFriend(false); setGameMode('cpu');}} 
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition"
          >
            Cancel
          </button>
        </div>
      )}

      {gameActive && !hasStarted && countdown !== null && (
        <div className="text-8xl font-black text-gray-900 animate-bounce drop-shadow-lg">
          {countdown === 0 ? 'Go!' : countdown}
        </div>
      )}

      {hasStarted && (
        <div className="w-full max-w-2xl space-y-6">
          <div className="w-full">
            <div className="flex justify-between text-lg font-semibold text-gray-700 mb-2">
              <span className="text-green-700">You: {playerTime}s</span>
              <span className="text-purple-600">Game: {Math.floor(totalGameTime / 60)}:{(totalGameTime % 60).toString().padStart(2, '0')}</span>
              <span className="text-red-700">{gameMode === 'cpu' ? 'CPU' : 'Friend'}: {opponentTime}s</span>
            </div>
            <div className="relative w-full h-8 bg-white border-2 border-gray-300 rounded-full overflow-hidden shadow-inner">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 ease-out" 
                style={{ width: `${playerPercent}%` }} 
              />
              <div 
                className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-400 to-red-500 transition-all duration-500 ease-out" 
                style={{ width: `${opponentPercent}%` }} 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-6 bg-gray-800 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-6">
              What is <span className="text-blue-600">{question.a}</span> × <span className="text-blue-600">{question.b}</span>?
            </div>

            <div className="flex gap-4 items-center justify-center">
              <input
                ref={inputRef}
                type="number"
                className="border-3 border-blue-300 p-4 rounded-xl text-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder="?"
              />
              <button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl text-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all"
                disabled={!input.trim() || status !== 'Playing...'}
              >
                Submit
              </button>
            </div>
          </div>

          {feedback && (
            <div className="text-center">
              <div className="text-8xl animate-bounce">{feedback}</div>
            </div>
          )}

          {streak >= 3 && (
            <div className="text-center">
              <div className="inline-block bg-orange-100 border-2 border-orange-400 text-orange-800 px-4 py-2 rounded-full text-lg font-bold animate-pulse">
                🔥 {streak} Streak!
              </div>
            </div>
          )}

          <div className="text-center text-2xl font-bold text-gray-800">
            {status}
          </div>

          {(status === 'You Won!' || status === 'You Lost!' || status === "It's a Tie!") && !showWinnerModal && (
            <div className="text-center">
              <button 
                onClick={startGame} 
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-lg rounded-full hover:from-purple-600 hover:to-purple-700 shadow-lg transform hover:scale-105 transition-all"
              >
                🔁 Play Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Winner Modal */}
      {showWinnerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full animate-bounce">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {gameStats.won ? '🎉' : '😢'}
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-800">
                {gameStats.won ? 'Victory!' : 'Defeat!'}
              </h2>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600 mb-2">Game Stats</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Questions: {gameStats.totalQuestions}</div>
                  <div>Correct: {gameStats.correctAnswers}</div>
                  <div>Accuracy: {gameStats.accuracy}%</div>
                  <div>Time: {gameStats.duration}s</div>
                </div>
              </div>

              <button
                onClick={() => setShowWinnerModal(false)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full text-lg font-semibold transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Question History</h3>
              <button 
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {questionHistory.map((q, i) => (
                <div key={i} className={`p-2 rounded border ${q.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between items-center">
                    <span>{q.a} × {q.b} = {q.answer}</span>
                    <span className={q.correct ? 'text-green-600' : 'text-red-600'}>
                      {q.correct ? '✅' : '❌'} {q.userAnswer}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {(q.responseTime / 1000).toFixed(1)}s
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {showAchievements && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">🏆 Achievements</h3>
              <button 
                onClick={() => setShowAchievements(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {achievements.map((achievement) => (
                <div key={achievement.id} className={`p-3 rounded-lg border-2 transition-all ${
                  achievement.unlocked 
                    ? 'bg-yellow-100 border-yellow-400 text-yellow-800' 
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}>
                  <div className="text-2xl mb-1">{achievement.icon}</div>
                  <div className="font-bold text-sm">{achievement.title}</div>
                  <div className="text-xs">{achievement.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
