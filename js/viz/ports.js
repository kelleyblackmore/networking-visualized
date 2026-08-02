// 03 — Ports: one IP, many doors. A port is only useful if something is listening.

import { g, rect, line, text, chip, device, circle, moveTo, flash, tappable } from '../lib/kit.js';

const DOORS = [
  { port: 22, svc: 'SSH', y: 52, listening: true, accent: 'c-amber' },
  { port: 80, svc: 'HTTP', y: 100, listening: true, accent: 'c-cyan' },
  { port: 443, svc: 'HTTPS', y: 148, listening: true, accent: 'c-mint' },
  { port: 3306, svc: 'MySQL', y: 196, listening: false, accent: 'c-rose' },
];

export default {
  id: 'ports',
  title: 'Ports',
  kicker: 'one IP, many doors',
  blurb: 'One machine, many services. The address finds the host; the port picks which program answers.',
  accent: 'c-amber',

  build(ctx) {
    const client = device('monitor', 14, 96);
    ctx.add(client, text(31, 138, 'client', { class: 'lbl' }));

    ctx.add(rect(262, 24, 168, 194, { rx: 10, class: 'zone' }));
    ctx.add(text(346, 16, 'one server · 203.0.113.5', { class: 'lbl lbl-strong' }));

    const hub = circle(120, 109, 4, { class: 'pkt' });
    ctx.add(line(48, 109, 120, 109, { class: 'wire' }), hub);

    const doors = DOORS.map(d => {
      const wire = line(124, 109, 262, d.y, { class: 'wire wire-dash' });
      const door = chip(300, d.y, `:${d.port}`, { anchor: 'start', w: 52, cls: d.accent });
      const svcLbl = text(420, d.y, d.svc, { class: 'lbl', 'text-anchor': 'end' });
      ctx.add(wire, door, svcLbl);
      const row = { ...d, wire, door, svcLbl };
      tappable(door, () => connect(row), `connect to port ${d.port}`);
      setListening(row, d.listening);
      return row;
    });

    const pkt = g({ class: 'ghost' }, [circle(0, 0, 4.5, { class: 'pkt' })]);
    ctx.add(pkt);

    function setListening(row, on) {
      row.listening = on;
      row.door.classList.toggle('is-off', !on);
      row.svcLbl.textContent = on ? row.svc : 'no listener';
      row.svcLbl.setAttribute('class', on ? 'lbl' : 'lbl c-dim');
      row.wire.style.opacity = on ? '' : '.35';
    }

    function connect(row) {
      ctx.seq.go(async (_t, check) => {
        pkt.classList.remove('ghost');
        ctx.say(`Dialling <b>203.0.113.5:${row.port}</b> — same address as every other door.`);
        await moveTo(pkt, 31, 109, 120, 109, 300);
        check();
        await moveTo(pkt, 120, 109, 296, row.y, 420);
        check();
        if (row.listening) {
          await flash(row.door, 'is-hit', 420);
          pkt.classList.add('ghost');
          ctx.say(`<span class="ok">connected</span> → <b>:${row.port}</b> handed the connection to <i>${row.svc}</i>.`);
        } else {
          await flash(row.door, 'is-hit', 200);
          check();
          await moveTo(pkt, 296, row.y, 31, 109, 380);
          pkt.classList.add('ghost');
          ctx.say(`<span class="no">connection refused</span> — the host is up, but nothing is listening on <b>:${row.port}</b>.`);
        }
      });
    }

    ctx.picker(
      DOORS.map(d => ({ label: `:${d.port}`, value: d.port })),
      port => connect(doors.find(d => d.port === port)),
      { label: 'port to connect to' },
    );
    ctx.button('Connect', () => connect(doors[2]), { cls: 'btn-primary' });
    ctx.toggle('sshd running', on => {
      setListening(doors[0], on);
      ctx.say(on
        ? 'Started <i>sshd</i> — <b>:22</b> now has a program behind it.'
        : 'Stopped <i>sshd</i>. The port number still exists; nothing answers it any more.');
    }, true);

    ctx.say('Pick a port to knock on. <b>:3306</b> has no service behind it — try it.');
  },
};
