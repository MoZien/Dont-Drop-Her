import { LEVELS } from '../shared/levels.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  heart:'M12 21 3.5 12.7C-2 7.2 5.6.5 12 7 18.4.5 26 7.2 20.5 12.7Z',
  arrow:'M4 12h16m-6-6 6 6-6 6',
  people:'M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a2.5 2.5 0 1 0 0-5m-14 16v-3a6 6 0 0 1 12 0v3m2-9a5 5 0 0 1 5 5v3',
  pause:'M8 4v16M16 4v16',
  sound:'m3 9 4 0 5-4v14l-5-4H3Zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  link:'m9 15 6-6m-4-3 2-2a5 5 0 0 1 7 7l-2 2M13 18l-2 2a5 5 0 0 1-7-7l2-2',
  balance:'M12 3v18m-7-5 7 3 7-3M4 6h16M5 6l-3 6h6Zm14 0-3 6h6Z',
  jump:'M12 21V3m-6 6 6-6 6 6',
  grab:'M6 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v6-2a2 2 0 0 1 4 0v5c0 7-4 8-8 8-4 0-5-3-8-6-3-3 0-5 2-3Z',
  check:'m5 12 4 4L20 5',
  close:'m6 6 12 12M6 18 18 6',
};
export const icon = (name, className='') => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.heart}"/></svg>`;
const colors=['#ee789a','#71bfc1','#a994dc','#edb66f','#88b986','#699de0'];
const names=['Rose','Sea glass','Lavender','Honey','Sage','Sky'];

export class UI {
  constructor(root,network,audio,world) {
    this.root=root;this.network=network;this.audio=audio;this.world=world;this.screen='home';this.mode='create';this.connected=false;
    this.profile={name:'',color:'#71bfc1',appearance:'boy'};this.story={anniversary:'',message:''};this.state=null;this.lastKey='';this.toastTimer=0;
    this.codeFromLink=new URLSearchParams(location.search).get('room')?.toUpperCase().slice(0,6)||'';
    root.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button&&!button.disabled)this.action(button.dataset.action,button);});
    root.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='setup-form')this.submit();});
    root.addEventListener('input',e=>{
      if(e.target.id==='player-name')this.profile.name=e.target.value;
      if(e.target.id==='anniversary')this.story.anniversary=e.target.value;
      if(e.target.id==='love-message')this.story.message=e.target.value;
      if(e.target.id==='volume')this.audio.setVolume(Number(e.target.value));
      if(e.target.id==='room-input')e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
    });
    network.on('room',room=>this.room(room));
    network.on('state',state=>this.update(state));
    network.on('connection',connected=>{this.connected=connected;this.refreshConnection();if(!connected&&network.room)this.show('offline');else if(connected&&network.room)this.room(network.room);});
    network.on('closed',reason=>{this.show('home');this.toast(reason);});
    network.on('error',reason=>{if(!network.room)this.show('home');this.toast(reason);});
    this.show(this.codeFromLink?'setup':'home');if(this.codeFromLink){this.mode='join';this.profile.appearance='girl';this.profile.color='#ee789a';this.show('setup',true);}
  }
  toast(message) {const el=document.getElementById('toast');el.textContent=message;el.classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.remove('visible'),4800);}
  header() {return `<header class="topbar"><button class="brand" data-action="home" aria-label="Main menu">${icon('heart')}<span>DON'T DROP HER<span class="brand-dot">!</span></span></button><div class="top-actions"><span class="online-label"><i class="connection-dot ${this.connected?'online':''}"></i><span id="connection-label">${this.connected?'ONLINE CO-OP':'CONNECTING'}</span></span><button class="icon-button" data-action="sound" aria-label="${this.audio.muted?'Unmute':'Mute'} sound">${icon('sound')}<span class="mute-slash ${this.audio.muted?'show':''}"></span></button><button class="icon-button" data-action="help" aria-label="How to play">?</button></div></header>`;}
  show(screen,force=false) {
    if(screen===this.screen&&this.root.children.length&&!force)return;
    this.screen=screen;this.root.dataset.screen=screen;
    const renderer={home:()=>this.home(),setup:()=>this.setup(),lobby:()=>this.lobby(),countdown:()=>this.countdown(),intro:()=>this.intro(),playing:()=>this.game(),broken:()=>this.broken(),paused:()=>this.paused(),complete:()=>this.complete(),victory:()=>this.victory(),reconnecting:()=>this.reconnecting(),offline:()=>this.reconnecting(true)};
    this.root.innerHTML=this.header()+(renderer[screen]||renderer.home)();
    if(['playing','broken','paused','reconnecting','offline'].includes(screen))this.root.classList.add('in-game');else this.root.classList.remove('in-game');
    this.onScreen?.(screen);this.refreshConnection();if(this.state)this.updateHud();
  }
  home() {
    return `<main class="home-layout"><section class="hero"><div class="eyebrow"><span class="tiny-line"></span>A TWO-PLAYER LOVE STORY</div><h1>A little teamwork.<br>A lot of <em>heart.</em></h1><p class="hero-copy">One fragile heart. Two imperfect people.<br>Five little adventures to carry it through.</p><div class="hero-actions"><button class="button primary" data-action="create">Start your story ${icon('arrow')}</button><button class="button secondary" data-action="join">Join your person ${icon('link')}</button></div><div class="hero-note">${icon('people')}<span>2 players online<span class="note-dot">·</span>Made for your phone</span></div></section><aside class="scene-caption"><span class="caption-index">01 / 05</span><div><span class="caption-title">Love Garden</span><span class="caption-sub">Where your adventure begins</span></div></aside><footer class="menu-footer"><button class="text-button" data-action="help">How to carry a little love ${icon('arrow')}</button><span>FOR TWO. TOGETHER.</span><button class="text-button" data-action="settings">Sound & graphics</button></footer><div class="scene-vignette"></div></main>`;
  }
  setup() {
    const create=this.mode==='create';
    return `<main class="panel-layout"><section class="panel setup-panel"><button class="back-button" data-action="home">← Back to the garden</button><div class="eyebrow">${create?'A NEW ADVENTURE':'BETTER WITH YOU'}</div><h2>${create?'Make it yours.':'Meet your person.'}</h2><p class="panel-intro">${create?'Pick your little adventurer. Invite your favorite human.':'A room code is all that stands between you two.'}</p><form id="setup-form"><label class="field-label" for="player-name">YOUR NAME</label><input id="player-name" name="name" maxlength="20" placeholder="${create?'Oliver':'Juniper'}" value="${escape(this.profile.name)}" autocomplete="nickname"/><div class="field-label">YOUR LITTLE ADVENTURER</div><div class="appearance-options"><button type="button" class="appearance ${this.profile.appearance==='boy'?'selected':''}" data-action="appearance" data-value="boy"><span class="avatar-silhouette boy"></span><span>Oliver<span class="option-note">The daydreamer</span></span>${this.profile.appearance==='boy'?icon('check'):''}</button><button type="button" class="appearance ${this.profile.appearance==='girl'?'selected':''}" data-action="appearance" data-value="girl"><span class="avatar-silhouette girl"></span><span>Juniper<span class="option-note">The brave one</span></span>${this.profile.appearance==='girl'?icon('check'):''}</button></div><div class="field-label">A COLOR THAT FEELS LIKE YOU</div><div class="color-options">${colors.map((color,i)=>`<button type="button" aria-label="${names[i]} color" title="${names[i]}" class="color-swatch ${this.profile.color===color?'selected':''}" style="--swatch:${color}" data-action="color" data-value="${color}">${this.profile.color===color?icon('check'):''}</button>`).join('')}</div>${create?`<details class="story-details"><summary>${icon('heart')}A little personal touch <span>optional</span></summary><label class="field-label" for="anniversary">YOUR ANNIVERSARY</label><input id="anniversary" type="date" value="${escape(this.story.anniversary)}"/><label class="field-label" for="love-message">A NOTE FOR YOUR PERSON</label><textarea id="love-message" rows="2" maxlength="240" placeholder="Saved for the end of your adventure…">${escape(this.story.message)}</textarea><p class="privacy-note">Only the two people in this room can see your note.</p></details>`:`<label class="field-label" for="room-input">YOUR SIX-LETTER ROOM CODE</label><input id="room-input" class="room-input" maxlength="6" minlength="6" required placeholder="ABCDEF" value="${escape(this.codeFromLink)}" autocomplete="off" autocapitalize="characters" spellcheck="false"/>`}<p id="form-error" class="form-error" role="alert"></p><button class="button primary full-width" type="submit" id="enter-button">${create?'Create our room':'Join our adventure'} ${icon('arrow')}</button></form></section><div class="preview-label"><span>YOUR STORY. YOUR COLORS.</span>It's a little cuter with you in it.</div></main>`;
  }
  lobby() {
    const room=this.network.room;if(!room)return this.home();const me=room.players[this.network.index];
    return `<main class="center-layout"><section class="panel lobby-panel"><div class="eyebrow">A TABLE FOR TWO</div><h2>${room.players.length<2?'Waiting for your person.':'The dream team.'}</h2><p class="panel-intro">${room.players.length<2?'Send them an invitation. Your little adventure is almost ready.':'Ready when you both are. Take it slow. Stay together.'}</p><div class="room-code-card"><span>YOUR PRIVATE ROOM</span><strong id="room-code">${escape(room.code)}</strong><button class="text-button" data-action="invite">${icon('link')} Copy invite link</button></div><div class="lobby-players">${[0,1].map(i=>{const p=room.players[i];return `<div class="player-card ${!p?'empty':''}"><span class="player-avatar" style="--player-color:${p?.profile.color||'#afb7b0'}">${icon('people')}</span><strong>${escape(p?.profile.name||'Your person')}</strong><span>${!p?'Not here yet':!p.connected?'Reconnecting…':p.ready?'Ready for love':'Finding their courage'}</span>${p?.ready?`<i class="ready-check">${icon('check')}</i>`:''}</div>`;}).join('')}</div>${room.story.message||room.story.anniversary?`<div class="story-saved">${icon('heart')}Your personal story is saved for the finale.</div>`:''}<button class="button primary full-width" data-action="ready">${me?.ready?'Actually, give me a second':"I'm ready. Let's do this."} ${icon(me?.ready?'pause':'arrow')}</button><div class="lobby-bottom"><button class="text-button" data-action="edit">Edit my character</button><button class="text-button" data-action="leave">Leave room</button></div></section></main>`;
  }
  countdown() {return `<main class="center-layout"><section class="countdown-panel"><div class="eyebrow">TWO PEOPLE. ONE HEART.</div><h2>Here we go.</h2><strong class="countdown-number" id="countdown-number">${this.network.room?.countdown||4}</strong><p>Grab your handles. And maybe each other's courage.</p></section></main>`;}
  intro() {
    const level=LEVELS[this.network.room?.level||0];
    return `<main class="center-layout"><section class="panel intro-panel"><span class="level-pill">CHAPTER ${level.id+1} OF 5</span><h2>${level.title}</h2><p class="intro-subtitle">${level.subtitle}</p><div class="intro-tip">${icon('balance')}<span>${level.tip}</span></div><div class="chapter-dots">${LEVELS.map((l,i)=>`<i class="${i<=level.id?'active':''}"></i>`).join('')}</div><p class="small-note">Your adventure starts in a moment…</p></section></main>`;
  }
  game() {
    const room=this.network.room,level=LEVELS[room?.level||0];
    return `<div class="hud"><div class="hud-level"><span class="eyebrow">CHAPTER ${level.id+1} / 05</span><strong>${level.title}</strong><span id="checkpoint-text">Checkpoint 0 / 2</span></div><div class="heart-meter"><div class="meter-heading">${icon('heart')}<span>OUR LITTLE HEART</span><strong id="health-text">100%</strong></div><div class="health-track"><div id="health-fill"></div></div><div class="balance-row"><span>STEADY</span><div class="balance-track"><i id="balance-dot"></i></div><span>WOBBLY</span></div></div><div class="hud-actions"><div class="partner-status" id="partner-status"></div><button class="icon-button" data-action="pause" aria-label="Pause adventure">${icon('pause')}</button></div></div><div class="objective" id="objective">Step onto both glowing circles together.</div><div class="game-progress"><div id="progress-fill"></div><i style="left:36%"></i><i style="left:70%"></i><span>${icon('heart')}</span></div><div class="desktop-controls"><span><kbd>W A S D</kbd> move</span><span><kbd>E</kbd> grab</span><span><kbd>SPACE</kbd> jump</span><span><kbd>SHIFT</kbd> balance</span><span>drag to look</span></div><div class="touch-controls" id="touch-controls"><div id="joystick" aria-label="Movement joystick" role="application"><span class="joystick-knob"></span><span class="joystick-label">MOVE</span></div><div class="touch-actions"><button data-touch="grab" aria-label="Grab or release heart">${icon('grab')}<span>GRAB</span></button><button data-touch="jump" aria-label="Jump">${icon('jump')}<span>JUMP</span></button><button class="balance-button" data-touch="balance" aria-label="Balance heart">${icon('balance')}<span>BALANCE</span></button></div></div>`;
  }
  broken() {return this.game()+`<main class="center-layout overlay-layout"><section class="broken-panel"><div class="broken-heart">${icon('heart')}</div><div class="eyebrow">A SMALL BREAK IN THE LOVE STORY</div><h2>Oops. Still love you.</h2><p>${escape(this.state?.events.filter(e=>e.type==='break').at(-1)?.message||'Good news: your love comes with a checkpoint.')}</p><span class="small-note">Back to your last checkpoint in a moment…</span></section></main>`;}
  paused() {return this.game()+`<main class="center-layout overlay-layout"><section class="panel pause-panel"><div class="eyebrow">A LITTLE BREATHER</div><h2>Love can wait.</h2><p class="panel-intro">${escape(this.network.room?.pausedBy||'Your partner')} paused the adventure. Both of you are safe.</p><button class="button primary full-width" data-action="pause">Back to us ${icon('arrow')}</button><button class="button secondary full-width" data-action="restart">${this.network.room?.players[this.network.index]?.restartVote?'Waiting for your partner…':'Restart checkpoint together'}</button><button class="text-button full-width" data-action="settings">Sound & graphics</button><button class="text-button full-width" data-action="leave">Leave adventure</button></section></main>`;}
  complete() {const level=LEVELS[this.network.room?.level||0];return `<main class="center-layout overlay-layout"><section class="panel complete-panel"><span class="medallion">${icon('check')}</span><div class="eyebrow">CHAPTER ${level.id+1} COMPLETE</div><h2>Look at you two.</h2><p class="panel-intro">${level.title}, carried with care.<br>Another little piece of your story.</p><div class="result-stats"><div><strong>${Math.round(this.state?.health||100)}%</strong><span>HEART LEFT</span></div><div><strong>${this.state?.deaths||0}</strong><span>TRUST FALLS</span></div><div><strong>${this.timeString(this.state?.time||0)}</strong><span>TOGETHER</span></div></div><button class="button primary full-width" data-action="continue">${this.network.room?.players[this.network.index]?.vote?'Waiting for your person…':'Next little adventure'} ${icon('arrow')}</button><p class="small-note">Both players choose to continue.</p></section></main>`;}
  victory() {
    const room=this.network.room;return `<main class="center-layout victory-layout"><section class="victory-panel"><div class="eyebrow">YOUR FOREVER KIND OF LOVE</div><h2>You carried it.<br><em>Together.</em></h2><p class="victory-quote">“No matter how difficult the journey gets,<br>we can carry our love together.”</p><div class="victory-names">${escape(room.players[0].profile.name)}<span>&</span>${escape(room.players[1].profile.name)}</div>${room.story.anniversary?`<p class="anniversary-line">OUR STORY BEGAN · ${escape(room.story.anniversary)}</p>`:''}${room.story.message?`<blockquote class="personal-message">${escape(room.story.message)}</blockquote>`:''}<button class="button primary" data-action="continue">${room.players[this.network.index]?.vote?'Waiting for your person…':'Fall in love all over again'} ${icon('heart')}</button><button class="text-button" data-action="leave">Back to the garden</button></section></main>`;
  }
  reconnecting(offline=false) {return `<main class="center-layout overlay-layout"><section class="panel pause-panel"><span class="reconnect-spinner"></span><div class="eyebrow">STAYING TOGETHER</div><h2>${offline?'Finding our connection.':'Waiting for your person.'}</h2><p class="panel-intro">The adventure is safely paused. We hold your place for two minutes while you reconnect.</p><button class="text-button" data-action="leave">Return to the garden</button></section></main>`;}
  room(room) {
    this.world.setProfiles([room.players[0]?.profile||{name:'Oliver',color:'#71bfc1',appearance:'boy'},room.players[1]?.profile||{name:'Juniper',color:'#ee789a',appearance:'girl'}]);
    const key=JSON.stringify({index:this.network.index,phase:room.phase,players:room.players,story:room.story,level:room.level});
    const screen=room.phase==='playing'&&this.state?.status==='broken'?'broken':room.phase;
    this.countdownEnd=Date.now()+room.countdown*1000;
    if(key!==this.lastKey){this.lastKey=key;this.show(screen,true);}
  }
  update(state) {
    this.state=state;
    if(this.network.room?.phase==='playing')this.show(state.status==='broken'?'broken':'playing');
    this.updateHud();
  }
  updateHud() {
    const state=this.state;if(!state)return;
    const health=this.root.querySelector('#health-text');if(!health)return;
    health.textContent=`${Math.ceil(state.health)}%`;
    const fill=this.root.querySelector('#health-fill');fill.style.width=`${state.health}%`;fill.classList.toggle('critical',state.health<16);
    this.root.querySelector('#balance-dot').style.left=`${state.balance*94}%`;
    this.root.querySelector('#checkpoint-text').textContent=`Checkpoint ${state.checkpoint} / 2`;
    const progress=this.root.querySelector('#progress-fill');progress.style.width=`${Math.max(0,Math.min(100,state.heart.position.z/LEVELS[state.level].finish*100))}%`;
    const mine=state.players[this.network.index],partner=this.network.room?.players[1-this.network.index];
    this.root.querySelector('#partner-status').innerHTML=`<i style="background:${partner?.profile.color||'#71bfc1'}"></i><span>${escape(partner?.profile.name||'Your person')}</span>`;
    this.root.querySelector('#objective').textContent=!mine.grabbing?'Get close to the heart and grab your handle.':state.balance>.6?'Hold Balance together. Slow steps, same direction.':!state.gateOpen?`Stand on both circles${state.padCharge>0?' · Hold still…':''}.`:(state.checkpoint<2?'Carry your heart to the next golden checkpoint.':'Center the heart on the pedestal. Both hold Balance to place it.');
  }
  refreshConnection() {const label=this.root.querySelector('#connection-label');if(label)label.textContent=this.connected?'ONLINE CO-OP':'CONNECTING';this.root.querySelector('.connection-dot')?.classList.toggle('online',this.connected);}
  tick() {const number=this.root.querySelector('#countdown-number');if(number)number.textContent=Math.max(1,Math.ceil((this.countdownEnd-Date.now())/1000));}
  timeString(t) {return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
  async submit() {
    const button=this.root.querySelector('#enter-button'),error=this.root.querySelector('#form-error');button.disabled=true;error.textContent='';
    await this.audio.unlock();
    if(this.editing) {
      const r=await this.network.request('player:profile',this.profile);
      if(this.network.index===0)await this.network.request('room:personalize',this.story);
      if(r.ok){this.editing=false;this.show('lobby',true);}else{error.textContent=r.error;button.disabled=false;}return;
    }
    const data={profile:this.profile,story:this.story,code:this.root.querySelector('#room-input')?.value};
    const result=await this.network.enter(this.mode,data);
    if(!result.ok){error.textContent=result.error;button.disabled=false;}
    else history.replaceState({},'',`?room=${result.code}`);
  }
  async action(action,button) {
    if(action==='create'||action==='join'){this.mode=action;this.editing=false;this.profile.appearance=action==='join'?'girl':'boy';this.profile.color=action==='join'?'#ee789a':'#71bfc1';this.show('setup',true);this.preview();return;}
    if(action==='appearance'||action==='color'){this.profile[action==='color'?'color':'appearance']=button.dataset.value;this.show('setup',true);this.preview();return;}
    if(action==='sound'){await this.audio.unlock();this.audio.toggle();button.setAttribute('aria-label',`${this.audio.muted?'Unmute':'Mute'} sound`);button.querySelector('.mute-slash').classList.toggle('show',this.audio.muted);return;}
    if(action==='home'){if(!this.network.room){this.editing=false;this.show('home');}return;}
    if(action==='help'){this.modal('A little guide to love.',`<p>You each hold one side of a very fragile heart. Move together, and it travels beautifully. Pull apart, and things get interesting.</p><div class="help-grid"><span><kbd>W A S D</kbd> Move</span><span><kbd>E</kbd> Grab / release</span><span><kbd>SPACE</kbd> Jump together</span><span><kbd>SHIFT</kbd> Balance / brake</span></div><p>On your phone, use the joystick and the three buttons. Hold Balance together to calm the heart and slowly repair it. Drag the world to turn the camera.</p><p>Stand on both glowing circles to open the arch. Golden flags save your progress. If the heart breaks, you both return to your last checkpoint.</p><p class="small-note">Two real players are needed. There is no solo mode.</p>`);return;}
    if(action==='settings'){this.modal('Set the mood.',`<label class="field-label" for="volume">VOLUME</label><input id="volume" type="range" min="0" max="1" step=".05" value="${this.audio.volume}"/><label class="field-label" for="quality">GRAPHICS</label><select id="quality"><option value="auto">Automatic · adapts to your device</option><option value="high">High · lovely shadows and glass</option><option value="low">Low · a lighter touch</option></select><p class="small-note">All sounds and music are original, generated in your browser.</p>`);const quality=this.root.querySelector('#quality');quality.value=this.world.quality;quality.addEventListener('change',()=>this.world.setQuality(quality.value));return;}
    if(action==='close-modal'){this.root.querySelector('.modal-backdrop')?.remove();return;}
    if(action==='invite'){const url=new URL(location.href);url.search=`room=${this.network.room.code}`;url.hash='';try{await navigator.clipboard.writeText(url.href);this.toast('Invitation copied. Send a little love.');}catch{this.modal('Your invitation.',`<input aria-label="Invitation link" readonly value="${escape(url.href)}"/><p>Select and copy this link, then send it to your person.</p>`);}return;}
    if(action==='edit'){this.editing=true;this.mode=this.network.index===0?'create':'join';this.profile={...this.network.room.players[this.network.index].profile};this.story={...this.network.room.story};this.show('setup',true);this.root.querySelector('#enter-button').innerHTML=`Save my character ${icon('check')}`;this.root.querySelector('#room-input')?.removeAttribute('required');return;}
    if(action==='leave'){await this.network.leave();this.lastKey='';this.state=null;history.replaceState({},'','/');this.show('home',true);return;}
    const events={ready:'player:ready',pause:'game:pause',continue:'game:continue',restart:'game:restart',grab:'game:grab'};
    if(events[action]){await this.audio.unlock();const r=await this.network.request(events[action]);if(!r.ok)this.toast(r.error);}
  }
  preview() {const p={...this.profile,name:this.profile.name||'You'},partner={name:'Your person',appearance:p.appearance==='boy'?'girl':'boy',color:p.color==='#ee789a'?'#71bfc1':'#ee789a'};this.world.setProfiles([p,partner]);}
  modal(title,body) {this.root.querySelector('.modal-backdrop')?.remove();const div=document.createElement('div');div.className='modal-backdrop';div.innerHTML=`<section class="panel modal" role="dialog" aria-modal="true" aria-label="${escape(title)}"><button class="icon-button modal-close" data-action="close-modal" aria-label="Close">${icon('close')}</button><h2>${title}</h2>${body}<button class="button primary full-width" data-action="close-modal">Got it ${icon('check')}</button></section>`;this.root.append(div);div.querySelector('button').focus();}
}
