import { useEffect, useRef, useState } from "react";
import "./App.css";

import weekend4 from "./assets/weekend4.jpg";

const COLS = 10;
const ROWS = 20;
const BLOCK = 32;

const COLORS = {
  1: "#4cc9f0",
  2: "#4361ee",
  3: "#f8961e",
  4: "#f9c74f",
  5: "#43aa8b",
  6: "#9b5de5",
  7: "#f94144",
};

const PIECES = [
  [[1,1,1,1]],
  [[2,0,0],[2,2,2]],
  [[0,0,3],[3,3,3]],
  [[4,4],[4,4]],
  [[0,5,5],[5,5,0]],
  [[0,6,0],[6,6,6]],
  [[7,7,0],[0,7,7]],
];

export default function App() {

  const canvasRef = useRef(null);
  const nextRef = useRef(null);

  const [started,setStarted] = useState(false);
  const [gameOver,setGameOver] = useState(false);

  const [score,setScore] = useState(0);
  const [rows,setRows] = useState(0);
  const [level,setLevel] = useState(1);

  const [msg,setMsg] = useState("");
  const [resetKey,setResetKey] = useState(0);

  useEffect(() => {

    if(!started || gameOver) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const nextCanvas = nextRef.current;
    const nctx = nextCanvas.getContext("2d");

    canvas.width = COLS * BLOCK;
    canvas.height = ROWS * BLOCK;

    nextCanvas.width = 160;
    nextCanvas.height = 160;

    const board = Array.from({length:ROWS},()=>Array(COLS).fill(0));

    const moveSound = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3"
    );

    const rotateSound = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"
    );

    const dropSound = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3"
    );

    const clearSound = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2030/2030-preview.mp3"
    );

    let nextPiece = createPiece();

    const player = {
      x:0,
      y:0,
      matrix:null
    };

    let dropCounter = 0;
    let lastTime = 0;
    let animation;

    function createPiece(){
      return JSON.parse(
        JSON.stringify(
          PIECES[Math.floor(Math.random()*PIECES.length)]
        )
      );
    }

    function collide(px,py,matrix){

      for(let y=0;y<matrix.length;y++){

        for(let x=0;x<matrix[y].length;x++){

          if(matrix[y][x]){

            const nx = px+x;
            const ny = py+y;

            if(nx<0 || nx>=COLS || ny>=ROWS){
              return true;
            }

            if(ny>=0 && board[ny][nx]){
              return true;
            }
          }
        }
      }

      return false;
    }

    function spawnPiece(){

      player.matrix = nextPiece;
      nextPiece = createPiece();

      player.y = 0;

      player.x = Math.floor(
        COLS/2-player.matrix[0].length/2
      );

      drawNext();

      if(collide(player.x,player.y,player.matrix)){
        setGameOver(true);
      }
    }

    function merge(){

      player.matrix.forEach((row,y)=>{

        row.forEach((value,x)=>{

          if(value){

            board[y+player.y][x+player.x] = value;
          }
        });
      });
    }

    function rotate(matrix){

      return matrix[0].map((_,i)=>
        matrix.map(r=>r[i]).reverse()
      );
    }

    function rotatePlayer(){

      const rotated = rotate(player.matrix);

      const oldX = player.x;

      let offset = 1;

      player.matrix = rotated;

      while(collide(player.x,player.y,player.matrix)){

        player.x += offset;

        offset = -(offset+(offset>0?1:-1));

        if(offset > player.matrix[0].length){

          player.matrix =
            rotate(
              rotate(
                rotate(player.matrix)
              )
            );

          player.x = oldX;
          return;
        }
      }

      rotateSound.currentTime = 0;
      rotateSound.play();
    }

    function clearRows(){

      let cleared = 0;

      for(let y=ROWS-1;y>=0;y--){

        if(board[y].every(v=>v)){

          board.splice(y,1);

          board.unshift(Array(COLS).fill(0));

          cleared++;
          y++;
        }
      }

      if(cleared){

        clearSound.currentTime = 0;
        clearSound.play();

        setRows(r=>{

          const nr = r+cleared;

          setLevel(Math.floor(nr/5)+1);

          return nr;
        });

        setScore(s=>s+(cleared*250*level));

        setMsg(`+${cleared} ROWS`);

        setTimeout(()=>{
          setMsg("");
        },900);
      }
    }

    function playerDrop(){

      player.y++;

      if(collide(player.x,player.y,player.matrix)){

        player.y--;

        merge();

        clearRows();

        spawnPiece();
      }

      dropCounter = 0;
    }

    function hardDrop(){

      while(
        !collide(
          player.x,
          player.y+1,
          player.matrix
        )
      ){
        player.y++;
      }

      dropSound.currentTime = 0;
      dropSound.play();

      merge();

      clearRows();

      spawnPiece();
    }

    function move(dir){

      player.x += dir;

      if(collide(player.x,player.y,player.matrix)){
        player.x -= dir;
      } else {
        moveSound.currentTime = 0;
        moveSound.play();
      }
    }

    function ghostY(){

      let y = player.y;

      while(
        !collide(
          player.x,
          y+1,
          player.matrix
        )
      ){
        y++;
      }

      return y;
    }

    function drawBlock(c,x,y,v,a=1){

      const px = x*BLOCK;
      const py = y*BLOCK;

      c.globalAlpha = a;

      c.fillStyle = COLORS[v];

      c.fillRect(px,py,BLOCK,BLOCK);

      c.fillStyle = "rgba(255,255,255,0.30)";

      c.fillRect(px+2,py+2,BLOCK-4,5);

      c.fillStyle = "rgba(0,0,0,0.30)";

      c.fillRect(px+2,py+BLOCK-7,BLOCK-4,5);

      c.strokeStyle = "rgba(255,255,255,0.12)";

      c.strokeRect(px+1,py+1,BLOCK-2,BLOCK-2);

      c.globalAlpha = 1;
    }

    function drawMatrix(c,matrix,ox,oy,a=1){

      matrix.forEach((row,y)=>{

        row.forEach((value,x)=>{

          if(value){

            drawBlock(
              c,
              ox+x,
              oy+y,
              value,
              a
            );
          }
        });
      });
    }

    function draw(){

      ctx.fillStyle = "#0d1218";

      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      drawMatrix(ctx,board,0,0);

      drawMatrix(
        ctx,
        player.matrix,
        player.x,
        ghostY(),
        0.2
      );

      drawMatrix(
        ctx,
        player.matrix,
        player.x,
        player.y
      );
    }

    function drawNext(){

      nctx.clearRect(0,0,160,160);

      drawMatrix(
        nctx,
        nextPiece,
        2,
        2
      );
    }

    function update(time=0){

      const delta = time-lastTime;

      lastTime = time;

      dropCounter += delta;

      const speed = Math.max(
        220,
        850-(level*40)
      );

      if(dropCounter > speed){

        playerDrop();
      }

      draw();

      animation = requestAnimationFrame(update);
    }

    function handleKey(e){

      e.preventDefault();

      if(gameOver) return;

      if(e.code==="ArrowLeft") move(-1);

      if(e.code==="ArrowRight") move(1);

      if(e.code==="ArrowDown") playerDrop();

      if(e.code==="ArrowUp") rotatePlayer();

      if(e.code==="Space") hardDrop();
    }

    document.addEventListener(
      "keydown",
      handleKey
    );

    spawnPiece();

    update();

    return ()=>{

      cancelAnimationFrame(animation);

      document.removeEventListener(
        "keydown",
        handleKey
      );
    };

  },[started,gameOver,level,resetKey]);

  const nextLevelRows = 5-(rows%5);

  function restartGame(){

    setGameOver(false);
    setStarted(true);

    setScore(0);
    setRows(0);
    setLevel(1);

    setMsg("");

    setResetKey(v=>v+1);
  }

  return (

    <div className="app">

      <img
        src={weekend4}
        className="bg"
      />

      <div className="unicorn u1">🦄</div>
      <div className="unicorn u2">🦄</div>
      <div className="unicorn u3">🦄</div>
      <div className="unicorn u4">🦄</div>
      <div className="unicorn u5">🦄</div>

      <div className="panel left-panel">

        <h1 className="logo">
          TETRIS
        </h1>

        <div className="stat">
          <span>ROWS</span>
          <b>{rows}</b>
        </div>

        <div className="stat">
          <span>LEVEL</span>
          <b>{level}</b>
        </div>

        <div className="stat">
          <span>NEXT LEVEL</span>
          <b>{nextLevelRows}</b>
        </div>

        <div className="stat">
          <span>SCORE</span>
          <b>{score}</b>
        </div>

        <div className="keys">

          <h3>KEYBINDS</h3>

          <div className="key">
            ← → MOVE
          </div>

          <div className="key">
            ↑ ROTATE
          </div>

          <div className="key">
            ↓ DROP
          </div>

          <div className="key">
            SPACE HARD DROP
          </div>

        </div>

        {!started && (

          <button
            onClick={()=>setStarted(true)}
          >
            START GAME
          </button>
        )}

      </div>

      <div className="game-wrap">

        {msg && (
          <div className="msg">
            {msg}
          </div>
        )}

        {gameOver && (

          <div className="overlay">

            <div className="game-over-box">

              <h2>GAME LOST</h2>

              <button
                className="retry-btn"
                onClick={restartGame}
              >
                TRY AGAIN
              </button>

            </div>

          </div>
        )}

        <canvas
          ref={canvasRef}
          className="game"
        />

      </div>

      <div className="panel right-panel">

        <h3>NEXT</h3>

        <canvas ref={nextRef}/>

      </div>

    </div>
  );
}