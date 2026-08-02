// 09 — Subnetting & CIDR: the prefix is a line drawn through 32 bits.

import { g, rect, line, text, flash } from '../lib/kit.js';

const X0 = 24, BW = 10.4, GAP = 1.6, GROUP = 9, TOP = 72, BH = 16;

const parseIp = str => {
  const p = String(str).trim().split('.');
  if (p.length !== 4) return null;
  const n = p.map(Number);
  if (n.some(v => !Number.isInteger(v) || v < 0 || v > 255)) return null;
  return ((n[0] << 24) | (n[1] << 16) | (n[2] << 8) | n[3]) >>> 0;
};
const dotted = v => [24, 16, 8, 0].map(s => (v >>> s) & 255).join('.');
const bitX = i => X0 + i * (BW + GAP) + Math.floor(i / 8) * GROUP;

export default {
  id: 'cidr',
  title: 'Subnetting & CIDR',
  kicker: 'the mask draws the line',
  blurb: 'The prefix says how many of the 32 bits identify the network. Everything left over counts your hosts.',
  accent: 'c-cyan',

  build(ctx) {
    let ip = parseIp('192.168.1.130'), prefix = 24;

    const bits = [];
    const bitsG = g({});
    ctx.add(bitsG);
    for (let i = 0; i < 32; i++) {
      const box = rect(bitX(i), TOP, BW, BH, { rx: 2, class: 'chip-box' });
      const val = text(bitX(i) + BW / 2, TOP + BH / 2, '0', { class: 'chip-text bit-num' });
      const node = g({ class: 'chip' }, [box, val]);
      bitsG.append(node);
      bits.push({ node, val });
    }

    const octets = [0, 1, 2, 3].map(i =>
      text(bitX(i * 8 + 4) - GAP / 2, TOP - 14, '0', { class: 'lbl lbl-strong', 'font-size': 10 }));
    ctx.add(...octets);

    const divider = line(0, TOP - 6, 0, TOP + BH + 6, { class: 'wire-live', 'stroke-width': 2 });
    const netBand = rect(0, TOP - 4, 0, BH + 8, { rx: 3, fill: 'rgba(103,232,249,.07)', stroke: 'none' });
    const hostBand = rect(0, TOP - 4, 0, BH + 8, { rx: 3, fill: 'rgba(251,191,36,.07)', stroke: 'none' });
    bitsG.before(netBand, hostBand);
    ctx.add(divider);

    const netTag = text(0, TOP + 34, '', { class: 'lbl' });
    const hostTag = text(0, TOP + 34, '', { class: 'lbl' });
    ctx.add(netTag, hostTag);
    netTag.setAttribute('class', 'lbl'); netTag.style.fill = 'var(--cyan)';
    hostTag.style.fill = 'var(--amber)';

    const rowY = [128, 148, 168, 188, 208];
    const labels = ['network', 'usable range', 'broadcast', 'subnet mask', 'usable hosts'];
    const vals = labels.map((lb, i) => {
      ctx.add(text(24, rowY[i], lb, { class: 'lbl', 'text-anchor': 'start' }));
      const v = text(416, rowY[i], '', { class: 'lbl lbl-strong', 'text-anchor': 'end', 'font-size': 10.5 });
      ctx.add(v);
      return v;
    });

    ctx.add(text(24, 30, 'address', { class: 'lbl', 'text-anchor': 'start' }));
    const ipTag = text(416, 30, '', { class: 'lbl lbl-strong', 'text-anchor': 'end', 'font-size': 12 });
    ctx.add(ipTag);

    function paint(animate = false) {
      const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
      const network = (ip & mask) >>> 0;
      const broadcast = (network | (~mask >>> 0)) >>> 0;
      const hosts = Math.pow(2, 32 - prefix) - 2;

      for (let i = 0; i < 32; i++) {
        const b = (ip >>> (31 - i)) & 1;
        bits[i].val.textContent = b;
        bits[i].node.setAttribute('class', `chip ${i < prefix ? 'c-cyan' : 'c-amber'}${b ? '' : ' is-off'}`);
      }
      octets.forEach((o, i) => { o.textContent = (ip >>> (24 - i * 8)) & 255; });

      const dx = prefix >= 32 ? bitX(31) + BW + 3 : bitX(prefix) - GAP / 2 - 0.5;
      divider.setAttribute('x1', dx); divider.setAttribute('x2', dx);
      netBand.setAttribute('x', X0 - 3); netBand.setAttribute('width', Math.max(0, dx - X0 + 1));
      hostBand.setAttribute('x', dx + 1); hostBand.setAttribute('width', Math.max(0, bitX(31) + BW + 3 - dx));
      netTag.setAttribute('x', (X0 + dx) / 2); netTag.textContent = `${prefix} network bits`;
      hostTag.setAttribute('x', (dx + bitX(31) + BW) / 2); hostTag.textContent = `${32 - prefix} host bits`;

      ipTag.textContent = `${dotted(ip)}/${prefix}`;
      vals[0].textContent = dotted(network);
      vals[1].textContent = `${dotted(network + 1)} – ${dotted(broadcast - 1)}`;
      vals[2].textContent = dotted(broadcast);
      vals[3].textContent = dotted(mask);
      vals[4].textContent = hosts.toLocaleString();

      if (animate) {
        ctx.say(`<b>/${prefix}</b> → mask <i>${dotted(mask)}</i>. This address sits in <b>${dotted(network)}/${prefix}</b>, which holds <b>${hosts.toLocaleString()}</b> usable hosts.`);
      }
      return { network, hosts };
    }

    ctx.field({ value: '192.168.1.130', label: 'IPv4 address', action: 'Set', maxlength: 15 }, v => {
      const parsed = parseIp(v);
      if (parsed == null) { ctx.say('<span class="no">Not a valid IPv4 address.</span> Try four numbers 0–255, like <i>10.24.7.99</i>.'); return; }
      ip = parsed;
      paint(true);
      bits.forEach((b, i) => { if (i >= prefix) flash(b.node, 'is-hit', 240 + i * 4); });
    });

    ctx.slider({ min: 8, max: 30, value: prefix, label: 'prefix', fmt: v => `/${v}` }, v => {
      prefix = v;
      paint(true);
    });

    ctx.picker(
      [{ label: '/24', value: 24 }, { label: '/26', value: 26 }, { label: '/30', value: 30 }, { label: '/16', value: 16 }],
      v => {
        prefix = v;
        const sl = ctx.controls.querySelector('.sl-input');
        if (sl) { sl.value = v; sl.dispatchEvent(new Event('input')); }
      },
      { label: 'common prefixes', initial: 0 },
    );

    paint();
    ctx.say('Drag the prefix. Every bit you move to the left doubles the number of subnets and halves the hosts in each.');
  },
};
