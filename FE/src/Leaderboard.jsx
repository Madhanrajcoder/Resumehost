import { useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { apiBase } from './api.js';

const storageKey = 'resumehost:games:player-key';
const keyPattern = /^[A-Za-z0-9_-]{43}$/;

function readKey() {
  try {
    return localStorage.getItem(storageKey) ?? '';
  } catch {
    return '';
  }
}

function storeKey(key) {
  try {
    if (key) localStorage.setItem(storageKey, key);
    else localStorage.removeItem(storageKey);
  } catch {
    // The key can still be copied and used to sign in on another device.
  }
}

function makeKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

async function request(path, { key, body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;
  if (body) headers['Content-Type'] = 'application/json';
  const timeout = AbortSignal.timeout(75_000);
  const response = await fetch(`${apiBase}/api/games${path}`, {
    method: body ? 'PUT' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new OnlineError(response.status);
  return response.json();
}

class OnlineError extends Error {
  constructor(status) {
    super(`Leaderboard request returned ${status}`);
    this.status = status;
  }
}

function scoreLabel(game, score) {
  if (score === undefined) return '—';
  if (game === 'reaction') return `${score} ms`;
  if (game === 'memory') return `${score} attempts`;
  return String(score);
}

export default function Leaderboard({ game, candidate }) {
  const [open, setOpen] = useState(false);
  const [board, setBoard] = useState(null);
  const [playerKey, setPlayerKey] = useState(readKey);
  const [profile, setProfile] = useState(null);
  const [mode, setMode] = useState('create');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const draftKey = useRef('');
  const { id } = game;

  useEffect(() => {
    if (!open || apiBase === null) return undefined;
    const controller = new AbortController();
    request(`/leaderboard/${id}`, { signal: controller.signal })
      .then((entries) => {
        if (!controller.signal.aborted) setBoard({ id, entries });
      })
      .catch(() => {
        if (!controller.signal.aborted) setBoard({ id, unavailable: true });
      });
    return () => controller.abort();
  }, [id, open, revision]);

  useEffect(() => {
    if (!open || apiBase === null || !playerKey || profile !== null) return undefined;
    const controller = new AbortController();
    request('/player', { key: playerKey, signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setProfile(value);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error.status === 401) {
          storeKey('');
          setPlayerKey('');
          setMode('signIn');
          setMessage('That player key is no longer recognized.');
        } else {
          setMessage('Couldn’t load your player profile. Try refreshing the leaderboard.');
        }
      });
    return () => controller.abort();
  }, [open, playerKey, profile, revision]);

  function refresh() {
    setBoard(null);
    setRevision((current) => current + 1);
  }

  function switchMode(next) {
    setMode(next);
    setInput('');
    setMessage('');
  }

  async function connectPlayer(event) {
    event.preventDefault();
    if (busy) return;
    const value = input.trim();
    if (mode === 'signIn' && !keyPattern.test(value)) {
      setMessage('Enter the complete player key.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'create' && !draftKey.current) draftKey.current = makeKey();
      const key = mode === 'signIn' ? value : draftKey.current;
      const account = await request('/player', { key, body: mode === 'create' ? { nickname: value } : undefined });
      storeKey(key);
      setPlayerKey(key);
      setProfile(account);
      setInput('');
      setMessage(mode === 'create' ? 'Player created. Save your player key to use another device.' : 'Signed in. Your online scores are ready.');
      draftKey.current = '';
    } catch (error) {
      if (error.status === 401) setMessage('That player key wasn’t recognized.');
      else if (error.status === 400) setMessage('Use 2–24 characters. Names can contain letters, numbers, spaces, hyphens, and underscores.');
      else setMessage('Couldn’t connect to online scores. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    storeKey('');
    setPlayerKey('');
    setProfile(null);
    switchMode('signIn');
  }

  async function shareScore() {
    if (busy || candidate === undefined) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await request(`/scores/${id}`, { key: playerKey, body: { score: candidate } });
      setProfile((current) => ({ ...current, scores: { ...current.scores, [id]: result.best } }));
      setMessage('Score saved to the online leaderboard.');
      refresh();
    } catch (error) {
      setMessage(error.status === 400 ? 'This score is outside the leaderboard’s supported range.' : 'Couldn’t save your score. Try sharing it again.');
    } finally {
      setBusy(false);
    }
  }

  if (apiBase === null) return null;

  const currentBoard = board?.id === id ? board : null;
  const onlineBest = profile?.scores[id];
  const canShare = candidate !== undefined && (onlineBest === undefined
    || (game.best(candidate, onlineBest) === candidate && candidate !== onlineBest));

  return (
    <section className="leaderboard" aria-labelledby="leaderboard-title">
      <div className="leaderboard-heading">
        <h3 id="leaderboard-title"><Trophy size={21} aria-hidden="true" /> {game.name} leaderboard</h3>
        <button className="button button-outline" type="button" aria-expanded={open} aria-controls="leaderboard-content" onClick={() => setOpen(!open)}>
          {open ? 'Hide leaderboard' : 'View leaderboard'}
        </button>
      </div>
      {open && (
        <div className="leaderboard-content" id="leaderboard-content">
          <div className="leaderboard-rank">
            <h4>Top 10</h4>
            {!currentBoard && <p role="status">Loading online scores…</p>}
            {currentBoard?.unavailable && <p>Online scores are temporarily unavailable.</p>}
            {currentBoard?.entries?.length === 0 && <p>No scores yet. Play and share the first one.</p>}
            {currentBoard?.entries?.length > 0 && (
              <ol>
                {currentBoard.entries.map(({ nickname, score }, index) => (
                  <li key={index}><span>{nickname}</span><strong>{scoreLabel(id, score)}</strong></li>
                ))}
              </ol>
            )}
            <button className="button button-outline" type="button" onClick={refresh}>Refresh scores</button>
          </div>
          <div className="leaderboard-account">
            {profile ? (
              <>
                <h4>{profile.nickname}</h4>
                <p>Your best online score <strong>{scoreLabel(id, onlineBest)}</strong></p>
                <p>Best from this visit <strong>{scoreLabel(id, candidate)}</strong></p>
                <button className="button button-primary" type="button" disabled={busy || !canShare} onClick={shareScore}>Share score</button>
                {candidate === undefined && <p>Play a round to earn a score to share.</p>}
                <details>
                  <summary>Show player key</summary>
                  <label htmlFor="stored-player-key">Keep this key private. Use it to sign in on another device.</label>
                  <input id="stored-player-key" value={playerKey} readOnly onFocus={(event) => event.target.select()} />
                </details>
                <button className="button button-outline" type="button" disabled={busy} onClick={signOut}>Sign out</button>
              </>
            ) : playerKey ? (
              <>
                <h4>Your player profile</h4>
                <p>Fetching your online scores…</p>
                <button className="button button-outline" type="button" onClick={signOut}>Sign out</button>
              </>
            ) : (
              <>
                <h4>Save scores across devices</h4>
                <p>Your nickname and shared scores appear on the public leaderboard.</p>
                <div className="leaderboard-actions" role="group" aria-label="Player options">
                  <button className="button button-outline" type="button" aria-pressed={mode === 'create'} disabled={busy} onClick={() => switchMode('create')}>New player</button>
                  <button className="button button-outline" type="button" aria-pressed={mode === 'signIn'} disabled={busy} onClick={() => switchMode('signIn')}>Use player key</button>
                </div>
                <form onSubmit={connectPlayer}>
                  <label htmlFor="leaderboard-input">{mode === 'create' ? 'Public nickname' : 'Private player key'}</label>
                  <input
                    id="leaderboard-input"
                    value={input}
                    type={mode === 'create' ? 'text' : 'password'}
                    minLength={mode === 'create' ? 2 : 43}
                    maxLength={mode === 'create' ? 24 : 43}
                    autoComplete="off"
                    spellCheck="false"
                    required
                    onChange={(event) => setInput(event.target.value)}
                  />
                  <button className="button button-primary" type="submit" disabled={busy || currentBoard?.unavailable}>
                    {busy ? 'Connecting…' : mode === 'create' ? 'Create player' : 'Sign in'}
                  </button>
                </form>
              </>
            )}
            <p role="status">{message}</p>
          </div>
        </div>
      )}
    </section>
  );
}
