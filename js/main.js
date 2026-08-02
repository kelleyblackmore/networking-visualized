// Wires the 15 cards into the page.

import { buildCard } from './lib/card.js';
import { el } from './lib/kit.js';
import { mountHero } from './hero.js';

import ip from './viz/ip.js';
import dns from './viz/dns.js';
import ports from './viz/ports.js';
import mac from './viz/mac.js';
import nat from './viz/nat.js';
import dhcp from './viz/dhcp.js';
import packets from './viz/packets.js';
import osi from './viz/osi.js';
import cidr from './viz/cidr.js';
import routerSwitch from './viz/routerswitch.js';
import tcpudp from './viz/tcpudp.js';
import http from './viz/http.js';
import tls from './viz/tls.js';
import firewall from './viz/firewall.js';
import vpn from './viz/vpn.js';

const MODULES = [ip, dns, ports, mac, nat, dhcp, packets, osi, cidr, routerSwitch, tcpudp, http, tls, firewall, vpn];

const grid = document.getElementById('grid');
const jump = document.getElementById('jump');
const built = [];

MODULES.forEach((mod, i) => {
  const { article, ctx } = buildCard(mod, i);
  article.classList.add(mod.accent || 'c-violet');
  grid.append(article);
  try {
    mod.build(ctx);
  } catch (err) {
    console.error(`[${mod.id}] failed to build`, err);
    ctx.say('<span class="no">This visualization failed to load.</span>');
  }
  built.push({ mod, ctx, article });

  jump.append(el('a', {
    href: `#${mod.id}`,
    text: `${String(i + 1).padStart(2, '0')} ${mod.title}`,
    onclick: () => setTimeout(() => document.getElementById(mod.id)?.focus({ preventScroll: true }), 400),
  }));
});

// reveal cards as they scroll in
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  built.forEach(b => io.observe(b.article));
} else {
  built.forEach(b => b.article.classList.add('is-in'));
}

mountHero(document.getElementById('tracer'));

document.getElementById('year').textContent = new Date().getFullYear();

// small hook for debugging / headless checks
window.__NV = { modules: MODULES, cards: built };
