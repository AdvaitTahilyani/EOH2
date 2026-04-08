import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { FactoryScene } from "./FactoryScene";

export function ArcadeGame({ game, onComplete }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const [readyToStart, setReadyToStart] = useState(false);

  useEffect(() => {
    setReadyToStart(false);
  }, [game]);

  useEffect(() => {
    const scene = new FactoryScene();
    sceneRef.current = scene;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 960,
      height: 640,
      parent: hostRef.current,
      backgroundColor: "#08131f",
      scale: {
        mode: Phaser.Scale.FIT,
        // CENTER_BOTH centers relative to the document viewport, not the
        // parent element, which displaces the canvas when the container is
        // not in the middle of the page. Let CSS flexbox handle centering.
        autoCenter: Phaser.Scale.NO_CENTER,
      },
      scene: [scene],
      physics: {
        default: "arcade",
        arcade: {
          debug: false,
        },
      },
    });

    // The parent card has a 500 ms fadeSlideUp CSS animation. During that
    // animation getBoundingClientRect() returns mid-animation coordinates,
    // so Phaser's Scale Manager places the canvas at the wrong position.
    // Calling scale.refresh() after the animation ends corrects it instantly.
    const refreshTimer = setTimeout(() => {
      gameRef.current?.scale.refresh();
    }, 650);

    return () => {
      clearTimeout(refreshTimer);
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!readyToStart || !sceneRef.current) return;
    sceneRef.current.configure(game, onComplete);
    gameRef.current?.scale.refresh();
  }, [game, onComplete, readyToStart]);

  return (
    <section className="screen-card game-card">
      <div className="game-frame" ref={hostRef} />
      {!readyToStart ? (
        <div className="game-splash">
          <div className="game-splash-card">
            <div className="eyebrow">How To Play</div>
            <h3>{game.title}</h3>
            <p>{game.description}</p>
            <div className="game-splash-meta">
              <span>{game.metric}</span>
              <span>{game.durationLabel}</span>
            </div>
            <p className="game-splash-rules">{game.instructions}</p>
            <button className="primary-button" onClick={() => setReadyToStart(true)}>
              Start Game
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
