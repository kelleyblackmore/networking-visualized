// 05 — NAT: many private IPs behind one public address, tracked by a translation table.

import { el, g, rect, line, text, chip, device, circle, moveTo, flash, wait, tappable } from '../lib/kit.js';

export default {
  id: 'nat',
  title: 'NAT',
  kicker: 'private inside, public outside',
  blurb: 'Many private IPs, one public IP. The router rewrites the source and remembers who asked.',
  accent: 'c-lime',

  build(ctx) {
    let port = 40000;
    const table = [];
    const panel = ctx.panel('translation table');
    renderTable();

    ctx.add(rect(8, 24, 156, 192, { rx: 10, class: 'zone' }));
    ctx.add(text(20, 36, 'PRIVATE 10.0.0.0/8', { class: 'zone-lbl', 'text-anchor': 'start' }));

    const hosts = [
      { ip: '10.0.0.12', y: 62, kind: 'monitor' },
      { ip: '10.0.0.17', y: 118, kind: 'phone' },
      { ip: '10.0.0.23', y: 174, kind: 'server' },
    ].map(hp => {
      const dev = device(hp.kind, 18, hp.y - 13);
      const addr = chip(112, hp.y, hp.ip, { fontSize: 10 });
      const wire = line(154, hp.y, 196, 112, { class: 'wire wire-dash' });
      ctx.add(wire, dev, addr);
      const row = { ...hp, dev, addr };
      tappable(dev, () => send(row), `start a flow from ${hp.ip}`);
      tappable(addr, () => send(row), `start a flow from ${hp.ip}`);
      return row;
    });

    // The NAT box sits above the wire so the rewritten packet stays readable
    // as it passes underneath.
    const natBox = g({ class: 'chip' }, [
      rect(196, 62, 72, 30, { rx: 8, class: 'chip-box' }),
      text(232, 77, 'NAT', { class: 'chip-text', 'font-size': 12 }),
    ]);
    ctx.add(natBox);
    const pubChip = chip(232, 146, '203.0.113.5', { fontSize: 10, cls: 'c-amber' });
    ctx.add(pubChip, text(232, 166, 'one public address', { class: 'lbl' }));
    ctx.add(line(196, 112, 268, 112, { class: 'wire' }));
    natBox.before(line(232, 92, 232, 136, { class: 'wire-soft wire-dash' }));

    const cloud = device('cloud', 370, 96, { w: 52, h: 34 });
    ctx.add(line(268, 112, 366, 112, { class: 'wire' }), cloud);
    ctx.add(text(396, 142, 'internet', { class: 'lbl' }));

    const pkt = g({ class: 'ghost' }, [
      rect(-38, -9, 76, 18, { rx: 4, class: 'pkt-box' }),
      text(0, 0, '', { class: 'pkt-txt' }),
    ]);
    const pktLbl = pkt.querySelector('text');
    ctx.add(pkt);

    function renderTable() {
      panel.clear();
      if (!table.length) {
        panel.body.append(el('div', { class: 'empty', text: 'no active flows — click a device' }));
        return;
      }
      table.slice(-4).forEach(t => {
        panel.body.append(el('div', { class: `row ${t.hot ? 'is-new' : ''}` }, [
          el('span', { text: `${t.src}:${t.sport}` }),
          el('span', { class: 'arrow', text: '→' }),
          el('b', { text: `203.0.113.5:${t.pport}` }),
        ]));
      });
    }

    function send(host) {
      ctx.seq.go(async (_t, check) => {
        const sport = 51000 + Math.floor(Math.random() * 900);
        const pport = ++port;
        pktLbl.textContent = `src ${host.ip}:${sport}`;
        pkt.classList.remove('ghost');
        ctx.say(`<i>${host.ip}</i> sends out. That source address is <b>private</b> — no one on the internet can route a reply to it.`);
        await moveTo(pkt, 112, host.y, 232, 112, 620);
        check();

        await flash(natBox, 'is-hit', 300);
        pktLbl.textContent = `src 203.0.113.5:${pport}`;
        table.forEach(t => (t.hot = false));
        table.push({ src: host.ip, sport, pport, hot: true });
        renderTable();
        ctx.say(`Source rewritten to <b>203.0.113.5:${pport}</b> and the mapping is stored. That port number is the only thing that remembers who asked.`);
        check();

        await moveTo(pkt, 232, 112, 380, 112, 560);
        check();
        await flash(cloud, 'is-hit', 260);
        pktLbl.textContent = `dst 203.0.113.5:${pport}`;
        ctx.say(`The server replies to <b>203.0.113.5:${pport}</b> — the only address it ever saw.`);
        await wait(320);
        check();

        await moveTo(pkt, 380, 112, 232, 112, 560);
        check();
        await flash(natBox, 'is-hit', 300);
        pktLbl.textContent = `dst ${host.ip}:${sport}`;
        ctx.say(`Table lookup: <b>:${pport}</b> belongs to <i>${host.ip}:${sport}</i>. Destination rewritten back.`);
        check();

        await moveTo(pkt, 232, 112, 112, host.y, 560);
        check();
        pkt.classList.add('ghost');
        await flash(host.dev, 'is-hit', 400);
        ctx.say(`Delivered to <i>${host.ip}</i>. Three devices, one public address — the port map keeps the conversations apart.`);
      });
    }

    ctx.button('10.0.0.12 →', () => send(hosts[0]), { cls: 'btn-primary' });
    ctx.button('10.0.0.17 →', () => send(hosts[1]));
    ctx.button('10.0.0.23 →', () => send(hosts[2]));
    ctx.button('Flush table', () => {
      table.length = 0;
      renderTable();
      ctx.say('Table flushed. Any reply arriving now has nowhere to go — the router drops it.');
    });

    ctx.say('Click a private host to start a flow and watch its source address get rewritten.');
  },
};
