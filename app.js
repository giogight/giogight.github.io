(() => {
  const takeover = document.getElementById('takeover');
  const scenes = [...document.querySelectorAll('[data-scene]')];
  const sequence = [...document.querySelectorAll('#sequence i')];
  const enterButton = document.getElementById('enterButton');
  const skipButton = document.getElementById('skipButton');
  const replayButton = document.getElementById('replayButton');
  const releaseButton = document.getElementById('releaseButton');
  const soundButton = document.getElementById('soundButton');
  const whiteFlash = document.getElementById('whiteFlash');
  const timecode = document.getElementById('timecode');
  const hudStatus = document.getElementById('hudStatus');
  const packetCount = document.getElementById('packetCount');
  const latencyValue = document.getElementById('latencyValue');
  const lossValue = document.getElementById('lossValue');
  const cipherState = document.getElementById('cipherState');
  const packetStream = document.getElementById('packetStream');
  const breachState = document.getElementById('breachState');
  const terminalCommand = document.getElementById('terminalCommand');
  const prebreachCode = document.getElementById('prebreachCode');
  const noiseCanvas = document.getElementById('signalNoise');
  const noiseContext = noiseCanvas.getContext('2d', { alpha: true });

  const photoGrid = document.getElementById('photoGrid');
  const photoCards = [...document.querySelectorAll('.photo-card')];
  const photoStatus = document.getElementById('photoStatus');
  const photoSubmit = document.getElementById('photoSubmit');

  const pongBoard = document.getElementById('pongBoard');
  const pongCanvas = document.getElementById('pongCanvas');
  const pongContext = pongCanvas.getContext('2d');
  const pongStart = document.getElementById('pongStart');
  const pongStartButton = document.getElementById('pongStartButton');
  const pongResult = document.getElementById('pongResult');
  const pongScoreNode = document.getElementById('pongScore');
  const pongLivesNode = document.getElementById('pongLives');


  const selfDestruct = document.getElementById('selfDestruct');
  const destructCount = document.getElementById('destructCount');
  const destructReason = document.getElementById('destructReason');
  const explosionParticles = document.getElementById('explosionParticles');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finalScene = 9;
  const sceneDurations = [3200, 2400, 2400, 2700, 999999, 2500, 2600, 999999, 2400, 2400];

  let timers = [];
  let flowTimer;
  let started = false;
  let currentStage = 0;
  let soundOn = false;
  let audioContext;
  let noiseStrength = .12;
  let telemetryTimer;
  let telemetryTick = 0;
  let packets = 0;
  let destructing = false;
  let photoPassed = false;

  let pongFrame;
  let pongRunning = false;
  let pongLastTime = 0;
  let pongPauseUntil = 0;
  let pongScore = 0;
  let pongLives = 3;
  let pongWidth = 0;
  let pongHeight = 0;
  let paddle = { x: 0, y: 0, width: 0, height: 12 };
  let ball = { x: 0, y: 0, radius: 8, vx: 0, vy: 0 };
  const keys = { left: false, right: false };

  const later = (fn, delay) => {
    const id = setTimeout(() => {
      timers = timers.filter(timer => timer !== id);
      fn();
    }, delay);
    timers.push(id);
    return id;
  };

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    clearTimeout(flowTimer);
    flowTimer = undefined;
    clearInterval(telemetryTimer);
    telemetryTimer = undefined;
  }

  function cancelFlow() {
    clearTimeout(flowTimer);
    flowTimer = undefined;
  }

  function flowDelay(delay) {
    return reducedMotion ? Math.min(delay, 520) : delay;
  }

  function scheduleScene(index, delay) {
    cancelFlow();
    flowTimer = setTimeout(() => enterScene(index), flowDelay(delay));
  }

  function resizeNoise() {
    noiseCanvas.width = Math.max(120, Math.floor(innerWidth / 5));
    noiseCanvas.height = Math.max(80, Math.floor(innerHeight / 5));
  }

  function drawNoise() {
    if (!takeover.classList.contains('active') && !reducedMotion) {
      requestAnimationFrame(drawNoise);
      return;
    }
    const width = noiseCanvas.width;
    const height = noiseCanvas.height;
    const image = noiseContext.createImageData(width, height);
    const pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const grey = Math.random() * 255;
      const colorFault = Math.random() < noiseStrength * .055;
      pixels[i] = colorFault ? 245 : grey;
      pixels[i + 1] = colorFault ? Math.random() * 70 : grey;
      pixels[i + 2] = colorFault ? 175 + Math.random() * 80 : grey;
      pixels[i + 3] = 35 + Math.random() * 105 * noiseStrength;
    }
    noiseContext.putImageData(image, 0, 0);
    if (Math.random() < noiseStrength * .36) {
      const y = Math.floor(Math.random() * height);
      const h = 1 + Math.floor(Math.random() * 5);
      noiseContext.fillStyle = Math.random() > .5 ? 'rgba(239,62,197,.72)' : 'rgba(105,239,255,.65)';
      noiseContext.fillRect(0, y, width, h);
      const slice = noiseContext.getImageData(0, y, width, Math.min(h + 3, height - y));
      noiseContext.putImageData(slice, Math.floor((Math.random() - .5) * width * .25), y);
    }
    if (!reducedMotion) requestAnimationFrame(drawNoise);
  }

  function ensureAudio() {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    return audioContext;
  }

  function tone(frequency, duration = .08, type = 'square', gainValue = .025) {
    if (!soundOn) return;
    const context = ensureAudio();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(gainValue, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function noiseAudio(duration = .14, gainValue = .018) {
    if (!soundOn) return;
    const context = ensureAudio();
    const count = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, count, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < count; i += 1) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = 1250;
    filter.Q.value = .65;
    gain.gain.setValueAtTime(gainValue, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  }

  function burst(strong = false) {
    takeover.classList.remove('burst', 'burst-strong');
    void takeover.offsetWidth;
    takeover.classList.add(strong ? 'burst-strong' : 'burst');
    noiseStrength = strong ? 1 : .55;
    noiseAudio(strong ? .28 : .12, strong ? .045 : .018);
    later(() => {
      takeover.classList.remove('burst', 'burst-strong');
      noiseStrength = .12;
    }, strong ? 470 : 340);
  }

  function flash() {
    whiteFlash.classList.remove('fire');
    void whiteFlash.offsetWidth;
    whiteFlash.classList.add('fire');
  }

  function dropout(long = false) {
    if (destructing) return;
    takeover.classList.remove('dropout', 'dropout-long');
    void takeover.offsetWidth;
    takeover.classList.add(long ? 'dropout-long' : 'dropout');
    tone(long ? 54 : 78, long ? .18 : .08, 'sawtooth', long ? .05 : .03);
    later(() => takeover.classList.remove('dropout', 'dropout-long'), long ? 380 : 210);
  }

  function desync() {
    if (destructing) return;
    takeover.classList.remove('desync');
    void takeover.offsetWidth;
    takeover.classList.add('desync');
    noiseStrength = .78;
    noiseAudio(.16, .028);
    later(() => {
      takeover.classList.remove('desync');
      noiseStrength = .12;
    }, 460);
  }

  function scheduleFaults() {
    [240, 1850, 5270, 10130, 15180].forEach((delay, index) => later(() => dropout(index === 1 || index === 4), delay));
    [820, 3780, 7440, 12420, 17140].forEach(delay => later(desync, delay));
  }

  function addPacketLine() {
    const endpoints = ['198.51.100.17:443', '203.0.113.24:8080', '192.0.2.45:22', '127.0.0.1:49152'];
    const flags = ['ACK', 'PSH ACK', 'SYN ACK', 'RST', 'DATA'];
    const line = document.createElement('span');
    const size = 48 + Math.floor(Math.random() * 1380);
    line.textContent = `${String(packets).padStart(6, '0')}  ${endpoints[telemetryTick % endpoints.length]}  ${flags[(telemetryTick * 3) % flags.length]}  ${size}B`;
    packetStream.append(line);
    while (packetStream.children.length > 7) packetStream.firstElementChild.remove();
  }

  function startTelemetry() {
    clearInterval(telemetryTimer);
    telemetryTick = 0;
    packets = 0;
    packetStream.replaceChildren();
    const update = () => {
      telemetryTick += 1;
      packets += 31 + Math.floor(Math.random() * 640);
      const unstable = currentStage === 0 || currentStage === 8;
      const baseLatency = currentStage === 0 ? 186 : currentStage === 8 ? 118 : 34;
      const jitter = Math.floor(Math.random() * (currentStage === 0 ? 240 : 72));
      const loss = unstable ? 2.4 + Math.random() * 6 : Math.random() * 1.4;
      packetCount.textContent = String(packets).padStart(6, '0');
      latencyValue.textContent = `${baseLatency + jitter} ms`;
      lossValue.textContent = `${loss.toFixed(1)}%`;
      if (telemetryTick % 3 === 0) addPacketLine();
    };
    update();
    telemetryTimer = setInterval(update, 137);
  }

  function setNetworkState(link, status, cipher, state, command) {
    takeover.dataset.link = link;
    hudStatus.textContent = status;
    cipherState.textContent = cipher;
    breachState.textContent = state;
    terminalCommand.textContent = command;
  }

  function updateSkipControl() {
    if (currentStage < 4) {
      skipButton.disabled = false;
      skipButton.textContent = '快进至验证';
    } else if (currentStage === finalScene) {
      skipButton.disabled = true;
      skipButton.textContent = '验证完成';
    } else {
      skipButton.disabled = true;
      skipButton.textContent = '验证锁定';
    }
  }

  function setScene(index) {
    currentStage = index;
    takeover.scrollTop = 0;
    takeover.scrollLeft = 0;
    takeover.dataset.stage = String(index);
    takeover.style.setProperty('--sequence-duration', `${sceneDurations[index]}ms`);
    scenes.forEach(scene => scene.classList.toggle('visible', Number(scene.dataset.scene) === index));
    sequence.forEach((item, itemIndex) => {
      item.classList.toggle('done', itemIndex < index || index === finalScene);
      item.classList.toggle('current', itemIndex === index && index < finalScene);
    });
    updateSkipControl();
    if (index !== 7) stopPong();

    if (index === 0) {
      setNetworkState('unstable', 'SYNC LOST ●', 'NEGOTIATING', '正在重建加密通道', 'mount /archive/xw --decrypt');
      burst(true);
      tone(88, .22, 'sawtooth', .05);
      later(() => burst(false), 690);
      later(() => burst(true), 1480);
    } else if (index === 1) {
      setNetworkState('breached', 'LINK OWNED ●', 'BYPASSED', '签名密钥已注入', 'verify signature --subject XW');
      flash();
      burst(false);
      tone(220, .12, 'sine', .04);
      later(() => tone(520, .18, 'sine', .04), 520);
    } else if (index === 2) {
      setNetworkState('breached', 'STREAM LIVE ●', 'DECRYPTED', '身份索引已解密', 'read /identity/record_017');
      burst(false);
      tone(310, .1);
      later(() => tone(460, .12), 110);
    } else if (index === 3) {
      setNetworkState('breached', 'STREAM LIVE ●', 'DECRYPTED', '兴趣档案 01 已挂载', 'render /interests/camera.asset');
      flash();
      burst(false);
      tone(760, .08, 'sine', .05);
    } else if (index === 4) {
      setNetworkState('breached', 'INPUT REQUIRED ●', 'LOCKED', '视觉判断等待提交', 'challenge /visual/all-ai --required');
      burst(true);
      tone(118, .14, 'square', .05);
    } else if (index === 5) {
      setNetworkState('breached', 'STREAM LIVE ●', 'DECRYPTED', '兴趣档案 02 已挂载', 'render /interests/travel.asset');
      flash();
      burst(false);
      tone(340, .12, 'triangle', .04);
      later(() => tone(610, .1, 'sine', .03), 460);
    } else if (index === 6) {
      setNetworkState('breached', 'STREAM LIVE ●', 'DECRYPTED', '兴趣档案 03 已挂载', 'render /interests/game.asset');
      flash();
      burst(true);
      tone(95, .12, 'square', .05);
      later(() => tone(620, .08, 'square', .035), 380);
    } else if (index === 7) {
      setNetworkState('breached', 'INPUT REQUIRED ●', 'LOCKED', '人机交互验证等待输入', 'challenge /human/paddle --target 5');
      resetPong();
      later(resizePongCanvas, 40);
    } else if (index === 8) {
      setNetworkState('unstable', 'PACKET LOSS ●', 'RECOVERING', '数据包正在重组', 'recover --source fragmented_stream');
      burst(true);
      tone(62, .3, 'sawtooth', .06);
      later(() => burst(true), 720);
      later(() => burst(false), 1480);
    } else if (index === finalScene) {
      setNetworkState('breached', 'ARCHIVE OPEN ●', 'COMPLETE', '档案接管完成', 'release /archive/xw --display');
      burst(false);
      tone(410, .1, 'sine', .04);
      later(() => tone(620, .2, 'sine', .035), 140);
    }
  }

  function enterScene(index) {
    cancelFlow();
    setScene(index);
    if (index === 0) scheduleScene(1, sceneDurations[0]);
    if (index === 1) scheduleScene(2, sceneDurations[1]);
    if (index === 2) scheduleScene(3, sceneDurations[2]);
    if (index === 3) scheduleScene(4, sceneDurations[3]);
    if (index === 5) scheduleScene(6, sceneDurations[5]);
    if (index === 6) scheduleScene(7, sceneDurations[6]);
    if (index === 8) scheduleScene(finalScene, sceneDurations[8]);
  }

  function resetPhotoGate() {
    photoPassed = false;
    photoGrid.classList.remove('is-error', 'is-approved');
    photoCards.forEach(card => {
      card.disabled = false;
      card.setAttribute('aria-pressed', 'false');
      card.querySelector('i').textContent = '未选择';
    });
    photoSubmit.disabled = false;
    photoStatus.textContent = '已选择 0 / 3';
  }

  function updatePhotoGate() {
    const selected = photoCards.filter(card => card.getAttribute('aria-pressed') === 'true').length;
    photoStatus.textContent = `已选择 ${selected} / 3`;
  }

  function createExplosionParticles() {
    explosionParticles.replaceChildren();
    for (let index = 0; index < 56; index += 1) {
      const particle = document.createElement('i');
      const angle = Math.random() * Math.PI * 2;
      const distance = 90 + Math.random() * Math.max(innerWidth, innerHeight) * .62;
      particle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--s', `${2 + Math.random() * 9}px`);
      particle.style.setProperty('--d', `${Math.random() * .13}s`);
      particle.style.setProperty('--c', Math.random() > .48 ? '#ffcf70' : '#ff314c');
      explosionParticles.append(particle);
    }
  }

  function resetSelfDestruct() {
    destructing = false;
    selfDestruct.classList.remove('active', 'exploding', 'safe');
    selfDestruct.setAttribute('aria-hidden', 'true');
    takeover.classList.remove('destruct-impact');
    destructCount.textContent = '5';
  }

  function triggerSelfDestruct(reason, retry) {
    if (destructing) return;
    destructing = true;
    takeover.scrollTop = 0;
    takeover.scrollLeft = 0;
    cancelFlow();
    stopPong();
    createExplosionParticles();
    destructReason.textContent = reason;
    destructCount.textContent = '5';
    selfDestruct.classList.remove('exploding', 'safe');
    selfDestruct.classList.add('active');
    selfDestruct.setAttribute('aria-hidden', 'false');
    takeover.classList.add('destruct-impact');
    burst(true);
    tone(86, .2, 'sawtooth', .07);
    [4, 3, 2, 1].forEach((value, index) => later(() => {
      destructCount.textContent = String(value);
      tone(value <= 2 ? 142 : 104, .16, 'square', .065);
      dropout(value <= 2);
    }, (index + 1) * 1000));
    later(() => {
      destructCount.textContent = '0';
      selfDestruct.classList.add('exploding');
      takeover.classList.remove('destruct-impact');
      noiseStrength = 1;
      noiseAudio(.62, .11);
      flash();
    }, 5000);
    later(() => {
      selfDestruct.classList.remove('exploding');
      selfDestruct.classList.add('safe');
      noiseStrength = .12;
      tone(520, .12, 'sine', .03);
      later(() => tone(740, .18, 'sine', .025), 130);
    }, 5900);
    later(() => {
      resetSelfDestruct();
      retry();
    }, 7300);
  }

  function resizePongCanvas() {
    const rect = pongBoard.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const oldWidth = pongWidth || rect.width;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    pongWidth = rect.width;
    pongHeight = rect.height;
    pongCanvas.width = Math.round(pongWidth * ratio);
    pongCanvas.height = Math.round(pongHeight * ratio);
    pongContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    paddle.width = pongWidth * (innerWidth <= 520 ? .17 : .12);
    paddle.height = Math.max(10, pongHeight * .025);
    paddle.y = pongHeight - paddle.height - 18;
    paddle.x = Math.max(0, Math.min(pongWidth - paddle.width, paddle.x * pongWidth / oldWidth));
    if (!pongRunning) paddle.x = (pongWidth - paddle.width) / 2;
    drawPong();
  }

  function resetBall(direction = 1) {
    ball.radius = Math.max(7, Math.min(10, pongWidth * .009));
    ball.x = pongWidth * (.38 + Math.random() * .24);
    ball.y = pongHeight * .22;
    const speed = 315 + pongScore * 20;
    ball.vx = speed * (.62 + Math.random() * .22) * (Math.random() > .5 ? 1 : -1);
    ball.vy = speed * direction;
  }

  function drawPong() {
    if (!pongWidth || !pongHeight) return;
    pongContext.clearRect(0, 0, pongWidth, pongHeight);
    pongContext.save();
    pongContext.setLineDash([8, 12]);
    pongContext.strokeStyle = 'rgba(105,239,255,.1)';
    pongContext.beginPath();
    pongContext.moveTo(0, pongHeight / 2);
    pongContext.lineTo(pongWidth, pongHeight / 2);
    pongContext.stroke();
    pongContext.restore();
    const paddleGradient = pongContext.createLinearGradient(paddle.x, 0, paddle.x + paddle.width, 0);
    paddleGradient.addColorStop(0, '#ef3ec5');
    paddleGradient.addColorStop(.52, '#f4f6f8');
    paddleGradient.addColorStop(1, '#69efff');
    pongContext.shadowBlur = 22;
    pongContext.shadowColor = 'rgba(105,239,255,.55)';
    pongContext.fillStyle = paddleGradient;
    pongContext.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    pongContext.shadowBlur = 24;
    pongContext.shadowColor = '#ef3ec5';
    pongContext.fillStyle = '#ffffff';
    pongContext.beginPath();
    pongContext.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    pongContext.fill();
    pongContext.shadowBlur = 0;
  }

  function resetPong() {
    stopPong();
    pongScore = 0;
    pongLives = 3;
    pongScoreNode.textContent = '0';
    pongLivesNode.textContent = '3';
    pongStart.classList.remove('is-hidden');
    pongStartButton.textContent = '启动交互验证';
    pongResult.classList.remove('is-visible');
    pongResult.replaceChildren();
    resizePongCanvas();
    resetBall();
    drawPong();
  }

  function stopPong() {
    pongRunning = false;
    cancelAnimationFrame(pongFrame);
    pongFrame = undefined;
    keys.left = false;
    keys.right = false;
  }

  function finishPong() {
    stopPong();
    pongResult.innerHTML = '<b>HUMAN VERIFIED</b><span>交互签名已通过</span>';
    pongResult.classList.add('is-visible');
    setNetworkState('breached', 'INPUT VERIFIED ●', 'ACCEPTED', '人机交互验证通过', 'accept /human/signature --continue');
    flash();
    burst(false);
    tone(520, .1, 'sine', .04);
    later(() => tone(780, .18, 'sine', .035), 120);
    later(() => enterScene(8), reducedMotion ? 260 : 1250);
  }

  function pongLoop(timestamp) {
    if (!pongRunning || currentStage !== 7 || destructing) return;
    const delta = Math.min((timestamp - pongLastTime) / 1000 || 0, .032);
    pongLastTime = timestamp;
    const paddleSpeed = pongWidth * .78;
    if (keys.left) paddle.x -= paddleSpeed * delta;
    if (keys.right) paddle.x += paddleSpeed * delta;
    paddle.x = Math.max(0, Math.min(pongWidth - paddle.width, paddle.x));
    if (timestamp >= pongPauseUntil) {
      ball.x += ball.vx * delta;
      ball.y += ball.vy * delta;
      if (ball.x - ball.radius <= 0 && ball.vx < 0) {
        ball.x = ball.radius;
        ball.vx *= -1;
        tone(240, .025, 'square', .012);
      }
      if (ball.x + ball.radius >= pongWidth && ball.vx > 0) {
        ball.x = pongWidth - ball.radius;
        ball.vx *= -1;
        tone(240, .025, 'square', .012);
      }
      if (ball.y - ball.radius <= 0 && ball.vy < 0) {
        ball.y = ball.radius;
        ball.vy *= -1;
      }
      const hitsPaddle = ball.vy > 0
        && ball.y + ball.radius >= paddle.y
        && ball.y - ball.radius <= paddle.y + paddle.height
        && ball.x >= paddle.x - ball.radius
        && ball.x <= paddle.x + paddle.width + ball.radius;
      if (hitsPaddle) {
        ball.y = paddle.y - ball.radius;
        const offset = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        const speed = Math.min(530, Math.hypot(ball.vx, ball.vy) * 1.10);
        ball.vx = speed * Math.max(-.82, Math.min(.82, offset));
        if (Math.abs(ball.vx) < 62) ball.vx = 62 * (offset >= 0 ? 1 : -1);
        ball.vy = -Math.sqrt(Math.max(90 * 90, speed * speed - ball.vx * ball.vx));
        pongScore += 1;
        pongScoreNode.textContent = String(pongScore);
        tone(460 + pongScore * 55, .055, 'sine', .028);
        burst(false);
        if (pongScore >= 5) {
          drawPong();
          finishPong();
          return;
        }
      }
      if (ball.y - ball.radius > pongHeight) {
        pongLives -= 1;
        pongLivesNode.textContent = String(pongLives);
        tone(74, .22, 'sawtooth', .055);
        dropout(true);
        if (pongLives <= 0) {
          stopPong();
          triggerSelfDestruct('接球验证失败 · 容错耗尽', () => setScene(7));
          return;
        }
        resetBall();
        pongPauseUntil = timestamp + 520;
      }
    }
    drawPong();
    pongFrame = requestAnimationFrame(pongLoop);
  }

  function startPongGame() {
    if (pongRunning || currentStage !== 7 || destructing) return;
    resizePongCanvas();
    resetBall();
    pongStart.classList.add('is-hidden');
    pongResult.classList.remove('is-visible');
    pongRunning = true;
    pongLastTime = performance.now();
    pongPauseUntil = pongLastTime + 350;
    pongFrame = requestAnimationFrame(pongLoop);
    tone(330, .08, 'sine', .025);
  }

  function movePaddleTo(clientX) {
    if (currentStage !== 7) return;
    const rect = pongBoard.getBoundingClientRect();
    paddle.x = Math.max(0, Math.min(pongWidth - paddle.width, clientX - rect.left - paddle.width / 2));
    if (!pongRunning) drawPong();
  }

  function resetExperience() {
    resetPhotoGate();
    resetPong();
    resetSelfDestruct();
    photoPassed = false;
  }

  function startSequence() {
    clearTimers();
    stopPong();
    resetExperience();
    started = true;
    document.body.classList.add('pre-hijack');
    document.body.style.overflow = 'hidden';
    takeover.classList.remove('active', 'burst', 'burst-strong', 'dropout', 'dropout-long', 'desync');
    takeover.dataset.link = 'unstable';
    prebreachCode.textContent = 'ERR_CONNECTION_RESET';
    const lead = reducedMotion ? 40 : 1080;
    if (!reducedMotion) {
      later(() => { prebreachCode.textContent = 'TLS_HANDSHAKE_ABORTED'; }, 340);
      later(() => { prebreachCode.textContent = 'REMOTE_FRAME_CONTROL'; }, 760);
    }
    later(() => {
      takeover.classList.add('active');
      takeover.setAttribute('aria-hidden', 'false');
      enterScene(0);
      startTelemetry();
      if (!reducedMotion) scheduleFaults();
    }, lead);
  }

  function jumpToVerification() {
    if (!takeover.classList.contains('active') || currentStage >= 4 || destructing) return;
    cancelFlow();
    enterScene(4);
  }

  function releasePage() {
    clearTimers();
    stopPong();
    resetSelfDestruct();
    takeover.classList.remove('active', 'burst', 'burst-strong', 'dropout', 'dropout-long', 'desync');
    takeover.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pre-hijack');
    document.body.style.overflow = '';
    scenes.forEach(scene => scene.classList.remove('visible'));
    noiseStrength = .12;
    packetStream.replaceChildren();
    takeover.dataset.link = 'unstable';
    started = false;
  }

  function updateTimecode() {
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');
    const frames = Math.floor(now.getMilliseconds() / 1000 * 24);
    timecode.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}:${pad(frames)}`;
    requestAnimationFrame(updateTimecode);
  }

  photoCards.forEach(card => card.addEventListener('click', () => {
    if (currentStage !== 4 || destructing || photoPassed) return;
    const selected = card.getAttribute('aria-pressed') === 'true';
    card.setAttribute('aria-pressed', String(!selected));
    card.querySelector('i').textContent = selected ? '未选择' : '已锁定';
    photoGrid.classList.remove('is-error');
    updatePhotoGate();
    tone(selected ? 240 : 470, .045, 'sine', .02);
  }));

  photoSubmit.addEventListener('click', () => {
    if (currentStage !== 4 || destructing || photoPassed) return;
    const selected = photoCards.filter(card => card.getAttribute('aria-pressed') === 'true');
    if (selected.length === photoCards.length) {
      photoPassed = true;
      photoGrid.classList.add('is-approved');
      photoStatus.textContent = '视觉验证通过 · 3 / 3 均为 AI';
      photoCards.forEach(card => { card.disabled = true; });
      photoSubmit.disabled = true;
      setNetworkState('breached', 'INPUT VERIFIED ●', 'ACCEPTED', '全部 AI 图像识别完成', 'accept /visual/all-ai --continue');
      flash();
      burst(false);
      tone(520, .1, 'sine', .04);
      later(() => tone(760, .16, 'sine', .035), 120);
      later(() => enterScene(5), reducedMotion ? 260 : 1150);
    } else {
      photoGrid.classList.remove('is-error');
      void photoGrid.offsetWidth;
      photoGrid.classList.add('is-error');
      photoStatus.textContent = `判断错误 · 漏选 ${photoCards.length - selected.length} 项`;
      triggerSelfDestruct('视觉验证失败 · 三张均为 AI', () => {
        resetPhotoGate();
        setScene(4);
      });
    }
  });

  pongStartButton.addEventListener('click', startPongGame);
  pongBoard.addEventListener('pointermove', event => movePaddleTo(event.clientX));
  pongBoard.addEventListener('pointerdown', event => {
    movePaddleTo(event.clientX);
    if (!pongRunning && !destructing) startPongGame();
  });

  enterButton.addEventListener('click', startSequence);
  skipButton.addEventListener('click', jumpToVerification);
  replayButton.addEventListener('click', startSequence);
  releaseButton.addEventListener('click', releasePage);
  soundButton.addEventListener('click', async () => {
    soundOn = !soundOn;
    soundButton.setAttribute('aria-pressed', String(soundOn));
    soundButton.innerHTML = soundOn
      ? '<i>◉</i><span>声音开启</span>'
      : '<i>◌</i><span>声音关闭</span>';
    if (soundOn) {
      const context = ensureAudio();
      await context.resume();
      tone(520, .07, 'sine', .035);
    }
  });

  document.addEventListener('keydown', event => {
    if (!takeover.classList.contains('active')) return;
    if (currentStage === 7) {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        keys.left = true;
        event.preventDefault();
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        keys.right = true;
        event.preventDefault();
      }
      if ((event.key === 'Enter' || event.key === ' ') && !pongRunning && !destructing) {
        startPongGame();
        event.preventDefault();
      }
    }
    if (event.key === 'Escape') jumpToVerification();
  });

  document.addEventListener('keyup', event => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false;
  });

  resizeNoise();
  addEventListener('resize', () => {
    resizeNoise();
    if (currentStage === 7) resizePongCanvas();
  });
  if (!reducedMotion) requestAnimationFrame(drawNoise);
  else drawNoise();
  requestAnimationFrame(updateTimecode);
  // The normal homepage tools remain usable until the visitor chooses the archive.
})();
