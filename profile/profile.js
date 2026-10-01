(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const introDialog = $('takeover'), pongDialog = $('pongDialog');
  const scenes = Array.from(document.querySelectorAll('[data-scene]'));
  const sequence = Array.from(document.querySelectorAll('#sequence i'));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const durations = [2800, 2000, 2200, 3000, 2300, 2300, 0];
  let introStage = 0, introTimer = 0, introDeadline = 0, introRemaining = 0;
  let introFrame = 0, glitchTimer = 0, lastNoise = 0;
  let parentPaused = false, suspended = document.hidden;
  let soundOn = false, audioContext;
  const audioSources = new Set();
  const noiseCanvas = $('signalNoise'), noiseContext = noiseCanvas.getContext('2d');
  const Pong = window.GuanchaoPong;
  const gameCanvas = $('pongCanvas'), gameContext = gameCanvas.getContext('2d');
  let gameState = null, gameFrame = 0, lastGameTime = 0;
  const keys = { left: false, right: false };

  function stopAudio() {
    for (const source of audioSources) { try { source.stop(); } catch { /* Already stopped. */ } }
    audioSources.clear();
    if (audioContext && audioContext.state === 'running') audioContext.suspend().catch(() => {});
  }
  function tone(frequency, duration = .08) {
    if (!soundOn || suspended) return;
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) return;
    audioContext ||= new Constructor();
    audioContext.resume().catch(() => {});
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.025, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    audioSources.add(oscillator);
    oscillator.onended = () => { audioSources.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  }
  function stopIntroClock() {
    clearTimeout(introTimer); introTimer = 0;
    cancelAnimationFrame(introFrame); introFrame = 0;
    clearTimeout(glitchTimer); glitchTimer = 0;
    introDialog.classList.remove('burst');
  }
  function drawIntroFrame(time) {
    if (!introDialog.open || suspended) { introFrame = 0; return; }
    const now = new Date();
    $('timecode').textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
    if (noiseContext && time - lastNoise >= 50 && !reducedMotion) {
      lastNoise = time;
      const frame = noiseContext.createImageData(noiseCanvas.width, noiseCanvas.height);
      for (let index = 0; index < frame.data.length; index += 4) {
        const grey = Math.random() * 255;
        frame.data[index] = frame.data[index + 1] = frame.data[index + 2] = grey;
        frame.data[index + 3] = 65;
      }
      noiseContext.putImageData(frame, 0, 0);
    }
    introFrame = requestAnimationFrame(drawIntroFrame);
  }
  function resizeNoise() {
    noiseCanvas.width = Math.min(360, Math.max(80, Math.floor(innerWidth / 6)));
    noiseCanvas.height = Math.min(220, Math.max(60, Math.floor(innerHeight / 6)));
  }
  function scheduleIntro() {
    clearTimeout(introTimer); introTimer = 0;
    if (!introDialog.open || introStage >= scenes.length - 1 || suspended) return;
    introDeadline = performance.now() + introRemaining;
    introTimer = setTimeout(() => setIntroScene(introStage + 1), introRemaining);
  }
  function setIntroScene(stage) {
    introStage = Math.max(0, Math.min(scenes.length - 1, stage));
    introDialog.dataset.stage = String(introStage);
    introRemaining = reducedMotion ? Math.min(durations[introStage], 520) : durations[introStage];
    introDialog.style.setProperty('--sequence-duration', `${introRemaining}ms`);
    scenes.forEach((scene, index) => {
      const active = index === introStage;
      scene.classList.toggle('visible', active);
      scene.setAttribute('aria-hidden', String(!active));
      scene.inert = !active;
    });
    sequence.forEach((item, index) => {
      item.classList.toggle('done', index < introStage);
      item.classList.toggle('current', index === introStage);
    });
    $('hudStatus').textContent = introStage === scenes.length - 1 ? 'ARCHIVE OPEN ●' : 'LIVE ●';
    $('skipButton').textContent = introStage === scenes.length - 1 ? '返回主页' : '跳过介绍';
    if (!reducedMotion && introStage !== 3) {
      introDialog.classList.remove('burst');
      void introDialog.offsetWidth;
      introDialog.classList.add('burst');
      clearTimeout(glitchTimer);
      glitchTimer = setTimeout(() => introDialog.classList.remove('burst'), 360);
    }
    tone(180 + introStage * 75);
    scheduleIntro();
  }
  function openIntro() {
    if (suspended) return;
    closeGame();
    if (!introDialog.open) introDialog.showModal();
    introDialog.classList.add('active');
    $('pongLauncher').hidden = true;
    resizeNoise(); setIntroScene(0);
    if (!introFrame) introFrame = requestAnimationFrame(drawIntroFrame);
    $('skipButton').focus();
  }
  function closeIntro() {
    stopIntroClock(); stopAudio();
    if (introDialog.open) introDialog.close();
    introDialog.classList.remove('active');
    $('pongLauncher').hidden = pongDialog.open;
  }

  function sizeGame() {
    if (!gameState || !pongDialog.open) return;
    const rect = $('pongBoard').getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    Pong.resize(gameState, rect.width, rect.height, innerWidth <= 520);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    gameCanvas.width = Math.round(gameState.width * ratio);
    gameCanvas.height = Math.round(gameState.height * ratio);
    gameContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawGame();
  }
  function drawGame() {
    if (!gameState || !gameContext) return;
    const { width, height, ball, paddle } = gameState;
    gameContext.clearRect(0, 0, width, height);
    gameContext.save();
    gameContext.setLineDash([6, 10]); gameContext.strokeStyle = '#a28bbb25';
    gameContext.beginPath(); gameContext.moveTo(0, height / 2); gameContext.lineTo(width, height / 2); gameContext.stroke();
    gameContext.restore();
    const gradient = gameContext.createLinearGradient(paddle.x, 0, paddle.x + paddle.width, 0);
    gradient.addColorStop(0, '#9b81c1'); gradient.addColorStop(.5, '#ede0fa'); gradient.addColorStop(1, '#bda1ea');
    gameContext.shadowBlur = 16; gameContext.shadowColor = '#b99be570';
    gameContext.fillStyle = gradient; gameContext.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    gameContext.fillStyle = '#eee0fc'; gameContext.beginPath(); gameContext.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); gameContext.fill();
    gameContext.shadowBlur = 0;
  }
  function stopGameLoop() {
    cancelAnimationFrame(gameFrame); gameFrame = 0; keys.left = keys.right = false;
  }
  function resetRound() {
    stopGameLoop();
    const rect = $('pongBoard').getBoundingClientRect();
    gameState = Pong.create({ width: rect.width, height: rect.height, phone: innerWidth <= 520, level: 2 });
    sizeGame();
    $('pongScore').textContent = '0'; $('pongLives').textContent = '3';
    $('pongResult').textContent = '';
    $('pongMessage').innerHTML = '球更快，挡板更窄。<br>接住 5 次，完成挑战。';
    $('pongStartButton').textContent = '开始接球'; $('pongCurtain').hidden = false;
  }
  function gameLoop(time) {
    if (!pongDialog.open || suspended || !gameState || gameState.status !== 'running') { gameFrame = 0; return; }
    const score = gameState.score, lives = gameState.lives;
    Pong.advance(gameState, (time - lastGameTime) / 1000, keys);
    lastGameTime = time;
    $('pongScore').textContent = String(gameState.score); $('pongLives').textContent = String(gameState.lives);
    if (gameState.score !== score) { tone(440 + gameState.score * 65); $('pongResult').textContent = `已接住 ${gameState.score} 次。`; }
    if (gameState.lives !== lives) { tone(150); $('pongResult').textContent = `剩余 ${gameState.lives} 次容错。`; }
    drawGame();
    if (gameState.status === 'won' || gameState.status === 'lost') {
      stopGameLoop();
      const won = gameState.status === 'won';
      $('pongMessage').textContent = won ? '5 次接球，挑战完成。' : `本局结束：接住 ${gameState.score} / 5 次。`;
      $('pongResult').textContent = won ? '挑战完成，可以再来一局。' : '容错已用完，可以重试。';
      $('pongStartButton').textContent = won ? '再来一局' : '重新挑战';
      $('pongCurtain').hidden = false;
      $('pongStartButton').focus();
      return;
    }
    gameFrame = requestAnimationFrame(gameLoop);
  }
  function startGame() {
    if (!pongDialog.open || suspended) return;
    if (gameState && gameState.status === 'running') return;
    if (!gameState || gameState.status !== 'ready') resetRound();
    if (!Pong.start(gameState)) return;
    $('pongCurtain').hidden = true; $('pongResult').textContent = '挑战开始。';
    gameCanvas.focus(); lastGameTime = performance.now(); gameFrame = requestAnimationFrame(gameLoop);
  }
  function openGame() {
    if (suspended) return;
    closeIntro();
    if (!pongDialog.open) pongDialog.showModal();
    $('pongLauncher').hidden = true;
    resetRound(); $('pongStartButton').focus();
  }
  function closeGame() {
    stopGameLoop(); gameState = null;
    if (pongDialog.open) pongDialog.close();
    $('pongLauncher').hidden = introDialog.open;
  }
  function movePointer(event) {
    if (!pongDialog.open || !gameState) return;
    const rect = gameCanvas.getBoundingClientRect();
    Pong.movePaddle(gameState, event.clientX - rect.left);
    if (gameState.status !== 'running') drawGame();
  }

  function syncSuspension() {
    const shouldSuspend = parentPaused || document.hidden;
    if (shouldSuspend === suspended) return;
    suspended = shouldSuspend;
    document.body.classList.toggle('module-paused', suspended);
    if (suspended) {
      if (introTimer) introRemaining = Math.max(0, introDeadline - performance.now());
      stopIntroClock(); closeGame(); stopAudio();
    } else if (introDialog.open) {
      scheduleIntro();
      if (!introFrame) introFrame = requestAnimationFrame(drawIntroFrame);
    }
  }
  $('enterButton').addEventListener('click', openIntro);
  $('replayButton').addEventListener('click', () => { setIntroScene(0); $('skipButton').focus(); });
  $('releaseButton').addEventListener('click', closeIntro);
  $('closeIntro').addEventListener('click', closeIntro);
  $('skipButton').addEventListener('click', () => {
    if (introStage === scenes.length - 1) closeIntro();
    else { setIntroScene(scenes.length - 1); $('replayButton').focus(); }
  });
  $('soundButton').addEventListener('click', () => {
    soundOn = !soundOn; $('soundButton').setAttribute('aria-pressed', String(soundOn));
    $('soundButton').textContent = soundOn ? '声音开启' : '声音关闭';
    if (soundOn) tone(520); else stopAudio();
  });
  introDialog.addEventListener('cancel', event => { event.preventDefault(); closeIntro(); });
  introDialog.addEventListener('close', () => { stopIntroClock(); introDialog.classList.remove('active'); $('pongLauncher').hidden = pongDialog.open; });
  $('pongLauncher').addEventListener('click', openGame);
  $('closePong').addEventListener('click', closeGame);
  $('pongStartButton').addEventListener('click', startGame);
  pongDialog.addEventListener('cancel', event => { event.preventDefault(); closeGame(); });
  pongDialog.addEventListener('close', () => { stopGameLoop(); gameState = null; $('pongLauncher').hidden = introDialog.open; });
  gameCanvas.addEventListener('pointerdown', event => {
    gameCanvas.setPointerCapture(event.pointerId); movePointer(event);
    if (gameState && gameState.status === 'ready') startGame();
  });
  gameCanvas.addEventListener('pointermove', movePointer);
  gameCanvas.addEventListener('pointerup', event => {
    if (gameCanvas.hasPointerCapture(event.pointerId)) gameCanvas.releasePointerCapture(event.pointerId);
  });
  gameCanvas.addEventListener('pointercancel', event => {
    if (gameCanvas.hasPointerCapture(event.pointerId)) gameCanvas.releasePointerCapture(event.pointerId);
  });
  document.addEventListener('keydown', event => {
    if (!pongDialog.open || suspended) return;
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') { keys.left = true; event.preventDefault(); }
    if (key === 'arrowright' || key === 'd') { keys.right = true; event.preventDefault(); }
    if ((key === 'enter' || key === ' ') && event.target === gameCanvas) { startGame(); event.preventDefault(); }
  });
  document.addEventListener('keyup', event => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') keys.left = false;
    if (key === 'arrowright' || key === 'd') keys.right = false;
  });
  window.addEventListener('blur', () => { keys.left = keys.right = false; });
  window.addEventListener('resize', () => { resizeNoise(); sizeGame(); });
  if (window.ResizeObserver) new ResizeObserver(sizeGame).observe($('pongBoard'));
  document.addEventListener('visibilitychange', syncSuspension);
  window.addEventListener('pagehide', () => { closeGame(); closeIntro(); });
  window.addEventListener('message', event => {
    /* Same-origin parent only; file:// hosts also require the exact parent Window reference. */
    if (event.source !== window.parent || (event.origin !== window.location.origin && !(location.protocol === 'file:' && event.origin === 'null')) || !event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'guanchao:pause') { parentPaused = true; syncSuspension(); }
    if (event.data.type === 'guanchao:resume') { parentPaused = false; syncSuspension(); }
    if (event.data.type === 'guanchao:theme') document.documentElement.dataset.theme = event.data.theme === 'night' ? 'night' : 'day';
  });
  document.body.classList.toggle('module-paused', suspended);
  scenes.forEach(scene => { scene.inert = true; scene.setAttribute('aria-hidden', 'true'); });
  resizeNoise();
})();
