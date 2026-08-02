# networking-visualized

Fifteen networking concepts, each one an interactive visualization that only moves when you do
something. Click a device, drag a prefix, drop some packets, flip the lock.

**Live:** https://kelleyblackmore.github.io/networking-visualized/

## The fifteen

| # | Concept | What you can do to it |
|---|---------|-----------------------|
| 01 | IP Address | Click any device to route a packet to it; renumber the whole subnet |
| 02 | DNS | Resolve any name you type, then resolve it again and watch the cache short-circuit the walk |
| 03 | Ports | Knock on four ports; stop `sshd` and watch `:22` start refusing |
| 04 | MAC Address | Send a frame and watch the MAC pair get rewritten at every hop while the IP pair never changes |
| 05 | NAT | Start flows from three private hosts and watch the translation table fill in and map the replies back |
| 06 | DHCP | Plug in a device for the DISCOVER/OFFER/REQUEST/ACK handshake, then let the lease run out |
| 07 | Packets | Split a file into 3–7 chunks, turn on a lossy link, watch them arrive out of order and get reassembled |
| 08 | OSI Model | Send a message down all seven layers and back up, watching headers wrap and peel off |
| 09 | Subnetting & CIDR | Drag the prefix across 32 bits; live network, broadcast, mask, range and host count |
| 10 | Router vs Switch | Same sender, two destinations — one never touches the router |
| 11 | TCP vs UDP | Race eight packets down both lanes at a packet-loss rate you choose |
| 12 | HTTP / HTTPS | Type a secret, send it in the clear, then flip on TLS and send it again |
| 13 | TLS | Step through the handshake one message at a time before any data moves |
| 14 | Firewall | Pick a port and source, send it through the rule list, switch rules off to change the outcome |
| 15 | VPN | Visit sites with and without a tunnel; compare what the ISP sees against what the exit node sees |

Plus a hero **tracer** that runs one request end to end and links each stage to its card.

## How it is built

No frameworks, no build step, no dependencies, no trackers — plain HTML, CSS and ES modules,
served straight from the repo.

```
index.html
css/styles.css
js/
  main.js            card registry + scroll reveal + jump nav
  hero.js            the end-to-end request tracer
  lib/kit.js         DOM/SVG builders, tween engine, cancellable sequences
  lib/card.js        card shell + shared controls (buttons, toggles, sliders, pickers, panels)
  viz/*.js           one module per concept
```

Each visualization is a module exporting `{ id, title, kicker, blurb, accent, build(ctx) }`.
`ctx` hands it an SVG stage, a live narration line, and the control widgets, so a new card is
mostly diagram code:

```js
export default {
  id: 'example', title: 'Example', kicker: 'sub-heading', blurb: 'one-line takeaway',
  accent: 'c-mint',
  build(ctx) {
    const box = ctx.add(chip(220, 60, 'hello'));
    ctx.button('Go', () => ctx.seq.go(async (_t, check) => {
      await moveTo(box, 0, 0, 100, 0, 600);
      check();                       // bail out if the user clicked again
      ctx.say('Arrived.');
    }), { cls: 'btn-primary' });
  },
};
```

Add it to the `MODULES` array in `js/main.js` and it appears in the grid and the jump nav.

### Notes

- **One ticker for the page.** `kit.js` runs a single clock that uses `requestAnimationFrame`
  while the tab is visible and falls back to timers when it is not, so a backgrounded tab
  finishes its animations instead of stranding them half-done.
- **Every sequence is cancellable.** Clicking a button mid-animation abandons the running
  sequence rather than interleaving two of them.
- **`prefers-reduced-motion` is respected** — tweens resolve immediately and pauses collapse,
  so the same code still narrates each step without moving anything.
- **Diagram text scales up on narrow screens**, since the SVG stage shrinks with the card.

## Running it locally

Any static file server will do:

```bash
python -m http.server 3496
```

Then open http://localhost:3496.

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which publishes the repo root to
GitHub Pages.
