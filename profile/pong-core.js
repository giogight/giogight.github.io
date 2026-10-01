/* Standalone deterministic physics; no DOM, scene index, storage or network. */
(function (root) {
  'use strict';
  const FIXED_STEP = 1 / 240;
  const TARGET = 5;
  const LIVES = 3;
  function configFor(level = 2) {
    const rank = Math.max(0, Math.min(2, Math.trunc(Number(level) || 0)));
    const speedFactor = 1.15 ** rank;
    const widthFactor = .9 ** rank;
    return Object.freeze({ level: rank, verticalStart: 315 * speedFactor,
      scoreIncrement: 20 * speedFactor, maxSpeed: 530 * speedFactor,
      desktopPaddle: .12 * widthFactor, phonePaddle: .17 * widthFactor,
      target: TARGET, lives: LIVES });
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function resize(state, width, height, phone) {
    const nextWidth = Math.max(120, Number(width) || 120);
    const nextHeight = Math.max(200, Number(height) || 200);
    const oldWidth = state.width || nextWidth, oldHeight = state.height || nextHeight;
    state.width = nextWidth; state.height = nextHeight; state.phone = Boolean(phone);
    const paddle = state.paddle;
    paddle.width = nextWidth * (state.phone ? state.config.phonePaddle : state.config.desktopPaddle);
    paddle.height = Math.max(10, nextHeight * .025);
    paddle.y = nextHeight - paddle.height - 18;
    paddle.x = clamp(paddle.x * nextWidth / oldWidth, 0, nextWidth - paddle.width);
    if (state.status === 'ready') paddle.x = (nextWidth - paddle.width) / 2;
    state.ball.radius = Math.max(7, Math.min(10, nextWidth * .009));
    state.ball.x = clamp(state.ball.x * nextWidth / oldWidth, state.ball.radius, nextWidth - state.ball.radius);
    state.ball.y = clamp(state.ball.y * nextHeight / oldHeight, state.ball.radius, nextHeight + state.ball.radius);
    return state;
  }
  function resetBall(state, random = Math.random) {
    const speed = state.config.verticalStart + state.score * state.config.scoreIncrement;
    const ball = state.ball;
    ball.x = state.width * (.38 + random() * .24);
    ball.y = state.height * .22;
    ball.vx = speed * (.62 + random() * .22) * (random() > .5 ? 1 : -1);
    ball.vy = speed;
  }
  function create(options = {}, random = Math.random) {
    const state = { width: 0, height: 0, phone: false, config: configFor(options.level === undefined ? 2 : options.level),
      score: 0, lives: LIVES, status: 'ready', accumulator: 0, launchDelay: 0,
      paddle: { x: 0, y: 0, width: 0, height: 10 }, ball: { x: 0, y: 0, radius: 7, vx: 0, vy: 0 } };
    resize(state, options.width, options.height, options.phone);
    resetBall(state, random);
    return state;
  }
  function start(state) {
    if (state.status !== 'ready') return false;
    state.status = 'running'; state.launchDelay = .35; state.accumulator = 0;
    return true;
  }
  function movePaddle(state, centerX) {
    state.paddle.x = clamp(Number(centerX) - state.paddle.width / 2, 0, state.width - state.paddle.width);
  }
  function reflectPaddle(state, hitX) {
    const { ball, paddle, config } = state;
    const offset = (hitX - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const speed = Math.min(config.maxSpeed, Math.hypot(ball.vx, ball.vy) * 1.10);
    ball.x = hitX; ball.y = paddle.y - ball.radius;
    ball.vx = speed * clamp(offset, -.82, .82);
    if (Math.abs(ball.vx) < 62) ball.vx = 62 * (offset >= 0 ? 1 : -1);
    ball.vy = -Math.sqrt(Math.max(90 * 90, speed * speed - ball.vx * ball.vx));
    state.score += 1;
    if (state.score >= TARGET) state.status = 'won';
  }
  function step(state, dt, input, random) {
    const { ball, paddle } = state;
    const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
    paddle.x = clamp(paddle.x + direction * state.width * .78 * dt, 0, state.width - paddle.width);
    if (state.launchDelay > 0) { state.launchDelay = Math.max(0, state.launchDelay - dt); return; }
    const previousX = ball.x, previousY = ball.y;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < ball.radius && ball.vx < 0) { ball.x = ball.radius * 2 - ball.x; ball.vx = Math.abs(ball.vx); }
    if (ball.x > state.width - ball.radius && ball.vx > 0) { ball.x = (state.width - ball.radius) * 2 - ball.x; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < ball.radius && ball.vy < 0) { ball.y = ball.radius * 2 - ball.y; ball.vy = Math.abs(ball.vy); }
    /* Check the crossing point, rather than only the final frame position. */
    if (ball.vy > 0 && previousY + ball.radius <= paddle.y && ball.y + ball.radius >= paddle.y) {
      const fraction = (paddle.y - ball.radius - previousY) / (ball.y - previousY);
      const hitX = previousX + (ball.x - previousX) * fraction;
      if (hitX >= paddle.x - ball.radius && hitX <= paddle.x + paddle.width + ball.radius) reflectPaddle(state, hitX);
    }
    if (state.status === 'running' && ball.y - ball.radius > state.height) {
      state.lives -= 1;
      if (state.lives <= 0) state.status = 'lost';
      else { resetBall(state, random); state.launchDelay = .52; }
    }
  }
  function advance(state, elapsedSeconds, input = {}, random = Math.random) {
    if (state.status !== 'running') return state;
    /* Fixed substeps keep 30 Hz and 60 Hz play consistent; a long stall does not teleport the ball. */
    state.accumulator += clamp(Number(elapsedSeconds) || 0, 0, .1);
    while (state.accumulator + 1e-10 >= FIXED_STEP && state.status === 'running') {
      step(state, FIXED_STEP, input, random); state.accumulator -= FIXED_STEP;
    }
    return state;
  }
  const api = { configFor, create, resize, resetBall, start, movePaddle, advance, FIXED_STEP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GuanchaoPong = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
