// The hero tracer: one request, end to end, with every stage linking to its card.

import { s, g, line, text, chip, circle, moveTo, flash, wait, Seq, tappable } from './lib/kit.js';

const STAGES = [
  { to: 'dns', label: 'DNS', ms: 34, say: 'resolve <b>github.com</b> → 140.82.121.4' },
  { to: 'ip', label: 'route', ms: 12, say: 'hand the packet to the default gateway' },
  { to: 'nat', label: 'NAT', ms: 1, say: 'rewrite the source to your public address' },
  { to: 'tcp-udp', label: 'TCP', ms: 48, say: 'three-way handshake, port <b>443</b>' },
  { to: 'tls', label: 'TLS', ms: 71, say: 'prove identity, agree a session key' },
  { to: 'http', label: 'HTTP', ms: 96, say: '<b>GET /</b> — the first byte you actually asked for' },
];

export function mountHero(root) {
  const seq = new Seq();
  const svg = s('svg', { viewBox: '0 0 900 104', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'request lifecycle' });
  const readout = root.querySelector('.readout');
  const btn = root.querySelector('[data-run]');
  const total = root.querySelector('[data-total]');

  const X0 = 46, X1 = 856;
  svg.append(line(X0, 52, X1, 52, { class: 'wire' }));

  const nodes = STAGES.map((st, i) => {
    const x = X0 + ((X1 - X0) / (STAGES.length - 1)) * i;
    const node = chip(x, 52, st.label, { cls: 'c-violet', fontSize: 11 });
    const ms = text(x, 78, `${st.ms} ms`, { class: 'lbl' });
    tappable(node, () => {
      document.getElementById(st.to)?.scrollIntoView({ block: 'center' });
      document.getElementById(st.to)?.focus({ preventScroll: true });
    }, `jump to the ${st.label} card`);
    svg.append(node, ms);
    return { ...st, x, node, ms };
  });

  svg.append(text(X0, 26, 'you press enter', { class: 'lbl', 'text-anchor': 'start' }));
  svg.append(text(X1, 26, 'pixels', { class: 'lbl', 'text-anchor': 'end' }));

  const pkt = g({ class: 'ghost' }, [circle(0, 0, 5, { class: 'pkt' })]);
  svg.append(pkt);
  root.querySelector('[data-stage]').append(svg);

  function run() {
    seq.go(async (_t, check) => {
      btn.disabled = true;
      nodes.forEach(n => n.node.classList.remove('is-hit'));
      let elapsed = 0;
      pkt.classList.remove('ghost');
      pkt.setAttribute('transform', `translate(${X0} 52)`);
      for (let i = 0; i < nodes.length; i++) {
        check();
        const n = nodes[i];
        readout.innerHTML = n.say;
        await moveTo(pkt, i === 0 ? X0 : nodes[i - 1].x, 52, n.x, 52, 520);
        check();
        await flash(n.node, 'is-hit', 300);
        elapsed += n.ms;
        total.textContent = `${elapsed} ms`;
      }
      check();
      await moveTo(pkt, nodes[nodes.length - 1].x, 52, X1, 52, 320);
      pkt.classList.add('ghost');
      readout.innerHTML = `Page starts painting after <b>${elapsed} ms</b> — and five of the six stages happened before a single byte of the page was requested. Every card below is one of them.`;
      await wait(10);
    }).finally(() => { btn.disabled = false; });
  }

  btn.addEventListener('click', run);
  readout.innerHTML = 'Click <i>Run a request</i> — or jump straight to any stage.';
}
