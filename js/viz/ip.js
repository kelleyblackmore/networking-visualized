// 01 — IP Address: one address per device, unique host inside a shared subnet.

import { g, rect, line, text, chip, device, circle, moveTo, flash, wait, tappable } from '../lib/kit.js';

const SUBNETS = ['192.168.1', '10.0.4', '172.16.9'];

export default {
  id: 'ip',
  title: 'IP Address',
  kicker: 'one address per device',
  blurb: 'Every device gets an address. The network half is shared; the host half is yours alone.',
  accent: 'c-cyan',

  build(ctx) {
    let net = 0;
    const hosts = [
      { kind: 'monitor', name: 'laptop', host: 4, y: 58 },
      { kind: 'phone', name: 'phone', host: 7, y: 114 },
      { kind: 'server', name: 'nas', host: 19, y: 170 },
    ];

    ctx.add(
      rect(12, 26, 258, 190, { rx: 10, class: 'zone' }),
      text(24, 38, 'SAME SUBNET', { class: 'zone-lbl', 'text-anchor': 'start' }),
    );
    const netLbl = text(258, 38, `${SUBNETS[net]}.0/24`, { class: 'lbl lbl-strong', 'text-anchor': 'end' });
    ctx.add(netLbl);

    // router / default gateway
    const router = device('router', 356, 96);
    ctx.add(router);
    ctx.add(text(373, 138, 'router', { class: 'lbl' }));
    const gw = chip(373, 154, `${SUBNETS[net]}.1`, { fontSize: 10 });
    ctx.add(gw);

    const rows = hosts.map(hp => {
      const dev = device(hp.kind, 30, hp.y - 13);
      const addr = chip(196, hp.y, `${SUBNETS[net]}.${hp.host}`);
      const nameLbl = text(80, hp.y, hp.name, { class: 'lbl', 'text-anchor': 'start' });
      const wire = line(240, hp.y, 356, 109, { class: 'wire wire-dash' });
      ctx.add(wire, dev, nameLbl, addr);
      const row = { ...hp, dev, addr, wire, nameLbl };
      const send = () => deliver(row);
      tappable(dev, send, `send a packet to the ${hp.name}`);
      tappable(addr, send, `send a packet to the ${hp.name}`);
      return row;
    });

    const pkt = g({ class: 'ghost' }, [circle(0, 0, 5, { class: 'pkt' })]);
    ctx.add(pkt);

    function renumber() {
      net = (net + 1) % SUBNETS.length;
      netLbl.textContent = `${SUBNETS[net]}.0/24`;
      gw.setText(`${SUBNETS[net]}.1`);
      rows.forEach(r => r.addr.setText(`${SUBNETS[net]}.${r.host}`));
      ctx.say(`Renumbered to <b>${SUBNETS[net]}.0/24</b>. Same devices, new network half — the host numbers <i>.4 .7 .19</i> stayed unique.`);
    }

    function deliver(target) {
      ctx.seq.go(async (_t, check) => {
        rows.forEach(r => r.dev.classList.toggle('is-dim', r !== target));
        ctx.say(`Router forwards to <b>${SUBNETS[net]}.${target.host}</b> — only the <i>${target.name}</i> holds that address.`);
        pkt.classList.remove('ghost');
        await moveTo(pkt, 373, 109, 240, target.y, 620);
        check();
        await flash(target.addr, 'is-hit', 320);
        check();
        await moveTo(pkt, 240, target.y, 46, target.y, 260);
        check();
        pkt.classList.add('ghost');
        await flash(target.dev, 'is-hit', 420);
        check();
        rows.forEach(r => r.dev.classList.remove('is-dim'));
        ctx.say(`Delivered to <b>${SUBNETS[net]}.${target.host}</b>. The first three octets say <i>which network</i>; the last says <i>which device on it</i>.`);
        await wait(10);
      });
    }

    ctx.button('Send to laptop', () => deliver(rows[0]), { cls: 'btn-primary' });
    ctx.button('Send to phone', () => deliver(rows[1]));
    ctx.button('Send to nas', () => deliver(rows[2]));
    ctx.button('Renumber network', renumber);

    ctx.say('Click a device — or any address chip — to route a packet to it.');
  },
};
