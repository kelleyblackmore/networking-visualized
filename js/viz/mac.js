// 04 — MAC Address: IP survives the whole trip; the MAC pair is rewritten at every router.

import { g, line, text, chip, device, circle, moveTo, flash, hexByte } from '../lib/kit.js';

const newMac = () => Array.from({ length: 6 }, hexByte).join(':');
const short = m => m.slice(0, 8) + '…';

export default {
  id: 'mac',
  title: 'MAC Address',
  kicker: 'burned in at the factory',
  blurb: "The NIC's hardware identity. It never leaves the local link — each router rewrites it for the next hop.",
  accent: 'c-violet',

  build(ctx) {
    let macs = { pc: newMac(), rtrLan: newMac(), rtrWan: newMac(), srv: newMac() };

    const ipChip = chip(220, 34, '', { fontSize: 10, cls: 'c-dim' });
    const macChip = chip(220, 62, '', { fontSize: 10, cls: 'c-violet' });
    ctx.add(
      text(14, 34, 'layer 3', { class: 'lbl', 'text-anchor': 'start' }),
      text(14, 62, 'layer 2', { class: 'lbl', 'text-anchor': 'start' }),
      ipChip, macChip,
    );

    const nodes = [
      { key: 'pc', kind: 'monitor', x: 20, label: 'PC', mac: () => macs.pc },
      { key: 'sw', kind: 'server', x: 140, label: 'switch', mac: () => '—' },
      { key: 'rt', kind: 'router', x: 260, label: 'router', mac: () => macs.rtrLan },
      { key: 'sv', kind: 'server', x: 384, label: 'server', mac: () => macs.srv },
    ].map(n => {
      const dev = device(n.kind, n.x, 118);
      const name = text(n.x + 17, 156, n.label, { class: 'lbl' });
      const mac = text(n.x + 17, 175, '', { class: 'lbl' });
      ctx.add(dev, name, mac);
      return { ...n, dev, macLbl: mac, cx: n.x + 17 };
    });

    for (let i = 0; i < nodes.length - 1; i++) {
      ctx.add(line(nodes[i].cx + 22, 131, nodes[i + 1].cx - 22, 131, { class: 'wire' }));
    }
    ctx.add(text(97, 200, '← same broadcast domain →', { class: 'lbl' }));
    ctx.add(text(325, 200, '← new link →', { class: 'lbl' }));

    const pkt = g({ class: 'ghost' }, [circle(0, 0, 5, { class: 'pkt' })]);
    ctx.add(pkt);

    function paintMacs() {
      nodes.forEach(n => { n.macLbl.textContent = n.mac() === '—' ? 'transparent' : short(n.mac()); });
    }

    function reset() {
      ipChip.setText('192.168.1.4 → 203.0.113.9');
      macChip.setText('—');
      paintMacs();
    }

    const HOPS = [
      {
        from: 0, to: 1,
        mac: () => `${short(macs.pc)} → ${short(macs.rtrLan)}`,
        say: 'PC addresses the frame to the <b>router</b>, not the server — the destination is off-link, so it hands it to the gateway.',
      },
      {
        from: 1, to: 2,
        mac: () => `${short(macs.pc)} → ${short(macs.rtrLan)}`,
        say: 'The <b>switch</b> forwards by MAC and changes <i>nothing</i>. Same source, same destination.',
      },
      {
        from: 2, to: 3,
        mac: () => `${short(macs.rtrWan)} → ${short(macs.srv)}`,
        say: 'The <b>router</b> strips the old frame and writes a new one for the next link. New MAC pair — <i>identical IP pair</i>.',
      },
    ];

    function send() {
      ctx.seq.go(async (_t, check) => {
        reset();
        pkt.setAttribute('transform', `translate(${nodes[0].cx} 131)`);
        pkt.classList.remove('ghost');
        macChip.setText(HOPS[0].mac());
        for (const hop of HOPS) {
          check();
          macChip.setText(hop.mac());
          await flash(macChip, 'is-hit', 200);
          ctx.say(hop.say);
          check();
          await moveTo(pkt, nodes[hop.from].cx, 131, nodes[hop.to].cx, 131, 700);
          check();
          await flash(nodes[hop.to].dev, 'is-hit', 300);
        }
        pkt.classList.add('ghost');
        ctx.say('Arrived. The <b>MAC pair</b> changed on every link; the <i>IP pair</i> never did. That is the whole division of labour.');
      });
    }

    ctx.button('Send a frame', send, { cls: 'btn-primary' });
    ctx.button('Swap the NICs', () => {
      macs = { pc: newMac(), rtrLan: newMac(), rtrWan: newMac(), srv: newMac() };
      reset();
      ctx.say(`New hardware, new burned-in addresses — <b>${macs.pc}</b> for the PC. The IPs are unaffected; they are assigned, not manufactured.`);
    });

    reset();
    ctx.say('Send a frame and watch the two address pairs behave completely differently.');
  },
};
