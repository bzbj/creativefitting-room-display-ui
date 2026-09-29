'use strict';

// Room metadata and occupied intervals come from the same-origin read-only server.
const $ = id => document.getElementById(id);
const roomNumber = location.pathname.match(/\/room\/([1-9][0-9]*)$/)?.[1] || document.body.dataset.room;
const apiBase = document.body.dataset.apiBase || '/api';
const zone = 'Asia/Shanghai';
const clockFormat = new Intl.DateTimeFormat('zh-CN', {
  timeZone:zone, hour:'2-digit', minute:'2-digit', hour12:false
});
const dateFormat = new Intl.DateTimeFormat('zh-CN', {
  timeZone:zone, month:'numeric', day:'numeric', weekday:'short'
});
const dayFormat = new Intl.DateTimeFormat('zh-CN', {
  timeZone:zone, month:'numeric', day:'numeric'
});
const keyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit'
});
let snapshot = null;
let fetchError = false;
let lastLayoutSignature = '';

function time(iso) { return clockFormat.format(new Date(iso)); }
function dayLabel(iso, now) {
  const date = new Date(iso);
  if (keyFormat.format(date) === keyFormat.format(now)) return '今天';
  if (keyFormat.format(date) === keyFormat.format(new Date(now.getTime() + 86400000))) {
    return '明天 ' + dayFormat.format(date);
  }
  return dayFormat.format(date);
}
function updateClock() {
  const now = new Date();
  $('clock').textContent = clockFormat.format(now);
  $('clock').dateTime = now.toISOString();
  $('today').textContent = dateFormat.format(now);
}
function setAppHeight() {
  const visible = Math.min(window.innerHeight, window.visualViewport?.height || window.innerHeight);
  document.documentElement.style.setProperty('--app-height', Math.round(visible) + 'px');
}
function setState(kind, kicker, headline, support) {
  document.body.className = 'state-' + kind;
  $('status-kicker').textContent = kicker;
  $('status-main').textContent = headline;
  $('status-support').textContent = support;
}
function addBooking(parent, event, index, now) {
  const active = event.start <= now.getTime();
  const card = document.createElement('article');
  card.className = 'booking-card ' + (index === 0 ? 'primary' : 'secondary');
  const label = document.createElement('div');
  label.className = 'booking-label';
  label.textContent = (active ? '当前预约' : index === 0 ? '下一场' : '后续') + ' · ' + dayLabel(event.startIso, now);
  const range = document.createElement('div');
  range.className = 'booking-time';
  const start = document.createElement('span'); start.textContent = time(event.startIso);
  const dash = document.createElement('span'); dash.className = 'dash'; dash.textContent = '—';
  const end = document.createElement('span'); end.textContent = time(event.endIso);
  range.append(start, dash, end);
  const organizer = document.createElement('div');
  organizer.className = 'booking-organizer';
  organizer.textContent = event.organizerName ? `组织者 ${event.organizerName}` : '已预约';
  card.append(label, range, organizer);
  parent.append(card);
}
function showMessage(title, detail) {
  const message = document.createElement('div');
  message.className = 'booking-empty';
  const heading = document.createElement('strong'); heading.textContent = title;
  message.append(heading);
  if (detail) {
    const sub = document.createElement('span'); sub.textContent = detail;
    message.append(sub);
  }
  $('booking-list').replaceChildren(message);
}
function drawBookings(events, now, fresh) {
  if (!fresh) {
    $('booking-horizon').textContent = '实时状态';
    showMessage('预约暂不可用', '请查看飞书');
    return;
  }
  $('booking-horizon').textContent = snapshot?.source === 'demo' ? '示例数据' : '未来两天';
  const upcoming = events.filter(event => event.end > now.getTime()).slice(0, 3);
  if (!upcoming.length) {
    showMessage('暂无预约', '未来两天');
    return;
  }
  const fragment = document.createDocumentFragment();
  upcoming.forEach((event, index) => addBooking(fragment, event, index, now));
  $('booking-list').replaceChildren(fragment);
}
function render() {
  const now = new Date();
  updateClock();
  const room = snapshot?.room;
  $('room-name').textContent = room?.name || '会议室';
  $('capacity').textContent = room?.capacity ? `${room.capacity} 人` : '';

  const fetched = snapshot?.fetched_at ? Date.parse(snapshot.fetched_at) : 0;
  const maxAgeMs = (snapshot?.max_age_seconds || 180) * 1000;
  const fresh = Boolean(snapshot?.fresh && !fetchError && fetched &&
    now.getTime() - fetched < maxAgeMs && room?.enabled);
  const events = (snapshot?.events || []).map(event => ({
    startIso:event.start, endIso:event.end,
    start:Date.parse(event.start), end:Date.parse(event.end),
    organizerName:typeof event.organizer_name === 'string' ? event.organizer_name.trim() : ''
  })).filter(event => Number.isFinite(event.start) && Number.isFinite(event.end) &&
    event.start < event.end).sort((a,b) => a.start-b.start || a.end-b.end);
  const current = fresh && events.find(event => event.start <= now.getTime() && now.getTime() < event.end);
  const next = fresh && events.find(event => event.start > now.getTime());

  if (!fresh) {
    setState('unknown', '预约状态', '状态未知', room?.enabled === false ? '暂停使用' : '请查看飞书');
  } else if (current) {
    setState('busy', '当前状态', '使用中', `至 ${time(current.endIso)}`);
  } else if (next && next.start - now.getTime() <= 10 * 60000) {
    setState('soon', '当前状态', '即将开始', `${time(next.startIso)} 开始`);
  } else {
    setState('available', '当前状态', '空闲', '当前无预约');
  }
  drawBookings(events, now, fresh);
  $('sync-text').textContent = snapshot?.source === 'demo' ? '示例数据 · 请勿用于实际使用' :
    fresh ? `同步 ${time(snapshot.fetched_at)}` : fetched ? `数据未更新 · ${time(snapshot.fetched_at)}` : '尚未同步';
  setTimeout(reportLayout, 100);
}
async function refresh() {
  if (!roomNumber) { fetchError = true; render(); return; }
  try {
    const response = await fetch(`${apiBase}/room/${roomNumber}?v=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    snapshot = await response.json();
    fetchError = false;
  } catch (_) { fetchError = true; }
  render();
}
function reportLayout() {
  if (document.body.dataset.layoutReport === 'off') return;
  const elements = {};
  const selectors = {
    header:'.topbar', brand:'.brand-wordmark', main:'.content', room:'.room-side',
    roomMeta:'.room-meta', roomName:'#room-name', status:'.status-block',
    statusMain:'.status-main', statusSupport:'.status-support',
    schedule:'.booking-side', bookingHead:'.booking-head',
    bookingList:'.booking-list', primary:'.booking-card.primary',
    primaryEnd:'.booking-card.primary .booking-time span:last-child',
    primaryOrganizer:'.booking-card.primary .booking-organizer',
    lastItem:'.booking-list > :last-child',
    lastEnd:'.booking-card.secondary:last-child .booking-time span:last-child',
    lastOrganizer:'.booking-card.secondary:last-child .booking-organizer',
    footer:'footer'
  };
  for (const [name, selector] of Object.entries(selectors)) {
    const node = document.querySelector(selector);
    if (!node) continue;
    const box = node.getBoundingClientRect();
    elements[name] = {
      top:Math.round(box.top), bottom:Math.round(box.bottom),
      left:Math.round(box.left), right:Math.round(box.right),
      height:Math.round(box.height)
    };
  }
  const report = {
    layoutVersion:4,
    viewport:{width:window.innerWidth, height:window.innerHeight,
      visualHeight:Math.round(window.visualViewport?.height || window.innerHeight),
      devicePixelRatio:window.devicePixelRatio},
    documentHeight:document.documentElement.scrollHeight,
    pageState:document.body.className,
    fontPx:{
      room:Math.round(parseFloat(getComputedStyle($('room-name')).fontSize)),
      status:Math.round(parseFloat(getComputedStyle($('status-main')).fontSize)),
      primary:Math.round(parseFloat(getComputedStyle(document.querySelector('.booking-card.primary .booking-time') || $('booking-list')).fontSize)),
      organizer:Math.round(parseFloat(getComputedStyle(document.querySelector('.booking-card.primary .booking-organizer') || $('booking-list')).fontSize)),
      empty:Math.round(parseFloat(getComputedStyle(document.querySelector('.booking-empty strong') || $('booking-list')).fontSize))
    },
    elements,
    browser:navigator.userAgent.slice(0,180)
  };
  const signature = JSON.stringify(report);
  if (signature === lastLayoutSignature) return;
  lastLayoutSignature = signature;
  fetch(`${apiBase}/layout`, {method:'POST',headers:{'Content-Type':'application/json'},body:signature,keepalive:true}).catch(() => {});
}

setAppHeight();
updateClock();
render();
refresh();
window.addEventListener('resize', () => { setAppHeight(); setTimeout(reportLayout, 150); });
window.visualViewport?.addEventListener('resize', () => { setAppHeight(); setTimeout(reportLayout, 150); });
setInterval(updateClock, 1000);
setInterval(refresh, 15000);
