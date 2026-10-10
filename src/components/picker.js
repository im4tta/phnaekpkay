import { h, setChildren } from '../lib/dom.js';
import { friendlyLabel } from '../lib/format.js';

/**
 * Photo picker: a row of thumbnails where two are marked (A = first slot, B = second).
 * Tapping a photo assigns it to the slot chosen by the caller.
 *
 * @param {HTMLElement} row
 * @param {{frames: Array, aId: number|null, bId: number|null, aLabel: string, bLabel: string, addLabel: string,
 *          onPick: (id:number)=>void, onAdd: ()=>void}} opts
 */
export function renderPicker(row, { frames, aId, bId, aLabel, bLabel, addLabel, onPick, onAdd }) {
  const items = frames.map((im) => {
    const isA = im.id === aId;
    const isB = im.id === bId;
    const badge = isA && isB ? `${aLabel} / ${bLabel}` : isA ? aLabel : isB ? bLabel : null;
    return h(
      'button',
      {
        type: 'button',
        class: 'pick' + (isA ? ' is-a' : '') + (isB ? ' is-b' : ''),
        'aria-pressed': String(isA || isB),
        title: im.label,
        dataset: { id: im.id },
        onclick: () => onPick(im.id),
      },
      h('img', { class: 'pick-thumb', src: im.thumb || im.src, alt: '', decoding: 'async', draggable: 'false' }),
      badge && h('span', { class: 'pick-badge' }, badge),
      h('span', { class: 'pick-label' }, friendlyLabel(im.label)),
    );
  });
  items.push(
    h(
      'button',
      { type: 'button', class: 'pick add', onclick: onAdd },
      h('span', { class: 'pick-thumb' }, '+'),
      h('span', { class: 'pick-label' }, addLabel),
    ),
  );
  setChildren(row, items);
}

/**
 * Decide the new pair after tapping `tappedId`. The tap fills `slot` ('a' or 'b');
 * tapping the photo that is already in the other slot swaps the two instead of
 * leaving the same photo on both sides.
 */
export function nextPair({ aId, bId }, tappedId, slot) {
  if (slot === 'a') return tappedId === bId ? { aId: bId, bId: aId } : { aId: tappedId, bId };
  return tappedId === aId ? { aId: bId, bId: aId } : { aId, bId: tappedId };
}
