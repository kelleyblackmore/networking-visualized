// 07 — Packets: one file, split into chunks that arrive out of order and get reassembled.

import { g, rect, line, text, moveTo, tween, wait, flash, rand, ease } from '../lib/kit.js';

const SLOT_Y = i => 44 + i * 22;

export default {
  id: 'packets',
  title: 'Packets',
  kicker: 'one file, split into chunks',
  blurb: 'Data travels in small pieces. They can take different paths, arrive out of order, and get put back together at the end.',
  accent: 'c-mint',

  build(ctx) {
    let n = 6, lossy = false;

    ctx.add(
      rect(18, 44, 54, 140, { rx: 6, class: 'dev-body' }),
      text(45, 196, 'file.jpg', { class: 'lbl' }),
      text(45, 32, 'sender', { class: 'lbl' }),
      text(395, 32, 'receiver', { class: 'lbl' }),
      line(45, 62, 45, 62, { class: 'wire' }),
    );
    for (let i = 0; i < 5; i++) ctx.add(line(28, 60 + i * 26, 62, 60 + i * 26, { class: 'wire-soft' }));

    const slots = g({});
    const chunks = g({});
    ctx.add(slots, chunks);

    const statusL = text(150, 210, '', { class: 'lbl' });
    const statusR = text(330, 210, '', { class: 'lbl' });
    ctx.add(statusL, statusR);

    function drawSlots() {
      slots.textContent = '';
      for (let i = 0; i < n; i++) {
        slots.append(rect(354, SLOT_Y(i) - 9, 62, 18, { rx: 4, class: 'wire-soft', fill: 'rgba(255,255,255,.02)' }));
      }
    }

    function makeChunk(seq) {
      const node = g({ class: 'chunk' }, [
        rect(-16, -8, 32, 16, { rx: 3, class: 'pkt-box' }),
        text(0, 0, String(seq + 1), { class: 'pkt-txt' }),
      ]);
      node.setAttribute('transform', 'translate(96 ' + SLOT_Y(seq) + ')');
      chunks.append(node);
      return node;
    }

    function reset() {
      chunks.textContent = '';
      drawSlots();
      statusL.textContent = `${n} chunks queued`;
      statusR.textContent = '';
    }

    async function send() {
      await ctx.seq.go(async (_t, check) => {
        reset();
        const parts = Array.from({ length: n }, (_, i) => ({ seq: i, node: makeChunk(i) }));
        let landed = 0, lost = 0;
        ctx.say(`Splitting <b>file.jpg</b> into <b>${n}</b> chunks. Each one is addressed and routed on its own.`);
        await wait(320);
        check();

        const trips = parts.map(async p => {
          await wait(rand(0, 260));
          check();
          let attempt = 0;
          for (;;) {
            attempt++;
            const drops = lossy && attempt === 1 && Math.random() < 0.28;
            const dur = rand(900, 1800);
            if (drops) {
              lost++;
              await moveTo(p.node, 96, SLOT_Y(p.seq), rand(200, 280), SLOT_Y(p.seq) + rand(-14, 14), dur * 0.45, ease.linear);
              check();
              p.node.style.opacity = '';
              await tween(240, t => { p.node.style.opacity = String(1 - t); });
              check();
              statusL.textContent = `chunk ${p.seq + 1} lost — resending`;
              await wait(rand(200, 500));
              check();
              p.node.setAttribute('transform', `translate(96 ${SLOT_Y(p.seq)})`);
              await tween(200, t => { p.node.style.opacity = String(t); });
              continue;
            }
            const slot = landed++;
            p.slot = slot;
            await moveTo(p.node, 96, SLOT_Y(p.seq), 385, SLOT_Y(slot), dur, ease.linear);
            check();
            await flash(p.node, 'is-hit', 200);
            statusR.textContent = `${landed}/${n} arrived`;
            return;
          }
        });

        await Promise.all(trips);
        check();
        const order = parts.slice().sort((a, b) => a.slot - b.slot).map(p => p.seq + 1).join(' ');
        const jumbled = order !== parts.map(p => p.seq + 1).join(' ');
        ctx.say(`All ${n} arrived${lost ? `, after <span class="no">${lost} retransmission${lost > 1 ? 's' : ''}</span>` : ''} — in the order <i>${order}</i>.${jumbled ? ' Not the order they were sent.' : ''}`);
        statusL.textContent = '';
        await wait(500);
        check();

        await Promise.all(parts.map(p =>
          moveTo(p.node, 385, SLOT_Y(p.slot), 385, SLOT_Y(p.seq), 620, ease.inOut)));
        check();
        statusR.textContent = 'reassembled';
        await Promise.all(parts.map(p => flash(p.node, 'is-hit', 300)));
        ctx.say(`Reassembled by <b>sequence number</b>. The network never promised order — the sequence numbers in each header are what restore it.`);
      });
    }

    ctx.slider({ min: 3, max: 7, value: n, label: 'chunks', fmt: v => `${v}` }, v => { n = v; reset(); });
    ctx.toggle('lossy link', on => {
      lossy = on;
      ctx.say(on
        ? 'Link set to lossy. Some chunks will vanish in flight — watch them get sent again.'
        : 'Clean link. Every chunk gets through on the first try.');
    });
    ctx.button('Send file', send, { cls: 'btn-primary' });

    reset();
    ctx.say('Send the file and watch it arrive in pieces — rarely in the order it left.');
  },
};
