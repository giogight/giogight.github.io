(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GuanchaoSocialCodec = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PRODUCTION = 'https://giogight.github.io';
  const LIMITS = Object.freeze({ token: 12000, options: 12, votes: 200, paste: 180000 });
  const fail = message => { throw new Error(message); };
  const own = (obj, keys) => obj && Object.getPrototypeOf(obj) === Object.prototype &&
    Object.keys(obj).length === keys.length && keys.every(key => Object.hasOwn(obj, key));
  const clean = (value, max, label) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(label + '格式不正确');
    return value.trim().normalize('NFC');
  };
  const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(value);
  const kind = value => value === 'games' || value === 'travel';
  const timestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
  function validateInvite(value) {
    if (!own(value, ['v', 'type', 'id', 'kind', 'title', 'options', 'created']) || value.v !== 1 || value.type !== 'invite' || !id(value.id) || !kind(value.kind) || !timestamp(value.created)) fail('邀请数据不完整或版本不支持');
    if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > LIMITS.options) fail('请提供 2—12 个候选项');
    const seen = new Set(), names = new Set();
    const options = value.options.map(option => {
      if (!own(option, ['id', 'name']) || typeof option.id !== 'string' || !/^o(?:[1-9]|1[0-2])$/.test(option.id) || seen.has(option.id)) fail('候选项编号重复或无效');
      const name = clean(option.name, 64, '候选名称');
      if (names.has(name)) fail('候选名称不能重复');
      seen.add(option.id); names.add(name); return { id: option.id, name };
    });
    return { v: 1, type: 'invite', id: value.id, kind: value.kind, title: clean(value.title, 80, '邀请标题'), options, created: value.created };
  }
  function validateVote(value, invite) {
    if (!own(value, ['v', 'type', 'invite', 'kind', 'reply', 'name', 'choice', 'revision', 'updated']) || value.v !== 1 || value.type !== 'vote' || !id(value.invite) || !kind(value.kind) || !id(value.reply) || typeof value.choice !== 'string' || !/^o(?:[1-9]|1[0-2])$/.test(value.choice) || !Number.isSafeInteger(value.revision) || value.revision < 1 || value.revision > 1000000 || !timestamp(value.updated)) fail('回票数据不完整或版本不支持');
    if (invite && (value.invite !== invite.id || value.kind !== invite.kind || !invite.options.some(option => option.id === value.choice))) fail('这张回票不属于当前邀请');
    return { v: 1, type: 'vote', invite: value.invite, kind: value.kind, reply: value.reply, name: clean(value.name, 32, '昵称'), choice: value.choice, revision: value.revision, updated: value.updated };
  }
  function encode(value) {
    const checked = value?.type === 'invite' ? validateInvite(value) : validateVote(value);
    const bytes = new TextEncoder().encode(JSON.stringify(checked));
    let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
    const token = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (token.length > LIMITS.token) fail('链接过长，请减少候选文字');
    return token;
  }
  function decode(token, type, invite) {
    if (typeof token !== 'string' || !token.length || token.length > LIMITS.token || !/^[a-zA-Z0-9_-]+$/.test(token) || token.length % 4 === 1) fail('链接数据无效或过长');
    let data;
    try {
      const raw = atob(token.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - token.length % 4) % 4));
      const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
      data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch (_) { fail('链接内容损坏，无法读取'); }
    if (type === 'invite') return validateInvite(data);
    if (type === 'vote') return validateVote(data, invite);
    fail('未知链接类型');
  }
  function localOrigin(value) {
    try { const url = new URL(value); return /^https?:$/.test(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !url.username && !url.password ? url.origin : null; }
    catch (_) { return null; }
  }
  function decodeParams(params, expectedKind) {
    if (!params || typeof params !== 'object' || typeof params.gc_invite !== 'string') fail('请使用包含完整邀请的观潮链接');
    const invite = decode(params.gc_invite, 'invite');
    if (expectedKind && invite.kind !== expectedKind) fail('请在' + (invite.kind === 'games' ? '游戏' : '旅行') + '模块打开这份邀请');
    const vote = params.gc_vote ? decode(params.gc_vote, 'vote', invite) : null;
    return { invite, vote };
  }
  function parseLink(value, devOrigin) {
    if (typeof value !== 'string' || value.trim().length > LIMITS.token * 2 + 300) fail('链接过长');
    let url;
    try { url = new URL(value.trim()); } catch (_) { fail('请粘贴完整的观潮邀请或回票网址'); }
    if (url.username || url.password || ![PRODUCTION, localOrigin(devOrigin)].filter(Boolean).includes(url.origin) || !['/', '/index.html'].includes(url.pathname)) fail('只接受观潮官网的邀请或回票链接');
    if (!['#games', '#travel'].includes(url.hash) || url.searchParams.getAll('gc_invite').length !== 1 || url.searchParams.getAll('gc_vote').length > 1) fail('链接参数不完整或重复');
    const parsed = decodeParams({ gc_invite: url.searchParams.get('gc_invite'), gc_vote: url.searchParams.get('gc_vote') });
    if (url.hash !== '#' + parsed.invite.kind) fail('链接的模块与邀请不一致');
    return parsed;
  }
  function makeLink(invite, vote, devOrigin) {
    const checked = validateInvite(invite), url = new URL((localOrigin(devOrigin) || PRODUCTION) + '/');
    url.searchParams.set('gc_invite', encode(checked));
    if (vote) url.searchParams.set('gc_vote', encode(validateVote(vote, checked)));
    url.hash = checked.kind;
    return url.href;
  }
  const sameInvite = (a, b) => JSON.stringify(validateInvite(a)) === JSON.stringify(validateInvite(b));
  const sameVote = (a, b) => JSON.stringify(validateVote(a)) === JSON.stringify(validateVote(b));
  function mergeVotes(invite, previous, incoming) {
    const checked = validateInvite(invite);
    if (!Array.isArray(previous) || !Array.isArray(incoming) || previous.length > LIMITS.votes || incoming.length > LIMITS.votes) fail('每份邀请最多汇总 200 张回票');
    const map = new Map();
    for (const raw of previous) { const vote = validateVote(raw, checked); if (map.has(vote.reply)) fail('本地回票记录重复'); map.set(vote.reply, vote); }
    const stats = { added: 0, replaced: 0, unchanged: 0, conflicts: 0 };
    const groups = new Map();
    for (const raw of incoming) { const vote = validateVote(raw, checked); const group = groups.get(vote.reply) || []; group.push(vote); groups.set(vote.reply, group); }
    for (const [reply, group] of groups) {
      const old = map.get(reply), highest = Math.max(old?.revision || 0, ...group.map(v => v.revision));
      const candidates = group.filter(v => v.revision === highest);
      if (old?.revision === highest) candidates.push(old);
      if (!candidates.length) { stats.unchanged++; continue; }
      const selected = candidates[0];
      if (candidates.some(v => !sameVote(v, selected))) { stats.conflicts++; continue; }
      if (!old) { if (map.size >= LIMITS.votes) fail('已达到 200 张回票上限'); map.set(reply, selected); stats.added++; }
      else if (selected.revision > old.revision) { map.set(reply, selected); stats.replaced++; }
      else stats.unchanged++;
    }
    return { votes: [...map.values()], stats };
  }
  return Object.freeze({ PRODUCTION, LIMITS, validateInvite, validateVote, encode, decode, parseLink, decodeParams, makeLink, sameInvite, mergeVotes, localOrigin });
});
