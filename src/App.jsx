import { useEffect, useMemo, useState } from "react";
import { ArcadeGame } from "./game/ArcadeGame";
import { gameDefinitions } from "./game/gameDefinitions";

const leaderboardKey = "semiconductor-arcade-leaderboard";

function loadLeaderboard() {
  try {
    return JSON.parse(window.localStorage.getItem(leaderboardKey) ?? "[]");
  } catch {
    return [];
  }
}

function saveLeaderboard(entries) {
  window.localStorage.setItem(leaderboardKey, JSON.stringify(entries));
}

function rankForTotal(total, maxScore) {
  const ratio = total / maxScore;
  if (ratio >= 0.88) return "Superchip";
  if (ratio >= 0.7) return "Production Ready";
  return "Prototype";
}

function IntroScreen({
  playerName,
  onNameChange,
  onStartRun,
  onStartSingle,
  leaderboard,
  resetPassword,
  onResetPasswordChange,
  onClearLeaderboard,
  resetError,
}) {
  return (
    <section className="screen-card hero-card">
      <div className="eyebrow">Semiconductor Arcade Factory</div>
      <h1>Build a better chip.</h1>
      <p className="hero-copy">
        Win five fast arcade challenges to earn your chip performance score.
        Play the full factory run or jump straight into any individual game.
      </p>

      <div className="name-row">
        <label className="name-label" htmlFor="playerName">
          Leaderboard Name
        </label>
        <input
          id="playerName"
          className="name-input"
          value={playerName}
          maxLength={16}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Player"
        />
      </div>

      <div className="hero-actions">
        <button className="primary-button" onClick={onStartRun}>
          Start Full Factory Run
        </button>
      </div>

      <div className="feature-grid game-select-grid">
        {gameDefinitions.map((game) => (
          <article className="feature-tile" key={game.id}>
            <span className="feature-badge">{game.shortLabel}</span>
            <h2>{game.title}</h2>
            <p>{game.description}</p>
            <button className="secondary-button" onClick={() => onStartSingle(game.id)}>
              Play This Game
            </button>
          </article>
        ))}
      </div>

      <section className="leaderboard-panel">
        <div className="leaderboard-head">
          <div>
            <div className="eyebrow">Leaderboard</div>
            <h2>Top Factory Scores</h2>
          </div>
          <div className="reset-panel">
            <input
              className="reset-input"
              type="password"
              value={resetPassword}
              onChange={(event) => onResetPasswordChange(event.target.value)}
              placeholder="Reset password"
            />
            <button className="secondary-button" style={{ marginTop: 0 }} onClick={onClearLeaderboard}>
              Clear
            </button>
          </div>
        </div>
        {resetError ? <p className="reset-error">{resetError}</p> : null}
        <div className="leaderboard-list">
          {leaderboard.length ? (
            leaderboard.map((entry, index) => (
              <div
                className="leaderboard-row"
                key={`${entry.name}-${entry.score}-${entry.date}-${index}`}
              >
                <div className="leaderboard-rank">{index + 1}</div>
                <span>{entry.name}</span>
                <span>{entry.label}</span>
                <span style={{ fontWeight: 800, color: "var(--gold)" }}>{entry.score}</span>
              </div>
            ))
          ) : (
            <p className="hero-copy" style={{ margin: 0 }}>
              No scores yet — run the factory and claim the top spot.
            </p>
          )}
        </div>
      </section>
    </section>
  );
}

function ProgressMap({ games, currentIndex, results }) {
  return (
    <div className="progress-map">
      {games.map((game, index) => {
        const result = results.find((entry) => entry.id === game.id);
        const status =
          index < currentIndex ? "done" : index === currentIndex ? "active" : "";

        return (
          <div className={`progress-node ${status}`} key={game.id}>
            <div className="progress-dot">{index + 1}</div>
            <div>
              <strong>{game.shortLabel}</strong>
              <span>{result ? `${result.normalized}/100` : game.metric}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultScreen({ game, result, onNext, nextLabel }) {
  return (
    <section className="screen-card result-card">
      <div className="eyebrow">Round Complete</div>
      <h2>{game.title}</h2>
      <div className="result-stat">
        <span className="result-score">{result.normalized}</span>
        <span>/100</span>
      </div>
      <p className="hero-copy" style={{ margin: "0 auto 0" }}>
        {game.title} maps to <strong style={{ color: "var(--cyan)" }}>{game.shortLabel}</strong>: {game.linkText}
      </p>
      <div className="result-grid">
        <div className="result-box">
          <span>Raw Score</span>
          <strong>{result.rawScore}</strong>
        </div>
        <div className="result-box">
          <span>Best Stat</span>
          <strong>{result.statLabel}</strong>
        </div>
        <div className="result-box">
          <span>Factory Rank</span>
          <strong>{result.medal}</strong>
        </div>
      </div>
      <button className="primary-button" onClick={onNext}>
        {nextLabel}
      </button>
    </section>
  );
}

function FinalScreen({ results, selectedGames, onRestart }) {
  const totalPossible = selectedGames.length * 100;
  const total = results.reduce((sum, item) => sum + item.normalized, 0);
  const rank = rankForTotal(total, totalPossible);
  const bestGame = [...results].sort((a, b) => b.normalized - a.normalized)[0];

  return (
    <section className="screen-card final-card">
      <div className="eyebrow">Chip Performance Score</div>
      <h2>
        {selectedGames.length === 1 ? "Game complete." : "Your factory run is complete."}
      </h2>
      <div className="total-score-panel">
        <div className="total-score">{total}</div>
        <div className="total-meta">
          <span>out of {totalPossible}</span>
          <strong>{rank}</strong>
        </div>
      </div>
      <div className="feature-grid summary-grid">
        {results.map((result) => (
          <article className="feature-tile summary-tile" key={result.id}>
            <span className="feature-badge">{result.shortLabel}</span>
            <h3>{result.normalized}/100</h3>
            <p>{result.statLabel}</p>
          </article>
        ))}
      </div>
      {bestGame ? (
        <p className="hero-copy" style={{ margin: "0 auto 28px" }}>
          Best performance:{" "}
          <strong style={{ color: "var(--cyan)" }}>{bestGame.shortLabel}</strong>{" "}
          with {bestGame.normalized}/100.
        </p>
      ) : null}
      <button className="primary-button" onClick={onRestart}>
        Back To Factory Lobby
      </button>
    </section>
  );
}

export default function App() {
  const [phase, setPhase] = useState("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [selectedGameIds, setSelectedGameIds] = useState(
    gameDefinitions.map((game) => game.id),
  );
  const [playerName, setPlayerName] = useState("Player");
  const [leaderboard, setLeaderboard] = useState([]);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    setLeaderboard(loadLeaderboard());
  }, []);

  const selectedGames = useMemo(
    () => gameDefinitions.filter((game) => selectedGameIds.includes(game.id)),
    [selectedGameIds],
  );
  const currentGame = selectedGames[currentIndex];
  const currentResult = useMemo(
    () => results.find((item) => item.id === currentGame?.id),
    [currentGame, results],
  );

  const persistLeaderboard = (scoreResults, games) => {
    const total = scoreResults.reduce((sum, item) => sum + item.normalized, 0);
    const label =
      games.length === 1 ? games[0].title : `Full Run (${games.length} games)`;
    const nextEntries = [
      {
        name: playerName.trim() || "Player",
        score: total,
        label,
        date: new Date().toISOString(),
      },
      ...loadLeaderboard(),
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    saveLeaderboard(nextEntries);
    setLeaderboard(nextEntries);
  };

  const handleStartRun = () => {
    setSelectedGameIds(gameDefinitions.map((game) => game.id));
    setResults([]);
    setCurrentIndex(0);
    setPhase("play");
  };

  const handleStartSingle = (gameId) => {
    setSelectedGameIds([gameId]);
    setResults([]);
    setCurrentIndex(0);
    setPhase("play");
  };

  const handleGameComplete = (result) => {
    setResults((existing) => {
      const next = existing.filter((item) => item.id !== result.id);
      return [...next, result];
    });
    setPhase("result");
  };

  const handleNext = () => {
    const isLast = currentIndex === selectedGames.length - 1;
    if (isLast) {
      persistLeaderboard(
        results.filter((item) => selectedGameIds.includes(item.id)),
        selectedGames,
      );
      setPhase("final");
      return;
    }

    setCurrentIndex((value) => value + 1);
    setPhase("play");
  };

  const handleRestart = () => {
    setResults([]);
    setCurrentIndex(0);
    setSelectedGameIds(gameDefinitions.map((game) => game.id));
    setPhase("intro");
  };

  const handleClearLeaderboard = () => {
    if (resetPassword !== "011205") {
      setResetError("Wrong password.");
      return;
    }
    saveLeaderboard([]);
    setLeaderboard([]);
    setResetPassword("");
    setResetError("");
  };

  return (
    <main className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">⚡</div>
          <div>
            <span className="eyebrow" style={{ marginBottom: 2 }}>Arcade Demo</span>
            <h1>Semiconductor Arcade Factory</h1>
          </div>
        </div>
        <div className="topbar-stats">
          <div className="topbar-stat">
            <span>Games</span>
            <strong>
              {results.length}/{selectedGames.length}
            </strong>
          </div>
        </div>
      </header>

      {phase !== "intro" && phase !== "final" ? (
        <ProgressMap
          games={selectedGames}
          currentIndex={currentIndex}
          results={results}
        />
      ) : null}

      {phase === "intro" ? (
        <IntroScreen
          playerName={playerName}
          onNameChange={setPlayerName}
          onStartRun={handleStartRun}
          onStartSingle={handleStartSingle}
          leaderboard={leaderboard}
          resetPassword={resetPassword}
          onResetPasswordChange={(value) => {
            setResetPassword(value);
            if (resetError) setResetError("");
          }}
          onClearLeaderboard={handleClearLeaderboard}
          resetError={resetError}
        />
      ) : null}

      {phase === "play" && currentGame ? (
        <section className="play-layout">
          <aside className="screen-card briefing-card">
            <div className="eyebrow">Now Playing</div>
            <h2>{currentGame.title}</h2>
            <p>{currentGame.description}</p>
            <div className="briefing-meta">
              <span>{currentGame.metric}</span>
              <span>{currentGame.durationLabel}</span>
            </div>
            <p className="hint-copy">{currentGame.instructions}</p>
          </aside>
          <ArcadeGame game={currentGame} onComplete={handleGameComplete} />
        </section>
      ) : null}

      {phase === "result" && currentResult && currentGame ? (
        <ResultScreen
          game={currentGame}
          result={currentResult}
          onNext={handleNext}
          nextLabel={
            currentIndex === selectedGames.length - 1
              ? "See Final Score"
              : "Next Game"
          }
        />
      ) : null}

      {phase === "final" ? (
        <FinalScreen
          results={results.filter((item) => selectedGameIds.includes(item.id))}
          selectedGames={selectedGames}
          onRestart={handleRestart}
        />
      ) : null}
    </main>
  );
}
