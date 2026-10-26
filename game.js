// Whot on start.ng. The server deals, shuffles and checks every card, and only ever sends you your own hand. A room is made by one
// person, who adds bots to empty seats and starts the game. Needs https://start.ng/kit.js (loaded in index.html).
(() => {
  const $ = (id) => document.getElementById(id);
  const SYMBOL = { circle: '●', triangle: '▲', cross: '✚', square: '■', star: '★' };
  const SHAPES = Object.keys(SYMBOL);
  const REASONS = {
    not_found: 'That room has closed, or the code is wrong.',
    nobody_came: 'Nobody joined in time, so the room closed.',
    inactive: 'The room closed because nobody played for a while.',
    empty: 'The room closed because everyone left.',
    finished: 'That game is over and the room closed.',
    too_old: 'That room was open too long, so it closed.',
    offline: "Couldn't reconnect. Check your connection and try again.",
    code_4403: 'That room is full, or the game has started.',
    code_4404: 'That room has closed, or the code is wrong.',
    code_4409: 'You joined from another tab, so this one stopped.',
    code_4429: 'Too many wrong codes. Wait a minute and try again.',
    code_4401: 'Sign in with start.ng to play.',
  };

  let room = null;
  let botsNext = 0; // "Play the bots": make a room, add bots, start
  let choosing = null; // the Whot card waiting for a shape

  const show = (name) => { for (const id of ['lobby', 'waiting', 'game']) $(id).hidden = id !== name; };
  const problem = (text) => { $('lobby-problem').textContent = text || ''; $('lobby-problem').hidden = !text; };
  const reasonText = (reason) => REASONS[reason] || 'The room closed.';
  const note = (text) => { $('game-note').textContent = text || ''; };
  const nameOf = (seat) => room?.players.find((p) => p.seat === seat)?.name ?? 'Player';
  const isHost = () => room?.host === 0 && room.you === 0;

  // ---------- the lobby ----------

  function needSignIn(why) { problem(why); $('signin').hidden = false; }

  async function guarded(open) {
    problem('');
    $('signin').hidden = true;
    try {
      return await open();
    } catch (err) {
      if (err.message === 'signin') needSignIn('Sign in with start.ng to play Whot.');
      else if (/^closed:/.test(err.message)) problem(reasonText(`code_${err.message.slice(7)}`));
      else problem(err.message || "Couldn't start. Try again.");
      return null;
    }
  }

  function wire(r) {
    room = r;
    choosing = null;
    r.on('welcome', () => {
      if (botsNext && r.status === 'waiting') {
        const n = botsNext;
        botsNext = 0;
        for (let i = 0; i < n; i++) r.playBot();
        setTimeout(() => r.start(), 400);
      }
      render();
    });
    r.on('state', render);
    r.on('join', render);
    r.on('away', render);
    r.on('back', render);
    r.on('reconnecting', () => note('Reconnecting…'));
    r.on('open', () => note(''));
    r.on('error', (m) => note(m.message));
    r.on('closed', (m) => leaveRoom(reasonText(m.reason)));
    StartngExtras.watch(r); // sounds, the "play again?" popup, and the waiting spinner (extras.js)
    render();
  }

  async function open(make) {
    const r = await guarded(make);
    if (r) wire(r);
    return r;
  }

  async function joinRoom(code) {
    const r = await open(() => startng.rooms.join(code));
    if (!r && new URLSearchParams(location.search).has('room')) history.replaceState(null, '', location.pathname);
  }

  function leaveRoom(message) {
    room?.leave();
    StartngExtras.reset();
    room = null;
    botsNext = 0;
    history.replaceState(null, '', location.pathname);
    show('lobby');
    problem(message || '');
  }

  // ---------- drawing the room ----------

  // How the game ended, for the status line (and the "play again?" popup, which shows it)
  function ended(result, wonByPlaying) {
    const won = result.winner === room.you;
    if (result.reason === 'resigned') return won ? 'They resigned. You win!' : 'You resigned';
    if (result.reason === 'left') return won ? 'They left. You win!' : `${nameOf(result.winner)} won`;
    return won ? wonByPlaying : `${nameOf(result.winner)} won`;
  }

  function render() {
    if (!room) return;
    if (room.code) history.replaceState(null, '', `${location.pathname}?room=${room.code}`);
    if (room.status === 'waiting' || room.status === null) { drawWaiting(); return; }
    show('game');
    drawGame();
  }

  function drawWaiting() {
    show('waiting');
    $('room-code').textContent = room.code || '';
    $('names').replaceChildren(...room.players.map((p) => {
      const li = document.createElement('li');
      li.textContent = p.seat === room.you ? `${p.name} (you)` : p.name;
      if (!p.online) li.className = 'away';
      return li;
    }));
    const host = isHost();
    $('add-bot').hidden = !host || room.players.length >= 4;
    $('start').hidden = !host;
    $('start').disabled = room.players.length < 2;
    $('waiting-title').textContent = host ? 'Share this code' : 'You are in. Waiting for the host to start.';
    $('waiting-note').textContent = host ? 'Up to 4 can play. Add bots to fill empty seats, then start.' : '';
  }

  function cardEl(card, tag = 'div') {
    const [shape, number] = card;
    const e = document.createElement(tag);
    e.className = `wcard ${shape}`;
    if (shape === 'whot') {
      e.append(Object.assign(document.createElement('span'), { className: 'sym', textContent: 'WHOT' }));
      e.style.gridTemplateRows = '1fr';
    } else {
      e.append(Object.assign(document.createElement('span'), { className: 'n', textContent: number }),
        Object.assign(document.createElement('span'), { className: 'sym', textContent: SYMBOL[shape] }),
        Object.assign(document.createElement('span'), { className: 'n2', textContent: number }));
    }
    e.setAttribute('aria-label', shape === 'whot' ? 'Whot card' : `${shape} ${number}`);
    return e;
  }

  function drawGame() {
    const s = room.state;
    const result = room.result;
    const mine = room.turn === room.you;
    $('players').replaceChildren(...room.players.map((p) => {
      const span = document.createElement('span');
      span.textContent = `${p.seat === room.you ? 'You' : p.name} · ${s.counts[p.seat]}`;
      if (room.turn === p.seat) span.className = 'turn';
      if (!p.online) span.className += ' away';
      return span;
    }));
    $('top').replaceChildren(cardEl(s.top));
    $('shape-now').textContent = s.top[0] === 'whot' || s.shape !== s.top[0] ? `Follow ${s.shape} ${SYMBOL[s.shape]}` : '';
    $('market').textContent = `Market ${s.market}`;
    $('market').disabled = !mine || !!result;
    $('market').onclick = () => room.send({ draw: true });
    $('pending').hidden = !s.pending || !!result;
    if (s.pending) $('pending').textContent = mine ? `Play another ${s.pending.kind}, or pick up ${s.pending.cards}` : `${s.pending.cards} cards waiting to be picked up`;

    $('hand').replaceChildren(...s.hand.map((card, i) => {
      const b = cardEl(card, 'button');
      b.type = 'button';
      const ok = mine && s.playable.includes(i);
      b.disabled = !ok;
      if (ok) b.classList.add('ok');
      b.onclick = () => {
        if (card[0] === 'whot') { choosing = i; drawPicker(); } else room.send({ play: i });
      };
      return b;
    }));
    drawPicker();

    if (result) {
      $('status').textContent = ended(result, 'You played your last card. You win! 🎉');
    } else if (mine) {
      $('status').textContent = s.pending ? 'Your turn: defend or pick up' : s.playable.length ? 'Your turn' : 'Your turn: nothing fits, pick from the market';
    } else {
      $('status').textContent = `Waiting for ${nameOf(room.turn)}`;
    }
    $('after').hidden = !result;
    note(s.last && !result ? lastText(s.last) : '');
  }

  function lastText(last) {
    const who = last.seat === room.you ? 'You' : nameOf(last.seat);
    if (last.card) return `${who} played ${last.card[0] === 'whot' ? 'Whot and asked for ' + last.shape : last.card[0] + ' ' + last.card[1]}.`;
    return `${who} picked ${last.drew} ${last.drew === 1 ? 'card' : 'cards'}.`;
  }

  function drawPicker() {
    $('picker').hidden = choosing === null || room.turn !== room.you;
    $('shapes').replaceChildren(...SHAPES.map((shape) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = shape;
      b.textContent = SYMBOL[shape];
      b.setAttribute('aria-label', shape);
      b.onclick = () => { const play = choosing; choosing = null; room.send({ play, shape }); };
      return b;
    }));
  }

  // ---------- buttons ----------

  $('friend').onclick = () => open(() => startng.rooms.create());
  $('bot').onclick = () => { botsNext = 2; open(() => startng.rooms.create()).then((r) => { if (!r) botsNext = 0; }); };
  $('join').onsubmit = (e) => { e.preventDefault(); const code = $('code').value.trim(); if (code) joinRoom(code); };
  $('signin').onclick = () => startng.signIn();
  $('add-bot').onclick = () => room?.playBot();
  $('start').onclick = () => room?.start();
  $('picker-cancel').onclick = () => { choosing = null; drawPicker(); };
  $('wait-cancel').onclick = () => leaveRoom('');
  $('back').onclick = () => leaveRoom('');
  $('share').onclick = () => startng.share({ text: 'I just played Whot on start.ng. Play me!' });
  $('copy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(room?.inviteUrl() ?? '');
      $('copy').textContent = 'Link copied';
    } catch {
      $('copy').textContent = room?.inviteUrl() ?? 'Copy failed';
    }
    setTimeout(() => { $('copy').textContent = 'Copy invite link'; }, 2000);
  };

  // ---------- start ----------

  async function start() {
    if (!window.startng) { problem('start.ng could not load. Check your connection.'); return; }
    const player = await startng.getPlayer();
    const code = startng.rooms.codeFromUrl();
    if (code && player?.user) joinRoom(code);
    else if (code) {
      $('invite').textContent = `You were invited to a game (room ${code}).`;
      $('invite').hidden = false;
      needSignIn('Sign in with start.ng to join your friends.');
    }
  }

  if (window.startng) start();
  else addEventListener('load', start);
})();
