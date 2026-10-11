'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');

function element() {
  return {textContent:'', className:'', children:[], listeners:{},
    addEventListener(name, callback) { this.listeners[name] = callback; },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; }};
}

async function open(url, status = 200, payload = null) {
  const nodes = new Map();
  const requests = [];
  const intervals = [];
  let now = Date.now();
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const body = {dataset:{room:'1', apiBase:'/meeting-room-display/api', layoutReport:'off'}};
  const get = id => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
  const context = vm.createContext({
    location:{href:url}, URL, Date:Clock, Intl, Number, Boolean, AbortController,
    document:{body, getElementById:get, documentElement:{style:{setProperty() {}}},
      createElement:element, createDocumentFragment:element},
    window:{innerHeight:962, innerWidth:602, addEventListener() {}},
    setTimeout() {}, setInterval(callback, delay) { intervals.push({callback, delay}); }, clearTimeout() {},
    fetch:async address => {
      requests.push(address);
      const number = address.match(/\/room\/([0-9]+)/)?.[1];
      return {ok:status === 200, status, json:async () => payload || ({
        source:'demo', fresh:true, max_age_seconds:630,
        room:{name:`示例会议室 ${number}`, capacity:6, enabled:true},
        fetched_at:new Clock().toISOString(), events:[]
      })};
    }
  });
  vm.runInContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return {get, requests, body, advance(ms) {
    now += ms;
    intervals.find(timer => timer.delay === 1000).callback();
  }};
}

test('the existing bare link still shows room 1', async () => {
  const page = await open('https://example.test/meeting-room-display/');
  assert.match(page.requests[0], /^\/meeting-room-display\/api\/room\/1\?v=/);
  assert.equal(page.get('room-name').textContent, '示例会议室 1');
});

test('independent tablet links select the requested rooms', async () => {
  for (const number of [1, 2, 7, 20]) {
    const page = await open(`https://example.test/meeting-room-display/?room=${number}`);
    assert.match(page.requests[0], new RegExp(`/room/${number}\\?v=`));
    assert.equal(page.get('room-name').textContent, `示例会议室 ${number}`);
    assert.equal(page.body.className, 'state-available');
  }
});

test('query selection takes precedence over a legacy path', async () => {
  const page = await open('https://example.test/room/1?room=2');
  assert.match(page.requests[0], /\/room\/2\?v=/);
});

test('legacy paths also accept a trailing slash', async () => {
  const page = await open('https://example.test/room/7/');
  assert.match(page.requests[0], /\/room\/7\?v=/);
});

test('invalid explicit selections cannot fall back to room 1', async () => {
  for (const query of ['room=', 'room=0', 'room=-1', 'room=01', 'room=2.5', 'room=abc',
      'room=1&room=2', 'room=9007199254740992', 'room=..%2F1']) {
    const page = await open('https://example.test/meeting-room-display/?' + query);
    assert.equal(page.requests.length, 0, query);
    assert.equal(page.body.className, 'state-unknown', query);
    assert.equal(page.get('status-support').textContent, '请检查会议室链接', query);
  }
});

test('an unconfigured room stays unknown without requesting another room', async () => {
  const page = await open('https://example.test/meeting-room-display/?room=99', 404);
  assert.equal(page.requests.length, 1);
  assert.match(page.requests[0], /\/room\/99\?v=/);
  assert.equal(page.body.className, 'state-unknown');
  assert.equal(page.get('status-support').textContent, '请检查会议室链接');
});

test('booking boundaries update while no new response has arrived', async () => {
  const now = Date.now();
  const iso = offset => new Date(now + offset).toISOString();
  const page = await open('https://example.test/rooms/?room=2', 200, {
    source:'demo', fresh:true, max_age_seconds:630,
    room:{name:'示例会议室 2', capacity:6, enabled:true},
    fetched_at:iso(-1000), events:[{start:iso(3000), end:iso(7000)}]
  });
  assert.equal(page.body.className, 'state-soon');
  page.advance(4000);
  assert.equal(page.body.className, 'state-busy');
  assert.equal(page.get('status-main').textContent, '已预约');
  page.advance(4000);
  assert.equal(page.body.className, 'state-available');
  assert.equal(page.requests.length, 1);
});

test('a snapshot becomes unknown even while the next fetch has not completed', async () => {
  const page = await open('https://example.test/rooms/');
  assert.equal(page.body.className, 'state-available');
  page.advance(631000);
  assert.equal(page.body.className, 'state-unknown');
  assert.equal(page.get('booking-list').children[0].children[0].textContent, '请以飞书预约信息为准');
});

test('expired authorization shows unknown with a sign-in prompt', async () => {
  for (const status of [401, 403]) {
    const page = await open('https://example.test/rooms/', status);
    assert.equal(page.body.className, 'state-unknown');
    assert.equal(page.get('status-support').textContent, '请重新登录飞书');
  }
});

test('question interaction survives clock and booking refreshes', async () => {
  const page = await open('https://example.test/rooms/');
  page.get('question-next').listeners.click();
  const question = page.get('question-text').textContent;
  assert.equal(page.get('question-index').textContent, '02 / 04');
  page.advance(1000);
  assert.equal(page.get('question-text').textContent, question);
  assert.equal(page.get('question-index').textContent, '02 / 04');
});
