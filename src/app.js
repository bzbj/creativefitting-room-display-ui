'use strict';

// Room metadata and occupied intervals come from the same-origin read-only server.
const $ = id => document.getElementById(id);
function resolveRoomNumber(url, fallback = '1') {
  const address = new URL(url);
  const requested = address.searchParams.getAll('room');
  if (requested.length > 1) return null;
  // An explicit query takes precedence; an invalid value never uses the default.
  const value = requested.length ? requested[0] :
    address.pathname.match(/\/room\/([^/]+)\/?$/)?.[1] ?? fallback;
  return typeof value === 'string' && /^[1-9][0-9]*$/.test(value) &&
    Number.isSafeInteger(Number(value)) ? value : null;
}
const roomNumber = resolveRoomNumber(location.href, document.body.dataset.room);
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
let fetchErrorReason = roomNumber ? '' : '请检查会议室链接';
let lastLayoutSignature = '';
// Original answer-book copy. No network/AI call and no visible index or total.
const questions = [
  "如果这次讨论\n只能做一个决定，\n会是什么？",
  "如果只用一半时间，\n我们会先做哪件事？",
  "什么证据，\n会让我们改变主意？",
  "这个想法，\n最小可以小到什么程度？",
  "先问一个\n更小的问题。",
  "答案可能藏在\n你还没问的地方。",
  "把第一步\n缩小到今天能做。",
  "先做一个版本，\n再让现实回答。",
  "你不需要知道全部，\n才开始第一步。",
  "让一个真实用户\n坐进这场讨论。",
  "如果从零开始，\n还会这样设计吗？",
  "我们在解决问题，\n还是维护一个习惯？",
  "什么可以\n先不做？",
  "把假设写下来，\n再把它交给实验。",
  "先把问题说清楚，\n再把答案说漂亮。",
  "换个角度，\n也许就有入口。",
  "暂停一下，\n听听最安静的声音。",
  "让对方把话\n说完。",
  "我们说的“好”，\n是同一种好吗？",
  "此刻最缺的，\n是答案还是共识？",
  "把分歧变成\n一个可验证的问题。",
  "先找共同的起点，\n再讨论不同的路径。",
  "如果没人需要证明\n自己是对的呢？",
  "我们是否错过了\n一个简单的解释？",
  "先说观察，\n再说判断。",
  "把“不可能”\n拆成几个小问题。",
  "如果这个前提错了，\n会发生什么？",
  "把最担心的事\n说具体。",
  "哪个风险，\n值得先试一次？",
  "留一点空间，\n给意料之外的答案。",
  "真正的瓶颈，\n可能不在眼前。",
  "我们要优化的，\n究竟是什么？",
  "更快之前，\n先确认方向。",
  "如果少一个功能，\n体验会更好吗？",
  "谁会因为这个改变，\n少一次麻烦？",
  "用户会用\n什么词描述它？",
  "不看演示，\n它还成立吗？",
  "把“感觉不错”\n换成一个观察。",
  "什么反馈，\n值得我们认真停下？",
  "先去现场，\n再回会议室。",
  "下一步的线索，\n可能在一次失败里。",
  "今天学到什么，\n比今天做了多少重要。",
  "让实验足够小，\n让反馈足够真。",
  "先试最不确定的\n那一部分。",
  "成功的信号，\n要提前约定。",
  "一次没成功，\n还不足以下结论。",
  "不是每个波动，\n都需要一个解释。",
  "问问那个\n没有被选中的方案。",
  "如果结果相反，\n我们会怎么解释？",
  "留下记录，\n给未来的自己。",
  "让工具做重复的事，\n让人做值得想的事。",
  "AI 的回答，\n也需要一个好问题。",
  "先定义任务，\n再选择模型。",
  "模型知道的，\n不等于用户需要的。",
  "这次自动化，\n为谁省下了时间？",
  "如果不用 AI，\n问题依然存在吗？",
  "给智能一点边界，\n给人一点主动权。",
  "把复杂藏起来，\n把清楚交给用户。",
  "哪个环节，\n最需要人的判断？",
  "我们在创造价值，\n还是展示能力？",
  "灵感来了，\n先留一行字。",
  "还没成熟的想法，\n也值得被听见。",
  "把一个大胆的想法\n做成小小的样品。",
  "认真对待\n那句“万一呢”。",
  "如果换个人来做，\n会有什么不同？",
  "先借一个视角，\n再找自己的答案。",
  "别急着命名，\n先看看它是什么。",
  "多看一次，\n可能就是新发现。",
  "今天有没有\n值得保留的意外？",
  "给好奇心\n留一个位置。",
  "重要的事，\n也可以慢慢想。",
  "需要的是坚持，\n还是换一种方法？",
  "别让紧迫，\n替你决定重要。",
  "这件事值得\n再睡一觉吗？",
  "可以先停下来，\n再重新出发。",
  "留一点余地，\n给下一次理解。",
  "把注意力\n还给眼前的人。",
  "先照顾好精力，\n再做重要的判断。",
  "此刻能放下的，\n就先放下。",
  "一个清楚的下一步，\n胜过一页愿望。",
  "我们需要更多选项，\n还是一次选择？",
  "什么决定，\n可以放心晚一点做？",
  "如果只带走一句话，\n会是哪一句？",
  "谁来做，什么时候做，\n做完是什么样？",
  "把结束变成\n下一步的开始。",
  "先确认理解，\n再确认同意。",
  "这场会结束后，\n什么会真正改变？",
  "有没有一件事，\n值得现在就敲定？",
  "能在纸上画出来，\n就先别绕着说。",
  "给结论一个理由，\n给理由一份证据。",
  "好的答案，\n也可以是“还不知道”。",
  "允许自己\n更新昨天的判断。",
  "把确定的说清楚，\n把未知的留在桌上。",
  "谁的经验，\n能让我们少绕一圈？",
  "什么值得保留，\n即使一切重新开始？",
  "如果没有惯例，\n我们会怎么选择？",
  "从一个真实的需求\n重新开始。",
  "这个答案，\n有没有让事情更清楚？",
  "下一次提问，\n试着少用一个形容词。",
  "也许下一句，\n就是新的起点。"
];
const questionDwellMs = 30000;
let questionBag = [];
let lastQuestion = null;
let questionChangedAt = 0;

function nextQuestion() {
  if (!questionBag.length) {
    questionBag = questions.map((_, index) => index);
    for (let i = questionBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionBag[i], questionBag[j]] = [questionBag[j], questionBag[i]];
    }
    // Avoid an immediate repeat when starting another shuffled cycle.
    if (questionBag[0] === lastQuestion) {
      [questionBag[0], questionBag[1]] = [questionBag[1], questionBag[0]];
    }
  }
  lastQuestion = questionBag.shift();
  $('question-text').textContent = questions[lastQuestion];
  questionChangedAt = Date.now();
}

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
  document.documentElement.style.setProperty('--screen-scale', Math.min(window.innerWidth / 602, visible / 962));
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
  organizer.textContent = '已预约';
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
    $('booking-horizon').textContent = '';
    showMessage('请以飞书预约信息为准', '请查看飞书');
    return;
  }
  const upcoming = events.filter(event => event.start > now.getTime()).slice(0, 1);
  if (!upcoming.length) {
    $('booking-horizon').textContent = '';
    showMessage('暂无预约', '未来两天');
    return;
  }
  $('booking-horizon').textContent = `· ${dayLabel(upcoming[0].startIso, now)} · 已预约`;
  const fragment = document.createDocumentFragment();
  upcoming.forEach((event, index) => addBooking(fragment, event, index, now));
  $('booking-list').replaceChildren(fragment);
}
function render() {
  const now = new Date();
  updateClock();
  const room = snapshot?.room;
  $('room-name').textContent = room?.name || '会议室';
  const weight = [...$('room-name').textContent].reduce((sum, char) => sum + (/[^\x00-\x7F]/.test(char) ? 1 : .6), 0);
  document.documentElement.style.setProperty('--room-size', Math.max(26, Math.min(66, 380 / weight)) + 'px');
  $('room-number').textContent = roomNumber ? `ROOM ${roomNumber.padStart(2, '0')}` : 'ROOM —';
  $('capacity').textContent = room?.capacity ? `${room.capacity} 人` : '';

  const fetched = snapshot?.fetched_at ? Date.parse(snapshot.fetched_at) : 0;
  const configuredAge = Number(snapshot?.max_age_seconds);
  const maxAgeMs = (Number.isFinite(configuredAge) && configuredAge > 0 ? configuredAge : 180) * 1000;
  const fresh = Boolean(snapshot?.fresh && !fetchError && fetched &&
    now.getTime() - fetched >= 0 && now.getTime() - fetched < maxAgeMs && room?.enabled);
  const events = (snapshot?.events || []).map(event => ({
    startIso:event.start, endIso:event.end,
    start:Date.parse(event.start), end:Date.parse(event.end),
    organizerName:typeof event.organizer_name === 'string' ? event.organizer_name.trim() : ''
  })).filter(event => Number.isFinite(event.start) && Number.isFinite(event.end) &&
    event.start < event.end).sort((a,b) => a.start-b.start || a.end-b.end);
  const current = fresh && events.find(event => event.start <= now.getTime() && now.getTime() < event.end);
  const next = fresh && events.find(event => event.start > now.getTime());

  if (!fresh) {
    setState('unknown', '预约状态', '状态未知', fetchErrorReason || (room?.enabled === false ? '暂停使用' : '请查看飞书'));
  } else if (current) {
    setState('busy', '当前状态', '占用中', `本场预计至 ${time(current.endIso)}`);
  } else if (next && next.start - now.getTime() <= 10 * 60000) {
    setState('soon', '当前状态', '即将开始', `距下一场 ${Math.ceil((next.start - now.getTime()) / 60000)} 分钟`);
  } else {
    setState('available', '当前状态', '空闲', next ? `可使用至 ${time(next.startIso)}` : '未来两天暂无预约');
  }
  drawBookings(events, now, fresh);
  $('sync-text').textContent = snapshot?.source === 'demo' ? '示例数据 · 请勿用于实际使用' :
    fresh ? `同步 ${time(snapshot.fetched_at)}` : fetched ? `数据未更新 · ${time(snapshot.fetched_at)}` : '尚未同步';
  setTimeout(reportLayout, 100);
}
async function refresh() {
  if (!roomNumber) { fetchError = true; render(); return; }
  fetchErrorReason = '';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${apiBase}/room/${roomNumber}?v=${Date.now()}`, {cache:'no-store', signal:controller.signal});
    if (response.status === 404) {
      snapshot = null;
      fetchErrorReason = '请检查会议室链接';
    }
    if (response.status === 401 || response.status === 403) fetchErrorReason = '请重新登录飞书';
    if (!response.ok) throw new Error('HTTP ' + response.status);
    snapshot = await response.json();
    fetchError = false;
  } catch (_) { fetchError = true; }
  finally { clearTimeout(timeout); }
  render();
}
function reportLayout() {
  if (document.body.dataset.layoutReport === 'off') return;
  const elements = {};
  const selectors = {
    header:'.topbar', brand:'.brand-wordmark', main:'.signage', room:'.booking-core',
    roomMeta:'.room-meta', roomName:'#room-name', status:'.status-block',
    statusMain:'.status-main', statusSupport:'.status-support',
    schedule:'.booking-side', bookingHead:'.booking-head',
    bookingList:'.booking-list', primary:'.booking-card.primary',
    primaryEnd:'.booking-card.primary .booking-time span:last-child',
    primaryOrganizer:'.booking-card.primary .booking-organizer',
    lastItem:'.booking-list > :last-child',
    lastEnd:'.booking-card.secondary:last-child .booking-time span:last-child',
    lastOrganizer:'.booking-card.secondary:last-child .booking-organizer',
    footer:'footer', question:'.question-card', questionText:'#question-text', questionButton:'#question-next'
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
    layoutVersion:6,
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
nextQuestion();
$('question-next').addEventListener('click', nextQuestion);
updateClock();
render();
refresh();
window.addEventListener('resize', () => { setAppHeight(); setTimeout(reportLayout, 150); });
window.visualViewport?.addEventListener('resize', () => { setAppHeight(); setTimeout(reportLayout, 150); });
setInterval(() => {
  render();
  if (Date.now() - questionChangedAt >= questionDwellMs) nextQuestion();
}, 1000);
setInterval(refresh, 15000);
