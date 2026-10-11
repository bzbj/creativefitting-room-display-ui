'use strict';
const $ = id => document.getElementById(id);
const base = '/rooms/studio';
const frame = $('shell');
let me = null, selectedFile = null, content = null, blobUrl = null, version = 0, busy = false;
const previewId = new URL(location.href).searchParams.get('preview');
if (new URL(location.href).searchParams.get('standalone') === '1') document.body.classList.add('standalone');
const kinds = {html:'html',htm:'html',png:'image',jpg:'image',jpeg:'image',webp:'image',mp4:'video',webm:'video'};
const limits = {html:1048576,image:10485760,video:52428800};
function send(reset = false) {
  frame.contentWindow?.postMessage({type:'room-studio-preview',state:$('state').value,content,reset},location.origin);
}
function resizePad() {
  const panel = $('preview-panel'), expanded = panel.classList.contains('expanded');
  const standalone = document.body.classList.contains('standalone');
  const scale = Math.min((panel.clientWidth - 54) / 602, expanded ? (innerHeight - 190) / 962 : Math.min(standalone ? .68 : .48,(innerHeight - (standalone ? 280 : 320)) / 962), 1);
  $('pad').style.setProperty('--pad-scale', Math.max(.2,scale));
}
function message(text, error = false) {
  $('progress').textContent = text; $('progress').className = error ? 'error' : '';
}
function updateSubmit() {
  $('submit').disabled = !selectedFile || !me || me.source === 'demo' || busy;
}
async function api(path, options = {}) {
  const response = await fetch(path,{cache:'no-store',...options});
  let data; try { data = await response.json(); } catch (_) { throw new Error('服务器返回异常，请稍后重试'); }
  if (!response.ok) throw new Error(response.status === 401 ? '登录已失效，请刷新页面重新登录飞书' : typeof data.detail === 'string' ? data.detail : '请求未成功，请稍后重试');
  return data;
}
function mediaMetadata(url, kind) {
  return new Promise((resolve,reject) => {
    const element = kind === 'image' ? new Image() : document.createElement('video');
    const timer = setTimeout(() => finish(new Error('文件读取超时，请换一个文件')),10000);
    const finish = (error,info) => { clearTimeout(timer); element.onload = element.onloadedmetadata = element.onerror = null;
      if (kind === 'video') {element.removeAttribute('src');element.load();}
      error ? reject(error) : resolve(info); };
    element.onerror = () => finish(new Error('浏览器无法播放这个文件，请检查格式或编码'));
    if (kind === 'image') element.onload = () => finish(null,{width:element.naturalWidth,height:element.naturalHeight});
    else { element.preload = 'metadata'; element.muted = true; element.onloadedmetadata = () => finish(null,{width:element.videoWidth,height:element.videoHeight,duration:element.duration}); }
    element.src = url;
  });
}
async function chooseFile() {
  const selection = ++version; selectedFile = null; content = null; send(); updateSubmit();
  $('share-box').hidden = true;
  if (blobUrl) {URL.revokeObjectURL(blobUrl);blobUrl = null;}
  const file = $('file').files[0];
  $('file-name').textContent = file?.name || '选择你的作品文件';
  if (!file) return;
  const extension = file.name.split('.').pop().toLowerCase(), kind = kinds[extension];
  $('file-check').className = 'file-check'; $('file-check').textContent = '正在读取文件…';
  try {
    if (!kind) throw new Error('请选择 HTML、PNG / JPG / WebP 或 MP4 / WebM');
    if (!file.size || file.size > limits[kind]) throw new Error('文件为空或超过大小限制');
    const next = {kind,fit:$('fit').value,key:'local-'+selection};
    let info = {width:602,height:382};
    if (kind === 'html') next.html = new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
    else {
      const url = URL.createObjectURL(file);
      try { info = await mediaMetadata(url,kind); } catch (error) {URL.revokeObjectURL(url);throw error;}
      if (selection !== version) {URL.revokeObjectURL(url);return;}
      blobUrl = url; next.url = url;
      if (kind === 'video' && (!Number.isFinite(info.duration) || info.duration <= 0 || info.duration > 60 || info.width > 1920 || info.height > 1080)) throw new Error('视频最长 60 秒、最大 1920×1080；请压缩后再提交');
      if (kind === 'image' && (Math.max(info.width,info.height) > 4096 || info.width * info.height > 10000000)) throw new Error('图片请控制在 4096px 和 1000 万像素以内');
    }
    if (selection !== version) return;
    selectedFile = file; content = next;
    if (!$('title').value.trim()) $('title').value = file.name.replace(/\.[^.]+$/,'').slice(0,80);
    $('preview-title').textContent = $('title').value.trim() || '本地试播';
    const ratioWarning = kind !== 'html' && Math.abs(info.width / info.height - 602 / 382) > .05 ? ' · 比例不同，可选择留白或裁切' : '';
    $('file-check').textContent = `${kind === 'html' ? 'HTML' : info.width+' × '+info.height+'px'} · ${(file.size / 1024).toFixed(0)}KB${kind === 'video' ? ' · '+info.duration.toFixed(1)+'秒 · 静音循环' : ''}${ratioWarning}`;
    message(me?.source === 'demo' ? '本地仅试播；在线上创作室登录后可保存投稿。' : '可以直接点按右侧预览，再提交保存。');
    send(true);
  } catch (error) {
    if (selection !== version) return;
    selectedFile = null; content = null; send();
    if (blobUrl) {URL.revokeObjectURL(blobUrl);blobUrl=null;}
    $('file-check').textContent = error.message; $('file-check').className = 'file-check error';
  }
  updateSubmit();
}
async function showSubmission(item) {
  const selection = ++version;
  let html;
  if (item.kind === 'html') {
    const response = await fetch(`${base}/api/submissions/${item.id}/asset`,{cache:'no-store'});
    if (!response.ok) throw new Error('作品暂时无法读取，请重新登录或刷新');
    html = await response.text();
  }
  if (selection !== version) return;
  content = {key:item.id,kind:item.kind,fit:item.fit,html,url:`${base}/api/submissions/${item.id}/asset`};
  $('preview-title').textContent = item.title;
  $('share-link').value = location.origin + item.preview_url;
  $('standalone-link').href = location.origin + item.preview_url + '&standalone=1';
  $('share-box').hidden = false;
  message('已保存，只用于预览；公司会议屏继续播放现有内容。');
  send(true);
}
async function refreshList() {
  try {
    const {items,admin} = await api(base+'/api/submissions');
    $('list-title').textContent = admin ? '公司投稿' : '我的投稿';
    const list = $('submissions-list'); list.replaceChildren();
    if (!items.length) { const empty = document.createElement('p'); empty.className='muted'; empty.textContent='还没有投稿。先用模板试试，或者上传你自己的作品。'; list.append(empty); }
    for (const item of items) {
      const row=document.createElement('article');row.className='submission-row';
      const detail=document.createElement('div'), title=document.createElement('strong'), description=document.createElement('p');
      title.textContent=item.title;description.textContent=(item.author || '未署名')+' · '+item.kind.toUpperCase()+' · 已提交，仅预览';
      detail.append(title,description);const actions=document.createElement('div');actions.className='row-actions';
      const preview=document.createElement('button');preview.type='button';preview.className='text-button';preview.textContent='预览 ↗';preview.addEventListener('click',()=>showSubmission(item).catch(error=>message(error.message,true)));actions.append(preview);
      if (item.mine || admin) {const withdraw=document.createElement('button');withdraw.type='button';withdraw.className='text-button';withdraw.textContent='撤回';withdraw.addEventListener('click',async()=>{if (!confirm('撤回后预览链接会失效，确定撤回？')) return;
        try {await api(base+'/api/submissions/'+item.id,{method:'DELETE',headers:{'X-CSRF-Token':me.csrf_token}}); if(content?.key===item.id){content=null;send();$('share-box').hidden=true;}await refreshList();message('投稿已撤回。');}catch(error){message(error.message,true);}});actions.append(withdraw);}
      row.append(detail,actions);list.append(row);
    }
  } catch (error) {$('submissions-list').textContent = error.message;}
}
$('submission-form').addEventListener('submit',async event=>{
  event.preventDefault(); if(!selectedFile || !me || busy || me.source==='demo')return;
  busy=true;updateSubmit();message('正在上传，请保持页面打开…');
  try {
    const meta={title:$('title').value.trim(),author:$('author').value.trim(),description:$('description').value.trim(),filename:selectedFile.name,fit:$('fit').value};
    const item=await api(base+'/api/submissions',{method:'POST',body:selectedFile,headers:{'Content-Type':'application/octet-stream','X-CSRF-Token':me.csrf_token,'X-Submission-Meta':encodeURIComponent(JSON.stringify(meta))}});
    await showSubmission(item);await refreshList();
  } catch(error){message(error.message,true);}finally{busy=false;updateSubmit();}
});
frame.addEventListener('load',()=>send(true));
addEventListener('message',event=>{if(event.source!==frame.contentWindow || event.origin!==location.origin)return;if(event.data?.type==='room-studio-ready')send(true);if(event.data?.type==='room-studio-error')message('预览播放失败，请检查文件编码或刷新重试。',true);});
$('file').addEventListener('change',chooseFile);
$('fit').addEventListener('change',()=>{if(content){content.fit=$('fit').value;send(true);}});
$('state').addEventListener('change',()=>send());
$('replay').addEventListener('click',()=>send(true));
$('expand').addEventListener('click',()=>{const expanded=$('preview-panel').classList.toggle('expanded');$('expand').textContent=expanded?'收起预览 ×':'展开预览 ⤢';resizePad();});
addEventListener('keydown',event=>{if(event.key==='Escape' && $('preview-panel').classList.contains('expanded'))$('expand').click();});
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('share-link').value);$('copy-link').textContent='已复制';}catch(_){$('share-link').select();message('请复制选中的预览链接。');}});
$('refresh-list').addEventListener('click',refreshList);
new ResizeObserver(resizePad).observe($('preview-panel'));addEventListener('resize',resizePad);resizePad();
(async()=>{
 try {
  me=await api('/auth/studio/me');$('account').textContent=me.source==='demo'?'本地演示':me.name || '公司同事';updateSubmit();
  if(me.source==='demo'){$('submissions-list').textContent='本地演示只试播，不保存投稿。';message('先下载模板或选择文件，即可在 Pad 外壳中预览。');}
  else await refreshList();
  if(previewId){if(!/^[0-9a-f]{32}$/.test(previewId))throw new Error('预览链接不正确');await showSubmission(await api(base+'/api/submissions/'+previewId));}
 }catch(error){message(error.message,true);$('account').textContent='请重新登录';$('submissions-list').textContent='登录后可查看投稿。';}
})();

$('copy-email-subject').addEventListener('click',async()=>{
  try {await navigator.clipboard.writeText($('email-subject').value);$('email-feedback').textContent='邮件主题已复制，请将占位文字换成作品名称和署名。';}
  catch(_) {$('email-subject').select();$('email-feedback').textContent='请复制已选中的邮件主题。';}
});
$('copy-agent-prompt').addEventListener('click',async()=>{
  try {await navigator.clipboard.writeText($('agent-prompt').textContent);$('agent-feedback').textContent='已复制，粘贴给 Agent 后填入你的创意和署名。';}
  catch(_) {$('agent-prompt').closest('details').open=true;const range=document.createRange();range.selectNodeContents($('agent-prompt'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);$('agent-feedback').textContent='请复制已选中的提示词，交给 Agent。';}
});
