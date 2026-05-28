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

  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [score, setScore] = useState(0);
  const [rows, setRows] = useState(0);
  const [level, setLevel] = useState(1);

  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!started || gameOver) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const nextCanvas = nextRef.current;
    const nctx = nextCanvas.getContext("2d");

    canvas.width = COLS * BLOCK;
    canvas.height = ROWS * BLOCK;

    nextCanvas.width = 160;
    nextCanvas.height = 160;

    const board = Array.from({ length: ROWS }, () =>
      Array(COLS).fill(0)
    );

    const moveSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3");
    const rotateSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
    const dropSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3");
    const clearSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2030/2030-preview.mp3");

    let nextPiece = create();
    const player = { x:0,y:0,m:null };

    let drop = 0;
    let last = 0;

    function create() {
      return JSON.parse(JSON.stringify(PIECES[Math.floor(Math.random()*PIECES.length)]));
    }

    function collide(px,py,m) {
      for(let y=0;y<m.length;y++){
        for(let x=0;x<m[y].length;x++){
          if(m[y][x]){
            let nx = px+x;
            let ny = py+y;
            if(nx<0||nx>=COLS||ny>=ROWS) return true;
            if(ny>=0 && board[ny][nx]) return true;
          }
        }
      }
      return false;
    }

    function spawn() {
      player.m = nextPiece;
      nextPiece = create();

      player.y = 0;
      player.x = Math.floor(COLS/2-player.m[0].length/2);

      if(collide(player.x,player.y,player.m)) setGameOver(true);

      drawNext();
    }

    function merge(){
      player.m.forEach((r,y)=>{
        r.forEach((v,x)=>{
          if(v) board[y+player.y][x+player.x]=v;
        });
      });
    }

    function rotate(m){
      return m[0].map((_,i)=>m.map(r=>r[i]).reverse());
    }

    function rotateP(){
      const r = rotate(player.m);
      const ox = player.x;
      player.m = r;

      let off = 1;
      while(collide(player.x,player.y,player.m)){
        player.x += off;
        off = -(off + (off>0?1:-1));
        if(off>player.m[0].length){
          player.m = rotate(rotate(rotate(player.m)));
          player.x = ox;
          return;
        }
      }
      rotateSound.play();
    }

    function clear(){
      let c=0;
      for(let y=ROWS-1;y>=0;y--){
        if(board[y].every(v=>v)){
          board.splice(y,1);
          board.unshift(Array(COLS).fill(0));
          c++; y++;
        }
      }

      if(c){
        clearSound.play();
        setRows(r=>{
          const nr=r+c;
          setLevel(Math.floor(nr/10)+1);
          return nr;
        });
        setScore(s=>s+c*200);
        setMsg("ROW CLEARED");
        setTimeout(()=>setMsg(""),800);
      }
    }

    function dropP(){
      player.y++;
      if(collide(player.x,player.y,player.m)){
        player.y--;
        merge();
        clear();
        spawn();
      }
      drop=0;
    }

    function hard(){
      while(!collide(player.x,player.y+1,player.m)) player.y++;
      dropSound.play();
      merge(); clear(); spawn();
    }

    function move(d){
      player.x+=d;
      if(collide(player.x,player.y,player.m)) player.x-=d;
      moveSound.play();
    }

    function ghost(){
      let y=player.y;
      while(!collide(player.x,y+1,player.m)) y++;
      return y;
    }

    function drawBlock(c,x,y,v,a=1){
      const px=x*BLOCK, py=y*BLOCK;
      c.globalAlpha=a;

      c.fillStyle=COLORS[v];
      c.fillRect(px,py,BLOCK,BLOCK);

      c.fillStyle="rgba(255,255,255,0.25)";
      c.fillRect(px+2,py+2,BLOCK-4,6);

      c.fillStyle="rgba(0,0,0,0.25)";
      c.fillRect(px+2,py+BLOCK-8,BLOCK-4,6);

      c.globalAlpha=1;
    }

    function drawM(c,m,ox,oy,a=1){
      m.forEach((r,y)=>r.forEach((v,x)=>v&&drawBlock(c,ox+x,oy+y,v,a)));
    }

    function draw(){
      ctx.fillStyle="#0d1218";
      ctx.fillRect(0,0,canvas.width,canvas.height);

      drawM(ctx,board,0,0);
      drawM(ctx,player.m,player.x,ghost(),0.2);
      drawM(ctx,player.m,player.x,player.y);
    }

    function drawNext(){
      nctx.clearRect(0,0,160,160);
      drawM(nctx,nextPiece,2,2);
    }

    function loop(t=0){
      const d=t-last; last=t; drop+=d;
      if(drop>600-level*50) dropP();
      draw();
      requestAnimationFrame(loop);
    }

    function key(e){
      if(gameOver) return;
      if(e.code==="ArrowLeft") move(-1);
      if(e.code==="ArrowRight") move(1);
      if(e.code==="ArrowDown") dropP();
      if(e.code==="ArrowUp") rotateP();
      if(e.code==="Space") hard();
    }

    document.addEventListener("keydown",key);

    spawn(); loop();

    return ()=>document.removeEventListener("keydown",key);

  },[started,gameOver,level]);

  const nextRows = 10-(rows%10);

  return (
    <div className="app">

      <img src={weekend4} className="bg"/>

      {/* 🦄 unicorns */}
      <div className="unicorn u1">🦄</div>
      <div className="unicorn u2">🦄</div>
      <div className="unicorn u3">🦄</div>
      <div className="unicorn u4">🦄</div>
  

      <div className="panel left">
        <h1>CODED BY A TETRIS V1</h1>

        <div className="stat">ROWS <b>{rows}</b></div>
        <div className="stat">LEVEL <b>{level}</b></div>
        <div className="stat">NEXT LVL <b>{nextRows}</b></div>
        <div className="stat">SCORE <b>{score}</b></div>

        <div className="keys">
          <h3>KEYBINDS</h3>
          <p>← → Move</p>
          <p>↑ Rotate</p>
          <p>↓ Drop</p>
          <p>SPACE Hard Drop</p>
        </div>

        <div className="info">
          Clear rows to level up and gain points.
        </div>

        {!started && <button onClick={()=>setStarted(true)}>START</button>}
      </div>

      <div className="game-wrap">

        {msg && <div className="msg">{msg}</div>}

        {gameOver && <div className="over">GAME LOST WOMP! </div>}

        <canvas ref={canvasRef} className="game"/>
      </div>

      <div className="panel right">
        <h3>NEXT</h3>
        <canvas ref={nextRef}/>
      </div>

    </div>
  );
}