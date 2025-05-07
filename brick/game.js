const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 게임 변수
let ballRadius = 8;
let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 2;
let dy = -2;

let paddleHeight = 10;
let paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

let rightPressed = false;
let leftPressed = false;

let brickRowCount = 5;
let brickColumnCount = 7;
let brickWidth = 55;
let brickHeight = 20;
let brickPadding = 8;
let brickOffsetTop = 30;
let brickOffsetLeft = 20;

let score = 0;
let lives = 3;
let brickCount = 0; // 남은 벽돌 개수
let bgm = null; // 배경음악 객체

let stageTransitioning = false;

// 1. 오디오 객체 생성
const brickSound = new Audio('audio/brick.mp3');

// 2. 스테이지별 벽돌 구성 (10스테이지로 확장)
const stageConfigs = [
  { rows: 3, cols: 5, pattern: (r, c) => 1 },
  { rows: 4, cols: 7, pattern: (r, c) => (r + c) % 2 === 0 ? 1 : 0 },
  { rows: 5, cols: 7, pattern: (r, c) => (r % 2 === 0 ? 1 : (c % 2 === 0 ? 1 : 0)) },
  { rows: 6, cols: 8, pattern: (r, c) => (r + c) % 3 !== 0 ? 1 : 0 },
  { rows: 7, cols: 10, pattern: (r, c) => (r === 6 && c === 5 ? 1 : 0) }, // stage5: 중앙 하단 1개
  { rows: 4, cols: 8, pattern: (r, c) => 1 },
  { rows: 7, cols: 10, pattern: (r, c) => (r === 6 && (c === 4 || c === 5) ? 1 : 0) }, // stage7: 하단 중앙 2개
  { rows: 8, cols: 10, pattern: (r, c) => (r === 5 && (c === 2 || c === 5 || c === 8) ? 1 : 0) }, // stage8: 띄엄띄엄 3개
  { rows: 7, cols: 10, pattern: (r, c) => (r === 6 && c === 5 ? 1 : 0) }, // stage9: 하단 중앙 1개
  { rows: 8, cols: 10, pattern: (r, c) => (r === 7 && c === 5 ? 1 : 0) }, // stage10: 하단 중앙 1개
];
let stage = 1;
const maxStage = stageConfigs.length;
const bgImages = [];
for (let i = 1; i <= maxStage; i++) {
  const img = new Image();
  img.src = `images/stage${i}.jpg`;
  bgImages.push(img);
}

// 열별 벽돌 색상 배열
const brickColors = [
  '#FF5733', // 1열
  '#FFBD33', // 2열
  '#75FF33', // 3열
  '#33FFBD', // 4열
  '#3375FF', // 5열
  '#8E33FF', // 6열
  '#FF33A8', // 7열
  '#FF3333', // 8열
  '#33FF57', // 9열
  '#33D1FF'  // 10열
];

// 벽돌 배열 생성 함수 (brickCount 계산 추가)
function createBricksForStage(stageIdx) {
  const config = stageConfigs[stageIdx];
  brickRowCount = config.rows;
  brickColumnCount = config.cols;
  bricks = [];
  brickCount = 0;
  for(let c=0; c<brickColumnCount; c++) {
    bricks[c] = [];
    for(let r=0; r<brickRowCount; r++) {
      const status = config.pattern(r, c);
      bricks[c][r] = { x: 0, y: 0, status };
      if(status === 1) brickCount++;
    }
  }
  // 진단용 콘솔 출력
  console.log('=== 스테이지', stage, 'brickCount:', brickCount, '===');
  for(let c=0; c<brickColumnCount; c++) {
    let col = [];
    for(let r=0; r<brickRowCount; r++) {
      col.push(bricks[c][r].status);
    }
    console.log('col', c, ':', col.join(','));
  }
}

// 배경음악 재생 함수
function playStageBGM(stageNum) {
  if(bgm) {
    bgm.pause();
    bgm.currentTime = 0;
  }
  bgm = new Audio(`audio/stage${stageNum}.mp3`);
  bgm.loop = true;
  bgm.volume = 0.5;
  bgm.play();
}

// 최초 사용자 입력 시에만 배경음악 재생
let bgmStarted = false;
function startBGMIfNeeded() {
  if (!bgmStarted) {
    playStageBGM(stage);
    bgmStarted = true;
  }
}
document.addEventListener("keydown", startBGMIfNeeded, { once: true });
document.addEventListener("mousedown", startBGMIfNeeded, { once: true });

// 최초 생성
createBricksForStage(stage-1);

// 이벤트 리스너
document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

function keyDownHandler(e) {
  if(e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
  else if(e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
}
function keyUpHandler(e) {
  if(e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
  else if(e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
}

// 벽돌 그리기
function drawBricks() {
  for(let c=0; c<brickColumnCount; c++) {
    for(let r=0; r<brickRowCount; r++) {
      if(bricks[c][r].status === 1) {
        let brickX = (c*(brickWidth+brickPadding)) + brickOffsetLeft;
        let brickY = (r*(brickHeight+brickPadding)) + brickOffsetTop;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;
        ctx.beginPath();
        ctx.rect(brickX, brickY, brickWidth, brickHeight);
        ctx.fillStyle = brickColors[c % brickColors.length];
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

// 공 그리기
function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI*2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.closePath();
}

// 패들 그리기
function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height-paddleHeight, paddleWidth, paddleHeight);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#111";
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.closePath();
}

// 점수 그리기
function drawScore() {
  ctx.font = "16px Arial";
  ctx.textAlign = "left";
  // 파란색 배경 블록
  ctx.fillStyle = "#2196f3";
  ctx.fillRect(4, 4, 80, 24);
  // 흰색 글씨
  ctx.fillStyle = "#fff";
  ctx.fillText("점수: "+score, 8, 22);
}

// 목숨 그리기
function drawLives() {
  ctx.font = "16px Arial";
  ctx.textAlign = "right";
  // 빨간색 배경 블록
  ctx.fillStyle = "#e53935";
  ctx.fillRect(canvas.width-84, 4, 80, 24);
  // 흰색 글씨
  ctx.fillStyle = "#fff";
  ctx.fillText("목숨: "+lives, canvas.width-8, 22);
}

// 충돌 체크 (brickCount로 스테이지 클리어 판정)
function collisionDetection() {
  console.log('collisionDetection: stage', stage, 'brickCount', brickCount, 'stageTransitioning', stageTransitioning);
  if (stageTransitioning) return;
  let hit = false;
  for(let c=0; c<brickColumnCount; c++) {
    for(let r=0; r<brickRowCount; r++) {
      let b = bricks[c][r];
      if(b.status === 1) {
        if(x > b.x && x < b.x+brickWidth && y > b.y && y < b.y+brickHeight) {
          dy = -dy;
          b.status = 0;
          score++;
          brickCount--;
          hit = true;
        }
      }
    }
  }
  if(brickCount <= 5 && brickCount > 0) {
    console.log('남은 벽돌 좌표 및 status:');
    for(let c=0; c<brickColumnCount; c++) {
      for(let r=0; r<brickRowCount; r++) {
        let b = bricks[c][r];
        if(b.status === 1) {
          console.log(`col:${c}, row:${r}, x:${b.x}, y:${b.y}, status:${b.status}`);
        }
      }
    }
  }
  if(hit) {
    brickSound.currentTime = 0;
    brickSound.play();
  }
  if(brickCount === 0 && !stageTransitioning) {
    stageTransitioning = true;
    console.log('brickCount 0! stage:', stage, 'stageTransitioning set true');
    setTimeout(() => {
      console.log('setTimeout fired! stage:', stage);
      if(stage < maxStage) {
        stage++;
        createBricksForStage(stage-1);
        playStageBGM(stage);
        x = canvas.width/2;
        y = canvas.height-30;
        dx = 2;
        dy = -2;
        paddleX = (canvas.width-paddleWidth)/2;
        stageTransitioning = false;
      } else {
        if(bgm) { bgm.pause(); }
        endGame();
      }
    }, 300);
  }
}

// 메인 draw 함수
function draw() {
  ctx.drawImage(bgImages[stage-1], 0, 0, canvas.width, canvas.height);
  drawStage();
  drawBricks();
  drawBall();
  drawPaddle();
  drawScore();
  drawLives();
  collisionDetection();

  // 벽 충돌
  if(x + dx > canvas.width-ballRadius || x + dx < ballRadius) dx = -dx;
  if(y + dy < ballRadius) dy = -dy;
  else if(y + dy > canvas.height-ballRadius) {
    if(x > paddleX && x < paddleX + paddleWidth) {
      dy = -dy;
    } else {
      lives--;
      if(!lives) {
        if(bgm) { bgm.pause(); }
        endGame();
      } else {
        x = canvas.width/2;
        y = canvas.height-30;
        dx = 2;
        dy = -2;
        paddleX = (canvas.width-paddleWidth)/2;
      }
    }
  }

  // 패들 이동
  if(rightPressed && paddleX < canvas.width-paddleWidth) paddleX += 7;
  else if(leftPressed && paddleX > 0) paddleX -= 7;

  x += dx;
  y += dy;
  requestAnimationFrame(draw);
}

// draw 함수에 drawStage 추가
function drawStage() {
  ctx.font = "bold 22px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(`STAGE ${stage}`, canvas.width/2, 28);
}

// 게임 종료 및 랭킹 처리
function endGame() {
  if(bgm) { bgm.pause(); }
  alert('게임 종료!');
  document.location.reload();
}

// 게임 시작 시간 기록
let startTime = Date.now();

draw(); 