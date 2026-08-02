// 15 — VPN: you don't remove the observer, you move it.

import { el, g, rect, line, text, chip, device, circle, moveTo, flash, wait, tappable } from '../lib/kit.js';

const SITES = [
  { host: 'news.example', ip: '93.184.16.9', y: 44 },
  { host: 'bank.example', ip: '198.51.100.7', y: 108 },
  { host: 'clinic.example', ip: '203.0.113.44', y: 172 },
];

export default {
  id: 'vpn',
  title: 'VPN',
  kicker: 'your ISP sees one blob',
  blurb: 'A private tunnel over a public network. Your ISP stops seeing where you go — the exit node starts.',
  accent: 'c-violet',

  build(ctx) {
    let on = false;
    const ispPanel = ctx.panel('your ISP sees');
    const exitPanel = ctx.panel('the exit node sees');
    clearLogs();

    const you = device('monitor', 12, 96);
    ctx.add(you, text(29, 138, 'you', { class: 'lbl' }));

    const isp = g({}, [
      rect(84, 96, 60, 28, { rx: 6, class: 'chip-box c-dim' }),
      text(114, 110, 'ISP', { class: 'chip-text c-dim', 'font-size': 10 }),
    ]);
    ctx.add(line(46, 110, 84, 110, { class: 'wire' }), isp);

    const exitNode = g({ class: 'chip c-violet ghost' }, [
      rect(180, 96, 84, 28, { rx: 6, class: 'chip-box' }),
      text(222, 110, 'vpn exit', { class: 'chip-text', 'font-size': 10 }),
    ]);
    const tunnel = rect(46, 100, 218, 20, { rx: 10, class: 'chip-box c-violet ghost' });
    ctx.add(tunnel, exitNode);

    const fanFrom = () => (on ? 264 : 144);

    const sites = SITES.map(sp => {
      const wire = line(144, 110, 320, sp.y, { class: 'wire wire-dash' });
      const node = chip(376, sp.y, sp.host, { fontSize: 9.5 });
      const ipLbl = text(376, sp.y + 18, sp.ip, { class: 'lbl', 'font-size': 8.5 });
      ctx.add(wire, node, ipLbl);
      tappable(node, () => visit({ ...sp, node }), `visit ${sp.host}`);
      return { ...sp, node, wire };
    });

    const pkt = g({ class: 'ghost' }, [circle(0, 0, 4.5, { class: 'pkt' })]);
    ctx.add(pkt);

    function clearLogs() {
      ispPanel.clear(); exitPanel.clear();
      ispPanel.body.append(el('div', { class: 'empty', text: 'nothing yet' }));
      exitPanel.body.append(el('div', { class: 'empty', text: on ? 'nothing yet' : 'no exit node — you are not using one' }));
    }

    function log(panel, txt, strong) {
      panel.body.querySelector('.empty')?.remove();
      panel.body.append(el('div', { class: 'row' }, [
        el('span', { class: 'arrow', text: '·' }),
        el(strong ? 'b' : 'span', { text: txt }),
      ]));
      while (panel.body.children.length > 3) panel.body.firstChild.remove();
    }

    function paint() {
      tunnel.classList.toggle('ghost', !on);
      exitNode.classList.toggle('ghost', !on);
      sites.forEach(s => {
        s.wire.setAttribute('x1', fanFrom());
        s.wire.setAttribute('y1', 110);
      });
      isp.setAttribute('class', on ? 'chip c-violet' : 'chip c-dim');
    }

    function visit(site) {
      ctx.seq.go(async (_t, check) => {
        pkt.classList.remove('ghost');
        if (on) {
          ctx.say(`Request for <b>${site.host}</b> is encrypted <i>before</i> it leaves your machine.`);
          await moveTo(pkt, 29, 110, 114, 110, 420);
          check();
          await flash(isp, 'is-hit', 300);
          log(ispPanel, 'vpn-exit.example:1194 · encrypted', false);
          ctx.say('Your ISP sees one destination — the VPN endpoint — and a blob it cannot read. Not the site, not the page.');
          await moveTo(pkt, 114, 110, 222, 110, 420);
          check();
          await flash(exitNode, 'is-hit', 320);
          log(exitPanel, `${site.host} → ${site.ip}`, true);
          ctx.say(`The <b>exit node</b> decrypts and makes the request for you. It now knows exactly what your ISP used to know.`);
          await moveTo(pkt, 264, 110, 376, site.y, 520);
        } else {
          ctx.say(`Request for <b>${site.host}</b> leaves in the clear.`);
          await moveTo(pkt, 29, 110, 114, 110, 420);
          check();
          await flash(isp, 'is-hit', 300);
          log(ispPanel, `${site.host} → ${site.ip}`, true);
          ctx.say(`Your ISP logged <b>${site.host}</b>. Even with HTTPS hiding the page, the destination is right there in the connection.`);
          await moveTo(pkt, 144, 110, 376, site.y, 560);
        }
        check();
        pkt.classList.add('ghost');
        await flash(site.node, 'is-hit', 340);
        await wait(20);
        if (on) ctx.say('The site sees the <b>exit node\'s</b> address, not yours. You did not delete the observer — you chose a different one.');
      });
    }

    ctx.toggle('VPN', v => {
      on = v;
      paint();
      clearLogs();
      ctx.say(v
        ? 'Tunnel up. Everything now leaves as one encrypted stream to a single endpoint.'
        : 'Tunnel down. Every destination is visible to your ISP again.');
    });
    SITES.forEach((sp, i) => ctx.button(sp.host, () => visit({ ...sp, node: sites[i].node }), { cls: i === 0 ? 'btn-primary' : '' }));

    paint();
    ctx.say('Visit a site, then flip the VPN on and visit it again — watch which panel fills up.');
  },
};
