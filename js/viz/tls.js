// 13 — TLS: the handshake that happens before any of your data moves.

import { g, rect, line, text, chip, device, circle, moveTo, flash, wait } from '../lib/kit.js';

const STEPS = [
  { dir: 1, label: 'ClientHello', y: 40, say: '<b>ClientHello</b> — "here are the TLS versions and cipher suites I support, and a random number." Nothing secret yet.' },
  { dir: -1, label: 'ServerHello + certificate', y: 70, say: '<b>ServerHello</b> — the server picks a cipher and sends its <i>certificate</i>: a public key with a signature vouching for the name on it.' },
  { dir: 0, label: 'verify against a trusted CA', y: 100, say: 'Your machine checks that signature against a <b>certificate authority</b> it already trusted before this connection existed. This step is what stops an impostor.' },
  { dir: 2, label: 'key exchange', y: 130, say: 'Both sides exchange public values and independently derive the <b>same session key</b>. The key itself is never sent across the wire.' },
  { dir: 1, label: 'Finished', y: 160, say: '<b>Finished</b>, encrypted with the new key. If the other side can read it, both agreed on everything — and the tunnel is open.' },
];

export default {
  id: 'tls',
  title: 'TLS',
  kicker: 'before any data moves',
  blurb: 'A handshake that proves who the server is and agrees a key — all before the first byte of your request.',
  accent: 'c-mint',

  build(ctx) {
    let step = -1;

    const client = device('monitor', 14, 92);
    const server = device('server', 396, 92);
    ctx.add(client, server,
      text(31, 132, 'client', { class: 'lbl' }),
      text(413, 132, 'server', { class: 'lbl' }));

    const ca = chip(220, 16, 'trusted CA store', { fontSize: 9, h: 16, cls: 'c-violet' });
    ctx.add(ca);

    const rows = STEPS.map(st => {
      const wire = line(60, st.y, 388, st.y, { class: 'wire-soft wire-dash' });
      const lbl = chip(220, st.y, st.label, { fontSize: 9.5, h: 18, cls: 'c-dim' });
      const arrow = text(st.dir === -1 ? 74 : 374, st.y,
        st.dir === -1 ? '◂' : st.dir === 2 ? '⇄' : st.dir === 0 ? '' : '▸', { class: 'lbl' });
      ctx.add(wire, arrow, lbl);
      return { ...st, wire, lbl };
    });

    const tunnel = g({ class: 'chip c-mint ghost' }, [
      rect(60, 182, 328, 24, { rx: 6, class: 'chip-box' }),
      text(224, 194, '🔒 application data · encrypted', { class: 'chip-text', 'font-size': 10 }),
    ]);
    ctx.add(tunnel);

    const pkt = g({ class: 'ghost' }, [circle(0, 0, 4.5, { class: 'pkt' })]);
    ctx.add(pkt);

    function reset() {
      step = -1;
      rows.forEach(r => { r.lbl.setAttribute('class', 'chip c-dim'); r.wire.classList.remove('wire-live'); });
      tunnel.classList.add('ghost');
      pkt.classList.add('ghost');
      ctx.say('Nothing is encrypted yet. Step through the handshake that has to finish first.');
    }

    async function play(i, check) {
      const r = rows[i];
      r.lbl.setAttribute('class', 'chip c-mint');
      r.wire.classList.add('wire-live');
      ctx.say(r.say);
      pkt.classList.remove('ghost');
      if (r.dir === 0) {
        await moveTo(pkt, 31, r.y, 220, 30, 420);
        check();
        await flash(ca, 'is-hit', 380);
        check();
        await moveTo(pkt, 220, 30, 31, r.y, 380);
      } else if (r.dir === 2) {
        await Promise.all([moveTo(pkt, 60, r.y, 220, r.y, 420)]);
        check();
        await flash(r.lbl, 'is-hit', 360);
        check();
        await moveTo(pkt, 220, r.y, 388, r.y, 300);
      } else {
        const [a, b] = r.dir === 1 ? [60, 388] : [388, 60];
        await moveTo(pkt, a, r.y, b, r.y, 620);
        check();
        await flash(r.dir === 1 ? server : client, 'is-hit', 260);
      }
      pkt.classList.add('ghost');
    }

    function next() {
      ctx.seq.go(async (_t, check) => {
        if (step >= STEPS.length - 1) {
          tunnel.classList.remove('ghost');
          pkt.classList.remove('ghost');
          ctx.say('Now — and only now — your <b>GET /</b> goes out, wrapped in the session key.');
          await moveTo(pkt, 60, 194, 388, 194, 700);
          check();
          pkt.classList.add('ghost');
          await flash(server, 'is-hit', 300);
          ctx.say('Handshake done once, then every request rides the same tunnel. That is why the first connection to a site is the slow one.');
          return;
        }
        step++;
        await play(step, check);
        if (step === STEPS.length - 1) {
          tunnel.classList.remove('ghost');
          ctx.say('<span class="ok">Tunnel open.</span> Identity proven, key agreed, and not one byte of your request has moved yet. Click again to send it.');
        }
      });
    }

    function runAll() {
      ctx.seq.go(async (_t, check) => {
        reset();
        for (let i = 0; i < STEPS.length; i++) {
          check();
          step = i;
          await play(i, check);
          await wait(200);
        }
        check();
        tunnel.classList.remove('ghost');
        ctx.say('<span class="ok">Tunnel open.</span> Identity proven, key agreed — now the request can go.');
      });
    }

    ctx.button('Next step ▸', next, { cls: 'btn-primary' });
    ctx.button('Run the handshake', runAll);
    ctx.button('Reset', () => { ctx.seq.begin(); reset(); });

    reset();
  },
};
