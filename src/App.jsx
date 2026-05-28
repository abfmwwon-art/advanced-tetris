import { useEffect, useRef, useState } from "react";
import "./App.css";

const COLS = 10;
const ROWS = 20;
const BLOCK = 32;

const COLORS = [
  null,
  "#00cfff",
  "#005eff",
  "#ff8a00",
  "#ffe600",
  "#00ff8c",
  "#c000ff",
  "#ff003c",
];

const PIECES = [
  [[1, 1, 1, 1]],
  [[2, 0, 0], [2, 2, 2]],
  [[0, 0, 3], [3, 3, 3]],
  [[4, 4], [4, 4]],
  [[0, 5, 5], [5, 5, 0]],
  [[0, 6, 0], [6, 6, 6]],
  [[7, 7, 0], [0, 7, 7]],
];

export default function App() {
  const canvasRef = useRef(null);
  const nextRef = useRef(null);

  const boardRef = useRef(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );

  const playerRef = useRef({
    x: 0,
    y: 0,
    matrix: null,
  });

  const nextPieceRef = useRef(null);

  const audio = useRef({
    move: null,
    rotate: null,
    drop: null,
    clear: null,
    gameOver: null,
  });

  const animationRef = useRef(null);

  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);

  const [targetLines, setTargetLines] = useState(5);

  function playSound(name) {
    const s = audio.current[name];
    if (!s) return;
    s.currentTime = 0;
    s.play().catch(() => {});
  }

  function randomPiece() {
    return JSON.parse(
      JSON.stringify(PIECES[Math.floor(Math.random() * PIECES.length)])
    );
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const nextCanvas = nextRef.current;
    const nctx = nextCanvas.getContext("2d");

    canvas.width = COLS * BLOCK;
    canvas.height = ROWS * BLOCK;

    nextCanvas.width = 140;
    nextCanvas.height = 140;

    const board = boardRef.current;
    const player = playerRef.current;

    let lastTime = 0;
    let dropCounter = 0;

    let dropInterval = 800;

    function collide(x, y, m) {
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
          if (m[r][c] && (board[r + y] && board[r + y][c + x]) !== 0) {
            return true;
          }
        }
      }
      return false;
    }

    function spawn() {
      player.matrix = nextPieceRef.current || randomPiece();
      nextPieceRef.current = randomPiece();

      player.y = 0;
      player.x = Math.floor((COLS - player.matrix[0].length) / 2);

      drawNext();

      if (collide(player.x, player.y, player.matrix)) {
        setGameOver(true);
        playSound("gameOver");
      }
    }

    function merge() {
      player.matrix.forEach((row, y) => {
        row.forEach((v, x) => {
          if (v) board[y + player.y][x + player.x] = v;
        });
      });
    }

    function rotate(m) {
      return m[0].map((_, i) => m.map(r => r[i]).reverse());
    }

    function rotatePiece() {
      const rotated = rotate(player.matrix);
      if (!collide(player.x, player.y, rotated)) {
        player.matrix = rotated;
        playSound("rotate");
      }
    }

    function clearLines() {
      let cleared = 0;

      outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
          if (!board[y][x]) continue outer;
        }

        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
        cleared++;
        y++;
      }

      if (cleared > 0) {
        playSound("clear");

        const table = [0, 100, 300, 500, 800];

        setScore(s => s + table[cleared] * level);

        setLines(prev => {
          const newLines = prev + cleared;

          const needed = targetLines;

          if (newLines >= needed) {
            setLevel(l => l + 1);
            setTargetLines(t => t + 5);
            dropInterval = Math.max(120, dropInterval - 80);
          }

          return newLines;
        });
      }
    }

    function move(dir) {
      player.x += dir;
      if (collide(player.x, player.y, player.matrix)) player.x -= dir;
      else playSound("move");
    }

    function drop() {
      player.y++;

      if (collide(player.x, player.y, player.matrix)) {
        player.y--;
        merge();
        clearLines();
        spawn();
        playSound("drop");
      }
    }

    function hardDrop() {
      while (!collide(player.x, player.y + 1, player.matrix)) {
        player.y++;
      }

      merge();
      clearLines();
      spawn();
      playSound("drop");
    }

    function ghostY() {
      let y = player.y;
      while (!collide(player.x, y + 1, player.matrix)) y++;
      return y;
    }

    function drawBlock(x, y, v, alpha = 1) {
      const px = x * BLOCK;
      const py = y * BLOCK;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS[v];
      ctx.fillRect(px, py, BLOCK, BLOCK);

      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.strokeRect(px, py, BLOCK, BLOCK);

      ctx.globalAlpha = 1;
    }

    function draw() {
      ctx.fillStyle = "#0b1020";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      board.forEach((row, y) => {
        row.forEach((v, x) => {
          if (v) drawBlock(x, y, v);
        });
      });

      const gy = ghostY();

      player.matrix.forEach((row, y) => {
        row.forEach((v, x) => {
          if (v) drawBlock(x + player.x, y + gy, v, 0.2);
        });
      });

      player.matrix.forEach((row, y) => {
        row.forEach((v, x) => {
          if (v) drawBlock(x + player.x, y + player.y, v);
        });
      });
    }

    function drawNext() {
      nctx.fillStyle = "#111827";
      nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

      nextPieceRef.current.forEach((row, y) => {
        row.forEach((v, x) => {
          if (v) {
            nctx.fillStyle = COLORS[v];
            nctx.fillRect((x + 1) * 28, (y + 1) * 28, 28, 28);
          }
        });
      });
    }

    function update(time = 0) {
      if (!started || gameOver) return;

      const delta = time - lastTime;
      lastTime = time;

      dropCounter += delta;

      if (dropCounter > dropInterval) {
        drop();
        dropCounter = 0;
      }

      draw();
      animationRef.current = requestAnimationFrame(update);
    }

    function key(e) {
      if (!started || gameOver) return;

      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowDown") drop();
      if (e.key === "ArrowUp") rotatePiece();
      if (e.key === " ") hardDrop();
    }

    window.addEventListener("keydown", key);

    audio.current.move = new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
    audio.current.rotate = new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg");
    audio.current.drop = new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg");
    audio.current.clear = new Audio("https://actions.google.com/sounds/v1/cartoon/ta_da.ogg");
    audio.current.gameOver = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

    if (started) {
      spawn();
      update();
    }

    return () => {
      window.removeEventListener("keydown", key);
      cancelAnimationFrame(animationRef.current);
    };
  }, [started, gameOver, level]);

  return (
    <div className="app">
      {!started && (
        <div className="menu">
          <h1>TETRIS</h1>
          <button onClick={() => setStarted(true)}>PLAY</button>
        </div>
      )}

      <div className="sidePanel">
        <h2>TETRIS</h2>
        <p>Score: {score}</p>
        <p>Lines: {lines} / {targetLines}</p>
        <p>Level: {level}</p>
      </div>

      <div className="gameWrap">
        <canvas ref={canvasRef} className="game" />
        {gameOver && <div className="gameOver">GAME OVER</div>}
      </div>

      <div className="sidePanel">
        <h2>NEXT</h2>
        <canvas ref={nextRef} className="next" />
      </div>
    </div>
  );
}