(() => {
  'use strict';
  const C = window.GuanchaoSocialCodec;
  if (!C) return;
  const KEY = 'gc-social-polls-v1', MAX_POLLS = 10;
  const views = new Map();
  const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined && text !== null) node.textContent = text; if (className) node.className = className; return node; };
  const button = (text, className = 'text-button') => { const node = el('button', text, className); node.type = 'button'; return node; };
  const label = (text, input) => { const node = el('label', text); node.append(input); return node; };
  const input = (tag, max, placeholder) => { const node = el(tag); node.maxLength = max; if (placeholder) node.placeholder = placeholder; return node; };
  const randomId = () => { const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''); };
  let nativeHost = false;
  try { nativeHost = !!(window.Capacitor?.isNativePlatform?.() || parent.Capacitor?.isNativePlatform?.() || parent.GuanchaoNativeAPI?.available); } catch (_) {}
  const devOrigin = nativeHost ? null : C.localOrigin(location.origin);
  let storageAvailable = true, records = [], replyIds = {}, consumed = '';
  function readSaved(raw, kind) {
    if (raw && raw.length > 1000000) throw Error('保存数据过大');
    const saved = raw ? JSON.parse(raw) : {};
    const result = { records: [], replyIds: {} };
    if (Array.isArray(saved.records) && saved.records.length <= MAX_POLLS) {
      result.records = saved.records.map(row => {
        const invite = C.validateInvite(row.invite), votes = C.mergeVotes(invite, [], row.votes || []).votes;
        if (invite.kind !== kind) throw Error('保存模块不匹配');
        return { invite, votes };
      });
      if (new Set(result.records.map(row => row.invite.id)).size !== result.records.length) throw Error('保存编号重复');
    }
    if (saved.replyIds && typeof saved.replyIds === 'object' && !Array.isArray(saved.replyIds)) {
      for (const [key, value] of Object.entries(saved.replyIds).slice(0, MAX_POLLS)) {
        const row = result.records.find(row => row.invite.id === key);
        if (row && value?.vote) result.replyIds[key] = { vote: C.validateVote(value.vote, row.invite) };
      }
    }
    return result;
  }
  for (const kind of ['games', 'travel']) {
    try { const saved = readSaved(localStorage.getItem(KEY + '-' + kind), kind); records.push(...saved.records); Object.assign(replyIds, saved.replyIds); }
    catch (_) { storageAvailable = false; }
  }
  function persist(view) {
    const moduleRecords = records.filter(row => row.invite.kind === view.kind), moduleReplies = {};
    for (const row of moduleRecords) if (replyIds[row.invite.id]) moduleReplies[row.invite.id] = replyIds[row.invite.id];
    try { localStorage.setItem(KEY + '-' + view.kind, JSON.stringify({ records: moduleRecords, replyIds: moduleReplies })); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    view.storageNote.textContent = storageAvailable ? '邀请和回票保存在当前浏览器。清理浏览数据会丢失；要换设备，请保留邀请与回票链接。' : '当前浏览器未能保存记录。请复制并保留邀请与回票链接，刷新后可能无法恢复。';
  }
  function notice(view, message, error = false) { view.status.textContent = message; view.status.dataset.error = error ? 'true' : 'false'; }
  function ensureRecord(invite) {
    const checked = C.validateInvite(invite), existing = records.find(row => row.invite.id === checked.id);
    if (existing) { if (!C.sameInvite(existing.invite, checked)) throw Error('该编号的邀请内容与本机原记录不同，已保留原记录'); return existing; }
    if (records.filter(row => row.invite.kind === checked.kind).length >= MAX_POLLS) throw Error('本机此模块已保存 10 份投票，请先移除一份不再需要的本地投票');
    const record = { invite: checked, votes: [] }; records.push(record); return record;
  }
  function renderSelectors() {
    for (const view of views.values()) {
      view.saved.replaceChildren(el('option', '选择本机保存的投票'));
      view.saved.firstElementChild.value = '';
      for (const row of records.filter(row => row.invite.kind === view.kind)) {
        const option = el('option', row.invite.title); option.value = row.invite.id; view.saved.append(option);
      }
      view.saved.value = view.active?.invite.id || '';
    }
  }
  function showLink(view, type, value) {
    const out = type === 'invite' ? view.inviteLink : view.replyLink;
    out.value = value; out.closest('.social-link-output').hidden = false;
  }
  async function copy(view, out) {
    try { if (!navigator.clipboard?.writeText) throw Error(); await navigator.clipboard.writeText(out.value); notice(view, '已复制链接，可以发给熟悉的朋友。'); }
    catch (_) { out.focus(); out.select(); notice(view, '请复制已选中的链接，再发给朋友。'); }
  }
  function renderPoll(view) {
    const record = view.active;
    view.poll.hidden = !record;
    if (!record) { view.inviteLink.closest('.social-link-output').hidden = true; view.replyLink.closest('.social-link-output').hidden = true; return; }
    const { invite } = record, last = replyIds[invite.id]?.vote;
    view.pollTitle.textContent = invite.title;
    view.options.replaceChildren(el('legend', '选一个你更想要的'));
    for (const option of invite.options) {
      const radio = el('input'); radio.type = 'radio'; radio.name = 'gc-choice-' + view.kind; radio.value = option.id; radio.required = true; radio.checked = last?.choice === option.id;
      const item = el('label', null, 'social-choice'); item.append(radio, el('span', option.name)); view.options.append(item);
    }
    view.nickname.value = last?.name || '';
    showLink(view, 'invite', C.makeLink(invite, null, devOrigin));
    view.replyLink.closest('.social-link-output').hidden = true;
    view.aggregateInput.value = '';
    renderTally(view); renderSelectors();
    view.storageNote.textContent = storageAvailable ? '邀请和回票保存在当前浏览器。清理浏览数据会丢失；要换设备，请保留邀请与回票链接。' : '当前浏览器未能保存记录，请复制并保留邀请与回票链接。';
  }
  function renderTally(view) {
    const record = view.active;
    if (!record) return;
    const total = record.votes.length;
    view.tallyTitle.textContent = total ? '已汇总 ' + total + ' 张回票' : '还没有汇总回票';
    view.tally.replaceChildren(); view.voters.replaceChildren();
    const counts = new Map(record.invite.options.map(option => [option.id, 0]));
    for (const vote of record.votes) counts.set(vote.choice, counts.get(vote.choice) + 1);
    const ordered = record.invite.options.map((option, index) => ({ ...option, index, count: counts.get(option.id) })).sort((a, b) => b.count - a.count || a.index - b.index);
    for (const option of ordered) {
      const row = el('div', null, 'social-tally-row'), head = el('div');
      head.append(el('span', option.name), el('strong', option.count + ' 票'));
      const bar = el('div', null, 'social-bar'), fill = el('i'); fill.style.width = (total ? option.count / total * 100 : 0) + '%'; bar.append(fill); row.append(head, bar); view.tally.append(row);
    }
    const best = ordered.filter(option => option.count && option.count === ordered[0].count);
    view.outcome.textContent = !total ? '朋友发来回票链接后，粘贴到这里一键汇总。' : best.length > 1 ? '暂时并列：' + best.map(option => option.name).join('、') : '当前票数最多：' + best[0].name;
    for (const vote of record.votes) {
      const option = record.invite.options.find(option => option.id === vote.choice);
      view.voters.append(el('li', vote.name + ' → ' + option.name + ' · 回票编号 ' + vote.reply.slice(0, 8) + ' · 第 ' + vote.revision + ' 版'));
    }
  }
  function activate(view, invite) { view.active = ensureRecord(invite); view.details.open = true; renderPoll(view); persist(view); }
  function receive(parsed, view) {
    activate(view, parsed.invite);
    if (parsed.vote) {
      view.aggregateInput.value = C.makeLink(parsed.invite, parsed.vote, devOrigin);
      notice(view, '已读取回票链接。点击“一键汇总回票”加入统计；统计不会自动同步。');
    } else notice(view, '邀请已打开，选好后生成回票链接发给发起人。');
  }
  function currentCandidates(kind) {
    if (kind === 'games') return [...document.querySelectorAll('#gameResults .game-card h3')].map(node => node.textContent.trim());
    const names = [...document.querySelectorAll('#mapCityChoices input:checked')].map(node => node.parentElement.textContent.trim());
    const nearby = window.GuanchaoNearby?.getSnapshot?.();
    if (nearby?.center?.city) names.unshift(nearby.center.city);
    if (nearby?.center?.name && nearby.center.name !== '当前位置') names.unshift(nearby.center.name);
    if (nearby?.selected?.name) names.unshift(nearby.selected.name);
    names.push(...[...document.querySelectorAll('#liveFavorites .live-favorite >button:first-child')].map(node => node.textContent.trim()));
    const active = document.querySelector('#livePlacesPanel:not([hidden]) .live-results-head h3');
    if (active) names.unshift(active.textContent.split(' · ')[0].trim());
    return [...new Set(names)].filter(Boolean);
  }
  function build(kind) {
    const host = document.getElementById(kind === 'games' ? 'gameSocial' : 'travelSocial');
    if (!host) return;
    const view = { kind, active: null };
    const heading = el('div', null, 'social-head');
    heading.append(el('p', kind === 'games' ? 'MAKE A PLAN / PLAY TOGETHER' : 'MAKE A PLAN / GO TOGETHER', 'lab-kicker'), el('h3', kind === 'games' ? '今晚玩什么，让朋友一起选。' : '下一站去哪，让朋友一起选。'), el('p', '发邀请 → 朋友选一个 → 回复回票链接 → 发起人粘贴汇总。', 'social-intro'));
    view.details = el('details', null, 'social-details');
    view.details.append(el('summary', '发起投票、打开邀请与汇总回票'));
    const body = el('div', null, 'social-body');
    const savedRow = el('div', null, 'social-saved-row');
    view.saved = el('select'); view.saved.setAttribute('aria-label', '本机保存的投票');
    const startNew = button('新建投票'), remove = button('移除本地投票');
    savedRow.append(view.saved, startNew, remove);
    view.saved.onchange = () => { const row = records.find(row => row.invite.id === view.saved.value); view.active = row || null; renderPoll(view); notice(view, row ? '已打开本机保存的投票。' : ''); };
    startNew.onclick = () => { view.active = null; renderPoll(view); renderSelectors(); notice(view, '填写标题和候选项，创建一份新邀请。'); view.title.focus(); };
    remove.onclick = () => {
      if (!view.active) return notice(view, '请先选择一份本地投票。');
      if (!confirm('移除本机的这份邀请和已汇总回票？已分享的链接仍然有效。')) return;
      const id = view.active.invite.id; records = records.filter(row => row.invite.id !== id); delete replyIds[id]; view.active = null;
      persist(view); renderPoll(view); renderSelectors(); notice(view, '已移除本机记录。');
    };
    const create = el('details', null, 'social-create'); create.open = true; create.append(el('summary', '创建一份邀请'));
    const createForm = el('form', null, 'social-create-form');
    view.title = input('input', 80); view.title.required = true; view.title.value = kind === 'games' ? '今晚一起玩哪款？' : '下次一起去哪里？';
    view.candidates = input('textarea', 1200, kind === 'games' ? '每行一个游戏\n例如：守望先锋\n双人成行' : '每行一个目的地\n例如：天津\n成都'); view.candidates.rows = 4; view.candidates.required = true;
    const candidatesLabel = label('候选项 · 2—12 个，每行一个', view.candidates), add = button(kind === 'games' ? '加入当前推荐' : '加入当前目的地');
    add.onclick = () => {
      const old = view.candidates.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean), next = [...new Set([...old, ...currentCandidates(kind)])];
      if (!next.length) return notice(view, kind === 'games' ? '先匹配游戏，也可以直接输入候选名称。' : '先添加或搜索城市，也可以直接输入候选名称。');
      if (next.length > C.LIMITS.options) return notice(view, '当前列表超过 12 项，请手动选出要投票的候选项。');
      view.candidates.value = next.join('\n'); notice(view, '已加入候选，可以继续编辑。');
    };
    const createSubmit = el('button', '创建邀请链接 ↗', 'lab-button primary'); createSubmit.type = 'submit';
    createForm.append(label('邀请标题', view.title), candidatesLabel, add, createSubmit); create.append(createForm);
    createForm.onsubmit = event => {
      event.preventDefault();
      try {
        const names = view.candidates.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        const invite = C.validateInvite({ v: 1, type: 'invite', id: randomId(), kind, title: view.title.value.trim(), options: names.map((name, index) => ({ id: 'o' + (index + 1), name })), created: Date.now() });
        activate(view, invite); create.open = false; notice(view, '邀请已生成，复制链接发给朋友。创建后候选项固定；修改候选请新建一份邀请。');
      } catch (error) { notice(view, error.message, true); }
    };
    const open = el('details', null, 'social-open'); open.append(el('summary', '粘贴另一份邀请或回票链接'));
    const openForm = el('form', null, 'social-open-form'), linkInput = input('textarea', C.LIMITS.token * 2 + 300, 'https://giogight.github.io/?gc_invite=…#' + kind); linkInput.rows = 2; linkInput.required = true;
    const openSubmit = el('button', '打开链接', 'lab-button'); openSubmit.type = 'submit'; openForm.append(label('完整观潮链接', linkInput), openSubmit); open.append(openForm);
    openForm.onsubmit = event => { event.preventDefault(); try { const parsed = C.parseLink(linkInput.value, devOrigin); if (parsed.invite.kind !== kind) throw Error('这份链接属于' + (parsed.invite.kind === 'games' ? '游戏' : '旅行') + '模块，请在对应模块打开'); receive(parsed, view); open.open = false; } catch (error) { notice(view, error.message, true); } };
    view.poll = el('section', null, 'social-poll'); view.poll.hidden = true; view.pollTitle = el('h4');
    const inviteOut = el('div', null, 'social-link-output'); inviteOut.hidden = true;
    view.inviteLink = input('textarea', C.LIMITS.token * 2 + 300); view.inviteLink.rows = 2; view.inviteLink.readOnly = true; view.inviteLink.setAttribute('aria-label', '邀请链接');
    const copyInvite = button('复制邀请链接 ↗'); copyInvite.onclick = () => copy(view, view.inviteLink); inviteOut.append(label('发给朋友的邀请链接', view.inviteLink), copyInvite);
    const voteForm = el('form', null, 'social-vote-form'); view.options = el('fieldset', null, 'social-options');
    const legend = el('legend', '选一个你更想要的'); view.options.append(legend);
    view.nickname = input('input', 32, '让朋友认得出你'); view.nickname.required = true; view.nickname.autocomplete = 'nickname';
    const voteSubmit = el('button', '生成我的回票链接 ↗', 'lab-button primary'); voteSubmit.type = 'submit'; voteForm.append(label('你的昵称', view.nickname), view.options, voteSubmit);
    const replyOut = el('div', null, 'social-link-output'); replyOut.hidden = true;
    view.replyLink = input('textarea', C.LIMITS.token * 2 + 300); view.replyLink.rows = 2; view.replyLink.readOnly = true; view.replyLink.setAttribute('aria-label', '回票链接');
    const copyReply = button('复制回票链接 ↗'); copyReply.onclick = () => copy(view, view.replyLink); replyOut.append(label('把这条回票链接发给发起人', view.replyLink), copyReply, el('p', '生成后还要把链接回复给发起人，发起人汇总后才会计票。', 'social-hint'));
    voteForm.onsubmit = event => {
      event.preventDefault();
      try {
        const invite = view.active.invite, previous = replyIds[invite.id]?.vote, choice = view.options.querySelector('input:checked')?.value;
        const candidate = C.validateVote({ v: 1, type: 'vote', invite: invite.id, kind, reply: previous?.reply || randomId(), name: view.nickname.value.trim(), choice, revision: previous ? previous.revision + 1 : 1, updated: Date.now() }, invite);
        const vote = previous && previous.name === candidate.name && previous.choice === candidate.choice ? previous : candidate;
        replyIds[invite.id] = { vote }; persist(view); showLink(view, 'reply', C.makeLink(invite, vote, devOrigin));
        notice(view, previous && previous !== vote ? '已生成新版回票，请重新发给发起人。汇总时同一回票编号只保留较新版本。' : '回票链接已生成，复制后回复给发起人。');
      } catch (error) { notice(view, error.message, true); }
    };
    const aggregate = el('details', null, 'social-aggregate'); aggregate.open = true; aggregate.append(el('summary', '发起人：粘贴收到的回票，一键汇总'));
    const aggregateForm = el('form'); view.aggregateInput = input('textarea', C.LIMITS.paste, '每行一条朋友发来的完整回票链接'); view.aggregateInput.rows = 4; view.aggregateInput.required = true;
    const aggregateSubmit = el('button', '一键汇总回票', 'lab-button primary'); aggregateSubmit.type = 'submit'; aggregateForm.append(label('回票链接 · 每行一条，最多 200 条', view.aggregateInput), aggregateSubmit); aggregate.append(aggregateForm);
    aggregateForm.onsubmit = event => {
      event.preventDefault();
      try {
        const record = view.active, lines = view.aggregateInput.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        if (!lines.length || lines.length > C.LIMITS.votes) throw Error('每次请粘贴 1—200 条回票链接');
        const incoming = [];
        for (const [index, line] of lines.entries()) {
          try { const parsed = C.parseLink(line, devOrigin); if (!C.sameInvite(parsed.invite, record.invite)) throw Error('邀请内容与当前投票不一致'); if (!parsed.vote) throw Error('这条是邀请链接，请使用朋友生成的回票链接'); incoming.push(parsed.vote); }
          catch (error) { throw Error('第 ' + (index + 1) + ' 行：' + error.message + '。本次尚未加入统计'); }
        }
        const merged = C.mergeVotes(record.invite, record.votes, incoming); record.votes = merged.votes; persist(view); renderTally(view);
        const s = merged.stats;
        notice(view, '汇总完成：新增 ' + s.added + '，更新 ' + s.replaced + '，重复或旧版 ' + s.unchanged + (s.conflicts ? '；有 ' + s.conflicts + ' 个相同编号与版本的冲突，请让对应朋友生成新版回票。冲突记录未更新' : '') + '。', !!s.conflicts);
        if (!s.conflicts) view.aggregateInput.value = '';
      } catch (error) { notice(view, error.message, true); }
    };
    const result = el('section', null, 'social-results'); view.tallyTitle = el('h4'); view.outcome = el('p', null, 'social-outcome'); view.tally = el('div', null, 'social-tally');
    const votersDetails = el('details', null, 'social-voters'); votersDetails.append(el('summary', '查看已汇总的昵称与选择')); view.voters = el('ul'); votersDetails.append(view.voters);
    result.append(view.tallyTitle, view.outcome, view.tally, votersDetails);
    view.poll.append(view.pollTitle, inviteOut, voteForm, replyOut, aggregate, result);
    view.status = el('p', '', 'social-status'); view.status.setAttribute('role', 'status'); view.status.setAttribute('aria-live', 'polite');
    view.storageNote = el('p', storageAvailable ? '邀请和回票保存在当前浏览器。清理浏览数据会丢失；请保留链接。' : '当前浏览器未能读取保存记录，请保留邀请与回票链接。', 'social-hint');
    body.append(el('p', '只向熟悉的朋友分享。链接包含标题、候选项；回票还包含昵称与选择，持有链接的人可以读取。昵称由自己填写，回票编号只用于本机去重，不验证身份。相同昵称、不同设备会算作不同回票；统计由发起人手动汇总，不会实时同步。', 'social-hint'), savedRow, create, open, view.poll, view.status, view.storageNote);
    view.details.append(body); host.append(heading, view.details); views.set(kind, view);
  }
  function consume(params) {
    const signature = String(params?.gc_invite || '') + '|' + String(params?.gc_vote || '');
    if (!params?.gc_invite || signature === consumed) return;
    consumed = signature;
    let parsed;
    try { parsed = C.decodeParams(params); const view = views.get(parsed.invite.kind); if (view) receive(parsed, view); }
    catch (error) { const view = views.get(location.hash === '#travel' ? 'travel' : 'games'); if (view) { view.details.open = true; notice(view, '邀请未能打开：' + error.message, true); } }
  }
  build('games'); build('travel'); renderSelectors();
  const params = new URLSearchParams(location.search); consume({ gc_invite: params.get('gc_invite'), gc_vote: params.get('gc_vote') });
  addEventListener('message', event => {
    if (event.source !== parent || (event.origin !== location.origin && !(location.protocol === 'file:' && event.origin === 'null'))) return;
    if (event.data?.type === 'guanchao:social-link') consume(event.data.params);
  });
  addEventListener('storage', event => {
    const kind = ['games', 'travel'].find(kind => event.key === KEY + '-' + kind), view = views.get(kind);
    if (!view) return;
    try {
      const saved = readSaved(event.newValue, kind), priorIds = records.filter(row => row.invite.kind === kind).map(row => row.invite.id);
      records = records.filter(row => row.invite.kind !== kind).concat(saved.records);
      for (const id of priorIds) delete replyIds[id]; Object.assign(replyIds, saved.replyIds);
      if (view.active) { view.active = records.find(row => row.invite.id === view.active.invite.id) || null; if (view.active) renderTally(view); else renderPoll(view); }
      renderSelectors();
    } catch (_) { notice(view, '另一页面的本地记录未能读取，当前显示的记录仍保留。', true); }
  });
})();
