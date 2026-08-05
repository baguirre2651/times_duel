import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import knightsSprite from './knights-sprite.png';
import sparklesSprite from './sparkles-sprite.png';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const audioUrl = file => `${import.meta.env.BASE_URL}${file}`;

const backgroundTracks = [
  'hungarian_dance_no5.mp3',
  'persona.mp3',
  'opera.mp3',
  'tekken.mp3',
  'raito.mp3'
];

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

const vibrate = (pattern = [100]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

const playAudio = (audio, { src, volume = 1, loop = false, restart = false, label = 'audio' } = {}) => {
  if (!audio) return Promise.resolve(false);

  if (src && audio.src !== new URL(src, window.location.href).href) {
    audio.src = src;
    audio.load();
  }

  audio.loop = loop;
  audio.volume = volume;
  audio.muted = false;

  if (restart) {
    try { audio.currentTime = 0; } catch {}
  }

  return audio.play().then(() => true).catch(error => {
    console.warn(`${label} could not start:`, error);
    return false;
  });
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
  const [roomCode, setRoomCode] = useState('');
  const [waitingForFriend, setWaitingForFriend] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Audio refs
  const backgroundAudioRefs = useRef([]);
  const correctRef = useRef(null);
  const wrongRef   = useRef(null);
  const victoryRef = useRef(null);
  const loseRef    = useRef(null);
  const introRef = useRef(null);
  const inputRef = useRef(null);
  const lastBackgroundTrackRef = useRef(-1);
  const currentBackgroundTrackRef = useRef(null);
  const introUnlockedRef = useRef(false);
  const startingGameRef = useRef(false);

  // Game-feel refs
  const barRef = useRef(null);
  const knightsRef = useRef(null);
  const dividerRef = useRef(null);
  const feedbackRef = useRef(null);
  const questionPlateRef = useRef(null);
  const floatLayerRef = useRef(null);

  // Floating "+2s" / "-2s" chip that shows the answer's actual effect on the clock.
  const spawnFloater = (text, tone) => {
    const layer = floatLayerRef.current;
    if (!layer || prefersReducedMotion()) return;
    const el = document.createElement('div');
    el.className = `floater floater--${tone}`;
    el.textContent = text;
    layer.appendChild(el);
    gsap.fromTo(el,
      { y: 0, opacity: 0, scale: 0.7 },
      {
        y: -70, opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(2.2)',
        onComplete: () => {
          gsap.to(el, {
            y: -110, opacity: 0, duration: 0.42, ease: 'power2.in',
            onComplete: () => el.remove()
          });
        }
      }
    );
  };

  // One-shot firework burst, fired on every correct answer. Any burst still on
  // screen is removed first so rapid answers replace rather than stack.
  const spawnSparkles = () => {
    if (prefersReducedMotion()) return;
    const host = document.body;
    host.querySelectorAll('.sparkle-burst').forEach(n => n.remove());
    const el = document.createElement('div');
    el.className = 'sparkle-burst';
    const strip = document.createElement('img');
    strip.className = 'sparkle-burst__strip';
    strip.src = sparklesSprite;
    strip.alt = '';
    el.appendChild(strip);
    host.appendChild(el);
    // 30 frames stepped once through, then cleaned up.
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: 'power2.out' });
    gsap.to(el, {
      opacity: 0, duration: 0.22, delay: 0.68, ease: 'power2.in',
      onComplete: () => el.remove()
    });
  };

  // One coordinated reaction per answer: the bar takes the hit, the knights
  // lunge or recoil, and the feedback icon pops. Keeps art and mechanic in sync.
  const playAnswerReaction = isCorrect => {
    if (prefersReducedMotion()) return;
    const tone = isCorrect ? '#22c55e' : '#ef4444';

    if (barRef.current) {
      gsap.fromTo(barRef.current,
        { scaleY: 1 },
        { scaleY: 1.16, duration: 0.11, ease: 'power2.out', yoyo: true, repeat: 1 }
      );
      gsap.fromTo(barRef.current,
        { boxShadow: `0 0 0px 0px ${tone}00` },
        { boxShadow: `0 0 22px 5px ${tone}88`, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' }
      );
    }

    if (dividerRef.current) {
      gsap.fromTo(dividerRef.current,
        { scaleY: 1 },
        { scaleY: 1.9, duration: 0.14, ease: 'back.out(3)', yoyo: true, repeat: 1 }
      );
    }

    // Knights drive forward on a correct answer, get shoved back on a wrong one.
    if (knightsRef.current) {
      gsap.fromTo(knightsRef.current,
        { x: 0 },
        { x: isCorrect ? 12 : -12, duration: 0.13, ease: 'power3.out', yoyo: true, repeat: 1 }
      );
    }

    if (!isCorrect && inputRef.current) {
      gsap.fromTo(inputRef.current,
        { x: 0 },
        { x: 8, duration: 0.06, ease: 'none', yoyo: true, repeat: 5, clearProps: 'x' }
      );
    }

    if (isCorrect && questionPlateRef.current) {
      gsap.fromTo(questionPlateRef.current,
        { scale: 1 },
        { scale: 1.045, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }
      );
    }
  };

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const achievements = [
    { id: 'first_win', title: 'First Victory', description: 'Win your first game', icon: '🎯', unlocked: playerWins >= 1 },
    { id: 'streak_5', title: 'Hot Streak', description: 'Get 5 correct in a row', icon: '🔥', unlocked: bestStreak >= 5 },
    { id: 'streak_10', title: 'On Fire', description: 'Get 10 correct in a row', icon: '🚀', unlocked: bestStreak >= 10 },
    { id: 'games_10', title: 'Veteran', description: 'Play 10 games', icon: '⭐', unlocked: totalGames >= 10 },
    { id: 'speed_demon', title: 'Speed Demon', description: 'Win in under 30 seconds', icon: '⚡', unlocked: fastestWin < 30 },
  ];

  const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const stopBackgroundMusic = () => {
    backgroundAudioRefs.current.forEach(audio => {
      if (!audio) return;
      audio.pause();
      try { audio.currentTime = 0; } catch {}
    });
  };

  const startGame = () => {
    if (startingGameRef.current) return;
    startingGameRef.current = true;

    const availableTracks = backgroundTracks
      .map((_, index) => index)
      .filter(index => index !== lastBackgroundTrackRef.current);
    const nextTrackIndex = availableTracks[Math.floor(Math.random() * availableTracks.length)];
    lastBackgroundTrackRef.current = nextTrackIndex;
    currentBackgroundTrackRef.current = nextTrackIndex;

    setGameActive(true);
    setCountdown(3);
    setHasStarted(false);
    setStatus('counting');
    setShowWinnerModal(false);
    setPlayerTime(30);
    setOpponentTime(30);
    setTotalGameTime(0);
    setInput('');
    setQuestion(getRandomQuestion());
    setStreak(0);
    setFeedback(null);
    setQuestionHistory([]);
    setGameStats({ totalQuestions: 0, correctAnswers: 0, duration: 0 });

    if (introRef.current) {
      introRef.current.pause();
      try { introRef.current.currentTime = 0; } catch {}
    }
    stopBackgroundMusic();

    playAudio(backgroundAudioRefs.current[nextTrackIndex], {
      volume: 1,
      loop: true,
      restart: true,
      label: `Background music ${backgroundTracks[nextTrackIndex]}`
    }).then(played => {
      if (played) setAudioEnabled(true);
    });

    setTimeout(() => {
      startingGameRef.current = false;
    }, 500);
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

  const handleStartPointerDown = event => {
    event.preventDefault();
    startGame();
  };

  const goHome = () => {
    setGameActive(false);
    setHasStarted(false);
    setStatus('');
    setCountdown(null);
    setWaitingForFriend(false);
    stopBackgroundMusic();
    currentBackgroundTrackRef.current = null;
    playAudio(introRef.current, {
      volume: 0.35,
      loop: true,
      restart: true,
      label: 'Intro music'
    }).then(played => {
      if (played) setAudioEnabled(true);
    });
  };

  const unlockAudio = () => {
    const activeTrack = currentBackgroundTrackRef.current;
    const target = activeTrack === null
      ? introRef.current
      : backgroundAudioRefs.current[activeTrack];

    playAudio(target, {
      volume: activeTrack === null ? 0.35 : 1,
      loop: true,
      label: activeTrack === null ? 'Intro music' : `Background music ${backgroundTracks[activeTrack]}`
    }).then(played => {
      if (played) setAudioEnabled(true);
    });
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
      if (gameMode === 'cpu') setOpponentTime(t => Math.max(0, t - 1));
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
      createConfetti();
    } else if (totalGameTime >= 180) {
      if (playerTime > opponentTime) {
        winner = 'player';
        setPlayerWins(w => w + 1);
        createConfetti();
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
        accuracy: questionHistory.length > 0
          ? Math.round((questionHistory.filter(q => q.correct).length / questionHistory.length) * 100)
          : 0
      };
      
      setGameStats(finalGameStats);
      setTotalGames(prev => prev + 1);
      if (streak > bestStreak) setBestStreak(streak);
      if (winner === 'player' && totalGameTime < fastestWin) setFastestWin(totalGameTime);

      stopBackgroundMusic();
      // 🔊 Play victory/lose sfx
      if (winner === 'player') {
        setTimeout(() => {
          victoryRef.current?.play().catch(()=>{});
        }, 100);
        spawnSparkles();
        setTimeout(spawnSparkles, 420);
      } else if (winner === 'opponent') {
        setTimeout(() => {
          loseRef.current?.play().catch(()=>{});
        }, 100);
      }

      setTimeout(() => {
        setShowWinnerModal(true);
        vibrate([200, 100, 200]);
      }, 1500);
    }
  }, [
    playerTime, opponentTime, totalGameTime, hasStarted, status,
    questionHistory, streak, bestStreak, totalGames, fastestWin
  ]);

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

  useEffect(() => {
    document.body.classList.toggle('is-playing', gameActive);
    return () => document.body.classList.remove('is-playing');
  }, [gameActive]);

  // Every button gets a physical press response, delegated so it covers buttons
  // that mount later (modals, play-again) without wiring each one by hand.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const press = e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      // Kept shallow on purpose: a deeper squash can pull the button's edge
      // inside the press point, so pointerup lands outside and the click is
      // dropped. 0.97 stays under the finger.
      gsap.to(btn, { scale: 0.97, duration: 0.09, ease: 'power2.out', overwrite: 'auto' });
    };
    const release = e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      gsap.to(btn, { scale: 1, duration: 0.34, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
    };
    document.addEventListener('pointerdown', press, true);
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    return () => {
      document.removeEventListener('pointerdown', press, true);
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', release, true);
    };
  }, []);

  // Countdown numerals punch in rather than looping a bounce.
  useEffect(() => {
    if (countdown === null || prefersReducedMotion()) return;
    const el = document.querySelector('.countdown-number');
    if (!el) return;
    const tween = gsap.fromTo(el,
      { scale: 0.4, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.5)' }
    );
    return () => tween.kill();
  }, [countdown]);

  // Feedback badge: a single settle-in-and-out pop, rather than looping bounce.
  useEffect(() => {
    if (!feedback || !feedbackRef.current || prefersReducedMotion()) return;
    const el = feedbackRef.current;
    const tl = gsap.timeline();
    tl.fromTo(el,
      { scale: 0.3, opacity: 0, rotate: -18 },
      { scale: 1.12, opacity: 1, rotate: 0, duration: 0.22, ease: 'back.out(3)' }
    )
      .to(el, { scale: 1, duration: 0.12, ease: 'power2.out' })
      .to(el, { scale: 0.85, opacity: 0, duration: 0.2, ease: 'power2.in' }, '+=0.12');
    return () => tl.kill();
  }, [feedback]);

  // Pin the play area to the visual viewport. On iOS Safari the keyboard does not
  // shrink the layout viewport — it scrolls it — so the top of the page (the tug
  // bar) ends up above the visible area. Tracking visualViewport gives us both the
  // usable height and how far Safari scrolled, so the shell can follow it exactly.
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    // Largest height seen without a keyboard, used as the no-keyboard baseline.
    // Comparing against window.innerHeight is unreliable: iOS keeps it at the full
    // layout height on some versions and shrinks it on others.
    let baseline = vv ? vv.height : window.innerHeight;

    // Last applied values, so we can ignore the sub-pixel churn iOS emits while
    // the keyboard slides in. Chasing every event makes the shell visibly wander.
    let lastH = -1;
    let lastTop = -1;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const rawH = vv ? vv.height : window.innerHeight;
      const rawTop = vv ? vv.offsetTop : 0;
      const height = Math.round(rawH);
      const offsetTop = Math.round(rawTop);

      if (height > baseline) baseline = height;
      const inset = Math.max(0, baseline - height);

      // Whole pixels only, and only when the change is big enough to matter.
      if (Math.abs(height - lastH) >= 1) {
        root.style.setProperty('--app-h', `${height}px`);
        root.style.setProperty('--kb-inset', `${inset}px`);
        root.classList.toggle('kb-open', inset > 120);
        lastH = height;
      }
      lastTop = offsetTop;
    };

    // Coalesce the burst of events iOS fires during the keyboard transition into
    // one update per frame.
    const sync = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    // Orientation changes invalidate the baseline entirely.
    const resetBaseline = () => {
      baseline = 0;
      lastH = -1;
      lastTop = -1;
      requestAnimationFrame(apply);
    };

    apply();
    if (vv) {
      vv.addEventListener('resize', sync);
      vv.addEventListener('scroll', sync);
    }
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', resetBaseline);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (vv) {
        vv.removeEventListener('resize', sync);
        vv.removeEventListener('scroll', sync);
      }
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', resetBaseline);
      root.classList.remove('kb-open');
    };
  }, []);

  // Last-resort nudge if the keypad actually covers the input. This used to run
  // on every focus with behavior: 'smooth' — and since each submitted answer
  // refocuses the input, the page smooth-scrolled after every answer, which is
  // what made the screen bounce while typing. Now it only fires when the input
  // is genuinely hidden, and it jumps instantly rather than animating.
  useEffect(() => {
    if (!hasStarted) return;
    const el = inputRef.current;
    if (!el) return;

    const onFocus = () => {
      setTimeout(() => {
        const vv = window.visualViewport;
        const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
        const visibleTop = vv ? vv.offsetTop : 0;
        const r = el.getBoundingClientRect();
        const hidden = r.bottom > visibleBottom - 4 || r.top < visibleTop + 4;
        if (hidden) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }, 350);
    };

    el.addEventListener('focus', onFocus);
    return () => el.removeEventListener('focus', onFocus);
  }, [hasStarted]);

  useEffect(() => {
    const unlockIntro = () => {
      if (introUnlockedRef.current || gameActive || waitingForFriend) return;
      introUnlockedRef.current = true;
      playAudio(introRef.current, {
        volume: 0.35,
        loop: true,
        label: 'Intro music'
      }).then(played => {
        if (played) setAudioEnabled(true);
      });
    };

    window.addEventListener('pointerdown', unlockIntro, { once: true });
    window.addEventListener('keydown', unlockIntro, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockIntro);
      window.removeEventListener('keydown', unlockIntro);
    };
  }, [gameActive, waitingForFriend]);

  // Play intro music on title/main page
  useEffect(() => {
    // Only play if we're on the main menu (not in game, not waiting for friend)
    if (!gameActive && !waitingForFriend) {
      const timer = setTimeout(() => {
        const intro = introRef.current;
        if (intro) {
          playAudio(intro, {
            volume: 0.35,
            loop: true,
            restart: true,
            label: 'Intro music'
          }).then(played => {
            if (played) setAudioEnabled(true);
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      // Stop intro music when leaving main menu
      const intro = introRef.current;
      if (intro) {
        intro.pause();
        intro.currentTime = 0;
      }
    }
  }, [gameActive, waitingForFriend]);

  const handleSubmit = () => {
    if (!input.trim() || status !== 'Playing...') return;
    
    // INSTANT UI UPDATES FIRST (mobile optimization)
    const isCorrect = parseInt(input) === question.answer;
    setFeedback(isCorrect ? '✅' : '❌');
    setInput('');
    
    // IMMEDIATE refocus to keep keyboard open
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Heavy processing after UI updates
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
    
    playAnswerReaction(isCorrect);

    if (isCorrect) {
      setPlayerTime(t => t + 2);
      if (gameMode === 'cpu') setOpponentTime(t => Math.max(0, t - 2));
      setStreak(s => s + 1);
      correctRef.current?.play().catch(()=>{});
      vibrate([50]);
      spawnFloater('+2s', 'good');
      spawnSparkles();
      // Streak milestones keep their extra flourish on top.
      const nextStreak = streak + 1;
      if (nextStreak > 0 && nextStreak % 5 === 0) {
        spawnFloater(`🔥 ${nextStreak} STREAK`, 'good');
        vibrate([40, 40, 80]);
      }
    } else {
      setStreak(0);
      wrongRef.current?.play().catch(()=>{});
      vibrate([100, 50, 100]);
      spawnFloater('miss', 'bad');
    }

    setQuestion(getRandomQuestion());

    // Feedback icon animates itself out; this just clears the node afterwards.
    setTimeout(() => setFeedback(null), 620);
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

  const isTie = status === "It's a Tie!";
  const resultSubtitle = isTie
    ? 'Dead even — run it back.'
    : gameStats.won
      ? (gameStats.accuracy >= 90 ? 'Flawless riding. The field is yours.' : 'The duel is yours.')
      : (gameStats.accuracy >= 70 ? 'So close — one more charge.' : 'Regroup and ride again.');

  const total = playerTime + opponentTime || 1;
  const playerPercent = (playerTime / total) * 100;
  const opponentPercent = 100 - playerPercent;

  return (
    <div className={`game-shell ${gameActive ? 'game-shell--playing' : ''} ${hasStarted ? 'game-shell--match' : ''} flex flex-col items-center justify-center min-h-screen px-2 py-4 font-sans ${isMobile ? 'gap-4' : 'gap-6 px-4 py-8'}`}>
      {/* Audio elements (relative paths) */}
      {backgroundTracks.map((track, index) => (
        <audio
          key={track}
          ref={element => { backgroundAudioRefs.current[index] = element; }}
          src={audioUrl(track)}
          loop
          preload="auto"
        />
      ))}
      <audio ref={correctRef} src={audioUrl('correct.mp3')} preload="auto" />
      <audio ref={wrongRef}   src={audioUrl('wrong.mp3')} preload="auto" />
      <audio ref={victoryRef} src={audioUrl('victory.mp3')} preload="auto" />
      <audio ref={loseRef}    src={audioUrl('lose.mp3')} preload="auto" />
      <audio ref={introRef}   src={audioUrl('intro.mp3')} preload="auto" loop />

      <div className="game-title text-center">
        <h1 className={`font-extrabold tracking-wide text-indigo-700 drop-shadow-xl animate-pulse ${isMobile ? 'text-5xl' : 'text-6xl'}`}>
          × Duel
        </h1>
        <div className="text-sm text-gray-600 mt-1">Multiplication Battle Arena</div>
      </div>

      <div className="score-pills flex flex-wrap gap-4 text-lg font-medium text-gray-800 items-center justify-center">
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

      <div className="utility-actions flex flex-wrap gap-2 justify-center">
        {hasStarted && (
          <button 
            onClick={goHome}
            className="px-3 py-1 border text-sm rounded-full bg-white hover:bg-gray-200 transition shadow-sm"
          >
            🏠 Home
          </button>
        )}
        <button 
          onClick={unlockAudio}
          className="px-3 py-1 border text-sm rounded-full bg-white hover:bg-gray-200 transition shadow-sm"
        >
          {audioEnabled ? '🔊 Sound' : '🔇 Sound'}
        </button>
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
              onPointerDown={handleStartPointerDown}
              onClick={startGame}
              className={`bg-gradient-to-r from-green-400 to-green-600 text-white rounded-full shadow-xl hover:scale-105 transition-all ${isMobile ? 'px-6 py-3 text-lg' : 'px-8 py-4 text-xl'}`}
            >
              vs CPU 🤖
            </button>
            <button 
              onClick={hostGame}
              className={`bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-full shadow-xl hover:scale-105 transition-all ${isMobile ? 'px-6 py-3 text-lg' : 'px-8 py-4 text-xl'}`}
            >
              vs Friend 👥
            </button>
          </div>
          
          <div className="text-center">
            <input 
              type="text" 
              placeholder="Enter room code" 
              className="border-2 border-gray-300 px-4 py-2 rounded-lg mr-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  joinGame(e.currentTarget.value.trim().toUpperCase());
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
        <div key={countdown} className={`countdown-number font-black text-gray-900 drop-shadow-lg ${isMobile ? 'text-6xl' : 'text-8xl'}`}>
          {countdown === 0 ? 'Go!' : countdown}
        </div>
      )}

      {hasStarted && (
        <div className="game-board w-full max-w-2xl space-y-6">
          <div className="tug-meter w-full">
            <div className={`timer-row flex justify-between font-semibold text-gray-700 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
              <span className="text-green-700">You: {playerTime}s</span>
              <span className="text-purple-600">Game: {Math.floor(totalGameTime / 60)}:{(totalGameTime % 60).toString().padStart(2, '0')}</span>
              <span className="text-red-700">{gameMode === 'cpu' ? 'CPU' : 'Friend'}: {opponentTime}s</span>
            </div>
            {/* Jousting knights ride directly on top of the tug bar, locked to it at
                every screen size. Driven by a CSS sprite animation rather than an
                animated GIF: iOS Safari pauses GIFs in Low Power Mode, but keeps
                running CSS animations. */}
            <div className="tug-knights" aria-hidden="true" ref={knightsRef}>
              <img src={knightsSprite} className="tug-knights__strip" alt="" draggable="false" />
            </div>
            <div ref={barRef} className="tug-bar relative w-full h-8 bg-white border-2 border-gray-300 rounded-full overflow-hidden shadow-inner">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 ease-out"
                style={{ width: `${playerPercent}%` }}
              />
              <div
                className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-400 to-red-500 transition-all duration-500 ease-out"
                style={{ width: `${opponentPercent}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div ref={dividerRef} className="w-1 h-6 bg-gray-800 rounded-full"></div>
              </div>
            </div>
            {/* Floating +2s / miss chips rise from the bar, so the clock swing the
                answer caused is visible where the tug-of-war actually happens. */}
            <div className="floater-layer" ref={floatLayerRef} aria-hidden="true" />
          </div>

          <div className="question-panel text-center">
            <div ref={questionPlateRef} className={`question-text font-bold text-gray-900 mb-6 ${isMobile ? 'text-2xl' : 'text-4xl'}`}>
              What is <span className="question-number">{question.a}</span> × <span className="question-number">{question.b}</span>?
            </div>

            <div className="answer-row">
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                maxLength="3"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="answer-input border-3 border-blue-300 rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all"
                value={input}
                onChange={e => setInput(e.target.value.replace(/\D/g, '').slice(0, 3))}
                onKeyDown={handleKeyDown}
                onBlur={(e) => {
                  // Prevent keyboard from closing on mobile
                  if (isMobile && status === 'Playing...') {
                    setTimeout(() => e.target.focus(), 0);
                  }
                }}
                autoFocus
                placeholder="?"
              />
              <button
                onClick={handleSubmit}
                className="submit-button bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all"
                disabled={!input.trim() || status !== 'Playing...'}
              >
                Submit
              </button>
            </div>
            
            {isMobile && (
              <div className="answer-hint text-sm text-blue-600 mt-2">
                💡 Tap Submit or press Enter on keypad
              </div>
            )}
          </div>

          {feedback && (
            <div className="feedback-pop" aria-live="polite">
              <div
                ref={feedbackRef}
                className={`feedback-badge ${feedback === '✅' ? 'feedback-badge--good' : 'feedback-badge--bad'}`}
              >
                {feedback}
              </div>
            </div>
          )}

          {streak >= 3 && (
            <div className="streak-badge text-center">
              <div className="inline-block bg-orange-100 border-2 border-orange-400 text-orange-800 px-4 py-2 rounded-full text-lg font-bold animate-pulse">
                🔥 {streak} Streak!
              </div>
            </div>
          )}

          <div className="status-text text-center text-2xl font-bold text-gray-800">
            {status}
          </div>

          {(status === 'You Won!' || status === 'You Lost!' || status === "It's a Tie!") && !showWinnerModal && (
            <div className="text-center">
              <button 
                onPointerDown={handleStartPointerDown}
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
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
          <div className={`modal-card result-card ${isTie ? 'result-card--tie' : gameStats.won ? 'result-card--won' : 'result-card--lost'}`}>
            <div className="result-emoji" aria-hidden="true">
              {isTie ? '🤝' : gameStats.won ? '🎉' : '😢'}
            </div>
            <h2 id="result-title" className="result-title">
              {isTie ? "It's a Tie!" : gameStats.won ? 'Victory!' : 'Defeat!'}
            </h2>
            <p className="result-subtitle">{resultSubtitle}</p>

            <div className="result-stats">
              <div className="result-stat">
                <div className="result-stat__value">{gameStats.correctAnswers}/{gameStats.totalQuestions}</div>
                <div className="result-stat__label">Correct</div>
              </div>
              <div className="result-stat">
                <div className="result-stat__value">{gameStats.accuracy}%</div>
                <div className="result-stat__label">Accuracy</div>
              </div>
              <div className="result-stat">
                <div className="result-stat__value">{gameStats.duration}s</div>
                <div className="result-stat__label">Duration</div>
              </div>
              <div className="result-stat">
                <div className="result-stat__value">{bestStreak}</div>
                <div className="result-stat__label">Best Streak</div>
              </div>
            </div>

            <div className="result-actions">
              <button
                onClick={() => { setShowWinnerModal(false); startGame(); }}
                className="result-button"
              >
                🔁 Play Again
              </button>
              <button
                onClick={() => setShowWinnerModal(false)}
                className="result-button result-button--ghost"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ padding: '1.5rem' }}>
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
        <div className="modal-overlay">
          <div className="modal-card" style={{ padding: '1.5rem' }}>
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
