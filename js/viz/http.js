// 12 — HTTP / HTTPS: the same request, with and without a lock on it.

import { el, g, rect, line, text, chip, device, moveTo, flash, wait } from '../lib/kit.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function cipher(str) {
  let h = 0x811c9dc5;
  let out = '';
  for (let i = 0; i < Math.max(str.length + 6, 18); i++) {
    h ^= (str.charCodeAt(i % Math.max(str.length, 1)) || 17) + i * 31;
    h = Math.imul(h, 16777619) >>> 0;
    out += ALPHABET[h % ALPHABET.length];
  }
  return out + '=';
}

export default {
  id: 'http',
  title: 'HTTP / HTTPS',
  kicker: 'same site, two different bets',
  blurb: 'The web, with or without a lock. HTTPS is the same request — wrapped so the network in between cannot read it.',
  accent: 'c-rose',

  build(ctx) {
    let secure = false;
    let secret = 'pass=hunter2';
    const seen = ctx.panel('what the wifi in between sees');

    const urlChip = chip(220, 30, '', { fontSize: 11 });
    ctx.add(urlChip);

    const client = device('monitor', 22, 100);
    const server = device('server', 386, 100);
    ctx.add(
      line(64, 114, 382, 114, { class: 'wire' }),
      client, server,
      text(39, 148, 'you', { class: 'lbl' }),
      text(403, 148, 'bank.com', { class: 'lbl' }),
    );

    // the eavesdropper
    const spy = g({}, [
      rect(184, 168, 74, 26, { rx: 6, class: 'chip-box c-dim' }),
      text(221, 181, 'open wifi', { class: 'chip-text c-dim', 'font-size': 9.5 }),
    ]);
    ctx.add(line(221, 168, 221, 122, { class: 'wire-soft wire-dash' }), spy);

    const pkt = g({ class: 'ghost' }, [
      rect(-64, -11, 128, 22, { rx: 5, class: 'pkt-box' }),
      text(0, 0, '', { class: 'pkt-txt', 'font-size': 9 }),
    ]);
    const pktTxt = pkt.querySelector('text');
    ctx.add(pkt);

    const lock = text(300, 90, '', { class: 'lbl', 'font-size': 13 });
    ctx.add(lock);

    function paint() {
      urlChip.setText(`${secure ? 'https' : 'http'}://bank.com/login`);
      urlChip.setAttribute('class', `chip ${secure ? 'c-mint' : 'c-rose'}`);
      lock.textContent = secure ? '🔒 encrypted' : '';
      lock.style.fill = 'var(--mint)';
    }

    function log(line1, ok) {
      seen.body.append(el('div', { class: 'row' }, [
        el('span', { class: 'arrow', text: ok ? '·' : '!' }),
        el(ok ? 'span' : 'b', { text: line1 }),
      ]));
      while (seen.body.children.length > 4) seen.body.firstChild.remove();
    }

    function send() {
      ctx.seq.go(async (_t, check) => {
        const body = secret || 'pass=hunter2';
        const wire = secure ? cipher(body) : body;
        pktTxt.textContent = wire.length > 20 ? wire.slice(0, 19) + '…' : wire;
        pkt.classList.remove('ghost');
        pkt.setAttribute('class', secure ? 'c-mint' : 'c-rose');
        ctx.say(secure
          ? 'Sending over <b>TLS</b>. The bytes on the wire are ciphertext.'
          : 'Sending in <b>plain text</b>. Every device on the path can read it.');
        await moveTo(pkt, 46, 114, 221, 114, 620);
        check();
        await flash(spy, 'is-hit', 400);
        log(secure ? `GET bank.com · ${wire.slice(0, 22)}…` : `POST bank.com/login  ${body}`, secure);
        ctx.say(secure
          ? `The wifi sees <i>you talked to bank.com</i> and nothing else — the body is <b>${wire.slice(0, 16)}…</b>`
          : `The wifi just read <b>${body}</b> straight off the wire. So did every hop after it.`);
        await wait(420);
        check();
        await moveTo(pkt, 221, 114, 392, 114, 560);
        check();
        pkt.classList.add('ghost');
        await flash(server, 'is-hit', 300);
        ctx.say(secure
          ? 'Delivered. Only <b>bank.com</b> holds the key that turns those bytes back into your password.'
          : '<span class="no">Delivered — and leaked.</span> Nothing about HTTP is broken here; it simply never promised secrecy.');
      });
    }

    ctx.toggle('HTTPS', on => {
      secure = on;
      paint();
      ctx.say(on
        ? 'TLS on. Same request, same server, same port-ish — the difference is who else can read it.'
        : 'TLS off. The request is now readable by every hop between you and the server.');
    });
    ctx.field({ value: secret, label: 'request body', action: 'Send', maxlength: 28 }, v => {
      secret = v || 'pass=hunter2';
      send();
    });
    ctx.button('Clear log', () => { seen.clear(); });

    paint();
    ctx.say('Type something private, hit <i>Send</i>, then flip HTTPS on and send it again.');
  },
};
