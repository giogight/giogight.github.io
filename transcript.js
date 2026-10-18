(() => {
  'use strict';
  const G = window.Guanchao;
  const page = document.getElementById('convertPage');
  if (!G || !page || document.getElementById('transcriptDetails')) return;
  const STORAGE = 'gc-transcript-job-v1';
  const BATCH_STORAGE = 'gc-transcript-batch-v1';
  const PENDING_STORAGE = 'gc-transcript-batch-submit-v1';
  const MEDIA_STORAGE = 'gc-transcript-media-submit-v1';
  const terminal = new Set(['completed', 'failed', 'cancelled', 'canceled']);
  const batchTerminal = new Set(['completed', 'partial', 'failed', 'cancelled', 'canceled']);
  const panel = document.getElementById('transcriptPanel') || page.appendChild(document.createElement('section'));
  panel.id = 'transcriptPanel';
  panel.classList.add('transcript-panel');
  panel.innerHTML = `
    <details id="transcriptDetails" class="transcript-card">
      <summary><span class="transcript-symbol" aria-hidden="true">文</span><span><strong>提了么 · 视频文案</strong><small>最多 20 条，按顺序提取 · 电脑本机识别</small></span><span class="transcript-chevron" aria-hidden="true">⌄</span></summary>
      <div class="transcript-body">
        <p class="transcript-intro">提取视频里实际说的话，保留原稿。识别结果可能有误，请对照原视频核对人名、数字与专业词。</p>
        <div class="transcript-modes" role="group" aria-label="文案来源"><button type="button" id="transcriptLinkMode" aria-pressed="true">视频链接</button><button type="button" id="transcriptFileMode" aria-pressed="false">本地音视频</button></div>
        <form id="transcriptForm">
          <label id="transcriptLinkField" class="transcript-field"><span id="transcriptLinkLabel">视频链接或完整分享文案</span><textarea id="transcriptShareText" rows="4" maxlength="8000" placeholder="把复制的视频分享文案粘贴到这里，一次一条，最多 8000 字。"></textarea><small>仅尝试匿名可读取的抖音、哔哩哔哩或西瓜单条公开视频。平台要求登录或验证时，请改用本地音视频。</small></label>
          <label id="transcriptFileField" class="transcript-field" hidden><span id="transcriptFileLabel">选择一个音频或视频文件</span><input id="transcriptFile" type="file" accept="audio/*,video/*,.mp4,.mov,.mkv,.webm,.m4a,.mp3,.wav,.flac,.ogg,.aac"><small id="transcriptFileName">文件交给已连接的电脑本机服务处理。</small><small>抖音 → 分享 → 保存本地，再在这里选择文件。没有保存选项时，请使用作者提供的视频文件。</small></label>
          <div id="transcriptInputPreview" class="transcript-input-preview" hidden><p id="transcriptInputCount" role="status"></p><ol id="transcriptInputList"></ol></div>
          <details class="transcript-recognition-settings"><summary>识别设置 <span>选填</span></summary><label class="transcript-field">重点词<input type="text" id="transcriptHotwords" maxlength="400" placeholder="例如：观潮、天津、品牌名或专业词"><small>人名、品牌和专业词可供模型参考，不会强制替换原稿。填写你确定正确的词，仍需结合原音核对。最多 400 字。</small></label></details>
          <p id="transcriptCapability" class="transcript-capability" role="status">正在检查本机识别能力…</p>
          <div id="transcriptModelSetup" class="transcript-model-setup" hidden></div>
          <div class="transcript-actions"><button type="submit" id="transcriptStart" class="primary" disabled>开始提取</button><button type="button" id="transcriptRecheck">重新检查</button><button type="button" id="transcriptCancel" hidden>取消任务</button><button type="button" id="transcriptResume" hidden>重新连接当前任务</button><button type="button" id="transcriptAbandon" hidden>停止找回（不会取消任务）</button><button type="button" id="transcriptTryFile" hidden>改用本地音视频</button></div>
        </form>
        <div id="transcriptTask" class="transcript-task" hidden><p id="transcriptStatus" role="status" aria-live="polite"></p><progress id="transcriptProgress" max="1" aria-label="文案提取进度"></progress></div>
        <section id="transcriptBatch" class="transcript-batch" hidden aria-label="按输入顺序排列的提取任务">
          <div class="transcript-batch-heading"><h3>本批任务</h3><span id="transcriptBatchCount" role="status"></span></div>
          <div class="transcript-actions transcript-recovery-toolbar"><button type="button" id="transcriptBatchRecover" hidden>后台重试抖音链接</button></div>
          <section id="transcriptRecoveryConsent" class="transcript-recovery-consent" hidden aria-label="确认后台重试抖音链接"><strong>按原编号后台重试</strong><p>允许观潮后台读取本批公开链接并在本机识别。不会弹登录窗口；受限时暂停，原编号和已有结果保留。不读取外部浏览器资料，不导出 Cookie。没有取得视频时，仍可补交本地音视频。</p><div class="transcript-actions"><button type="button" id="transcriptRecoveryConfirm">确认并后台重试</button><button type="button" id="transcriptRecoveryDecline">暂不使用</button></div></section>
          <div class="transcript-recovery-progress"><p id="transcriptRecoveryStatus" role="status" aria-live="polite"></p><div class="transcript-actions"><button type="button" id="transcriptRecoveryContinue" hidden>继续检查</button><button type="button" id="transcriptRecoveryCancel" hidden>停止后台重试</button></div></div>
          <p id="transcriptRecoveryHelp" class="transcript-batch-note" hidden></p>
          <ol id="transcriptBatchItems" class="transcript-batch-items"></ol>
          <div class="transcript-actions"><button type="button" id="transcriptBatchExport" disabled>保存全部 ZIP</button><button type="button" id="transcriptBatchRetry" hidden>重试失败项</button></div>
          <p class="transcript-batch-note">编号跟随输入顺序。单条失败不会打乱后面的编号，也不会补写文案。请选择一条查看原稿。</p>
          <p id="transcriptBatchSaveStatus" class="transcript-save-status" role="status" aria-live="polite"></p>
        </section>
        <div id="transcriptWarnings" class="transcript-warnings" hidden><strong>需要核对</strong><ul id="transcriptWarningList"></ul></div>
        <div id="transcriptResult" class="transcript-result" hidden tabindex="-1">
          <div class="transcript-result-heading"><h3 id="transcriptResultTitle">语音原稿</h3><span id="transcriptModel"></span></div>
          <a id="transcriptSource" target="_blank" rel="noopener noreferrer" hidden>查看来源视频 ↗</a>
          <label class="transcript-field"><span class="transcript-sr-only">提取的原始文案</span><textarea id="transcriptOriginal" rows="10" readonly spellcheck="false"></textarea></label>
          <p class="transcript-retention">本机结果仅保留 1 小时，请及时保存到自己的文件夹。点下方按钮下载后，才算保存到设备。</p>
          <div class="transcript-actions"><button type="button" id="transcriptCopy">复制原稿</button><button type="button" data-transcript-export="docx">保存 Word</button><button type="button" data-transcript-export="txt">保存 TXT</button><button type="button" data-transcript-export="srt">保存 SRT</button><button type="button" data-transcript-export="json">保存 JSON</button></div>
          <p id="transcriptSaveStatus" class="transcript-save-status" role="status" aria-live="polite"></p>
          <details id="transcriptSegmentsDetails" class="transcript-segments" hidden><summary>分段与时间戳 <span id="transcriptSegmentCount"></span></summary><ol id="transcriptSegments"></ol></details>
        </div>
      </div>
    </details>`;
  const $ = id => document.getElementById(id);
  let mode = 'link', caps = null, checking = false, submitting = false, current = null;
  let jobService = '', pollTimer = null, polling = false, capRevision = 0, cancelling = false;
  let batch = null, batchService = '', batchPolling = false, batchTimer = null, selectedIndex = null, retrying = false;
  let pendingSubmission = null, pendingTimer = null, pendingPolling = false;
  const mediaSubmissions = new Map();
  let recovery = null, recoveryConsent = null;
  let restoreRecoveryWanted = false, recoveryLookup = null, recoveryStateRevision = 0;
  const nativeTask = {title: '视频文案提取'};

  function serviceRoot(value) {
    try {
      const url = new URL(String(value || ''));
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash ? url.origin : '';
    } catch { return ''; }
  }
  function nativeRecoveryAvailable() { return location.protocol === 'file:' && window.guanchao?.transcriptPlaybackRecovery === true && typeof window.guanchao.request === 'function' && typeof window.guanchao.listen === 'function'; }
  function failedItem(item) { return ['failed', 'cancelled', 'canceled'].includes(item.status); }
  function linkItem(item) { return !!text(item.shareText) && item.source?.type !== 'upload'; }
  function recoverableIndices() { return batch?.kind === 'links' ? (batch.items || []).filter(item => failedItem(item) && linkItem(item) && item.source?.platform === 'douyin').map(item => item.index) : []; }
  function recovering() { return !!recovery?.active && recovery.id === batch?.id && recovery.root === batchService; }
  function mediaActive() { return [...mediaSubmissions.values()].some(item => item.id === batch?.id && item.root === batchService); }
  function active() { return !!pendingSubmission || recovering() || mediaActive() || (batch ? !batchTerminal.has(batch.status) : !!current && !terminal.has(current.status)); }
  function batchEnabled() { return caps?.batchAvailable === true; }
  function number(index) { return String(index).padStart(3, '0'); }
  function linkLines() { return $('transcriptShareText').value.split(/\r?\n/).map(value => value.trim()).filter(Boolean); }
  function text(value) { return typeof value === 'string' ? value : ''; }
  function notice(message) { if (typeof G.toast === 'function') G.toast(message); }
  function persist() {
    if (batch) {
      if (batch.id && batchService) try { localStorage.setItem(BATCH_STORAGE, JSON.stringify({id: batch.id, serviceURL: batchService})); } catch { /* Storage may be unavailable. */ }
      return;
    }
    if (!current?.id || !jobService) return;
    try { localStorage.setItem(STORAGE, JSON.stringify({id: current.id, serviceURL: jobService})); } catch { /* Private mode can disable storage. */ }
  }
  function persistPending() {
    try { if (pendingSubmission) localStorage.setItem(PENDING_STORAGE, JSON.stringify(pendingSubmission)); else localStorage.removeItem(PENDING_STORAGE); } catch { /* Storage may be unavailable. */ }
  }
  function clearPending() { pendingSubmission = null; clearTimeout(pendingTimer); persistPending(); }
  function persistMedia() {
    try { if (mediaSubmissions.size) localStorage.setItem(MEDIA_STORAGE, JSON.stringify([...mediaSubmissions.values()].map(({id, root, index, requestId, name}) => ({id, root, index, requestId, name})))); else localStorage.removeItem(MEDIA_STORAGE); } catch { /* Storage may be unavailable. */ }
  }
  function currentMedia(index) { const item = mediaSubmissions.get(index); return item?.id === batch?.id && item.root === batchService ? item : null; }
  function sameBatch(id, root) { return batch?.id === id && batchService === root; }
  function migrateNativeService() {
    // The desktop preload exists only on the packaged file page. A changed
    // loopback port belongs to its restarted service; remote jobs stay bound.
    if (location.protocol !== 'file:' || typeof window.guanchao?.request !== 'function' || !(pendingSubmission?.requestId || batch?.id || current?.id)) return false;
    const next = serviceRoot(G.serviceURL);
    const loopback = value => {
      if (!value) return false;
      return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname);
    };
    const previous = pendingSubmission ? pendingSubmission.serviceURL : batch ? batchService : jobService;
    if (!next || next === previous || !loopback(next) || !loopback(previous)) return false;
    if (batch) batchService = next;
    for (const item of mediaSubmissions.values()) if (item.id === batch?.id && item.root === previous) item.root = next;
    persistMedia();
    if (recovery?.root === previous) { recovery = null; recoveryConsent = null; $('transcriptRecoveryConsent').hidden = true; }
    recoveryLookup = null; recoveryStateRevision++; restoreRecoveryWanted = !!batch;
    if (pendingSubmission) { pendingSubmission.serviceURL = next; persistPending(); }
    jobService = next;
    persist();
    return true;
  }
  function refreshControls() {
    const occupied = submitting || active() || cancelling || retrying;
    $('transcriptStart').disabled = occupied || checking || !caps?.available || !(mode === 'link' ? caps.linkAvailable : caps.uploadAvailable);
    $('transcriptStart').textContent = submitting ? '正在提交…' : active() ? '正在提取…' : batchEnabled() ? '按顺序批量提取' : '开始提取';
    $('transcriptShareText').disabled = occupied;
    $('transcriptFile').disabled = occupied;
    $('transcriptHotwords').disabled = occupied;
    $('transcriptLinkMode').disabled = occupied;
    $('transcriptFileMode').disabled = occupied;
    $('transcriptCancel').hidden = !!pendingSubmission || recovering() || mediaActive() || !active();
    $('transcriptAbandon').hidden = !pendingSubmission || submitting;
    $('transcriptCancel').disabled = cancelling;
    $('transcriptTryFile').hidden = occupied || !caps?.uploadAvailable || !(batch ? batch.items?.some(item => item.status === 'failed') : current?.status === 'failed');
    $('transcriptRecheck').disabled = checking;
    $('transcriptBatchRetry').disabled = occupied;
    $('transcriptBatchExport').disabled = !batch || !batchTerminal.has(batch.status) || submitting || retrying || recovering() || mediaActive();
    refreshRecoveryControls();
  }
  function chooseMode(next) {
    if (submitting || active()) return;
    mode = next;
    $('transcriptLinkMode').setAttribute('aria-pressed', String(mode === 'link'));
    $('transcriptFileMode').setAttribute('aria-pressed', String(mode === 'file'));
    $('transcriptLinkField').hidden = mode !== 'link';
    $('transcriptFileField').hidden = mode !== 'file';
    capabilityMessage();
    previewInputs();
    refreshControls();
  }
  function capabilityMessage() {
    const root = serviceRoot(G.serviceURL);
    if (!root) {
      $('transcriptCapability').textContent = '需要电脑本机服务：请打开电脑版观潮并连接本机引擎。网页或手机自身不会在这里进行识别。';
    } else if (!caps?.available) {
      $('transcriptCapability').textContent = caps?.reason || (Array.isArray(caps?.instructions) ? caps.instructions.filter(value => typeof value === 'string').join(' ') : '') || '本机语音识别引擎尚未就绪。请在电脑上准备识别模型，并重新检查。';
    } else if (mode === 'link' && !caps.linkAvailable) {
      $('transcriptCapability').textContent = '当前引擎可识别本地文件，链接解析尚不可用。请选择“本地音视频”，或在电脑上安装链接解析组件后重试。';
    } else if (mode === 'file' && !caps.uploadAvailable) {
      $('transcriptCapability').textContent = '当前本机服务未开放文件上传，请使用视频链接，或更新电脑本机服务。';
    } else {
      $('transcriptCapability').textContent = '本机引擎已就绪' + (text(caps.model) ? ' · ' + caps.model : '') + (batchEnabled() ? ' · 每批最多 20 条。排队复用同一个模型，保留输入顺序。' : ' · 当前服务仅支持单条，请更新电脑版以使用批量提取。') + '首次加载模型可能较慢；识别在电脑上完成，不调用付费转写服务。' + (mode === 'link' ? '抖音匿名链接经常受限；无法读取时，请先保存或取得本地视频，再给原编号补交。' : '');
    }
  }
  function previewInputs() {
    const enabled = batchEnabled();
    $('transcriptShareText').maxLength = enabled ? 160000 : 8000;
    $('transcriptShareText').placeholder = enabled ? '每行粘贴一条完整分享文案或视频链接，最多 20 条。编号会按这里的顺序保留。' : '把复制的视频分享文案粘贴到这里，一次一条，最多 8000 字。';
    $('transcriptLinkLabel').textContent = enabled ? '视频链接 / 分享文案 · 每行一条' : '视频链接或完整分享文案';
    $('transcriptFileLabel').textContent = enabled ? '选择音视频 · 最多 20 个文件' : '选择一个音频或视频文件';
    $('transcriptFile').multiple = enabled;
    const values = mode === 'link' ? linkLines() : Array.from($('transcriptFile').files || []).map(file => file.name);
    $('transcriptInputPreview').hidden = !enabled || !values.length;
    $('transcriptInputCount').textContent = values.length > 20 ? '已填 ' + values.length + ' 条，超过 20 条，请分成两批。' : '已准备 ' + values.length + ' / 20 条 · 按以下顺序编号';
    $('transcriptInputPreview').classList.toggle('is-over-limit', values.length > 20);
    $('transcriptInputList').replaceChildren();
    values.slice(0, 21).forEach((value, index) => {
      const li = document.createElement('li'), badge = document.createElement('span'), label = document.createElement('span');
      badge.className = 'transcript-number'; badge.textContent = number(index + 1); label.textContent = value;
      li.append(badge, label); $('transcriptInputList').append(li);
    });
  }
  async function request(root, suffix, options = {}, namespace = '/api/transcripts') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.method === 'POST' ? 120000 : 15000);
    try {
      const response = await fetch(root + namespace + suffix, {...options, signal: controller.signal});
      let body;
      try { body = await response.json(); } catch { throw Error('本机服务返回了无法识别的结果，请更新服务后重试'); }
      if (!response.ok) {
        const error = Error(typeof body.detail === 'string' ? body.detail : body.message || body.error || '本机服务暂时无法处理请求');
        error.status = response.status;
        throw error;
      }
      return body;
    } finally { clearTimeout(timeout); }
  }
  async function checkCapabilities() {
    const revision = ++capRevision;
    const root = serviceRoot(G.serviceURL);
    checking = true;
    caps = null;
    refreshControls();
    if (root) $('transcriptCapability').textContent = '正在检查本机识别能力…';
    let result = null;
    try {
      if (root) result = await request(root, '/capabilities');
    } catch (error) {
      if (revision !== capRevision) return;
      result = {available: false, reason: '未连接到本机识别引擎：' + (error.name === 'AbortError' ? '连接超时' : error.message)};
    }
    if (revision !== capRevision) return;
    caps = result;
    checking = false;
    capabilityMessage();
    previewInputs();
    refreshControls();
    lookupRecoveryState();
  }
  function timestamp(seconds, srt = false) {
    const total = Math.max(0, Math.round(Number(seconds) * 1000));
    const hours = Math.floor(total / 3600000), minutes = Math.floor(total / 60000) % 60, secs = Math.floor(total / 1000) % 60;
    const value = [hours, minutes, secs].map(n => String(n).padStart(2, '0')).join(':');
    return value + (srt ? ',' + String(total % 1000).padStart(3, '0') : '');
  }
  function validSegments(job) {
    return Array.isArray(job.segments) ? job.segments.filter(segment => segment && Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.start >= 0 && segment.end > segment.start && typeof segment.text === 'string' && segment.text.trim()) : [];
  }
  function warningText(value) {
    if (typeof value === 'string') return value;
    return text(value?.message) || text(value?.text) || text(value?.reason);
  }
  function lowConfidence(segment) {
    return segment.lowConfidence === true || segment.low_confidence === true || (typeof segment.confidence === 'number' && segment.confidence < 0.6) || (typeof segment.avgLogprob === 'number' && segment.avgLogprob < -0.7) || (typeof segment.noSpeechProbability === 'number' && segment.noSpeechProbability > 0.6);
  }
  function safeSource(value) {
    try {
      const url = new URL(typeof value === 'string' ? value : value?.url || value?.source_url || '');
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }
  function renderWarnings(job) {
    const messages = (Array.isArray(job.warnings) ? job.warnings : []).map(warningText).filter(Boolean);
    const low = validSegments(job).filter(lowConfidence).length;
    if (low) messages.push(low + ' 段语音置信度较低，请对照原视频核对。');
    if (job.quality?.reviewRequired) messages.push(text(job.quality.notice) || '识别质量提示需要人工复核，请核对原视频。');
    $('transcriptWarningList').replaceChildren();
    for (const message of new Set(messages)) {
      const item = document.createElement('li');
      item.textContent = message;
      $('transcriptWarningList').append(item);
    }
    $('transcriptWarnings').hidden = !messages.length;
  }
  function applyJob(job, focus = false, fromBatch = false) {
    if (!job || typeof job.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(job.id) || typeof job.status !== 'string') throw Error('本机服务没有返回有效任务，请更新服务');
    const wasCompleted = current?.status === 'completed';
    current = {...job};
    if (current.status === 'completed' && !text(current.text).trim()) {
      current.status = 'failed';
      current.message = '任务结束但没有识别出语音原稿，请检查视频是否有人声。标题和简介不会作为正文。';
    }
    persist();
    $('transcriptTask').hidden = false;
    const labels = {completed: '提取完成，请核对原稿。', failed: '提取失败', cancelled: '任务已取消', canceled: '任务已取消'};
    $('transcriptStatus').textContent = text(current.message) || labels[current.status] || '本机引擎正在处理，请稍候…';
    panel.dataset.status = current.status;
    const progress = $('transcriptProgress');
    progress.hidden = terminal.has(current.status);
    if (typeof current.progress === 'number' && Number.isFinite(current.progress)) progress.value = Math.max(0, Math.min(1, current.progress));
    else progress.removeAttribute('value');
    $('transcriptResume').hidden = true;
    const completed = current.status === 'completed';
    $('transcriptResult').hidden = !completed;
    renderWarnings(current);
    if (completed) {
      $('transcriptOriginal').value = current.text;
      $('transcriptModel').textContent = text(current.quality?.model) || text(caps?.model);
      const source = safeSource(current.source);
      $('transcriptSource').hidden = !source;
      if (source) $('transcriptSource').href = source;
      else $('transcriptSource').removeAttribute('href');
      const segments = validSegments(current);
      $('transcriptSegments').replaceChildren();
      for (const segment of segments) {
        const item = document.createElement('li'), time = document.createElement('span'), copy = document.createElement('p');
        time.className = 'transcript-time';
        time.textContent = timestamp(segment.start) + ' – ' + timestamp(segment.end);
        copy.textContent = segment.text;
        item.append(time, copy);
        if (lowConfidence(segment)) {
          item.classList.add('needs-review');
          const badge = document.createElement('small');
          badge.textContent = '需核对';
          item.append(badge);
        }
        $('transcriptSegments').append(item);
      }
      $('transcriptSegmentsDetails').hidden = !segments.length;
      $('transcriptSegmentCount').textContent = segments.length + ' 段';
      panel.querySelector('[data-transcript-export="srt"]').disabled = !segments.length;
      panel.querySelector('[data-transcript-export="docx"]').disabled = !Array.isArray(current.outputs) || !current.outputs.some(output => typeof output?.name === 'string' && output.name.toLowerCase().endsWith('.docx'));
      if (focus || !wasCompleted) {
        $('transcriptDetails').open = true;
        $('transcriptResult').focus({preventScroll: true});
        $('transcriptResult').scrollIntoView?.({block: 'nearest', behavior: 'auto'});
      }
    }
    refreshControls();
    if (!fromBatch && typeof G.updateTask === 'function') {
      if (nativeTask.id !== current.id) delete nativeTask.nativeStarted;
      Object.assign(nativeTask, {id: current.id, status: terminal.has(current.status) ? current.status : 'running', message: $('transcriptStatus').textContent, progress: current.progress});
      Promise.resolve(G.updateTask(nativeTask)).catch(() => {});
    }
  }
  function schedulePoll(delay = 1200) {
    clearTimeout(pollTimer);
    if (active()) pollTimer = setTimeout(poll, delay);
  }
  async function poll() {
    if (pendingSubmission) return findPendingBatch();
    if (batch) return pollBatch();
    if (!current || polling) return;
    clearTimeout(pollTimer);
    polling = true;
    const id = current.id, root = jobService;
    try {
      const job = await request(root, '/' + encodeURIComponent(id));
      if (job?.id !== id) throw Error('服务返回了其他任务，原任务已保留');
      if (current?.id === id && jobService === root) applyJob(job);
    } catch (error) {
      if (current?.id === id && jobService === root) {
        if (error.status === 404 || error.status === 410) {
          applyJob({...current, status: 'failed', message: '本机服务已找不到这个任务，可能已清理或重启。没有重新提交；如需提取，请重新选择来源后开始。'});
          return;
        }
        $('transcriptTask').hidden = false;
        $('transcriptStatus').textContent = '任务连接中断，正在保留原任务。恢复连接后会继续查询，不会重新提交。' + (error.name === 'AbortError' ? '连接超时。' : error.message);
        $('transcriptResume').hidden = false;
      }
    } finally {
      polling = false;
      if (current?.id === id && jobService !== root) poll();
      else schedulePoll($('transcriptResume').hidden ? 1200 : 5000);
    }
  }
  function batchRequest(suffix, options) { return request(batchService, suffix, options, '/api/transcript-batches'); }
  async function findPendingBatch() {
    if (!pendingSubmission || pendingPolling) return;
    clearTimeout(pendingTimer); pendingPolling = true;
    const {requestId, serviceURL: root} = pendingSubmission;
    try {
      const value = await request(root, '/by-request/' + encodeURIComponent(requestId), {}, '/api/transcript-batches');
      if (pendingSubmission?.requestId !== requestId || pendingSubmission.serviceURL !== root) return;
      batchService = root; selectedIndex = null;
      applyBatch(value, true); clearPending(); refreshControls(); scheduleBatchPoll();
      try { localStorage.removeItem(STORAGE); } catch { /* Storage unavailable. */ }
    } catch (error) {
      if (pendingSubmission?.requestId === requestId && pendingSubmission.serviceURL === root) {
        $('transcriptTask').hidden = false; $('transcriptProgress').hidden = true;
        $('transcriptStatus').textContent = error.status === 404 ? '尚未查询到这次提交，正在按原请求编号找回。不会重新提交。若上传尚未完成，请稍等；停止找回不会取消本机任务。' : '提交结果尚未确认，正在按原请求编号找回，只查询，不会重新提交。' + (error.name === 'AbortError' ? '连接超时。' : error.message);
        $('transcriptResume').hidden = false; refreshControls();
      }
    } finally {
      pendingPolling = false;
      if (pendingSubmission?.requestId === requestId && pendingSubmission.serviceURL !== root) findPendingBatch();
      else if (pendingSubmission) pendingTimer = setTimeout(findPendingBatch, 5000);
    }
  }
  function refreshRecoveryControls() {
    const eligible = recoverableIndices(), running = recovering(), native = nativeRecoveryAvailable();
    $('transcriptBatchRecover').hidden = !native || !eligible.length || running;
    $('transcriptBatchRecover').disabled = submitting || retrying || mediaActive() || !caps?.available;
    $('transcriptRecoveryCancel').hidden = !running;
    $('transcriptRecoveryContinue').hidden = !running || recovery.status !== 'awaiting-user' || !Number.isInteger(recovery.index);
    const legacyUpload = batch && !['links', 'uploads'].includes(batch.kind) && batch.items?.some(item => failedItem(item) && linkItem(item));
    $('transcriptRecoveryHelp').hidden = !eligible.length && !legacyUpload;
    $('transcriptRecoveryHelp').textContent = legacyUpload ? '此服务未支持按编号补交，可改用“本地音视频”新建批次；原任务和编号保留。' : native ? '可确认后在后台重试本批公开抖音链接，不弹登录窗口。受限时暂停，原编号与已有结果保留；也可补交本地音视频。' : '抖音匿名访问经常受限。请先保存或取得本地视频，再在原编号下补交；已连接的本地文件识别仍可用。';
    if (!batch || recoveryConsent?.id !== batch.id || recoveryConsent.root !== batchService) $('transcriptRecoveryConsent').hidden = true;
    for (const input of $('transcriptBatchItems').querySelectorAll('[data-transcript-media]')) {
      const pending = currentMedia(Number(input.dataset.transcriptMedia));
      input.disabled = !!pending || running || !caps?.uploadAvailable;
      const button = input.parentElement.querySelector('.transcript-item-media-button');
      if (button) button.disabled = input.disabled;
    }
  }
  function applyRecoveryProgress(value, fromLookup = false) {
    if (!value || !batch || batch.kind !== 'links' || value.batchId !== batch.id || typeof value.active !== 'boolean' || serviceRoot(value.serviceRoot) !== batchService || serviceRoot(G.serviceURL) !== batchService) return false;
    if (!Number.isInteger(value.index) || !batch.items.some(item => item.index === value.index && item.source?.platform === 'douyin')) return false;
    if (!recovery && !fromLookup && !recoveryLookup) return false;
    if (recovery && !sameBatch(recovery.id, recovery.root)) return false;
    recoveryStateRevision++; recoveryLookup = null; restoreRecoveryWanted = false;
    if (!recovery) recovery = {id: batch.id, root: batchService};
    Object.assign(recovery, {active: value.active, status: text(value.status), index: value.index});
    $('transcriptRecoveryStatus').textContent = number(value.index) + ' · ' + text(value.message).slice(0, 800);
    $('transcriptRecoveryContinue').disabled = false; $('transcriptRecoveryCancel').disabled = false;
    refreshControls(); pollBatch(); scheduleBatchPoll();
    return true;
  }
  async function lookupRecoveryState() {
    if (!restoreRecoveryWanted || !nativeRecoveryAvailable() || !batch || batch.kind !== 'links' || !batch.items.length || recovering() || recoveryLookup || serviceRoot(G.serviceURL) !== batchService) return;
    const lookup = {id: batch.id, root: batchService, revision: ++recoveryStateRevision};
    recoveryLookup = lookup; restoreRecoveryWanted = false;
    try {
      // This reads the existing native controller only. It must never consent,
      // open a video, or resubmit a media file while restoring a page.
      const value = await window.guanchao.request('native-transcript-recovery-state');
      if (recoveryLookup !== lookup || recoveryStateRevision !== lookup.revision || !sameBatch(lookup.id, lookup.root) || serviceRoot(G.serviceURL) !== lookup.root) return;
      if (value?.ok === false || value?.active !== true) return;
      applyRecoveryProgress(value, true);
    } catch { /* A missing optional state API cannot disable local transcription. */ }
    finally { if (recoveryLookup === lookup) recoveryLookup = null; }
  }
  function settleMedia(value) {
    for (const [index, attempt] of mediaSubmissions) {
      if (attempt.id !== value.id || attempt.root !== batchService) continue;
      const item = value.items.find(item => item.index === index), submission = item?.mediaSubmission;
      if (!item) continue;
      if (submission?.requestId === attempt.requestId && ['accepted', 'failed'].includes(submission.status)) {
        mediaSubmissions.delete(index);
        $('transcriptBatchSaveStatus').textContent = submission.status === 'accepted' ? number(index) + ' 补交已接收，沿用原编号和链接，正在排队识别。' : number(index) + ' 补交未完成：' + (text(submission.message) || '服务未能接收这个文件') + '。原编号、链接和失败任务已保留。';
      } else if (attempt.uncertain && item.inputKind === 'upload' && !failedItem(item) && submission?.requestId !== attempt.requestId) {
        // Older compatible services may omit the optional submission receipt.
        mediaSubmissions.delete(index);
      }
    }
    persistMedia();
  }
  async function supplementMedia(index, file) {
    const original = batch?.items.find(item => item.index === index);
    if (!file || batch?.kind !== 'links' || !original || !failedItem(original) || !linkItem(original) || currentMedia(index) || recovering() || !caps?.uploadAvailable) return;
    const id = batch.id, root = batchService;
    if (file.size > (caps.maxInputBytes || 209715200)) { $('transcriptBatchSaveStatus').textContent = number(index) + ' 补交未完成：单个文件不能超过 200 MB。原编号和任务已保留，请先裁剪或压缩。'; return; }
    const requestId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(24)), value => value.toString(16).padStart(2, '0')).join('');
    const attempt = {id, root, index, requestId, name: file.name, uncertain: false};
    mediaSubmissions.set(index, attempt); persistMedia(); refreshControls();
    $('transcriptBatchSaveStatus').textContent = '正在补交 ' + number(index) + ' · ' + file.name + '，原编号和链接不变。单文件最多 200 MB、20 分钟；本机服务会验证文件。';
    try {
      const form = new FormData(); form.append('file', file, file.name); form.append('requestId', requestId);
      const value = await request(root, '/' + encodeURIComponent(id) + '/items/' + index + '/media', {method: 'POST', body: form}, '/api/transcript-batches');
      if (!sameBatch(id, root) || mediaSubmissions.get(index) !== attempt) return;
      if (value?.id !== id) throw Error('服务返回了其他批次，原批次已保留');
      mediaSubmissions.delete(index); persistMedia();
      applyBatch(value);
      $('transcriptBatchSaveStatus').textContent = number(index) + ' 补交已接收，沿用原编号和链接，正在排队识别。';
    } catch (error) {
      if (!sameBatch(id, root) || mediaSubmissions.get(index) !== attempt) return;
      if (error.status >= 400 && error.status < 500 && error.status !== 409) {
        mediaSubmissions.delete(index); persistMedia();
        $('transcriptBatchSaveStatus').textContent = number(index) + ' 补交未完成：' + error.message + '。原编号、链接和失败任务已保留。';
      } else {
        attempt.uncertain = true;
        $('transcriptBatchSaveStatus').textContent = number(index) + ' 补交结果尚未确认：' + (error.name === 'AbortError' ? '上传连接超时' : error.message) + '。只查询原编号进度，不会重新上传；原链接和任务保留。';
        applyBatch(batch); pollBatch();
      }
    } finally { if (sameBatch(id, root)) { refreshControls(); scheduleBatchPoll(); } }
  }
  function selectedJob(item) {
    // Pending/invalid inputs may not have a worker job yet. Its ordinal is a
    // display-only id and is never passed to native-export without outputs.
    return {...item, id: item.jobId || 'batch-item-' + item.index};
  }
  function applyBatch(value, focus = false) {
    if (!value || typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value.id) || typeof value.status !== 'string' || !Array.isArray(value.items)) throw Error('本机服务没有返回有效批次，请更新服务');
    const seen = new Set();
    const items = value.items.map(item => {
      if (!item || !Number.isInteger(item.index) || item.index < 1 || item.index > 20 || seen.has(item.index) || typeof item.status !== 'string') throw Error('本机服务返回了重复或无效编号，已保留原批次');
      seen.add(item.index);
      if (item.status === 'completed' && !text(item.text).trim()) return {...item, status: 'failed', message: '没有识别出语音原稿；标题和简介不会作为正文。'};
      return {...item};
    }).sort((a, b) => a.index - b.index);
    const changedBatch = batch?.id !== value.id;
    batch = {...value, items};
    if (changedBatch) { recovery = null; recoveryConsent = null; recoveryLookup = null; recoveryStateRevision++; $('transcriptRecoveryConsent').hidden = true; $('transcriptRecoveryStatus').textContent = ''; }
    settleMedia(batch);
    persist();
    if (!items.some(item => item.index === selectedIndex)) selectedIndex = items.find(item => item.status === 'completed')?.index || items[0]?.index;
    const selected = items.find(item => item.index === selectedIndex);
    if (selected) {
      jobService = batchService;
      applyJob(selectedJob(selected), focus, true);
      $('transcriptResultTitle').textContent = number(selected.index) + ' · 语音原稿';
    } else { current = null; $('transcriptResult').hidden = true; $('transcriptWarnings').hidden = true; }
    const completed = items.filter(item => item.status === 'completed').length;
    const failed = items.filter(item => item.status === 'failed').length;
    const cancelled = items.filter(item => item.status === 'cancelled' || item.status === 'canceled').length;
    $('transcriptBatch').hidden = false;
    $('transcriptBatchCount').textContent = '完成 ' + completed + ' / ' + items.length + ' · 失败 ' + failed + (cancelled ? ' · 取消 ' + cancelled : '');
    $('transcriptTask').hidden = false;
    $('transcriptStatus').textContent = recovering() ? '本批正在后台按原编号重试公开链接，不弹登录窗口；已经得到的媒体会继续本机识别。' : mediaActive() ? '本批正在补交或确认文件接收结果，原编号和链接保留。' : batchTerminal.has(batch.status) ? '本批已结束：' + $('transcriptBatchCount').textContent + '。编号保持输入顺序，请及时保存全部 ZIP。' : text(batch.message) || '正在按输入顺序处理，单条失败会继续下一条。';
    panel.dataset.status = batch.status;
    const progress = $('transcriptProgress'); progress.hidden = batchTerminal.has(batch.status);
    if (Number.isFinite(batch.progress)) progress.value = Math.max(0, Math.min(1, batch.progress)); else progress.removeAttribute('value');
    $('transcriptResume').hidden = true;
    $('transcriptBatchItems').replaceChildren();
    const labels = {queued: '排队中', waiting: '排队中', running: '提取中', completed: '已完成', failed: '失败', cancelled: '已取消', canceled: '已取消'};
    for (const item of items) {
      const li = document.createElement('li'), button = document.createElement('button'), badge = document.createElement('span'), copy = document.createElement('span'), title = document.createElement('strong'), message = document.createElement('small'), state = document.createElement('span');
      li.dataset.status = item.status;
      button.type = 'button'; button.className = 'transcript-batch-item'; button.setAttribute('aria-pressed', String(item.index === selectedIndex));
      badge.className = 'transcript-number'; badge.textContent = number(item.index);
      copy.className = 'transcript-batch-item-copy';
      title.textContent = text(item.source?.fileName) || text(item.source?.filename) || text(item.source?.title) || text(item.title) || text(item.shareText) || '音视频 ' + number(item.index);
      message.textContent = text(item.message) || (item.status === 'completed' ? '点击查看原稿和时间戳' : labels[item.status] || '等待本机服务');
      state.className = 'transcript-item-state'; state.textContent = labels[item.status] || '处理中';
      copy.append(title, message); button.append(badge, copy, state); li.append(button);
      button.onclick = () => { selectedIndex = item.index; applyBatch(batch, true); };
      if (linkItem(item)) {
        const original = document.createElement('small'); original.className = 'transcript-item-original'; original.textContent = '原链接：' + item.shareText; original.title = item.shareText;
        copy.append(original);
      }
      if (batch.kind === 'links' && failedItem(item) && linkItem(item)) {
        const controls = document.createElement('div'), input = document.createElement('input'), upload = document.createElement('button');
        controls.className = 'transcript-item-media';
        input.type = 'file'; input.hidden = true; input.accept = 'audio/*,video/*,.mp4,.mov,.mkv,.webm,.m4a,.mp3,.wav,.flac,.ogg,.aac'; input.dataset.transcriptMedia = item.index; input.setAttribute('aria-label', '为第 ' + number(item.index) + ' 条补交本地视频');
        upload.type = 'button'; upload.className = 'transcript-item-media-button'; upload.textContent = currentMedia(item.index) ? '补交结果待确认' : '补交本地视频'; upload.setAttribute('aria-label', '为第 ' + number(item.index) + ' 条补交本地视频');
        upload.onclick = () => { if (!input.disabled) input.click(); };
        input.onchange = () => supplementMedia(item.index, input.files?.[0]);
        controls.append(input, upload);
        const pending = currentMedia(item.index);
        if (pending?.uncertain) {
          const stop = document.createElement('button'); stop.type = 'button'; stop.className = 'transcript-item-stop-check'; stop.textContent = '停止查询'; stop.title = '只停止查询，不会取消本机上传或识别';
          stop.onclick = () => { if (mediaSubmissions.get(item.index) !== pending || !sameBatch(pending.id, pending.root)) return; mediaSubmissions.delete(item.index); persistMedia(); applyBatch(batch); $('transcriptBatchSaveStatus').textContent = number(item.index) + ' 已停止查询，未取消本机上传或识别；再次补交前请先重新连接当前任务确认状态。'; };
          controls.append(stop);
        }
        li.append(controls);
      }
      if (['queued', 'running'].includes(item.status)) {
        const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'transcript-item-cancel'; cancel.textContent = '取消'; cancel.setAttribute('aria-label', '取消第 ' + number(item.index) + ' 条');
        cancel.onclick = async () => {
          const id = batch.id, root = batchService;
          cancel.disabled = true;
          try {
            const value = await request(root, '/' + encodeURIComponent(id) + '/items/' + item.index, {method: 'DELETE'}, '/api/transcript-batches');
            if (batch?.id !== id || batchService !== root) return;
            if (value?.id !== id) throw Error('服务返回了其他批次，原批次已保留');
            applyBatch(value);
          } catch (error) {
            if (batch?.id === id && batchService === root) $('transcriptBatchSaveStatus').textContent = '单条取消尚未确认：' + error.message;
          } finally {
            if (batch?.id === id && batchService === root) scheduleBatchPoll();
          }
        };
        li.append(cancel);
      }
      $('transcriptBatchItems').append(li);
    }
    $('transcriptBatchRetry').hidden = !items.some(item => item.status === 'failed' || item.status === 'cancelled' || item.status === 'canceled');
    refreshControls();
    if (typeof G.updateTask === 'function') {
      if (nativeTask.id !== batch.id) delete nativeTask.nativeStarted;
      Object.assign(nativeTask, {id: batch.id, title: '批量视频文案提取', status: batchTerminal.has(batch.status) ? (batch.status === 'partial' ? 'completed' : batch.status) : 'running', message: $('transcriptStatus').textContent, progress: batch.progress});
      Promise.resolve(G.updateTask(nativeTask)).catch(() => {});
    }
    lookupRecoveryState();
  }
  function scheduleBatchPoll(delay = 1200) {
    clearTimeout(batchTimer);
    if (batch && (!batchTerminal.has(batch.status) || recovering() || mediaActive())) batchTimer = setTimeout(pollBatch, delay);
  }
  async function pollBatch() {
    if (!batch || batchPolling) return;
    clearTimeout(batchTimer); batchPolling = true;
    const id = batch.id, root = batchService;
    try {
      const value = await request(root, '/' + encodeURIComponent(id), {}, '/api/transcript-batches');
      if (value?.id !== id) throw Error('服务返回了其他批次，原批次已保留');
      if (batch?.id === id && batchService === root) applyBatch(value);
    } catch (error) {
      if (batch?.id === id && batchService === root) {
        if (error.status === 404 || error.status === 410) {
          for (const [index, attempt] of mediaSubmissions) if (attempt.id === id && attempt.root === root) mediaSubmissions.delete(index);
          persistMedia(); recovery = null;
          applyBatch({...batch, status: 'failed', items: batch.items.map(item => terminal.has(item.status) ? item : {...item, status: 'failed', message: '本机批次已过期或被清理，没有重新提交。'})});
          $('transcriptStatus').textContent = '本机服务已找不到这个批次，可能已清理。没有重新提交，请重新选择来源后开始。';
          try { localStorage.removeItem(BATCH_STORAGE); } catch { /* Storage unavailable. */ }
          return;
        }
        $('transcriptTask').hidden = false;
        $('transcriptStatus').textContent = '批次连接中断，原编号和任务已保留。恢复连接只查询进度，不会重新提交。' + (error.name === 'AbortError' ? '连接超时。' : error.message);
        $('transcriptResume').hidden = false;
      }
    } finally {
      batchPolling = false;
      if (batch?.id === id && batchService !== root) pollBatch(); else scheduleBatchPoll($('transcriptResume').hidden ? 1200 : 5000);
    }
  }
  async function submitBatch(root) {
    const lines = linkLines(), files = Array.from($('transcriptFile').files || []), items = mode === 'link' ? lines : files;
    const hotwords = $('transcriptHotwords').value.trim();
    if (!items.length) { notice(mode === 'link' ? '请每行粘贴一条视频分享文案或链接' : '请先选择音频或视频文件'); return; }
    if (items.length > 20) { notice('一批最多 20 条，请分批提取；当前输入顺序已保留'); return; }
    if (mode === 'link' && lines.some(value => value.length > 8000)) { notice('每条分享文案最多 8000 字，请缩短超长的一行'); return; }
    if (hotwords.length > 400) { notice('重点词最多 400 字，请只保留需要核对的人名、品牌或专业词'); return; }
    if (mode === 'file' && files.some(file => file.size > (caps.maxInputBytes || 209715200))) { notice('单个文件不能超过 200 MB，请先裁剪或压缩该文件'); return; }
    if (mode === 'file' && files.reduce((size, file) => size + file.size, 0) > (caps.batchMaxTotalBytes || 1073741824)) { notice('一批文件总大小不能超过 1 GB，请分成两批'); return; }
    submitting = true; refreshControls();
    $('transcriptTask').hidden = false; $('transcriptStatus').textContent = '正在提交 ' + items.length + ' 条，本批编号按输入顺序固定…';
    $('transcriptResult').hidden = true; $('transcriptWarnings').hidden = true; $('transcriptBatchSaveStatus').textContent = ''; $('transcriptSaveStatus').textContent = '';
    try {
      const requestId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(24)), value => value.toString(16).padStart(2, '0')).join('');
      pendingSubmission = {requestId, serviceURL: root}; persistPending();
      let options;
      if (mode === 'file') {
        const form = new FormData(); files.forEach(file => form.append('files', file, file.name)); form.append('language', 'zh'); form.append('requestId', requestId); if (hotwords) form.append('hotwords', hotwords); options = {method: 'POST', body: form};
      } else options = {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({items: lines, language: 'zh', requestId, ...(hotwords ? {hotwords} : {})})};
      const value = await request(root, mode === 'file' ? '/upload' : '', options, '/api/transcript-batches');
      // A late response from the previous desktop port must not replace a
      // recovered batch on the restarted service or rebind its exports.
      if (pendingSubmission?.requestId !== requestId) return;
      if (pendingSubmission.serviceURL !== root) { findPendingBatch(); return; }
      batchService = root; selectedIndex = null;
      try { localStorage.removeItem(STORAGE); } catch { /* Storage unavailable. */ }
      applyBatch(value, true); clearPending(); scheduleBatchPoll();
    } catch (error) {
      $('transcriptStatus').textContent = '批次提交未完成：' + (error.name === 'AbortError' ? '连接超时。请先检查本机任务，确认后再提交，避免重复。' : error.message);
      $('transcriptProgress').hidden = true;
      if (error.status >= 400 && error.status < 500) clearPending();
      else if (pendingSubmission) findPendingBatch();
    } finally { submitting = false; refreshControls(); }
  }
  $('transcriptForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || active() || checking || !caps?.available || $('transcriptStart').disabled) return;
    const root = serviceRoot(G.serviceURL);
    if (!root) return;
    if (batchEnabled()) return submitBatch(root);
    const shareText = $('transcriptShareText').value.trim(), file = $('transcriptFile').files?.[0], hotwords = $('transcriptHotwords').value.trim();
    if (mode === 'link' && !shareText) { notice('请粘贴视频链接或完整分享文案'); $('transcriptShareText').focus(); return; }
    if (mode === 'link' && shareText.length > 8000) { notice('分享文案最多 8000 字，请只粘贴一条视频分享文案'); $('transcriptShareText').focus(); return; }
    if (mode === 'file' && !file) { notice('请先选择一个音频或视频文件'); return; }
    if (hotwords.length > 400) { notice('重点词最多 400 字，请缩短后重试'); return; }
    submitting = true;
    refreshControls();
    $('transcriptTask').hidden = false;
    $('transcriptStatus').textContent = mode === 'file' ? '正在把文件交给电脑本机引擎…' : '正在提交给电脑本机引擎…';
    $('transcriptSaveStatus').textContent = '';
    $('transcriptResult').hidden = true;
    $('transcriptWarnings').hidden = true;
    try {
      let options;
      if (mode === 'file') {
        const form = new FormData();
        form.append('file', file, file.name);
        form.append('language', 'zh');
        if (hotwords) form.append('hotwords', hotwords);
        options = {method: 'POST', body: form};
      } else options = {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({shareText, language: 'zh', ...(hotwords ? {hotwords} : {})})};
      const job = await request(root, mode === 'file' ? '/upload' : '', options);
      batch = null; clearTimeout(batchTimer); $('transcriptBatch').hidden = true; $('transcriptResultTitle').textContent = '语音原稿';
      try { localStorage.removeItem(BATCH_STORAGE); } catch { /* Storage unavailable. */ }
      jobService = root;
      applyJob(job, true);
      schedulePoll();
    } catch (error) {
      $('transcriptStatus').textContent = '提交未完成：' + (error.name === 'AbortError' ? '连接超时。请先检查本机服务的任务状态，再决定是否重新提交。' : error.message);
      $('transcriptProgress').hidden = true;
    } finally { submitting = false; refreshControls(); }
  });
  $('transcriptLinkMode').onclick = () => chooseMode('link');
  $('transcriptFileMode').onclick = () => chooseMode('file');
  $('transcriptTryFile').onclick = () => { chooseMode('file'); $('transcriptFile').focus(); };
  $('transcriptFile').onchange = () => { const files = Array.from($('transcriptFile').files || []); $('transcriptFileName').textContent = files.length > 1 ? '已选 ' + files.length + ' 个文件，编号按下方列表顺序固定。' : files[0]?.name || '文件交给已连接的电脑本机服务处理。'; previewInputs(); };
  $('transcriptShareText').oninput = previewInputs;
  $('transcriptRecheck').onclick = checkCapabilities;
  $('transcriptResume').onclick = poll;
  $('transcriptAbandon').onclick = () => {
    if (!pendingSubmission || submitting) return;
    clearPending(); refreshControls(); $('transcriptResume').hidden = true;
    $('transcriptStatus').textContent = '已停止找回，没有重新提交。本机可能仍在处理，请先确认任务状态，再开始新批次。';
  };
  $('transcriptCancel').onclick = async () => {
    if (!active() || cancelling) return;
    cancelling = true;
    refreshControls();
    try { if (batch) applyBatch(await batchRequest('/' + encodeURIComponent(batch.id), {method: 'DELETE'})); else applyJob(await request(jobService, '/' + encodeURIComponent(current.id), {method: 'DELETE'})); }
    catch { $('transcriptStatus').textContent = '取消请求尚未确认，将继续查询原任务。'; }
    finally { cancelling = false; refreshControls(); if (batch) scheduleBatchPoll(); else schedulePoll(); }
  };
  $('transcriptBatchRetry').onclick = async () => {
    if (!batch || active() || submitting || retrying || cancelling) return;
    const indices = batch.items.filter(item => ['failed', 'cancelled', 'canceled'].includes(item.status)).map(item => item.index);
    if (!indices.length) return;
    retrying = true; refreshControls();
    $('transcriptBatchSaveStatus').textContent = '正在重试 ' + indices.map(number).join('、') + '；完成项不会重新提取。';
    try { applyBatch(await batchRequest('/' + encodeURIComponent(batch.id) + '/retry', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({indices})})); }
    catch (error) { $('transcriptBatchSaveStatus').textContent = '重试请求尚未确认：' + error.message + '。将查询当前批次，请勿反复点击。'; pollBatch(); }
    finally { retrying = false; refreshControls(); scheduleBatchPoll(); }
  };
  $('transcriptBatchRecover').onclick = () => {
    if (!nativeRecoveryAvailable() || !batch || !recoverableIndices().length || recovering() || mediaActive()) return;
    recoveryConsent = {id: batch.id, root: batchService};
    $('transcriptRecoveryConsent').hidden = false;
    $('transcriptRecoveryConsent').scrollIntoView?.({block: 'nearest', behavior: 'auto'});
    $('transcriptRecoveryConfirm').focus();
  };
  $('transcriptRecoveryDecline').onclick = () => { recoveryConsent = null; $('transcriptRecoveryConsent').hidden = true; };
  $('transcriptRecoveryConfirm').onclick = async () => {
    if (!nativeRecoveryAvailable() || !batch || recoveryConsent?.id !== batch.id || recoveryConsent.root !== batchService || recovering() || mediaActive()) return;
    const indices = recoverableIndices();
    if (!indices.length) return;
    const id = batch.id, root = batchService, token = {id, root, active: true, status: 'starting', index: null};
    recovery = token; recoveryConsent = null; $('transcriptRecoveryConsent').hidden = true;
    $('transcriptRecoveryStatus').textContent = '正在后台读取本批公开链接，沿用原编号。不会弹登录窗口；受限时暂停，已有结果保留。';
    refreshControls(); scheduleBatchPoll();
    try {
      const result = await window.guanchao.request('native-recover-transcript-batch', {batchId: id, consent: true, indices});
      if (!sameBatch(id, root) || recovery !== token) return;
      if (result?.ok === false) throw Error(result.error || '未能开始后台重试');
    } catch (error) {
      if (!sameBatch(id, root) || recovery !== token) return;
      token.active = false;
      $('transcriptRecoveryStatus').textContent = '后台重试未开始：' + error.message + '。原编号和失败原因保留，可补交本地视频。';
    } finally { if (sameBatch(id, root) && recovery === token) { refreshControls(); scheduleBatchPoll(); } }
  };
  $('transcriptRecoveryContinue').onclick = async () => {
    if (!nativeRecoveryAvailable() || !recovering() || recovery.status !== 'awaiting-user' || !Number.isInteger(recovery.index)) return;
    const token = recovery, id = batch.id, root = batchService, index = recovery.index;
    $('transcriptRecoveryContinue').disabled = true;
    try {
      const result = await window.guanchao.request('native-continue-transcript-recovery', {batchId: id, index});
      if (!sameBatch(id, root) || recovery !== token) return;
      if (result?.ok === false) throw Error(result.error || '当前链接仍未取得可识别媒体');
    } catch (error) { if (sameBatch(id, root) && recovery === token) $('transcriptRecoveryStatus').textContent = number(index) + ' 继续检查未完成：' + error.message + '。原编号和已有结果保留，可补交本地视频。'; }
    finally { if (sameBatch(id, root) && recovery === token) { $('transcriptRecoveryContinue').disabled = false; refreshControls(); } }
  };
  $('transcriptRecoveryCancel').onclick = async () => {
    if (!nativeRecoveryAvailable() || !recovering()) return;
    const token = recovery, id = batch.id, root = batchService;
    $('transcriptRecoveryCancel').disabled = true;
    try {
      const result = await window.guanchao.request('native-cancel-transcript-recovery', {batchId: id});
      if (!sameBatch(id, root) || recovery !== token) return;
      if (result?.ok === false) throw Error(result.error || '停止请求尚未确认');
      token.active = false;
      $('transcriptRecoveryStatus').textContent = '已停止后台重试，已得到的媒体会继续识别；原编号和已有文案保留。';
      pollBatch();
    } catch (error) { if (sameBatch(id, root) && recovery === token) $('transcriptRecoveryStatus').textContent = '停止请求尚未确认：' + error.message + '。已得到的文案保留。'; }
    finally { if (sameBatch(id, root) && recovery === token) { $('transcriptRecoveryCancel').disabled = false; refreshControls(); scheduleBatchPoll(); } }
  };
  $('transcriptBatchExport').onclick = async () => {
    if (!batch || !batchTerminal.has(batch.status) || $('transcriptBatchExport').disabled) return;
    const id = batch.id, name = '观潮视频文案-' + id + '.zip';
    $('transcriptBatchExport').disabled = true; $('transcriptBatchSaveStatus').textContent = '正在准备按编号整理的 ZIP，包含每条结果和失败清单…';
    try {
      let result;
      if (typeof window.guanchao?.request === 'function') {
        result = await window.guanchao.request('native-export-batch', {batchId: id});
        if (result?.ok === false) throw Error(result.error || '保存失败');
      } else {
        const response = await fetch(batchService + '/api/transcript-batches/' + encodeURIComponent(id) + '/export', {signal: AbortSignal.timeout(120000)});
        if (!response.ok) throw Error(response.status === 409 ? '本批仍在处理，请等待完成后再保存' : '批次文件已过期或下载受限，请及时逐条保存');
        result = await G.saveBlob(await response.blob(), name, {chooseLocation: true});
      }
      $('transcriptBatchSaveStatus').textContent = saveMessage(result, name);
    } catch (error) { $('transcriptBatchSaveStatus').textContent = '保存全部未完成：' + error.message + '。原编号和结果仍在这里，可以重试。'; }
    finally { refreshControls(); }
  };
  $('transcriptCopy').onclick = async () => {
    if (current?.status !== 'completed') return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(current.text);
      else {
        $('transcriptOriginal').focus();
        $('transcriptOriginal').select();
        if (!document.execCommand?.('copy')) throw Error('copy');
      }
      $('transcriptSaveStatus').textContent = '已复制原始文案，未作润色。';
    } catch { $('transcriptSaveStatus').textContent = '未能自动复制，请在原稿框中全选并复制。'; $('transcriptOriginal').focus(); $('transcriptOriginal').select(); }
  };
  function exportValue(format) {
    if (format === 'txt') return {value: current.text, mime: 'text/plain;charset=utf-8'};
    if (format === 'srt') return {value: validSegments(current).map((s, i) => (i + 1) + '\n' + timestamp(s.start, true) + ' --> ' + timestamp(s.end, true) + '\n' + s.text).join('\n\n') + '\n', mime: 'application/x-subrip;charset=utf-8'};
    return {value: JSON.stringify({text: current.text, segments: current.segments || [], warnings: current.warnings || [], source: current.source || null, quality: current.quality || null}, null, 2), mime: 'application/json;charset=utf-8'};
  }
  function saveMessage(result, name) {
    if (result?.canceled || result?.saved === 'cancelled') return '已取消保存，原稿仍保留在这里。';
    if (result?.saved === 'file' || result?.saved === true) return '已保存 ' + (result.fileName || result.name || name) + '，请到刚才选择的文件夹查看。';
    if (result?.saved === 'downloads') return '已保存 ' + name + '，请到设备下载目录查看。';
    if (result?.saved === 'download-requested') return '已请求下载 ' + name + '。请查看浏览器下载列表；未出现文件时，请用 Chrome、Edge 或 Safari 打开本页重试。';
    if (result?.saved === 'shared') return '已打开分享，请在系统中选择“存储到文件”或保存位置。';
    return '保存结果尚未确认，请检查系统保存窗口或下载列表。原稿仍在这里。';
  }
  panel.querySelectorAll('[data-transcript-export]').forEach(button => {
    button.onclick = async () => {
      if (current?.status !== 'completed' || button.disabled) return;
      const format = button.dataset.transcriptExport, name = (batch ? number(selectedIndex) + '-观潮视频文案-' : '观潮视频文案-') + current.id + '.' + format;
      const batchItem = batch ? {batchId: batch.id, index: selectedIndex} : null;
      button.disabled = true;
      $('transcriptSaveStatus').textContent = '正在准备保存…';
      try {
        const outputIndex = Array.isArray(current.outputs) ? current.outputs.findIndex(output => typeof output?.name === 'string' && output.name.toLowerCase().endsWith('.' + format)) : -1;
        let result;
        if (window.guanchao?.request && outputIndex >= 0) {
          result = batchItem ? await window.guanchao.request('native-export-batch-item', {...batchItem, outputIndex}) : await window.guanchao.request('native-export', {jobId: current.id, outputIndex});
          if (result.ok === false) throw Error(result.error || '保存失败');
        } else if (format === 'docx') {
          if (outputIndex < 0) throw Error('本机引擎没有生成 Word 文件，请先保存 TXT 原稿');
          const output = current.outputs[outputIndex];
          const url = new URL(output.url, jobService);
          const expectedPath = batchItem ? '/api/transcript-batches/' + encodeURIComponent(batchItem.batchId) + '/items/' + batchItem.index + '/outputs/' + encodeURIComponent(output.name) : '/api/jobs/' + encodeURIComponent(current.id) + '/outputs/' + encodeURIComponent(output.name);
          if (url.origin !== jobService || url.pathname !== expectedPath || url.search || url.hash) throw Error('Word 文件地址无效，请重新连接本机服务');
          const response = await fetch(url.href, {signal: AbortSignal.timeout(30000)});
          if (!response.ok) throw Error('Word 文件已过期或下载受限，请保留 TXT 原稿，或上传本地音视频重新提取');
          result = await G.saveBlob(await response.blob(), output.name, {chooseLocation: true});
        } else {
          const output = exportValue(format);
          result = await G.saveBlob(new Blob([output.value], {type: output.mime}), name, {chooseLocation: true});
        }
        $('transcriptSaveStatus').textContent = saveMessage(result, name);
      } catch (error) { $('transcriptSaveStatus').textContent = '保存未完成：' + error.message + '。原稿仍在这里，可以重试。'; }
      finally { button.disabled = false; }
    };
  });
  function openTranscript() {
    $('transcriptDetails').open = true;
    $('transcriptShareText').focus({preventScroll: true});
    panel.scrollIntoView?.({block: 'start', behavior: 'auto'});
    if ($('pageLabel')) $('pageLabel').textContent = '提了么';
    document.querySelectorAll('#moduleNav [data-page="convert"]').forEach(button => {
      const selected = button.hasAttribute('data-open-transcript');
      button.classList.toggle('active', selected);
      button.setAttribute('aria-current', selected ? 'page' : 'false');
    });
    if (batch && !recovering()) { restoreRecoveryWanted = true; lookupRecoveryState(); }
  }
  function openFromURL() { if (new URLSearchParams(location.search).get('tool') === 'transcript') openTranscript(); }
  addEventListener('guanchao:open-transcript', openTranscript);
  addEventListener('guanchao:service', () => {
    if (migrateNativeService()) poll();
    if (batch && !recovering()) { restoreRecoveryWanted = true; lookupRecoveryState(); }
    checkCapabilities();
  });
  addEventListener('online', () => { if (active()) poll(); });
  addEventListener('popstate', openFromURL);
  if (nativeRecoveryAvailable()) window.guanchao.listen(data => {
    applyRecoveryProgress(data?.transcriptRecovery);
  });
  let restored, restoredBatch, restoredPending;
  try {
    const restoredMedia = JSON.parse(localStorage.getItem(MEDIA_STORAGE) || '[]');
    if (Array.isArray(restoredMedia)) for (const item of restoredMedia.slice(0, 20)) {
      if (item && typeof item.id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(item.id) && serviceRoot(item.root) && Number.isInteger(item.index) && item.index >= 1 && item.index <= 20 && typeof item.requestId === 'string' && /^[a-zA-Z0-9_-]{16,64}$/.test(item.requestId)) mediaSubmissions.set(item.index, {id: item.id, root: serviceRoot(item.root), index: item.index, requestId: item.requestId, name: text(item.name).slice(0, 255), uncertain: true});
    }
  } catch { /* Invalid saved uploads must never be reposted. */ }
  try { restoredPending = JSON.parse(localStorage.getItem(PENDING_STORAGE) || 'null'); } catch { /* Ignore invalid local state. */ }
  try { restoredBatch = JSON.parse(localStorage.getItem(BATCH_STORAGE) || 'null'); } catch { /* Ignore invalid local state. */ }
  try { restored = JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch { /* Ignore invalid local state. */ }
  if (restoredPending && typeof restoredPending.requestId === 'string' && /^[a-zA-Z0-9_-]{16,80}$/.test(restoredPending.requestId) && serviceRoot(restoredPending.serviceURL)) {
    pendingSubmission = {requestId: restoredPending.requestId, serviceURL: serviceRoot(restoredPending.serviceURL)};
    migrateNativeService(); findPendingBatch();
  } else if (restoredBatch && typeof restoredBatch.id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(restoredBatch.id) && serviceRoot(restoredBatch.serviceURL)) {
    restoreRecoveryWanted = true;
    batch = {id: restoredBatch.id, status: 'queued', items: [], message: '正在恢复上次批次，只查询进度，不会重新提交。'};
    batchService = serviceRoot(restoredBatch.serviceURL); jobService = batchService;
    migrateNativeService(); applyBatch(batch); pollBatch();
  } else if (restored && typeof restored.id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(restored.id) && serviceRoot(restored.serviceURL)) {
    current = {id: restored.id, status: 'waiting', message: '正在恢复上次任务，只查询进度，不会重新提交。'};
    jobService = serviceRoot(restored.serviceURL);
    migrateNativeService();
    applyJob(current);
    poll();
  }
  checkCapabilities();
  openFromURL();
})();
