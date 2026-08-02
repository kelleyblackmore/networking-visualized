// 02 — DNS: names resolve to addresses, and the answer gets cached.

import { g, line, text, chip, device, circle, moveTo, flash, wait, clamp } from '../lib/kit.js';

const DEFAULT_NAME = 'github.com';

const ZONES = [{ key: 'root', y: 44 }, { key: 'tld', y: 108 }, { key: 'auth', y: 172 }];

// The hierarchy is relabelled per lookup, so typing a .io or .dev name walks a
// .io or .dev TLD rather than a hardcoded one.
function zoneCopy(name) {
  const dot = name.lastIndexOf('.');
  const tld = dot > 0 ? name.slice(dot) : '.com';
  return {
    root: { label: 'root .', hint: `ask the ${tld} servers` },
    tld: { label: `TLD ${tld}`, hint: `ask ns1.${name}` },
    auth: { label: 'authoritative', hint: 'the answer' },
  };
}

// A tiny fake zone file so any name the user types resolves to something stable.
function fakeIp(name) {
  let h = 2166136261;
  for (const ch of name) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const b = i => (Math.abs(h >> (i * 7)) % 254) + 1;
  return `${b(0)}.${b(1)}.${b(2)}.${b(3)}`;
}

export default {
  id: 'dns',
  title: 'DNS',
  kicker: 'a name means nothing to a router',
  blurb: 'Names resolve to IP addresses. Ask once, then the answer is cached until its TTL runs out.',
  accent: 'c-mint',

  build(ctx) {
    const cache = new Map(); // name -> { ip, until }
    const TTL = 30;

    const browser = device('monitor', 16, 96);
    ctx.add(browser, text(33, 138, 'browser', { class: 'lbl' }));

    const resolver = device('server', 150, 96);
    ctx.add(resolver, text(167, 138, 'resolver', { class: 'lbl' }));
    const cacheChip = chip(167, 158, 'cache: empty', { fontSize: 9.5, cls: 'c-dim', h: 17 });
    ctx.add(cacheChip);

    const zones = ZONES.map(z => {
      const wire = line(196, 109, 330, z.y, { class: 'wire wire-dash' });
      const node = chip(378, z.y, zoneCopy(DEFAULT_NAME)[z.key].label, { fontSize: 10, cls: 'c-violet' });
      ctx.add(wire, node);
      return { ...z, node, wire };
    });

    ctx.add(line(50, 109, 150, 109, { class: 'wire' }));

    const answer = chip(220, 208, '', { fontSize: 11, cls: 'c-mint' });
    answer.classList.add('ghost');
    ctx.add(answer);

    const pkt = g({ class: 'ghost' }, [circle(0, 0, 4.5, { class: 'pkt' })]);
    ctx.add(pkt);

    ctx.field(
      { value: DEFAULT_NAME, placeholder: 'any-domain.com', action: 'Look up', label: 'domain to resolve' },
      name => lookup(name || DEFAULT_NAME),
    );
    ctx.button('Clear cache', () => {
      cache.clear();
      cacheChip.setText('cache: empty');
      cacheChip.classList.add('c-dim');
      ctx.say('Cache cleared. The next lookup walks the whole hierarchy again.');
    });

    function showCache() {
      const n = cache.size;
      cacheChip.setText(n ? `cache: ${n} name${n > 1 ? 's' : ''}` : 'cache: empty');
      cacheChip.classList.toggle('c-dim', n === 0);
    }

    function lookup(name) {
      const hit = cache.get(name);
      const now = Date.now();
      if (hit && hit.until > now) return fromCache(name, hit);
      return fullWalk(name);
    }

    function fromCache(name, entry) {
      ctx.seq.go(async (_t, check) => {
        const left = clamp(Math.round((entry.until - Date.now()) / 1000), 0, TTL);
        answer.classList.remove('ghost');
        answer.setText(`${name} → ${entry.ip}`);
        pkt.classList.remove('ghost');
        await moveTo(pkt, 50, 109, 150, 109, 200);
        check();
        await flash(cacheChip, 'is-hit', 260);
        check();
        await moveTo(pkt, 150, 109, 50, 109, 200);
        check();
        pkt.classList.add('ghost');
        await flash(browser, 'is-hit', 260);
        ctx.say(`<span class="ok">CACHE HIT</span> — answered in one hop, <b>${left}s</b> of TTL left. No root, no TLD, nobody else asked.`);
      });
    }

    function fullWalk(name) {
      const ip = fakeIp(name);
      const copy = zoneCopy(name);
      zones.forEach(z => z.node.setText(copy[z.key].label));
      ctx.seq.go(async (_t, check) => {
        answer.classList.add('ghost');
        pkt.classList.remove('ghost');
        ctx.say(`Resolving <b>${name}</b> — the resolver knows nothing yet, so it starts at the root.`);
        await moveTo(pkt, 50, 109, 150, 109, 330);
        check();
        await flash(resolver, 'is-hit', 200);

        for (const z of zones) {
          check();
          z.wire.classList.add('wire-live');
          await moveTo(pkt, 196, 109, 330, z.y, 380);
          check();
          await flash(z.node, 'is-hit', 260);
          ctx.say(`<b>${copy[z.key].label}</b>: ${copy[z.key].hint}`);
          await moveTo(pkt, 330, z.y, 196, 109, 320);
          z.wire.classList.remove('wire-live');
        }

        check();
        answer.setText(`${name} → ${ip}`);
        answer.classList.remove('ghost');
        await moveTo(pkt, 150, 109, 50, 109, 330);
        check();
        pkt.classList.add('ghost');
        await flash(browser, 'is-hit', 300);
        cache.set(name, { ip, until: Date.now() + TTL * 1000 });
        showCache();
        ctx.say(`<b>${name}</b> is <i>${ip}</i>. Cached for <b>${TTL}s</b> — look it up again and watch the shortcut.`);
      });
    }

    ctx.say('Type a name and hit <i>Look up</i>. Run the same one twice to see the cache take over.');
  },
};
