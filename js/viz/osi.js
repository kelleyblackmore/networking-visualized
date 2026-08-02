// 08 — OSI model: seven layers, and the headers each one wraps around your data.

import { g, rect, text, flash, wait, tappable } from '../lib/kit.js';

const LAYERS = [
  { n: 7, name: 'Application', ex: 'HTTP', pdu: 'data', add: null, say: 'Your program speaks a protocol — <b>HTTP</b>, SMTP, DNS. This is the only layer you normally write code against.' },
  { n: 6, name: 'Presentation', ex: 'TLS', pdu: 'data', add: 'encode', say: '<b>Presentation</b>: encoding, compression, encryption. In practice this is where TLS sits.' },
  { n: 5, name: 'Session', ex: 'Socket', pdu: 'data', add: null, say: '<b>Session</b>: keeping a conversation open across many messages. Mostly folded into the layers around it these days.' },
  { n: 4, name: 'Transport', ex: 'TCP', pdu: 'segment', add: { label: 'TCP', cls: 'c-amber' }, say: '<b>Transport</b> adds ports, sequence numbers and acknowledgements. The PDU is now a <i>segment</i>.' },
  { n: 3, name: 'Network', ex: 'IP', pdu: 'packet', add: { label: 'IP', cls: 'c-cyan' }, say: '<b>Network</b> adds source and destination IP — the addresses that survive the whole journey. Now a <i>packet</i>.' },
  { n: 2, name: 'Data Link', ex: 'MAC', pdu: 'frame', add: { label: 'ETH', cls: 'c-violet' }, trailer: true, say: '<b>Data Link</b> wraps it for this one hop: MAC addresses in front, a checksum behind. Now a <i>frame</i>.' },
  { n: 1, name: 'Physical', ex: 'Cable', pdu: 'bits', add: null, say: '<b>Physical</b>: voltage, light, radio. Everything above becomes a stream of <i>bits</i> on a wire.' },
];

export default {
  id: 'osi',
  title: 'OSI Model',
  kicker: 'seven layers from app to wire',
  blurb: 'Each layer wraps the one above it in a header. Sending goes down the stack; receiving unwraps it back up.',
  accent: 'c-rose',

  build(ctx) {
    const rows = LAYERS.map((L, i) => {
      const y = 20 + i * 27;
      const box = rect(10, y, 186, 22, { rx: 5, class: 'chip-box c-dim' });
      const num = text(22, y + 11, L.n, { class: 'chip-text c-dim', 'font-size': 10 });
      const nm = text(34, y + 11, L.name, { class: 'lbl lbl-strong', 'text-anchor': 'start' });
      const ex = text(188, y + 11, L.ex, { class: 'lbl', 'text-anchor': 'end' });
      const row = g({ class: 'chip' }, [box, num, nm, ex]);
      tappable(row, () => {
        ctx.seq.begin();
        rows.forEach(r => r.node.classList.remove('is-hit'));
        row.classList.add('is-hit');
        ctx.say(L.say);
      }, `layer ${L.n}, ${L.name}`);
      ctx.add(row);
      return { ...L, node: row, y };
    });

    const pduName = text(322, 30, '', { class: 'lbl lbl-strong' });
    const stack = g({});
    const bits = text(322, 178, '', { class: 'lbl', 'font-size': 8.5 });
    ctx.add(pduName, stack, bits);

    let blocks = [];

    function render(flashIdx = -1) {
      stack.textContent = '';
      const total = blocks.reduce((a, b) => a + b.w, 0) + (blocks.length - 1) * 2;
      let x = 322 - total / 2;
      blocks.forEach((b, i) => {
        const node = g({ class: `chip ${b.cls}` }, [
          rect(x, 96, b.w, 30, { rx: 4, class: 'chip-box' }),
          text(x + b.w / 2, 111, b.label, { class: 'chip-text', 'font-size': 9.5 }),
        ]);
        stack.append(node);
        if (i === flashIdx) flash(node, 'is-hit', 460);
        x += b.w + 2;
      });
    }

    function reset() {
      blocks = [{ label: 'DATA', w: 58, cls: 'c-mint' }];
      bits.textContent = '';
      pduName.textContent = '';
      rows.forEach(r => r.node.classList.remove('is-hit'));
      render();
    }

    async function trip() {
      await ctx.seq.go(async (_t, check) => {
        reset();
        // down the stack
        for (const L of rows) {
          check();
          rows.forEach(r => r.node.classList.toggle('is-hit', r === L));
          ctx.say(L.say);
          if (L.add === 'encode') {
            blocks[blocks.findIndex(b => b.cls === 'c-mint')].label = 'ENCRYPTED';
            blocks[0].w = 58;
            render(blocks.findIndex(b => b.cls === 'c-mint'));
          } else if (L.add) {
            blocks.unshift({ label: L.add.label, w: 34, cls: L.add.cls });
            if (L.trailer) blocks.push({ label: 'FCS', w: 26, cls: L.add.cls });
            render(0);
          } else if (L.n === 1) {
            bits.textContent = '01000101 11010010 00101101 …';
          } else {
            render();
          }
          pduName.textContent = `PDU: ${L.pdu}`;
          await wait(760);
        }

        check();
        ctx.say('Over the wire as bits — then the receiver runs the whole thing <b>in reverse</b>, one layer at a time.');
        await wait(700);
        bits.textContent = '';

        // back up
        for (const L of [...rows].reverse()) {
          check();
          rows.forEach(r => r.node.classList.toggle('is-hit', r === L));
          if (L.add && L.add !== 'encode') {
            if (L.trailer) blocks.pop();
            blocks.shift();
            render();
            ctx.say(`Layer ${L.n} reads its <b>${L.add.label}</b> header, acts on it, and strips it off.`);
          } else if (L.add === 'encode') {
            blocks[0].label = 'DATA';
            render(0);
            ctx.say('Layer 6 decrypts. The payload is readable again.');
          }
          pduName.textContent = `PDU: ${L.pdu}`;
          await wait(560);
        }
        check();
        rows.forEach(r => r.node.classList.remove('is-hit'));
        pduName.textContent = '';
        ctx.say('The application gets back <b>exactly</b> the bytes that were sent. Every header in between existed only to get it here.');
      });
    }

    ctx.button('Send a message', trip, { cls: 'btn-primary' });
    ctx.button('Reset', () => { ctx.seq.begin(); reset(); ctx.say('Click any layer to read what it is responsible for.'); });

    reset();
    ctx.say('Click any layer — or send a message and watch the headers stack up and peel off.');
  },
};
