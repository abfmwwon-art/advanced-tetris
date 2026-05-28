import { useEffect, useRef, useState } from "react";
import "./App.css";

const COLS = 10;
const ROWS = 20;
const BLOCK = 32;

// REAL classic-ish Tetris colors (clean + consistent)
const COLORS = [
  null,
  "#00f0f0", // I
  "#0000f0", // J
  "#f0a000", // L
  "#f0f000", // O
  "#00f000", // S
  "#a000f0", // T
  "#f00000", // Z
];

// classic pieces
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

  const playerRef = useRef({ x: 0, y: 0, matrix: null });
  const nextPieceRef = useRef(null);

  const animRef = useRef(null);

  const audio = useRef({});

  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [target, setTarget] = useState(5);

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

    let dropCounter = 0;
    let lastTime = 0;
    let dropInterval = 800;

    // FIXED COLLISION (this was one of your main bugs)
    function collide(x, y, m) {
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
          if (!m[r][c]) continue;

          const ny = r + y;
          const nx = c + x;

          if (
            ny < 0 ||
            ny >= ROWS ||
            nx < 0 ||
            nx >= COLS ||
            board[ny][nx]
          ) {
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
        audio.current.gameOver?.play();
      }
    }

    function merge() {
      player.matrix.forEach((r, y) => {
        r.forEach((v, x) => {
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
        audio.current.rotate?.play();
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

      if (cleared) {
        const table = [0, 100, 300, 500, 800];

        setScore(s => s + table[cleared] * level);
        setLines(l => {
          const n = l + cleared;

          const need = target;

          if (n >= need) {
            setLevel(v => v + 1);
            setTarget(t => t + 5);
            dropInterval = Math.max(100, dropInterval - 70);
          }

          return n;
        });

        audio.current.clear?.play();
      }
    }

    function move(dir) {
      player.x += dir;
      if (collide(player.x, player.y, player.matrix)) player.x -= dir;
      else audio.current.move?.play();
    }

    function drop() {
      player.y++;

      if (collide(player.x, player.y, player.matrix)) {
        player.y--;
        merge();
        clearLines();
        spawn();
        audio.current.drop?.play();
      }
    }

    function hardDrop() {
      while (!collide(player.x, player.y + 1, player.matrix)) {
        player.y++;
      }
      merge();
      clearLines();
      spawn();
      audio.current.drop?.play();
    }

    function ghostY() {
      let y = player.y;
      while (!collide(player.x, y + 1, player.matrix)) y++;
      return y;
    }

    function drawBlock(x, y, v, a = 1) {
      ctx.globalAlpha = a;

      ctx.fillStyle = COLORS[v];
      ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);

      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);

      ctx.globalAlpha = 1;
    }

    function draw() {
      ctx.fillStyle = "#0b1020";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      board.forEach((r, y) => {
        r.forEach((v, x) => {
          if (v) drawBlock(x, y, v);
        });
      });

      const gy = ghostY();

      player.matrix.forEach((r, y) => {
        r.forEach((v, x) => {
          if (v) drawBlock(x + player.x, y + gy, v, 0.25);
        });
      });

      player.matrix.forEach((r, y) => {
        r.forEach((v, x) => {
          if (v) drawBlock(x + player.x, y + player.y, v);
        });
      });
    }

    function drawNext() {
      nctx.fillStyle = "#111827";
      nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

      nextPieceRef.current.forEach((r, y) => {
        r.forEach((v, x) => {
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
      animRef.current = requestAnimationFrame(update);
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

    // REAL TETRIS STYLE AUDIO (better than random Google sounds)
    audio.current.move = new Audio("https://cdn.freesound.org/previews/341/341695_6261199-lq.mp3");
    audio.current.rotate = new Audio("https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3");
    audio.current.drop = new Audio("https://cdn.freesound.org/previews/341/341695_6261199-lq.mp3");
    audio.current.clear = new Audio("https://cdn.freesound.org/previews/198/198841_285997-lq.mp3");
    audio.current.gameOver = new Audio("https://cdn.freesound.org/previews/331/331912_3248244-lq.mp3");

    if (started) {
      spawn();
      update();
    }

    return () => {
      window.removeEventListener("keydown", key);
      cancelAnimationFrame(animRef.current);
    };
  }, [started, gameOver, level, target]);

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
        <p>Lines: {lines} / {target}</p>
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