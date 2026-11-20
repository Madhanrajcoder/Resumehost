import { useEffect, useRef, useState } from 'react';
import {
  Brain, Calculator, Cloud, Grid3X3, Leaf, Moon, RotateCcw, Star, Sun, Timer, Zap,
} from 'lucide-react';
import './games.css';

const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const memorySymbols = [
  { name: 'Sun', Icon: Sun },
  { name: 'Moon', Icon: Moon },
  { name: 'Star', Icon: Star },
  { name: 'Cloud', Icon: Cloud },
  { name: 'Leaf', Icon: Leaf },
  { name: 'Lightning', Icon: Zap },
];

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function useBestScore(gameId, chooseBest) {
  const key = `resumehost:games:${gameId}`;

  function readScore() {
    try {
      const stored = localStorage.getItem(key);
      const score = Number(stored);
      return stored !== null && Number.isSafeInteger(score) && score > 0 ? score : null;
    } catch {
      return null;
    }
  }

  const [best, setBest] = useState(readScore);

  function record(score) {
    const previous = [best, readScore()].filter((value) => value !== null);
    const next = chooseBest(score, ...previous);
    setBest(next);
    try {
      localStorage.setItem(key, String(next));
    } catch {
      // Scores remain usable for the current game when storage is unavailable.
    }
  }

  return [best, record];
}

function GameLayout({ children, status, records }) {
  return (
    <div className="game-layout">
      <div className="game-play">{children}</div>
      <div className="game-progress">
        <p className="game-status" role="status">{status}</p>
        <dl className="game-records">
          {records.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function TicTacToe() {
  const [board, setBoard] = useState(() => Array(9).fill(null));
  const moves = board.filter(Boolean).length;
  const player = moves % 2 === 0 ? 'X' : 'O';
  const winningLine = winningLines.find(([first, second, third]) =>
    board[first] && board[first] === board[second] && board[first] === board[third]);
  const status = winningLine ? `${board[winningLine[0]]} wins!`
    : moves === board.length ? 'It’s a draw.' : `${player}’s turn.`;

  function play(index) {
    if (board[index] || winningLine) return;
    setBoard(board.map((cell, cellIndex) => cellIndex === index ? player : cell));
  }

  return (
    <GameLayout status={status} records={[[ 'Moves', moves ]]}>
      <div className="xo-board" role="group" aria-label="X and O board">
        {board.map((cell, index) => (
          <button
            key={index}
            className="game-tile xo-tile"
            type="button"
            data-mark={cell ?? undefined}
            data-winner={winningLine?.includes(index) || undefined}
            aria-label={`Square ${index + 1}, ${cell ?? 'empty'}`}
            disabled={Boolean(cell || winningLine)}
            onClick={() => play(index)}
          >
            {cell}
          </button>
        ))}
      </div>
    </GameLayout>
  );
}

function MemoryMatch() {
  const [deck] = useState(() => shuffle([...memorySymbols, ...memorySymbols]));
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [best, record] = useBestScore('memory', Math.min);

  useEffect(() => {
    if (open.length !== 2) return undefined;
    const timeout = window.setTimeout(() => setOpen([]), 900);
    return () => window.clearTimeout(timeout);
  }, [open]);

  function flip(index) {
    if (open.includes(index) || matched.includes(index) || open.length === 2) return;

    const [first] = open;
    if (first === undefined) {
      setOpen([index]);
      return;
    }

    const nextMove = moves + 1;
    setMoves(nextMove);
    if (deck[first] !== deck[index]) {
      setOpen([first, index]);
      return;
    }

    const nextMatched = [...matched, first, index];
    setMatched(nextMatched);
    setOpen([]);
    if (nextMatched.length === deck.length) record(nextMove);
  }

  const pairs = matched.length / 2;
  let status = `${pairs} of ${memorySymbols.length} pairs found.`;
  if (pairs === memorySymbols.length) status = 'All pairs matched!';
  if (open.length === 1) status = `${deck[open[0]].name}. Pick a second card.`;
  if (open.length === 2) status = 'No match. Try another pair.';

  return (
    <GameLayout status={status} records={[[ 'Attempts', moves ], [ 'Fewest attempts', best ?? '—' ]]}>
      <div className="memory-board" role="group" aria-label="Memory cards">
        {deck.map(({ name, Icon }, index) => {
          const isMatched = matched.includes(index);
          const isOpen = open.includes(index);
          return (
            <button
              key={index}
              className="game-tile memory-tile"
              type="button"
              data-face={isMatched ? 'matched' : isOpen ? 'open' : 'down'}
              aria-label={`Card ${index + 1}, ${isMatched ? `matched ${name}` : isOpen ? name : 'face down'}`}
              disabled={isMatched || isOpen || open.length === 2}
              onClick={() => flip(index)}
            >
              {isOpen || isMatched ? <Icon aria-hidden="true" /> : <span aria-hidden="true">?</span>}
            </button>
          );
        })}
      </div>
    </GameLayout>
  );
}

const reactionLabels = {
  idle: 'Start',
  waiting: 'Wait…',
  ready: 'Tap now!',
  early: 'Try again',
  result: 'Play again',
};

function ReactionTime() {
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [best, record] = useBestScore('reaction', Math.min);
  const timer = useRef(null);
  const startedAt = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function react() {
    if (phase === 'waiting') {
      window.clearTimeout(timer.current);
      setPhase('early');
      return;
    }
    if (phase === 'ready') {
      const elapsed = Math.max(1, Math.round(performance.now() - startedAt.current));
      setResult(elapsed);
      record(elapsed);
      setPhase('result');
      return;
    }

    setPhase('waiting');
    timer.current = window.setTimeout(() => {
      startedAt.current = performance.now();
      setPhase('ready');
    }, 1200 + Math.random() * 2200);
  }

  const status = {
    idle: 'Start when you’re ready.',
    waiting: 'Wait for the signal.',
    ready: 'Tap now!',
    early: 'Too soon. Try again!',
    result: `Your reaction time was ${result} ms.`,
  }[phase];

  return (
    <GameLayout status={status} records={[[ 'Fastest time', best === null ? '—' : `${best} ms` ]]}>
      <button className="reaction-target" type="button" data-phase={phase} onClick={react}>
        <Zap size={35} aria-hidden="true" />
        {reactionLabels[phase]}
      </button>
    </GameLayout>
  );
}

const mathOperations = [
  { symbol: '+', calculate: (left, right) => left + right },
  { symbol: '−', calculate: (left, right) => left - right },
  { symbol: '×', calculate: (left, right) => left * right },
];

function newQuestion() {
  const first = 2 + Math.floor(Math.random() * 11);
  const second = 2 + Math.floor(Math.random() * 11);
  const { symbol, calculate } = mathOperations[Math.floor(Math.random() * mathOperations.length)];
  const left = Math.max(first, second);
  const right = Math.min(first, second);
  const answer = calculate(left, right);
  const alternatives = shuffle([-4, -3, -2, -1, 1, 2, 3, 4])
    .map((offset) => answer + offset)
    .filter((choice) => choice >= 0)
    .slice(0, 3);
  return { left, right, symbol, answer, choices: shuffle([answer, ...alternatives]) };
}

function QuickMath() {
  const [question, setQuestion] = useState(newQuestion);
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState('Choose the correct answer.');
  const [best, record] = useBestScore('math', Math.max);

  function answer(choice) {
    const correct = choice === question.answer;
    const nextStreak = correct ? streak + 1 : 0;
    setStreak(nextStreak);
    setStatus(correct ? `Correct! Streak: ${nextStreak}.` : `The answer was ${question.answer}. Try the next question.`);
    if (correct) record(nextStreak);
    setQuestion(newQuestion());
  }

  return (
    <GameLayout status={status} records={[[ 'Current streak', streak ], [ 'Best streak', best ?? '—' ]]}>
      <div className="math-question">
        <p id="math-prompt" className="math-prompt" aria-live="polite">{question.left} {question.symbol} {question.right}</p>
        <div className="math-options" role="group" aria-labelledby="math-prompt">
          {question.choices.map((choice, index) => (
            <button key={index} className="game-tile math-option" type="button" onClick={() => answer(choice)}>
              {choice}
            </button>
          ))}
        </div>
      </div>
    </GameLayout>
  );
}

const games = [
  { name: 'X and O', Icon: Grid3X3, Game: TicTacToe, instructions: 'Take turns on the same device. Get three Xs or Os in a row to win.' },
  { name: 'Memory Match', Icon: Brain, Game: MemoryMatch, instructions: 'Flip two cards at a time and find all six matching pairs in as few attempts as possible.' },
  { name: 'Reaction Time', Icon: Timer, Game: ReactionTime, instructions: 'Press Start, then wait for “Tap now!” and react as fast as you can.' },
  { name: 'Quick Math', Icon: Calculator, Game: QuickMath, instructions: 'Pick the correct answer to build your streak. A wrong answer starts a new streak.' },
];

export default function Games() {
  const [selected, setSelected] = useState(0);
  const [round, setRound] = useState(0);
  const { name, Game, instructions } = games[selected];

  return (
    <>
      <div className="game-picker" role="group" aria-label="Choose a game">
        {games.map(({ name: gameName, Icon }, index) => (
          <button
            key={gameName}
            className="game-choice"
            type="button"
            aria-pressed={selected === index}
            aria-controls="game-panel"
            onClick={() => setSelected(index)}
          >
            <Icon size={20} aria-hidden="true" />
            {gameName}
          </button>
        ))}
      </div>
      <section id="game-panel" className="game-panel" aria-labelledby="active-game">
        <div className="game-header">
          <div>
            <h3 id="active-game">{name}</h3>
            <p>{instructions}</p>
          </div>
          <button className="button button-outline game-reset" type="button" onClick={() => setRound((current) => current + 1)}>
            <RotateCcw size={17} aria-hidden="true" />
            Reset
          </button>
        </div>
        <Game key={round} />
      </section>
      <p className="game-storage-note">Personal bests are saved in this browser.</p>
    </>
  );
}
