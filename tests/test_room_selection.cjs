'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');

function element() {
  return {textContent:'', className:'', children:[],
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; }};
}

async function open(url, status = 200) {
  const nodes = new Map();
  const requests = [];
  const body = {dataset:{room:'1', apiBase:'/meeting-room-display/api', layoutReport:'off'}};
  const get = id => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
  const context = vm.createContext({
    location:{href:url}, URL, Date, Intl, Number, Boolean,
    document:{body, getElementById:get, documentElement:{style:{setProperty() {}}},
      createElement:element, createDocumentFragment:element},
    window:{innerHeight:962, addEventListener() {}},
    setTimeout() {}, setInterval() {},
    fetch:async address => {
      requests.push(address);
      const number = address.match(/\/room\/([0-9]+)/)?.[1];
      return {ok:status === 200, status, json:async () => ({
        source:'demo', fresh:true, max_age_seconds:630,
        room:{name:`示例会议室 ${number}`, capacity:6, enabled:true},
        fetched_at:new Date().toISOString(), events:[]
      })};
    }
  });
  vm.runInContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return {get, requests, body};
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
