// Worker du champ de l'animation de la TAVI (js/tavi-mask-core.js) : le calcul tourne hors du fil principal ; le
// résultat revient par transfert (sans copie).
import { computeTaviMask } from './tavi-mask-core.js';

self.onmessage = (e) => {
  const r = computeTaviMask(e.data);
  self.postMessage(r, [r.data.buffer, r.ribbon.pos.buffer, r.ribbon.idx.buffer, r.liner.pos.buffer, r.liner.nrm.buffer, r.liner.idx.buffer]);
};
