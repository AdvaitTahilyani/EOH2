import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { FactoryScene } from "./FactoryScene";

export function ArcadeGame({ game, difficulty, onComplete }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const previewVideoRef = useRef(null);
  const [readyToStart, setReadyToStart] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    setReadyToStart(false);
    setPreviewReady(false);
  }, [game]);

  useEffect(() => {
    if (!readyToStart || !hostRef.current) return;

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
  }, [readyToStart]);

  useEffect(() => {
    if (!readyToStart || !sceneRef.current) return;
    sceneRef.current.configure(game, onComplete, difficulty);
    gameRef.current?.scale.refresh();
  }, [difficulty, game, onComplete, readyToStart]);

  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video) return;
    setPreviewReady(false);
    video.currentTime = 0;
    video.load();
    const playPromise = video.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  }, [game.id]);

  const handlePreviewCanPlay = () => {
    setPreviewReady(true);
    const video = previewVideoRef.current;
    if (!video || !video.paused) return;
    const playPromise = video.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  };

  return (
    <section className="screen-card game-card">
      <div className="game-frame" ref={hostRef} />
      {!readyToStart ? (
        <div className="game-splash">
          <div className="game-splash-card">
            <div className="eyebrow">How To Play</div>
            <div className="game-splash-video-wrap">
              <video
                ref={previewVideoRef}
                className="game-splash-video"
                src={game.previewVideo}
                muted
                autoPlay
                loop
                playsInline
                preload="metadata"
                onCanPlay={handlePreviewCanPlay}
              />
              {!previewReady ? (
                <div className="game-splash-video-loading">Buffering preview...</div>
              ) : null}
            </div>
            <h3>{game.title}</h3>
            <p>{game.description}</p>
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
