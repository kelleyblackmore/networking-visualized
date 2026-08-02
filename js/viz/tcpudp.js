// 11 — TCP vs UDP: same wire, two very different promises.

import { g, rect, line, text, chip, device, moveTo, tween, wait, flash, rand, ease } from '../lib/kit.js';

const N = 8;

export default {
  id: 'tcp-udp',
  title: 'TCP vs UDP',
  kicker: 'same wire, different promises',
  blurb: 'TCP resends what it loses and hands it over in order. UDP just fires — faster, and lossy by design.',
  accent: 'c-violet',

  build(ctx) {
    let loss = 20;

    const lanes = [
      { key: 'tcp', y: 62, name: 'TCP', cls: 'c-mint', note: 'ordered · acknowledged · resent' },
      { key: 'udp', y: 158, name: 'UDP', cls: 'c-rose', note: 'fire and forget' },
    ].map(L => {
      const sender = device('monitor', 44, L.y - 13, { w: 28, h: 22 });
      const receiver = device('server', 372, L.y - 14, { w: 28, h: 26 });
      const tag = chip(20, L.y, L.name, { fontSize: 10, w: 38, cls: L.cls });
      const wire = line(78, L.y, 368, L.y, { class: 'wire' });
      const note = text(223, L.y - 26, L.note, { class: 'lbl' });
      const got = text(223, L.y + 30, '', { class: 'lbl lbl-strong', 'font-size': 9.5 });
      const score = text(416, L.y + 30, '', { class: 'lbl', 'text-anchor': 'end', 'font-size': 9.5 });
      ctx.add(wire, note, tag, sender, receiver, got, score);
      return { ...L, sender, receiver, wire, got, score, layer: g({}) };
    });
    lanes.forEach(L => ctx.add(L.layer));
    ctx.add(line(14, 110, 426, 110, { class: 'wire-soft wire-dash' }));

    function box(L, seq) {
      const node = g({ class: `chip ${L.cls}` }, [
        rect(-9, -7, 18, 14, { rx: 3, class: 'chip-box' }),
        text(0, 0, seq, { class: 'chip-text', 'font-size': 8.5 }),
      ]);
      node.setAttribute('transform', `translate(78 ${L.y})`);
      L.layer.append(node);
      return node;
    }

    async function runLane(L, check) {
      L.layer.textContent = '';
      L.got.textContent = '';
      L.score.textContent = '';
      const arrived = [];
      let resends = 0;

      await Promise.all(Array.from({ length: N }, async (_, i) => {
        const seq = i + 1;
        await wait(i * 130);
        check();
        for (let attempt = 1; ; attempt++) {
          const node = box(L, seq);
          const lost = Math.random() * 100 < loss;
          if (lost) {
            const at = rand(150, 300);
            await moveTo(node, 78, L.y, at, L.y, 520, ease.linear);
            check();
            await tween(200, t => { node.style.opacity = String(1 - t); });
            node.remove();
            check();
            if (L.key === 'udp') return;            // no one is counting
            if (attempt >= 4) return;               // give up eventually
            resends++;
            L.score.textContent = `resending ${seq}…`;
            await wait(rand(220, 420));
            check();
            continue;
          }
          await moveTo(node, 78, L.y, 368, L.y, rand(760, 1250), ease.linear);
          check();
          await flash(node, 'is-hit', 180);
          node.remove();
          arrived.push(seq);
          L.got.textContent = (L.key === 'tcp' ? [...arrived].sort((a, b) => a - b) : arrived).join(' ');
          return;
        }
      }));

      check();
      await flash(L.receiver, 'is-hit', 300);
      if (L.key === 'tcp') {
        const ordered = [...arrived].sort((a, b) => a - b);
        L.got.textContent = ordered.join(' ');
        L.score.textContent = `${arrived.length}/${N} · in order`;
      } else {
        L.got.textContent = arrived.join(' ');
        L.score.textContent = `${arrived.length}/${N} · as they landed`;
      }
      return { arrived: arrived.length, resends };
    }

    function send() {
      ctx.seq.go(async (_t, check) => {
        ctx.say(`Sending <b>${N}</b> packets down each lane on a link that drops <b>${loss}%</b>.`);
        const [tcp, udp] = await Promise.all(lanes.map(L => runLane(L, check)));
        check();
        ctx.say(
          `<b>TCP</b> delivered <span class="ok">${tcp.arrived}/${N}</span> in order after <i>${tcp.resends}</i> retransmission${tcp.resends === 1 ? '' : 's'}. ` +
          `<b>UDP</b> delivered <span class="${udp.arrived === N ? 'ok' : 'no'}">${udp.arrived}/${N}</span> and never noticed the rest were gone. ` +
          (loss > 0 ? 'That extra work is exactly why TCP is slower — and why a video call chooses UDP anyway.' : 'On a perfect link they look identical. The difference only shows up when something goes wrong.'),
        );
      });
    }

    ctx.slider({ min: 0, max: 50, value: loss, label: 'packet loss', fmt: v => `${v}%` }, v => { loss = v; });
    ctx.button('Send 8 packets', send, { cls: 'btn-primary' });

    ctx.say('Turn up the loss, then send. Watch what each protocol does about it.');
  },
};
