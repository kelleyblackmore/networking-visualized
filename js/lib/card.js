// card.js — the shell every visualization is mounted into, plus the control
// widgets (buttons, toggles, sliders, chip pickers) they share.

import { el, s, Seq } from './kit.js';

/**
 * Build a card and hand its module a context object.
 *
 * A viz module exports:
 *   { id, title, kicker, blurb, viewBox?, build(ctx) }
 */
export function buildCard(mod, index) {
  const stage = s('svg', {
    class: 'stage',
    viewBox: mod.viewBox || '0 0 440 230',
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': `${mod.title} diagram`,
  });

  const controls = el('div', { class: 'controls' });
  const readout = el('p', { class: 'readout', 'aria-live': 'polite' });

  const article = el('article', { class: 'card', id: mod.id, tabindex: '-1' }, [
    el('header', { class: 'card-head' }, [
      el('span', { class: 'num', text: String(index + 1).padStart(2, '0') }),
      el('div', {}, [
        el('h2', {}, [mod.title]),
        el('p', { class: 'kicker', text: mod.kicker }),
      ]),
    ]),
    el('div', { class: 'stage-wrap' }, [stage]),
    controls,
    readout,
    el('p', { class: 'blurb', text: mod.blurb }),
  ]);

  const ctx = {
    card: article,
    stage,
    controls,
    seq: new Seq(),

    /** Set the live narration line. Accepts markup. */
    say(html) { readout.innerHTML = html; },

    /** Add anything to the SVG stage. */
    add(...nodes) { stage.append(...nodes); return nodes[0]; },

    button(label, onClick, opts = {}) {
      const b = el('button', {
        class: `btn ${opts.cls || ''}`, type: 'button',
        onclick: ev => onClick(ev, b),
      }, [label]);
      controls.append(b);
      return b;
    },

    /** On/off switch. onChange(isOn) fires on every flip. */
    toggle(label, onChange, initial = false) {
      const input = el('input', { type: 'checkbox', class: 'sr-only', checked: initial || null });
      const knob = el('span', { class: 'sw-knob' });
      const wrap = el('label', { class: `sw ${initial ? 'is-on' : ''}` }, [
        input, el('span', { class: 'sw-track' }, [knob]), el('span', { class: 'sw-label', text: label }),
      ]);
      input.addEventListener('change', () => {
        wrap.classList.toggle('is-on', input.checked);
        onChange(input.checked);
      });
      controls.append(wrap);
      wrap.set = v => { input.checked = v; wrap.classList.toggle('is-on', v); };
      wrap.get = () => input.checked;
      return wrap;
    },

    slider({ min = 0, max = 100, value = 50, step = 1, label = '', fmt = v => v }, onInput) {
      const out = el('output', { class: 'sl-val', text: fmt(value) });
      const input = el('input', { type: 'range', min, max, step, value, class: 'sl-input', 'aria-label': label });
      const wrap = el('label', { class: 'sl' }, [
        el('span', { class: 'sl-label' }, [label, out]), input,
      ]);
      const emit = () => { const v = Number(input.value); out.textContent = fmt(v); onInput(v); };
      input.addEventListener('input', emit);
      controls.append(wrap);
      wrap.value = () => Number(input.value);
      wrap.emit = emit;
      return wrap;
    },

    /** A row of mutually exclusive chips. onPick(value) fires on selection. */
    picker(items, onPick, opts = {}) {
      const wrap = el('div', { class: 'picker', role: 'radiogroup', 'aria-label': opts.label || 'options' });
      const buttons = items.map((it, i) => {
        const b = el('button', {
          class: `pick ${i === (opts.initial ?? 0) ? 'is-sel' : ''}`,
          type: 'button', role: 'radio',
          'aria-checked': i === (opts.initial ?? 0) ? 'true' : 'false',
          onclick: () => { select(i); onPick(it.value ?? it, i); },
        }, [it.label ?? it]);
        wrap.append(b);
        return b;
      });
      function select(i) {
        buttons.forEach((b, j) => {
          b.classList.toggle('is-sel', j === i);
          b.setAttribute('aria-checked', j === i ? 'true' : 'false');
        });
      }
      wrap.select = select;
      wrap.index = () => buttons.findIndex(b => b.classList.contains('is-sel'));
      controls.append(wrap);
      return wrap;
    },

    /** Free-text input with a submit button. */
    field({ value = '', placeholder = '', label = '', action = 'Go', maxlength = 32 }, onSubmit) {
      const input = el('input', { type: 'text', class: 'tf-input', value, placeholder, maxlength, 'aria-label': label || placeholder });
      const go = el('button', { class: 'btn btn-primary', type: 'button', onclick: () => onSubmit(input.value.trim()) }, [action]);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(input.value.trim()); } });
      const wrap = el('div', { class: 'tf' }, [input, go]);
      controls.append(wrap);
      wrap.value = () => input.value.trim();
      wrap.set = v => { input.value = v; };
      return wrap;
    },

    /** A small HTML side panel that sits under the stage (tables, logs). */
    panel(title) {
      const body = el('div', { class: 'panel-body' });
      const p = el('div', { class: 'panel' }, [el('div', { class: 'panel-title', text: title }), body]);
      const panels = article.querySelectorAll('.panel');
      (panels.length ? panels[panels.length - 1] : article.querySelector('.stage-wrap')).after(p);
      p.body = body;
      p.clear = () => { body.textContent = ''; };
      return p;
    },
  };

  return { article, ctx };
}
