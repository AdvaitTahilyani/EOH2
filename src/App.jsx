import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ArcadeGame } from "./game/ArcadeGame";
import { difficultyLevels, gameDefinitions } from "./game/gameDefinitions";
import { ChipModel } from "./components/ChipModel";
import { gsap } from "gsap";

const leaderboardKey = "semiconductor-arcade-leaderboard-v2";
const legacyLeaderboardKey = "semiconductor-arcade-leaderboard";
const fullRunLeaderboardMode = "full-run";

function emptyLeaderboardStore() {
  return difficultyLevels.reduce((accumulator, level) => {
    accumulator[level.id] = [];
    return accumulator;
  }, {});
}

function normalizeLeaderboardStore(value) {
  const base = emptyLeaderboardStore();

  // Backward compatibility: previous versions stored a single array.
  if (Array.isArray(value)) {
    base.medium = value;
    return base;
  }

  if (!value || typeof value !== "object") return base;

  difficultyLevels.forEach((level) => {
    base[level.id] = Array.isArray(value[level.id]) ? value[level.id] : [];
  });
  return base;
}

function loadLeaderboardStore() {
  try {
    const currentRaw = window.localStorage.getItem(leaderboardKey);
    if (currentRaw) {
      const raw = JSON.parse(currentRaw);
      return normalizeLeaderboardStore(raw);
    }

    const legacyRaw = window.localStorage.getItem(legacyLeaderboardKey);
    if (legacyRaw) {
      const migrated = normalizeLeaderboardStore(JSON.parse(legacyRaw));
      saveLeaderboardStore(migrated);
      return migrated;
    }

    return emptyLeaderboardStore();
  } catch {
    return emptyLeaderboardStore();
  }
}

function saveLeaderboardStore(store) {
  window.localStorage.setItem(leaderboardKey, JSON.stringify(store));
}

function loadLeaderboardForDifficulty(difficultyId) {
  return loadLeaderboardStore()[difficultyId] ?? [];
}

function saveLeaderboardForDifficulty(difficultyId, entries) {
  const store = loadLeaderboardStore();
  store[difficultyId] = entries;
  saveLeaderboardStore(store);
}

function mergeLeaderboardStores(currentStore, importedStore) {
  const merged = emptyLeaderboardStore();

  difficultyLevels.forEach((level) => {
    const combined = [
      ...(currentStore[level.id] ?? []),
      ...(importedStore[level.id] ?? []),
    ];

    const groupedByMode = combined.reduce((accumulator, entry) => {
      const mode = leaderboardModeForEntry(entry);
      if (!accumulator[mode]) accumulator[mode] = [];
      accumulator[mode].push(entry);
      return accumulator;
    }, {});

    merged[level.id] = Object.values(groupedByMode)
      .flatMap((entries) =>
        entries
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime();
          })
          .filter(
            (entry, index, array) =>
              array.findIndex(
                (candidate) =>
                  candidate.name === entry.name &&
                  candidate.score === entry.score &&
                  candidate.date === entry.date &&
                  leaderboardModeForEntry(candidate) === leaderboardModeForEntry(entry),
              ) === index,
          )
          .slice(0, 10),
      )
      .sort((a, b) => b.score - a.score);
  });

  return merged;
}

function leaderboardModeForGames(games) {
  return games.length === 1 ? games[0].id : fullRunLeaderboardMode;
}

function leaderboardModeForEntry(entry) {
  if (typeof entry?.mode === "string" && entry.mode) return entry.mode;
  const label = typeof entry?.label === "string" ? entry.label : "";
  if (label.includes("Full Run")) return fullRunLeaderboardMode;
  const matchedGame = gameDefinitions.find((game) => label.includes(game.title));
  return matchedGame?.id ?? fullRunLeaderboardMode;
}

function leaderboardDifficultyLabel(entry, fallbackDifficultyLabel) {
  if (typeof entry?.difficultyLabel === "string" && entry.difficultyLabel) {
    return entry.difficultyLabel;
  }

  const label = typeof entry?.label === "string" ? entry.label : "";
  const matchedDifficulty = difficultyLevels.find((level) => label.includes(level.label));
  return matchedDifficulty?.label ?? fallbackDifficultyLabel;
}

function rankForTotal(total, maxPossibleScore) {
  const ratio = total / Math.max(1, maxPossibleScore);
  if (ratio >= 0.78) return "Superchip";
  if (ratio >= 0.56) return "Production Ready";
  return "Prototype";
}

function LandingHero({ onEnter }) {
  return (
    <section className="screen-card landing-card">
      <div className="landing-grid">
        <div className="landing-main">
          <h1>
            SEMICONDUCTOR
            <br />
            ARCADE FACTORY
          </h1>
          <div className="landing-intro">
            <p className="hero-copy hero-copy-lead">
              You are the chip, and your goal is to survive{" "}
              {gameDefinitions.length} fast validation and stress-test stations.
            </p>
            <p className="hero-copy">
              Push through probe timing, power integrity, thermal load, core pressure,
              signal routing, and scan-chain diagnostics to prove you are production ready.
            </p>
          </div>
          <div className="landing-facts">
            <article className="landing-fact">
              <span>Game Flow</span>
              <strong>Play all stations in Full Run, or practice one in the Lobby.</strong>
            </article>
            <article className="landing-fact">
              <span>Difficulty</span>
              <strong>Pick Easy, Normal, or Hard before you launch a run.</strong>
            </article>
            <article className="landing-fact">
              <span>Goal</span>
              <strong>Beat your top score and climb the local leaderboard.</strong>
            </article>
          </div>
          <div className="landing-cta-row">
            <button className="primary-button landing-button" onClick={onEnter}>
              Start Full Run
            </button>
            <button className="secondary-button landing-button-secondary" onClick={onEnter}>
              Open Lobby
            </button>
          </div>
        </div>
        <div className="landing-visual-wrap">
          <ChipModel orbitEnabled />
        </div>
      </div>
    </section>
  );
}

function IntroScreen({
  playerName,
  onNameChange,
  onStartRun,
  onGoHome,
  onStartSingle,
  difficulty,
  difficultyLabel,
  leaderboardFilter,
  onLeaderboardFilterChange,
  onDifficultyChange,
  leaderboard,
  resetPassword,
  onResetPasswordChange,
  onClearLeaderboard,
  onExportLeaderboard,
  onImportLeaderboard,
  resetError,
  importMessage,
}) {
  return (
    <section className="screen-card hero-card">
      <div className="intro-layout">
        <div className="intro-main">
          <div className="eyebrow">Game Lobby</div>
          <h1>Choose your challenge</h1>

          <div className="name-row">
            <label className="name-label" htmlFor="playerName">
              Name
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

          <div className="difficulty-row">
            <span className="name-label">Difficulty</span>
            <div className="difficulty-switch">
              {difficultyLevels.map((level) => (
                <button
                  key={level.id}
                  className={`difficulty-pill ${difficulty === level.id ? "active" : ""}`}
                  onClick={() => onDifficultyChange(level.id)}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-actions">
            <button className="primary-button" onClick={onStartRun}>
              Start Full Run
            </button>
            <button className="secondary-button" onClick={onGoHome}>
              Back To Home
            </button>
          </div>

          <div className="feature-grid game-select-grid">
            {gameDefinitions.map((game) => (
              <button
                key={game.id}
                type="button"
                className="feature-tile feature-tile-button"
                onClick={() => onStartSingle(game.id)}
              >
                <span className="feature-badge">{game.shortLabel}</span>
                <h2>{game.title}</h2>
                <p>{game.metric}</p>
                <span className="feature-play-indicator" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <section className="leaderboard-panel">
          <div className="leaderboard-head">
            <div>
              <div className="eyebrow">Leaderboard</div>
              <h2>Top Scores ({difficultyLabel})</h2>
              <div className="leaderboard-filter-row">
                <label className="name-label" htmlFor="leaderboardFilter">
                  View
                </label>
                <select
                  id="leaderboardFilter"
                  className="leaderboard-select"
                  value={leaderboardFilter}
                  onChange={(event) => onLeaderboardFilterChange(event.target.value)}
                >
                  <option value={fullRunLeaderboardMode}>Full Run</option>
                  {gameDefinitions.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="reset-panel">
              <button className="secondary-button reset-button" onClick={onExportLeaderboard}>
                Export
              </button>
              <button className="secondary-button reset-button" onClick={onImportLeaderboard}>
                Import
              </button>
              <input
                className="reset-input"
                type="password"
                value={resetPassword}
                onChange={(event) => onResetPasswordChange(event.target.value)}
                placeholder="Reset password"
              />
              <button className="secondary-button reset-button" onClick={onClearLeaderboard}>
                Clear
              </button>
            </div>
          </div>
          {resetError ? <p className="reset-error">{resetError}</p> : null}
          {importMessage ? <p className="import-message">{importMessage}</p> : null}
          <div className="leaderboard-list">
            {leaderboard.length ? (
              leaderboard.map((entry, index) => (
                <div
                  className="leaderboard-row"
                  key={`${entry.name}-${entry.score}-${entry.date}-${index}`}
                >
                  <div className="leaderboard-rank">{index + 1}</div>
                  <div className="leaderboard-player">
                    <span>{entry.name}</span>
                    <span className="leaderboard-difficulty">
                      {leaderboardDifficultyLabel(entry, difficultyLabel)}
                    </span>
                  </div>
                  <span className="leaderboard-score">{entry.score}</span>
                </div>
              ))
            ) : (
              <p className="hero-copy leaderboard-empty">No scores yet.</p>
            )}
          </div>
        </section>
      </div>
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
              <span>{result ? `${result.normalized}` : game.metric}</span>
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
      </div>
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
          <span>Difficulty</span>
          <strong>{result.difficultyLabel}</strong>
        </div>
      </div>
      <button className="primary-button" onClick={onNext}>
        {nextLabel}
      </button>
    </section>
  );
}

function FinalScreen({ results, selectedGames, onRestart }) {
  const total = results.reduce((sum, item) => sum + item.normalized, 0);
  const maxPossibleScore = selectedGames.reduce(
    (sum, game) => sum + (game.maxScore ?? 0),
    0,
  );
  const rank = rankForTotal(total, maxPossibleScore);

  return (
    <section className="screen-card final-card">
      <div className="eyebrow">Chip Performance Score</div>
      <h2>{selectedGames.length === 1 ? "Game Complete" : "Run Complete"}</h2>
      <div className="total-score-panel">
        <div className="total-score">{total}</div>
        <div className="total-meta">
          <span>Total run score</span>
          <strong>{rank}</strong>
        </div>
      </div>
      <div className="feature-grid summary-grid">
        {results.map((result) => (
          <article className="feature-tile summary-tile" key={result.id}>
            <span className="feature-badge">{result.shortLabel}</span>
            <h3>{result.normalized}</h3>
            <p>{result.medal}</p>
          </article>
        ))}
      </div>
      <button className="primary-button" onClick={onRestart}>
        Back To Lobby
      </button>
    </section>
  );
}

export default function App() {
  const appRef = useRef(null);
  const ambientLeftRef = useRef(null);
  const ambientRightRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [selectedGameIds, setSelectedGameIds] = useState(
    gameDefinitions.map((game) => game.id),
  );
  const [playerName, setPlayerName] = useState("Player");
  const [difficulty, setDifficulty] = useState("medium");
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardFilter, setLeaderboardFilter] = useState(fullRunLeaderboardMode);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const importInputRef = useRef(null);

  useEffect(() => {
    setLeaderboard(loadLeaderboardForDifficulty(difficulty));
  }, [difficulty]);

  useEffect(() => {
    const links = [];
    gameDefinitions.forEach((game) => {
      if (!game.previewVideo) return;
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "video";
      link.href = game.previewVideo;
      document.head.appendChild(link);
      links.push(link);
    });

    return () => {
      links.forEach((link) => link.remove());
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const shouldLockScroll = location.pathname === "/play";
    document.body.classList.toggle("no-scroll", shouldLockScroll);
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [location.pathname]);

  useEffect(() => {
    const root = appRef.current;
    if (!root) return;

    const handleMove = (event) => {
      const offsetX = (event.clientX / window.innerWidth - 0.5) * 2;
      const offsetY = (event.clientY / window.innerHeight - 0.5) * 2;
      root.style.setProperty("--mouse-x", `${event.clientX}px`);
      root.style.setProperty("--mouse-y", `${event.clientY}px`);

      if (ambientLeftRef.current) {
        gsap.to(ambientLeftRef.current, {
          x: offsetX * 28,
          y: offsetY * 22,
          duration: 0.9,
          ease: "power3.out",
          overwrite: "auto",
        });
      }
      if (ambientRightRef.current) {
        gsap.to(ambientRightRef.current, {
          x: offsetX * -24,
          y: offsetY * -16,
          duration: 0.9,
          ease: "power3.out",
          overwrite: "auto",
        });
      }
    };

    const handleLeave = () => {
      root.style.setProperty("--mouse-x", "50%");
      root.style.setProperty("--mouse-y", "50%");
      if (ambientLeftRef.current) {
        gsap.to(ambientLeftRef.current, {
          x: 0,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          overwrite: "auto",
        });
      }
      if (ambientRightRef.current) {
        gsap.to(ambientRightRef.current, {
          x: 0,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          overwrite: "auto",
        });
      }
    };

    root.style.setProperty("--mouse-x", "50%");
    root.style.setProperty("--mouse-y", "50%");
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
      if (ambientLeftRef.current) gsap.killTweensOf(ambientLeftRef.current);
      if (ambientRightRef.current) gsap.killTweensOf(ambientRightRef.current);
    };
  }, []);

  const selectedGames = useMemo(
    () => gameDefinitions.filter((game) => selectedGameIds.includes(game.id)),
    [selectedGameIds],
  );
  const currentGame = selectedGames[currentIndex];
  const difficultyLabel =
    difficultyLevels.find((level) => level.id === difficulty)?.label ?? "Medium";
  const currentResult = useMemo(
    () => results.find((item) => item.id === currentGame?.id),
    [currentGame, results],
  );
  const filteredLeaderboard = useMemo(
    () =>
      leaderboard
        .filter((entry) => leaderboardModeForEntry(entry) === leaderboardFilter)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10),
    [leaderboard, leaderboardFilter],
  );

  const persistLeaderboard = (scoreResults, games) => {
    const total = scoreResults.reduce((sum, item) => sum + item.normalized, 0);
    const mode = leaderboardModeForGames(games);
    const label = games.length === 1 ? games[0].title : `Full Run (${games.length} games)`;
    const currentEntries = loadLeaderboardForDifficulty(difficulty);
    const sameModeEntries = currentEntries.filter(
      (entry) => leaderboardModeForEntry(entry) === mode,
    );
    const otherEntries = currentEntries.filter(
      (entry) => leaderboardModeForEntry(entry) !== mode,
    );
    const nextModeEntries = [
      {
        name: playerName.trim() || "Player",
        score: total,
        label: `${label} - ${difficultyLabel}`,
        difficultyId: difficulty,
        difficultyLabel,
        mode,
        date: new Date().toISOString(),
      },
      ...sameModeEntries,
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    const nextEntries = [...nextModeEntries, ...otherEntries];
    saveLeaderboardForDifficulty(difficulty, nextEntries);
    setLeaderboard(nextEntries);
    setLeaderboardFilter(mode);
  };

  const handleStartRun = () => {
    setSelectedGameIds(gameDefinitions.map((game) => game.id));
    setResults([]);
    setCurrentIndex(0);
    navigate("/play");
  };

  const handleStartSingle = (gameId) => {
    setSelectedGameIds([gameId]);
    setResults([]);
    setCurrentIndex(0);
    navigate("/play");
  };

  const handleGameComplete = (result) => {
    setResults((existing) => {
      const next = existing.filter((item) => item.id !== result.id);
      return [...next, result];
    });
    navigate("/result");
  };

  const handleNext = () => {
    const isLast = currentIndex === selectedGames.length - 1;
    if (isLast) {
      persistLeaderboard(
        results.filter((item) => selectedGameIds.includes(item.id)),
        selectedGames,
      );
      navigate("/final");
      return;
    }

    setCurrentIndex((value) => value + 1);
    navigate("/play");
  };

  const handleRestart = () => {
    setResults([]);
    setCurrentIndex(0);
    setSelectedGameIds(gameDefinitions.map((game) => game.id));
    navigate("/lobby");
  };

  const handleExitToLobby = () => {
    setResults([]);
    setCurrentIndex(0);
    setSelectedGameIds(gameDefinitions.map((game) => game.id));
    navigate("/lobby");
  };

  const handleClearLeaderboard = () => {
    if (resetPassword !== "011205") {
      setResetError("Wrong password.");
      return;
    }
    const currentEntries = loadLeaderboardForDifficulty(difficulty);
    const nextEntries = currentEntries.filter(
      (entry) => leaderboardModeForEntry(entry) !== leaderboardFilter,
    );
    saveLeaderboardForDifficulty(difficulty, nextEntries);
    setLeaderboard(nextEntries);
    setResetPassword("");
    setResetError("");
  };

  const handleExportLeaderboard = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      leaderboard: loadLeaderboardStore(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `semiconductor-arcade-leaderboard-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setImportMessage("Leaderboard exported.");
  };

  const handleImportLeaderboardClick = () => {
    importInputRef.current?.click();
  };

  const handleImportLeaderboardFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      const importedStore = normalizeLeaderboardStore(parsed?.leaderboard ?? parsed);
      const mergedStore = mergeLeaderboardStores(loadLeaderboardStore(), importedStore);
      saveLeaderboardStore(mergedStore);
      setLeaderboard(mergedStore[difficulty] ?? []);
      setImportMessage("Leaderboard imported and merged.");
      setResetError("");
    } catch {
      setImportMessage("");
      setResetError("Import failed. Use a valid leaderboard JSON export.");
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore failed fullscreen requests (browser/user gesture restrictions).
    }
  };

  const showProgress = location.pathname === "/play" || location.pathname === "/result";
  const showExitHomeButton =
    location.pathname === "/play" ||
    location.pathname === "/result" ||
    location.pathname === "/final";

  const filteredResults = results.filter((item) => selectedGameIds.includes(item.id));

  const centerShell = location.pathname === "/" || location.pathname === "/lobby";

  return (
    <main className={`app-shell ${centerShell ? "app-shell-centered" : ""}`} ref={appRef}>
      <button
        type="button"
        className="fullscreen-toggle-button"
        onClick={toggleFullscreen}
      >
        {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      </button>
      {showExitHomeButton ? (
        <button
          type="button"
          className="exit-home-button"
          onClick={handleExitToLobby}
        >
          Exit To Lobby
        </button>
      ) : null}
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleImportLeaderboardFile}
      />
      <div className="ambient ambient-left" ref={ambientLeftRef} />
      <div className="ambient ambient-right" ref={ambientRightRef} />

      {showProgress ? (
        <ProgressMap
          games={selectedGames}
          currentIndex={currentIndex}
          results={results}
        />
      ) : null}

      <Routes>
        <Route path="/" element={<LandingHero onEnter={() => navigate("/lobby")} />} />

        <Route
          path="/lobby"
          element={
            <IntroScreen
              playerName={playerName}
              onNameChange={setPlayerName}
              onStartRun={handleStartRun}
              onGoHome={() => navigate("/")}
              onStartSingle={handleStartSingle}
              difficulty={difficulty}
              difficultyLabel={difficultyLabel}
              leaderboardFilter={leaderboardFilter}
              onLeaderboardFilterChange={setLeaderboardFilter}
              onDifficultyChange={setDifficulty}
              leaderboard={filteredLeaderboard}
              resetPassword={resetPassword}
              onResetPasswordChange={(value) => {
                setResetPassword(value);
                if (resetError) setResetError("");
                if (importMessage) setImportMessage("");
              }}
              onClearLeaderboard={handleClearLeaderboard}
              onExportLeaderboard={handleExportLeaderboard}
              onImportLeaderboard={handleImportLeaderboardClick}
              resetError={resetError}
              importMessage={importMessage}
            />
          }
        />

        <Route
          path="/play"
          element={
            currentGame ? (
              <ArcadeGame
                game={currentGame}
                difficulty={difficulty}
                onComplete={handleGameComplete}
              />
            ) : (
              <Navigate to="/lobby" replace />
            )
          }
        />

        <Route
          path="/result"
          element={
            currentGame && currentResult ? (
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
            ) : (
              <Navigate to="/play" replace />
            )
          }
        />

        <Route
          path="/final"
          element={
            filteredResults.length ? (
              <FinalScreen
                results={filteredResults}
                selectedGames={selectedGames}
                onRestart={handleRestart}
              />
            ) : (
              <Navigate to="/lobby" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
