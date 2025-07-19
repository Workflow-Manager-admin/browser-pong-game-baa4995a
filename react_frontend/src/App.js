import React, { useRef, useEffect, useState, useCallback } from "react";
import "./App.css";

// Game configuration
const CANVAS_WIDTH = 560;
const CANVAS_HEIGHT = 360;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 64;
const BALL_SIZE = 16;
const PADDLE_MARGIN = 16;

// Game speed
const BALL_SPEED_INIT = 3.4; // speed in px/frame
const BALL_SPEED_MAX = 8;
const PADDLE_SPEED = 4.2;
const BOT_PADDLE_SPEED = 3.05;

const COLOR_PRIMARY = "#2196F3";  // Paddle, ball
const COLOR_ACCENT = "#FFEB3B";  // Score
const COLOR_SECONDARY = "#212121";  // Borders, text
const COLOR_BG = "#fff";
const COLOR_BOARD = "#f5f6f8";
const COLOR_BTN = "#2196F3";
const COLOR_BTN_TEXT = "#fff";
const COLOR_BTN_ACCENT = "#FFEB3B";
const COLOR_BTN_HOVER = "#1976D2";

// PUBLIC_INTERFACE
export default function App() {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Keyboard state
  const [keyState, setKeyState] = useState({ ArrowUp: false, ArrowDown: false });

  // Store all game state in a ref so the requestAnimationFrame loop can mutate without causing re-renders
  const paddle1 = useRef({ y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2 });
  const paddle2 = useRef({ y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2 });
  const ball = useRef({
    x: CANVAS_WIDTH / 2 - BALL_SIZE / 2,
    y: CANVAS_HEIGHT / 2 - BALL_SIZE / 2,
    vx: 0,
    vy: 0,
    speed: BALL_SPEED_INIT
  });
  const reqFrame = useRef();
  const canvasRef = useRef();

  // Set up keyboard listeners
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        setKeyState((ks) => ({ ...ks, [e.code]: true }));
      }
      // Start/restart shortcut
      if ((e.code === "Space" || e.code === "Enter") && !running) {
        handleStart();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        setKeyState((ks) => ({ ...ks, [e.code]: false }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line
  }, [running]);

  // Handle game start/restart
  const handleStart = useCallback(() => {
    // Reset state
    setScore(0);
    setGameOver(false);
    setShowInstructions(false);
    // Center paddles, ball
    paddle1.current.y = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
    paddle2.current.y = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
    ball.current.x = CANVAS_WIDTH / 2 - BALL_SIZE / 2;
    ball.current.y = CANVAS_HEIGHT / 2 - BALL_SIZE / 2;
    // Launch ball in random direction
    const angle = (Math.random() < 0.5 ? -1 : 1) * (
      Math.PI / 6 + Math.random() * (Math.PI / 3)
    ); // [~30 to 60deg up or down relative to rightward]
    ball.current.speed = BALL_SPEED_INIT;
    ball.current.vx = Math.cos(angle) * ball.current.speed;
    ball.current.vy = Math.sin(angle) * ball.current.speed;
    setRunning(true);
    reqFrame.current = requestAnimationFrame(gameLoop);
  }, []);

  // End the game, stop loop
  const handleGameOver = useCallback(() => {
    setGameOver(true);
    setRunning(false);
    cancelAnimationFrame(reqFrame.current);
  }, []);

  // Main game loop
  const gameLoop = useCallback(() => {
    // --- Move player paddle ---
    let newY = paddle1.current.y;
    if (keyState.ArrowUp) newY -= PADDLE_SPEED;
    if (keyState.ArrowDown) newY += PADDLE_SPEED;
    newY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newY));
    paddle1.current.y = newY;

    // --- AI paddle ---
    // Simple AI: Track the ball with some speed cap, only if ball moves toward AI
    if (ball.current.vx > 0) {
      const target = ball.current.y + BALL_SIZE / 2 - PADDLE_HEIGHT / 2;
      if (Math.abs(paddle2.current.y - target) < BOT_PADDLE_SPEED) {
        paddle2.current.y = target;
      } else if (paddle2.current.y < target) {
        paddle2.current.y += BOT_PADDLE_SPEED;
      } else if (paddle2.current.y > target) {
        paddle2.current.y -= BOT_PADDLE_SPEED;
      }
      // Clamp
      paddle2.current.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, paddle2.current.y));
    }

    // --- Ball movement ---
    let bx = ball.current.x + ball.current.vx;
    let by = ball.current.y + ball.current.vy;

    // Top/bottom wall
    if (by <= 0) {
      by = 0;
      ball.current.vy = -ball.current.vy;
    }
    if (by >= CANVAS_HEIGHT - BALL_SIZE) {
      by = CANVAS_HEIGHT - BALL_SIZE;
      ball.current.vy = -ball.current.vy;
    }

    // Left paddle collision
    if (
      bx <= PADDLE_MARGIN + PADDLE_WIDTH &&
      bx >= PADDLE_MARGIN + PADDLE_WIDTH - Math.abs(ball.current.vx) &&
      by + BALL_SIZE > paddle1.current.y &&
      by < paddle1.current.y + PADDLE_HEIGHT
    ) {
      bx = PADDLE_MARGIN + PADDLE_WIDTH;
      let collidePos = (by + BALL_SIZE / 2 - paddle1.current.y) / PADDLE_HEIGHT - 0.5; // [-0.5, +0.5]
      let angle = collidePos * Math.PI / 2.66; // Max angle 34deg up/down
      ball.current.vx = Math.abs(ball.current.vx) * 1.09;
      let speed = Math.min(BALL_SPEED_MAX, Math.sqrt(ball.current.vx**2 + ball.current.vy**2) * 1.09);
      ball.current.vx = Math.cos(angle) * speed;
      ball.current.vy = Math.sin(angle) * speed;
      // Move toward right
      if (ball.current.vx < 2.4) ball.current.vx = 2.4;
      // Score!
      setScore((prev) => prev + 1);
    }
    // Right paddle collision (AI)
    else if (
      bx + BALL_SIZE >= CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH &&
      bx + BALL_SIZE <= CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH + Math.abs(ball.current.vx) &&
      by + BALL_SIZE > paddle2.current.y &&
      by < paddle2.current.y + PADDLE_HEIGHT
    ) {
      bx = CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH - BALL_SIZE;
      let collidePos = (by + BALL_SIZE / 2 - paddle2.current.y) / PADDLE_HEIGHT - 0.5;
      let angle = collidePos * Math.PI / 2.7;
      let speed = Math.min(BALL_SPEED_MAX, Math.sqrt(ball.current.vx**2 + ball.current.vy**2) * 1.045);
      ball.current.vx = -Math.abs(Math.cos(angle) * speed);
      ball.current.vy = Math.sin(angle) * speed;
    }

    // Left wall = lose
    if (bx < 0 - BALL_SIZE * 0.8) {
      handleGameOver();
      return;
    }
    // Right wall = reflect
    if (bx > CANVAS_WIDTH - BALL_SIZE) {
      bx = CANVAS_WIDTH - BALL_SIZE;
      ball.current.vx = -ball.current.vx;
    }

    // Commit move
    ball.current.x = bx;
    ball.current.y = by;

    // Draw updated state
    renderGame();

    // Loop
    reqFrame.current = requestAnimationFrame(gameLoop);
  }, [keyState, handleGameOver]);

  // Clean up on unmount
  useEffect(() => () => cancelAnimationFrame(reqFrame.current), []);

  // Redraw initial board on mount and when not running
  useEffect(() => {
    renderGame();
    // eslint-disable-next-line
  }, [running, gameOver, score, showInstructions]);
  
  // Draw the game state
  function renderGame() {
    const ctx = canvasRef.current.getContext("2d");
    // Background
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Board
    ctx.fillStyle = COLOR_BOARD;
    ctx.fillRect(
      10, 8, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 16
    );

    // Dotted center line
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = COLOR_SECONDARY + "99";
    ctx.lineWidth = 2;
    ctx.moveTo(CANVAS_WIDTH/2, 12);
    ctx.lineTo(CANVAS_WIDTH/2, CANVAS_HEIGHT - 12);
    ctx.stroke();
    ctx.restore();

    // Paddles
    ctx.fillStyle = COLOR_PRIMARY;
    ctx.fillRect(PADDLE_MARGIN, paddle1.current.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = COLOR_SECONDARY;
    ctx.fillRect(CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH, paddle2.current.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Ball
    ctx.beginPath();
    ctx.fillStyle = COLOR_PRIMARY;
    ctx.arc(
      ball.current.x + BALL_SIZE/2,
      ball.current.y + BALL_SIZE/2,
      BALL_SIZE/2, 0, 2 * Math.PI
    );
    ctx.fill();

    // Score
    ctx.font = "bold 37px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = COLOR_ACCENT;
    ctx.textAlign = "center";
    ctx.fillText(score.toString().padStart(2, "0"), CANVAS_WIDTH/2, 54);

    // "Game Over"
    if (gameOver) {
      ctx.font = "24px 'Segoe UI', Arial";
      ctx.fillStyle = COLOR_PRIMARY;
      ctx.fillText("Game Over", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
      ctx.font = "16px 'Segoe UI', Arial";
      ctx.fillStyle = COLOR_SECONDARY;
      ctx.fillText("Your Score: " + score, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 24);
      ctx.font = "bold 16px 'Segoe UI', Arial";
      ctx.fillStyle = COLOR_PRIMARY;
      ctx.fillText("Press [Enter] or [Space] to restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 56);
    }

    // Instructions overlay
    if (showInstructions && !running) {
      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = "#fff";
      ctx.fillRect(24, CANVAS_HEIGHT/2-80, CANVAS_WIDTH-48, 180);
      ctx.globalAlpha = 1;
      ctx.font = "bold 22px 'Segoe UI', Arial";
      ctx.fillStyle = COLOR_PRIMARY;
      ctx.textAlign = "center";
      ctx.fillText("Pong - Minimal Edition", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 31);
      ctx.font = "16px 'Segoe UI', Arial";
      ctx.fillStyle = COLOR_SECONDARY;
      ctx.fillText("Use \u2191 and \u2193 Arrow Keys to move", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 1);
      ctx.fillText("Score points by hitting the ball with your paddle.", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 18);
      ctx.fillStyle = COLOR_PRIMARY;
      ctx.font = "bold 16px 'Segoe UI', Arial";
      ctx.fillText("Press [Start] or [Space]/[Enter] to begin", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 48);
      ctx.restore();
    }
  }

  // Responsive: restrict main game box width on small screens
  // PUBLIC_INTERFACE
  const getGameWrapperStyle = () => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100vh",
    background: COLOR_BG,
    color: COLOR_SECONDARY,
    padding: "0 8px"
  });

  // PUBLIC_INTERFACE
  const getCanvasWrapperStyle = () => ({
    margin: "60px 0 16px 0",
    background: "#eee",
    borderRadius: 16,
    boxShadow: "0 2px 8px rgba(33,150,243,0.04)",
    border: `2px solid ${COLOR_PRIMARY}10`,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    maxWidth: "100vw", // Prevents overflow
    overflow: "visible",
  });

  // PUBLIC_INTERFACE
  const getScoreStyle = () => ({
    marginTop: "16px",
    marginBottom: "10px",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "0.04em",
    color: COLOR_PRIMARY,
    textShadow: "0 2px 8px #0001"
  });

  // PUBLIC_INTERFACE
  const getBtnStyle = (accent) => ({
    margin: "10px 8px",
    padding: "10px 22px",
    fontSize: 16,
    borderRadius: "28px",
    border: "none",
    background: accent ? COLOR_ACCENT : COLOR_BTN,
    color: accent ? "#3e3e3e" : COLOR_BTN_TEXT,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background .15s",
    outline: "none",
    boxShadow: accent ? `0 2px 10px ${COLOR_ACCENT}36` : `0 1px 2px #bbb8`
  });

  // PUBLIC_INTERFACE
  return (
    <div style={getGameWrapperStyle()}>
      <main>
        <h1 
          style={{
            marginTop: 36,
            marginBottom: 22,
            textAlign: "center",
            fontSize: "2.4em",
            fontWeight: 700,
            letterSpacing: "0.03em",
            color: COLOR_PRIMARY,
            textShadow: "0 2px 8px #8881"
          }}
        >
          Pong
        </h1>
        <div style={getScoreStyle()}>Score: <span style={{color: COLOR_ACCENT}}>{score}</span></div>
        <section style={getCanvasWrapperStyle()}>
          <canvas
            ref={canvasRef}
            tabIndex={0}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            aria-label="pong game canvas"
            style={{
              background: "#fff",
              borderRadius: 12,
              outline: "none",
              border: `2px solid ${COLOR_PRIMARY}23`,
              width: "min(100vw,560px)",
              maxWidth: "100vw",
              height: "auto",
              display: "block",
              margin: "0 auto"
            }}
          />
        </section>
        <div style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          {!running && (
            <button
              style={getBtnStyle(false)}
              onClick={handleStart}
              aria-label="Start new game"
            >
              {gameOver ? "Restart" : "Start"}
            </button>
          )}
          <button
            style={getBtnStyle(true)}
            onClick={() => setShowInstructions((v) => !v)}
            aria-label="How to play"
          >
            {showInstructions ? "Hide Help" : "How to Play"}
          </button>
        </div>
        <footer style={{
          textAlign: "center",
          fontSize: 13,
          color: "#222",
          opacity: 0.7,
          marginTop: 36,
          marginBottom: 6,
        }}>
          Made with <span style={{color: COLOR_PRIMARY}}>React</span>. &copy; {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  );
}
