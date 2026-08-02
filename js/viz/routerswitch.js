// 10 — Router vs Switch: forwarding by MAC inside a network vs by IP between networks.

import { g, rect, line, text, chip, device, circle, moveTo, flash, wait } from '../lib/kit.js';

export default {
  id: 'router-switch',
  title: 'Router vs Switch',
  kicker: 'inside one network vs between two',
  blurb: 'A switch moves frames by MAC inside one network. A router moves packets by IP between networks.',
  accent: 'c-amber',

  build(ctx) {
    ctx.add(
      rect(8, 92, 196, 128, { rx: 10, class: 'zone' }),
      text(20, 106, 'LAN A · 192.168.1.0/24', { class: 'zone-lbl', 'text-anchor': 'start' }),
      rect(236, 92, 196, 128, { rx: 10, class: 'zone' }),
      text(248, 106, 'LAN B · 10.0.5.0/24', { class: 'zone-lbl', 'text-anchor': 'start' }),
    );

    const pc = device('monitor', 20, 128);
    const pcIp = chip(37, 178, '.4', { fontSize: 9, h: 16, w: 34 });
    const peer = device('monitor', 20, 186, { h: 20 });
    const peerIp = chip(88, 196, '192.168.1.9', { fontSize: 9, h: 16 });

    const swA = g({}, [rect(126, 130, 60, 26, { rx: 5, class: 'chip-box c-amber' }), text(156, 143, 'switch', { class: 'chip-text c-amber', 'font-size': 10 })]);
    const swB = g({}, [rect(254, 130, 60, 26, { rx: 5, class: 'chip-box c-amber' }), text(284, 143, 'switch', { class: 'chip-text c-amber', 'font-size': 10 })]);
    const router = g({}, [rect(184, 26, 72, 30, { rx: 6, class: 'chip-box c-rose' }), text(220, 41, 'router', { class: 'chip-text c-rose', 'font-size': 11 })]);

    const server = device('server', 372, 128);
    const srvIp = chip(389, 178, '10.0.5.4', { fontSize: 9, h: 16 });

    ctx.add(
      line(54, 141, 126, 141, { class: 'wire' }),
      line(70, 196, 126, 152, { class: 'wire' }),
      line(156, 130, 200, 56, { class: 'wire' }),
      line(284, 130, 240, 56, { class: 'wire' }),
      line(314, 141, 372, 141, { class: 'wire' }),
      swA, swB, router, pc, peer, server, pcIp, peerIp, srvIp,
    );
    ctx.add(text(16, 122, 'you · 192.168.1.4', { class: 'lbl', 'font-size': 9, 'text-anchor': 'start' }));

    const hdr = chip(220, 78, '', { fontSize: 9.5, h: 18, cls: 'c-dim' });
    hdr.classList.add('ghost');
    ctx.add(hdr);

    const pkt = g({ class: 'ghost' }, [circle(0, 0, 4.5, { class: 'pkt' })]);
    ctx.add(pkt);

    const local = [
      { p: [37, 141, 156, 143], node: swA, hdr: 'dst MAC = 192.168.1.9', say: 'Destination <b>192.168.1.9</b> is inside your own subnet, so the frame is addressed straight to that host.' },
      { p: [156, 143, 88, 196], node: peer, hdr: 'dst MAC = 192.168.1.9', say: 'The <b>switch</b> looks up that MAC in its table and forwards out the one port it lives on. It never read an IP address, and the router never saw the traffic.' },
    ];

    const remote = [
      { p: [37, 141, 156, 143], node: swA, hdr: 'dst IP 10.0.5.4 · dst MAC = router', say: '<b>10.0.5.4</b> is on a different network. Your host cannot reach it directly, so it addresses the frame to the <i>default gateway</i>.' },
      { p: [156, 143, 220, 41], node: router, hdr: 'dst IP 10.0.5.4 · TTL 64', say: 'The <b>switch</b> just hands it up. Only the router is allowed to move traffic between the two networks.' },
      { p: [220, 41, 284, 143], node: swB, hdr: 'dst IP 10.0.5.4 · TTL 63', say: 'The <b>router</b> reads the IP, picks the route, decrements the TTL and builds a brand new frame for LAN B.' },
      { p: [284, 143, 389, 141], node: server, hdr: 'dst MAC = 10.0.5.4', say: 'LAN B\'s switch delivers by MAC. Two switches, one router, one packet.' },
    ];

    function run(steps, mode) {
      ctx.seq.go(async (_t, check) => {
        [swA, swB, router].forEach(n => n.classList.remove('is-hit'));
        router.style.opacity = mode === 'local' ? '.35' : '';
        hdr.classList.remove('ghost');
        pkt.classList.remove('ghost');
        for (const st of steps) {
          check();
          hdr.setText(st.hdr);
          hdr.setAttribute('class', `chip ${mode === 'local' ? 'c-amber' : 'c-rose'}`);
          ctx.say(st.say);
          await moveTo(pkt, ...st.p, 620);
          check();
          await flash(st.node, 'is-hit', 320);
        }
        pkt.classList.add('ghost');
        await wait(60);
        ctx.say(mode === 'local'
          ? 'Stayed <b>inside</b> the network the whole way. Switching is a layer-2 job — the router was never involved.'
          : 'Crossed <b>between</b> networks. Routing is a layer-3 job — and only the router rewrites the frame.');
        router.style.opacity = '';
      });
    }

    ctx.button('Send to 192.168.1.9', () => run(local, 'local'), { cls: 'btn-primary' });
    ctx.button('Send to 10.0.5.4', () => run(remote, 'remote'));

    ctx.say('Same sender, two destinations. One of them never touches the router — send both and compare.');
  },
};
