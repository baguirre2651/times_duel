// Times Duel with Battle Music: Hungarian Dance No. 5
import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

const getRandomQuestion = () => {
  const a = Math.floor(Math.random() * 12) + 1;
  const b = Math.floor(Math.random() * 12) + 1;
  return { a, b, answer: a * b };
};

export default function TimesDuel() {
  const [playerWins, setPlayerWins] = useState(0);
  const [cpuWins, setCpuWins] = useState(0);
  const [playerTime, setPlayerTime] = useState(30);
  const [opponentTime, setOpponentTime] = useState(30);
  const [question, setQuestion] = useState(getRandomQuestion());
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [cpuMode, setCpuMode] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [totalGameTime, setTotalGameTime] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const musicRef = useRef(null);

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
    if (musicRef.current) {
      musicRef.current.currentTime = 0;
      musicRef.current.play();
    }
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
      setOpponentTime(t => Math.max(0, t - 1));
      setTotalGameTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasStarted, status]);

  useEffect(() => {
    if (!hasStarted || status !== 'Playing...') return;
    if (playerTime <= 0) {
      setStatus('You Lost!');
      setCpuWins(w => w + 1);
    } else if (opponentTime <= 0) {
      setStatus('You Won!');
      setPlayerWins(w => w + 1);
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    } else if (totalGameTime >= 180) {
      if (playerTime > opponentTime) {
        setStatus('You Won!');
        setPlayerWins(w => w + 1);
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
      } else if (playerTime < opponentTime) {
        setStatus('You Lost!');
        setCpuWins(w => w + 1);
      } else {
        setStatus("It's a Tie!");
      }
    }
  }, [playerTime, opponentTime, totalGameTime, hasStarted, status]);

  useEffect(() => {
    if (!cpuMode || status !== 'Playing...') return;
    const cpuInterval = setInterval(() => {
      if (status !== 'Playing...') return;
      if (Math.random() < 0.85) {
        setOpponentTime(t => Math.min(60, t + 2));
        setPlayerTime(t => Math.max(0, t - 2));
      }
    }, 1600);
    return () => clearInterval(cpuInterval);
  }, [cpuMode, status]);

  useEffect(() => {
    if (status !== 'Playing...' && musicRef.current) {
      musicRef.current.pause();
    }
  }, [status]);

  const handleSubmit = () => {
    if (!input.trim() || status !== 'Playing...') return;
    const isCorrect = parseInt(input) === question.answer;
    if (isCorrect) {
      setPlayerTime(t => t + 2);
      setOpponentTime(t => Math.max(0, t - 2));
      setStreak(s => s + 1);
      setFeedback('✅');
    } else {
      setStreak(0);
      setFeedback('❌');
    }
    setTimeout(() => setFeedback(null), 500);
    setQuestion(getRandomQuestion());
    setInput('');
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const resetTally = () => {
    setPlayerWins(0);
    setCpuWins(0);
  };

  const total = playerTime + opponentTime || 1;
  const playerPercent = (playerTime / total) * 100;
  const opponentPercent = 100 - playerPercent;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-4 py-10 bg-gradient-to-br from-amber-100 via-pink-100 to-sky-200 font-sans">
      <audio ref={musicRef} src="/hungarian_dance_no5.mp3" loop preload="auto" />

      <h1 className="text-6xl font-extrabold tracking-wide text-indigo-700 drop-shadow-xl">× Duel</h1>

      <div className="flex gap-8 text-xl font-medium text-gray-800 items-center">
        <span className="flex items-center gap-2">🏆 You: <span className="text-green-700 font-bold">{playerWins}</span></span>
        <span className="flex items-center gap-2">🤖 CPU: <span className="text-red-700 font-bold">{cpuWins}</span></span>
        <button onClick={resetTally} className="px-3 py-1 border text-sm rounded-full bg-white hover:bg-gray-200 transition shadow-sm">
          Reset
        </button>
      </div>

      {!gameActive && (
        <button onClick={startGame} className="px-8 py-4 bg-gradient-to-r from-green-400 to-green-600 text-white text-2xl rounded-full shadow-xl hover:scale-105 transition">
          Start Game
        </button>
      )}

      <button onClick={() => setCpuMode(prev => !prev)} className="px-5 py-2 border rounded-full text-md bg-white shadow hover:bg-gray-100 text-gray-800">
        {cpuMode ? '🔥 Playing CPU 👾' : 'Play vs CPU'}
      </button>

      {gameActive && !hasStarted && countdown !== null && (
        <div className="text-8xl font-black text-gray-900 animate-bounce drop-shadow-lg">
          {countdown === 0 ? 'Go!' : countdown}
        </div>
      )}

      {hasStarted && (
        <>
          <div className="w-full max-w-xl">
            <div className="flex justify-between text-lg font-semibold text-gray-700">
              <span className="text-green-700">Your Time: {playerTime}s</span>
              <span className="text-red-700">Opponent Time: {opponentTime}s</span>
            </div>
            <div className="relative w-full h-10 bg-white border rounded-full my-4 overflow-hidden shadow-inner">
              <div className="absolute left-0 top-0 h-full bg-green-400 transition-all duration-300" style={{ width: `${playerPercent}%` }} />
              <div className="absolute right-0 top-0 h-full bg-red-400 transition-all duration-300" style={{ width: `${opponentPercent}%` }} />
            </div>
          </div>

          <div className="text-3xl font-semibold text-gray-900">
            What is <span className="text-blue-700 font-bold">{question.a}</span> × <span className="text-blue-700 font-bold">{question.b}</span>?
          </div>

          <div className="flex gap-4 items-center mt-4">
            <input
              type="number"
              className="border-2 border-gray-400 p-3 rounded-lg text-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full text-lg font-semibold shadow-md disabled:opacity-50"
              disabled={!input.trim() || status !== 'Playing...'}
            >
              Submit
            </button>
          </div>

          <div className="mt-4 text-2xl font-semibold text-gray-800 italic">{status}</div>

          {feedback && (
            <div className="text-6xl animate-bounce mt-2">
              {feedback}
            </div>
          )}

          {streak >= 3 && (
            <div className="text-lg text-green-600 mt-1 font-semibold">
              🔥 Streak: {streak}!
            </div>
          )}

          {(status === 'You Won!' || status === 'You Lost!' || status === "It's a Tie!") && (
            <button onClick={startGame} className="mt-6 px-8 py-3 bg-purple-600 text-white text-lg rounded-full hover:bg-purple-700 shadow-lg">
              🔁 Play Again
            </button>
          )}
        </>
      )}
    </div>
  );
}
