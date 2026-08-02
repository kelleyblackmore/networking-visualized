// 06 — DHCP: DISCOVER · OFFER · REQUEST · ACK, then a lease that has to be renewed.

import { g, rect, line, text, chip, device, circle, moveTo, flash, tween, Seq, ease } from '../lib/kit.js';

const STEPS = [
  { name: 'DISCOVER', dir: 1, say: 'The new device has <b>no address at all</b>, so it shouts to the whole broadcast domain: is there a DHCP server out there?' },
  { name: 'OFFER', dir: -1, say: 'The server <b>offers</b> an address it has free — <i>10.0.0.42</i> — plus a gateway, DNS and a lease time.' },
  { name: 'REQUEST', dir: 1, say: 'The client formally <b>requests</b> that offer. (Broadcast again, so any other server knows its offer was declined.)' },
  { name: 'ACK', dir: -1, say: 'The server <b>acknowledges</b> and writes the lease down. The address is now spoken for.' },
];

const LEASE_MS = 24000;

export default {
  id: 'dhcp',
  title: 'DHCP',
  kicker: 'discover · offer · request · ack',
  blurb: 'Hands new devices their IP automatically — as a lease that expires unless it gets renewed.',
  accent: 'c-blue',

  build(ctx) {
    const lease = new Seq();
    let leased = false;

    const client = device('monitor', 24, 96, { cls: 'is-dim' });
    ctx.add(client, text(41, 138, 'new device', { class: 'lbl' }));
    const addr = chip(52, 158, 'no address', { fontSize: 9.5, cls: 'c-dim', h: 17 });
    ctx.add(addr);

    const server = device('server', 380, 96);
    ctx.add(server, text(397, 138, 'DHCP server', { class: 'lbl' }));

    const rows = STEPS.map((st, i) => {
      const y = 34 + i * 22;
      const wire = line(70, y, 372, y, { class: 'wire wire-soft wire-dash' });
      const lbl = chip(221, y, st.name, { fontSize: 9.5, h: 17, cls: 'c-dim' });
      const arrow = text(st.dir === 1 ? 356 : 86, y, st.dir === 1 ? '▸' : '◂', { class: 'lbl' });
      ctx.add(wire, arrow, lbl);
      return { ...st, y, wire, lbl };
    });

    const pkt = g({ class: 'ghost' }, [circle(0, 0, 4.5, { class: 'pkt' })]);
    ctx.add(pkt);

    // lease meter
    ctx.add(text(24, 186, 'lease', { class: 'lbl', 'text-anchor': 'start' }));
    ctx.add(rect(60, 180, 320, 8, { rx: 4, class: 'wire-soft', fill: 'rgba(0,0,0,.35)' }));
    const bar = rect(60, 180, 0, 8, { rx: 4, fill: 'var(--c)' });
    const barTxt = text(220, 204, '', { class: 'lbl' });
    ctx.add(bar, barTxt);

    function clearLease(msg) {
      lease.begin();
      leased = false;
      bar.setAttribute('width', 0);
      barTxt.textContent = '';
      addr.setText('no address');
      addr.classList.add('c-dim');
      client.classList.add('is-dim');
      rows.forEach(r => r.lbl.classList.add('c-dim'));
      if (msg) ctx.say(msg);
    }

    function startLease() {
      leased = true;
      lease.go(async (_t, check) => {
        await tween(LEASE_MS, p => {
          bar.setAttribute('width', 320 * (1 - p));
          const left = Math.ceil((LEASE_MS / 1000) * (1 - p));
          barTxt.textContent = `${left}s remaining · renews at 50%`;
          if (p > 0.5) bar.setAttribute('fill', 'var(--amber)');
          else bar.setAttribute('fill', 'var(--c)');
        }, ease.linear);
        check();
        clearLease('<span class="no">lease expired</span> — the address goes back in the pool and the device is offline until it asks again.');
      });
    }

    function handshake() {
      ctx.seq.go(async (_t, check) => {
        clearLease();
        pkt.setAttribute('transform', `translate(70 ${rows[0].y})`);
        pkt.classList.remove('ghost');
        for (const st of rows) {
          check();
          st.lbl.classList.remove('c-dim');
          st.wire.classList.add('wire-live');
          ctx.say(st.say);
          await flash(st.lbl, 'is-hit', 180);
          check();
          const [x1, x2] = st.dir === 1 ? [70, 372] : [372, 70];
          await moveTo(pkt, x1, st.y, x2, st.y, 620);
          st.wire.classList.remove('wire-live');
          check();
          await flash(st.dir === 1 ? server : client, 'is-hit', 220);
        }
        pkt.classList.add('ghost');
        client.classList.remove('is-dim');
        addr.setText('10.0.0.42');
        addr.classList.remove('c-dim');
        startLease();
        ctx.say('Online with <b>10.0.0.42</b> — but only <i>borrowed</i>. Watch the lease drain; the client renews at the halfway mark or loses it.');
      });
    }

    ctx.button('Plug in a new device', handshake, { cls: 'btn-primary' });
    ctx.button('Renew lease', () => {
      if (!leased) return ctx.say('Nothing to renew — the device has no lease yet.');
      startLease();
      ctx.say('Renewed. A single <b>REQUEST/ACK</b> pair is enough — no need to rediscover the server.');
    });
    ctx.button('Unplug', () => clearLease('Device removed. The lease is released early and <b>10.0.0.42</b> is free for someone else.'));

    ctx.say('Plug in a device and watch the four-message handshake it takes to get an address.');
  },
};
