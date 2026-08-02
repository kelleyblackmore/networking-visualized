// 14 — Firewall: rules are evaluated top to bottom, and the last word is "deny".

import { g, rect, line, text, chip, device, circle, moveTo, tween, flash, wait, tappable } from '../lib/kit.js';

export default {
  id: 'firewall',
  title: 'Firewall',
  kicker: 'rules are evaluated in order',
  blurb: 'Allow the good, block the rest. Order matters, and the rule nobody writes — default deny — catches everything else.',
  accent: 'c-rose',

  build(ctx) {
    let port = 443, internal = false;

    const RULES = [
      { n: 1, action: 'ALLOW', port: 443, src: 'any', srcTest: () => true },
      { n: 2, action: 'ALLOW', port: 22, src: '10.0.0.0/8', srcTest: p => p.internal },
      { n: 3, action: 'DENY', port: 23, src: 'any', srcTest: () => true },
    ].map(r => {
      const y = 46 + (r.n - 1) * 34;
      const box = rect(58, y - 13, 240, 26, { rx: 5, class: 'chip-box' });
      const txt = text(68, y, '', { class: 'chip-text', 'text-anchor': 'start', 'font-size': 10 });
      const node = g({ class: `chip ${r.action === 'ALLOW' ? 'c-mint' : 'c-rose'}` }, [box, txt]);
      ctx.add(node);
      const row = { ...r, y, node, txt, enabled: true };
      tappable(node, () => {
        row.enabled = !row.enabled;
        paint();
        ctx.say(row.enabled
          ? `Rule ${row.n} is back on.`
          : `Rule ${row.n} disabled. Anything it used to catch now falls through to whatever is below it.`);
      }, `toggle rule ${r.n}: ${r.action} tcp/${r.port} from ${r.src}`);
      return row;
    });

    const defY = 148;
    const defNode = g({ class: 'chip c-dim' }, [
      rect(58, defY - 13, 240, 26, { rx: 5, class: 'chip-box' }),
      text(68, defY, 'DENY   everything else   (implicit)', { class: 'chip-text', 'text-anchor': 'start', 'font-size': 10 }),
    ]);
    ctx.add(defNode);

    ctx.add(text(58, 22, 'rules, in order', { class: 'lbl', 'text-anchor': 'start' }));
    ctx.add(line(26, 30, 26, 168, { class: 'wire-soft wire-dash' }));

    const server = device('server', 384, 62);
    ctx.add(server, text(401, 104, 'protected', { class: 'lbl' }));
    ctx.add(line(302, 76, 380, 76, { class: 'wire wire-dash' }));

    const verdict = chip(220, 200, '', { fontSize: 11 });
    verdict.classList.add('ghost');
    const inbound = chip(424, 22, '', { fontSize: 9.5, h: 17, anchor: 'end', cls: 'c-dim' });
    ctx.add(verdict, inbound);

    const pkt = g({ class: 'ghost' }, [
      rect(-19, -9, 38, 18, { rx: 4, class: 'pkt-box' }),
      text(0, 0, '', { class: 'pkt-txt', 'font-size': 8.5 }),
    ]);
    const pktTxt = pkt.querySelector('text');
    ctx.add(pkt);

    function paint() {
      RULES.forEach(r => {
        r.txt.textContent = `${r.action.padEnd(6)} tcp/${String(r.port).padEnd(5)} from ${r.src}`;
        r.node.classList.toggle('is-off', !r.enabled);
        r.node.style.textDecoration = '';
        r.node.style.opacity = r.enabled ? '' : '.55';
      });
    }

    function send() {
      ctx.seq.go(async (_t, check) => {
        const p = { port, internal };
        verdict.classList.add('ghost');
        pktTxt.textContent = `:${port}`;
        inbound.setText(`tcp/${port} from ${internal ? '10.0.0.5' : 'the internet'}`);
        pkt.classList.remove('ghost');
        ctx.say(`Inbound: <b>tcp/${port}</b> from ${internal ? 'an <i>internal</i> host' : 'the <i>internet</i>'}. Checking rule 1…`);
        let py = 14;
        pkt.setAttribute('transform', `translate(26 ${py})`);

        let matched = null;
        for (const r of RULES) {
          check();
          await moveTo(pkt, 26, py, 26, r.y, 380);
          py = r.y;
          check();
          if (!r.enabled) {
            ctx.say(`Rule ${r.n} is <i>disabled</i> — skipped.`);
            await wait(260);
            continue;
          }
          await flash(r.node, 'is-hit', 300);
          if (r.port === p.port && r.srcTest(p)) { matched = r; break; }
          ctx.say(`Rule ${r.n} does not match (<i>tcp/${r.port} from ${r.src}</i>) — keep going.`);
          await wait(140);
        }

        check();
        if (!matched) {
          await moveTo(pkt, 26, py, 26, defY, 380);
          py = defY;
          check();
          await flash(defNode, 'is-hit', 400);
        }

        const allowed = matched?.action === 'ALLOW';
        verdict.classList.remove('ghost');
        verdict.setAttribute('class', `chip ${allowed ? 'c-mint' : 'c-rose'}`);
        verdict.setText(allowed ? `ALLOWED by rule ${matched.n}` : matched ? `DENIED by rule ${matched.n}` : 'DROPPED by default deny');

        if (allowed) {
          await moveTo(pkt, 26, matched.y, 400, 76, 620);
          check();
          pkt.classList.add('ghost');
          await flash(server, 'is-hit', 320);
          ctx.say(`<span class="ok">Allowed</span> — rule ${matched.n} matched first, so nothing below it was even read.`);
        } else {
          await tween(320, t => { pkt.style.opacity = String(1 - t); });
          pkt.classList.add('ghost');
          pkt.style.opacity = '';
          ctx.say(matched
            ? `<span class="no">Denied</span> by rule ${matched.n}. An explicit deny is worth writing when you want the reason in the logs.`
            : `<span class="no">Dropped.</span> No rule matched, and the last word in every firewall is <b>deny</b>. That default is the whole security model — everything else is an exception to it.`);
        }
      });
    }

    ctx.picker([{ label: 'tcp/443', value: 443 }, { label: 'tcp/22', value: 22 }, { label: 'tcp/23', value: 23 }, { label: 'tcp/8080', value: 8080 }],
      v => { port = v; }, { label: 'destination port' });
    ctx.picker([{ label: 'from internet', value: false }, { label: 'from 10.0.0.5', value: true }],
      v => { internal = v; }, { label: 'source' });
    ctx.button('Send packet', send, { cls: 'btn-primary' });

    paint();
    ctx.say('Pick a port and a source, then send. Click any rule to switch it off and watch the outcome change.');
  },
};
