// Module worker for the Definition tab's live engine (engine.js): one request at a time, in order; progress messages
// while it loads. Messages: { id, op, args } → { id, r } or { id, err }; { progress } while init runs.
import * as ENG from './engine.js';

let queue = Promise.resolve();
async function handle({ id, op, args = [] }) {
  try {
    const r = op === 'init' ? await ENG.init(args[0], (text) => self.postMessage({ progress: text })) : ENG[op](...args);
    self.postMessage({ id, r });
  } catch (e) { self.postMessage({ id, err: String((e && e.stack) || e) }); }
}
self.onmessage = (ev) => { queue = queue.then(() => handle(ev.data)); };
