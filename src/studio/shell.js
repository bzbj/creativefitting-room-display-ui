'use strict';
// This is an isolated preview shell: no real schedule fetch and no live publication.
const $ = id => document.getElementById(id);
const stage = $('content-stage');
let currentKey = null, state = 'available';
const clock = new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false});
const states = {available:['空闲','可使用至 15:30'],busy:['占用中','本场预计至 15:00'],soon:['即将开始','距下一场 5 分钟'],unknown:['状态未知','请查看飞书']};
function drawState() {
 document.body.className = 'state-'+state;
 $('status-main').textContent=states[state][0];$('status-support').textContent=states[state][1];
 $('room-name').textContent='示例会议室';$('capacity').textContent='6 人';$('room-number').textContent='ROOM 01';
 $('clock').textContent=clock.format(new Date());$('sync-text').textContent='模拟预约 · 仅用于预览';$('today').textContent='会议屏预览';
 $('booking-horizon').textContent='· 今天 · 已预约';
 $('booking-list').innerHTML=state==='unknown'?'<div class="booking-empty"><strong>请以飞书预约信息为准</strong></div>':'<div class="booking-time"><span>15:30</span><span class="dash">—</span><span>16:30</span></div>';
}
const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
function renderContent(content) {
 // Stop decoding the preceding video before disposing its DOM.
 const previous=stage.querySelector('video');if(previous){previous.pause();previous.removeAttribute('src');previous.load();}
 stage.replaceChildren();
 if (!content) {const empty=document.createElement('div');empty.className='studio-placeholder';empty.innerHTML='<small>YOUR CREATIVE SPACE</small><strong>这里，留给你的灵感。</strong><span>602 × 382 CSS px<br>选择文件，开始试播。</span>';stage.append(empty);return;}
 if (content.kind==='html') {
  const frame=document.createElement('iframe');frame.title='投稿 HTML 触摸预览';frame.id='submitted-content';
  frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('allow',"camera 'none'; microphone 'none'; geolocation 'none'; fullscreen 'none'");
  frame.setAttribute('referrerpolicy','no-referrer');
  // No same-origin permission, storage, popups, top navigation or network access.
  frame.srcdoc='<meta http-equiv="Content-Security-Policy" content="'+policy+'"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}*{box-sizing:border-box}</style>'+content.html;
  stage.append(frame);
 } else if(content.kind==='image'||content.kind==='video') {
  const url=new URL(content.url,location.href);
  if(url.origin!==location.origin && !content.url.startsWith('blob:'))return;
  const media=document.createElement(content.kind==='image'?'img':'video');media.id='submitted-content';
  media.style.objectFit=content.fit==='cover'?'cover':'contain';media.onerror=()=>parent.postMessage({type:'room-studio-error'},location.origin);
  if(content.kind==='image')media.alt='投稿图片';
  else {media.muted=true;media.autoplay=true;media.loop=true;media.playsInline=true;media.preload='auto';media.setAttribute('aria-label','投稿视频，轻触暂停或继续');media.addEventListener('click',()=>media.paused?media.play().catch(()=>{}):media.pause());}
  media.src=content.url;stage.append(media);if(content.kind==='video')media.play().catch(()=>{});
 }
}
addEventListener('message',event=>{
 if(event.source!==parent || event.origin!==location.origin || event.data?.type!=='room-studio-preview')return;
 state=Object.hasOwn(states,event.data.state)?event.data.state:'available';drawState();
 const content=event.data.content;
 if(event.data.reset||currentKey!==(content?.key || null)){currentKey=content?.key || null;renderContent(content);}
});
drawState();renderContent(null);setInterval(()=>{$('clock').textContent=clock.format(new Date());},1000);
parent.postMessage({type:'room-studio-ready'},location.origin);
