const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 게임 변수
let ballRadius = 8;
let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 2.4;
let dy = -2.4;

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

let isGameEnded = false;
let clearTime = 0;

// 1. 오디오 객체 생성
const brickSound = new Audio('audio/brick.mp3');

// 2. 스테이지별 벽돌 구성 (10스테이지로 확장)
const stageConfigs = [
  // stage1: 기본 직사각형 (맨 윗줄 제거, 12열째 블록 없음)
  { rows: 5, cols: 12, pattern: (r, c) => c !== 11 ? 1 : 0 },
  // stage2: 계단형
  { rows: 6, cols: 12, pattern: (r, c) => c >= r ? 1 : 0 },
  // stage3: 피라미드
  { rows: 7, cols: 13, pattern: (r, c) => Math.abs(c-6) <= r ? 1 : 0 },
  // stage4: X자
  { rows: 8, cols: 12, pattern: (r, c) => (r === c || r + c === 11) ? 1 : 0 },
  // stage5: 테두리만
  { rows: 8, cols: 14, pattern: (r, c) => (r === 0 || r === 7 || c === 0 || c === 13) ? 1 : 0 },
  // stage6: 중앙 십자
  { rows: 9, cols: 13, pattern: (r, c) => (r === 4 || c === 6) ? 1 : 0 },
  // stage7: 2중 피라미드
  { rows: 9, cols: 13, pattern: (r, c) => (Math.abs(c-6) <= r && r < 5) || (Math.abs(c-6) <= 8-r && r >= 5) ? 1 : 0 },
  // stage8: 좌우 대칭(2개의 삼각형)
  { rows: 8, cols: 14, pattern: (r, c) => (c <= r || c >= 13-r) ? 1 : 0 },
  // stage9: 중앙 구멍
  { rows: 8, cols: 14, pattern: (r, c) => (r < 2 || r > 5 || c < 3 || c > 10) ? 1 : ((r === 2 || r === 5 || c === 3 || c === 10) ? 1 : 0) },
  // stage10: 복합 패턴(테두리+X자)
  { rows: 9, cols: 15, pattern: (r, c) => (r === 0 || r === 8 || c === 0 || c === 14 || r === c || r + c === 14) ? 1 : 0 },
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

// 모바일 대응: 캔버스 크기 자동 조정 및 동적 크기 계산
function resizeCanvas() {
  // 9:16 세로형 비율, 최대 100vw, 70vh
  let w = window.innerWidth;
  let h = window.innerHeight * 0.7;
  // 9:16 비율 유지
  if (h / w > 16/9) {
    h = w * 16 / 9;
  } else {
    w = h * 9 / 16;
  }
  canvas.width = w;
  canvas.height = h;
  updateSizes();
}
function updateSizes() {
  brickPadding = Math.max(4, Math.floor(canvas.width * 0.01));
  brickWidth = (canvas.width - (brickColumnCount + 1) * brickPadding) / brickColumnCount;
  brickHeight = Math.max(16, Math.floor(canvas.height * 0.06));
  paddleWidth = Math.max(50, Math.floor(canvas.width * 0.2));
  paddleHeight = Math.max(10, Math.floor(canvas.height * 0.03));
  ballRadius = Math.max(8, Math.floor(canvas.width * 0.025));
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 터치로 패들 이동
canvas.addEventListener('touchmove', function(e) {
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  let x = touch.clientX - rect.left;
  paddleX = x - paddleWidth / 2;
  if (paddleX < 0) paddleX = 0;
  if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
  e.preventDefault();
});

// 벽돌 배열 생성 함수 (brickCount 계산 추가)
function createBricksForStage(stageIdx) {
  const config = stageConfigs[stageIdx];
  brickRowCount = config.rows;
  brickColumnCount = config.cols;
  updateSizes();
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
if (stage === 1) {
  x = canvas.width / 2;
  y = canvas.height / 2;
  dx = 2.4;
  dy = -2.4;
}

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

// 1. 시간 포맷 변환 함수
function formatTime(sec) {
  sec = Math.floor(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}분 ${s.toString().padStart(2, '0')}초`;
}

// 2. 스톱워치 변수
let stopwatchStart = Date.now();
function drawStopwatch() {
  const now = isGameEnded ? stopwatchStart + clearTime*1000 : Date.now();
  let elapsed = Math.floor((now - stopwatchStart) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  ctx.font = 'bold 18px Arial';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
    100, 22);
}

// 3. drawBricks에서 블록 색상 녹색
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

// 4. 엔딩 화면 녹색 바탕, 흰색 글씨, 시간 포맷 적용
function showEndScreen(type) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2ecc40';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const baseFont = Math.max(Math.floor(canvas.height/10), 32);
  ctx.font = 'bold ' + baseFont + 'px Arial';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(type === 'clear' ? 'ALL CLEAR!' : 'GAME OVER', canvas.width/2, canvas.height/8);
  ctx.font = Math.max(Math.floor(canvas.height/20), 20) + 'px Arial';
  ctx.textBaseline = 'middle';
  ctx.fillText('클리어 시간: ' + formatTime(clearTime), canvas.width/2, canvas.height/4);
  // 이름 입력 폼 (gameover에서만)
  let rankings = JSON.parse(localStorage.getItem('brickRankings') || '[]');
  if(type === 'gameover' && !document.getElementById('nameInputForm') && !window._nameInputDone) {
    const form = document.createElement('form');
    form.id = 'nameInputForm';
    form.style.position = 'fixed';
    form.style.left = '50%';
    form.style.top = '40%';
    form.style.transform = 'translate(-50%, -50%)';
    form.style.zIndex = 1000;
    form.style.background = 'rgba(44,204,64,0.95)';
    form.style.padding = '20px';
    form.style.borderRadius = '10px';
    form.innerHTML = `<label style='color:#fff;font-size:18px;'>이름을 입력하세요: <input id='nameInput' style='font-size:18px;'/></label> <button type='submit' style='font-size:18px;'>확인</button>`;
    document.body.appendChild(form);
    form.onsubmit = function(e) {
      e.preventDefault();
      const name = document.getElementById('nameInput').value || '';
      rankings.push({ name, clearTime, date: new Date().toLocaleString() });
      rankings.sort((a, b) => parseFloat(b.clearTime) - parseFloat(a.clearTime));
      rankings = rankings.slice(0, 10);
      localStorage.setItem('brickRankings', JSON.stringify(rankings));
      document.body.removeChild(form);
      window._nameInputDone = true;
      setTimeout(() => showEndScreen('gameover'), 0);
    };
    setTimeout(() => { document.getElementById('nameInput').focus(); }, 100);
  }
  // 명예의 전당 배경(녹색)
  const hallY = canvas.height/3 - 10;
  const hallH = (11 * canvas.height/22) + 40;
  ctx.fillStyle = '#2ecc40';
  ctx.fillRect(canvas.width/2 - canvas.width*0.4, hallY, canvas.width*0.8, hallH);
  // 순위표(흰색 폰트)
  ctx.font = Math.max(Math.floor(canvas.height/28), 16) + 'px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('명예의 전당', canvas.width/2, canvas.height/3);
  for(let i=0; i<rankings.length; i++) {
    const r = rankings[i];
    ctx.fillText(`${i+1}위: ${r.name || '---'} ${formatTime(r.clearTime)}`,
      canvas.width/2, canvas.height/3 + (i+1)*canvas.height/22);
  }
}

// 5. drawScore, drawStage, drawStopwatch 위치 조정
function drawScore() {
  ctx.font = "16px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff"; // 흰색 글자
  ctx.fillText("점수: "+score, 8, 22);
}
function drawStage() {
  ctx.font = "bold 22px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(`STAGE ${stage}`, canvas.width/2, 22);
}

// 6. 3스테이지 클리어 시 목숨+1, brick.mp3 5회 울림
function playBonusLifeSound() {
  let count = 0;
  function play() {
    if(count < 5) {
      brickSound.currentTime = 0;
      brickSound.play();
      count++;
      setTimeout(play, 200);
    }
  }
  play();
}

// 공 속도 증가 로직: 스테이지가 올라갈 때마다 2%씩 증가
function increaseBallSpeed() {
  dx = Math.sign(dx) * (Math.abs(dx) + 55);
  dy = Math.sign(dy) * (Math.abs(dy) + 55);
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
    setTimeout(() => {
      if(stage < maxStage) {
        // 3스테이지 클리어 보너스
        if(stage === 3) {
          lives++;
          playBonusLifeSound();
        }
        stage++;
        createBricksForStage(stage-1);
        playStageBGM(stage);
        increaseBallSpeed();
        x = canvas.width/2;
        y = canvas.height-30;
        dx = Math.sign(dx) * Math.abs(dx);
        dy = Math.sign(dy) * Math.abs(dy);
        paddleX = (canvas.width-paddleWidth)/2;
        stageTransitioning = false;
      } else {
        if(bgm) { bgm.pause(); }
        endGame('clear');
      }
    }, 300);
  }
}

// draw 함수에 drawStopwatch 호출 추가
function draw() {
  if(isGameEnded) return;
  ctx.drawImage(bgImages[stage-1], 0, 0, canvas.width, canvas.height);
  drawScore();
  drawStage();
  drawStopwatch();
  drawBricks();
  drawBall();
  drawPaddle();
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
        endGame('gameover');
      } else {
        x = canvas.width/2;
        y = canvas.height-30;
        dx = 2.4;
        dy = -2.4;
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

// 목숨 그리기
function drawLives() {
  ctx.font = "16px Arial";
  ctx.textAlign = "right";
  ctx.fillStyle = "#fff"; // 흰색 글자
  ctx.fillText("목숨: "+lives, canvas.width-8, 22);
}

function endGame(type) {
  isGameEnded = true;
  if(bgm) { bgm.pause(); }
  const endTime = Date.now();
  clearTime = ((endTime - startTime) / 1000).toFixed(2);
  let rankings = JSON.parse(localStorage.getItem('brickRankings') || '[]');
  if(type === 'clear') {
    let name = '';
    if(rankings.length < 10 || clearTime > rankings[rankings.length-1].clearTime) {
      name = prompt('신기록! 이름을 입력하세요:') || '';
      rankings.push({ name, clearTime, date: new Date().toLocaleString() });
      rankings.sort((a, b) => parseFloat(b.clearTime) - parseFloat(a.clearTime));
      rankings = rankings.slice(0, 10);
      localStorage.setItem('brickRankings', JSON.stringify(rankings));
    }
  }
  showEndScreen(type);
}

// 게임 시작 시간 기록
let startTime = Date.now();

draw(); 