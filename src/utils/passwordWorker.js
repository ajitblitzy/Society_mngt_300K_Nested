// passwordWorker.js - Worker-thread bcrypt executor for the Login feature.
//
// UTILS LAYER (worker entry point). This module is NOT required like an ordinary
// helper; it is the script body that runs INSIDE each Node.js worker thread spawned
// by src/utils/passwordUtils.js. Its sole job is to perform the CPU-intensive bcrypt
// work (hashing on registration, comparison on login) on a thread OTHER than the
// main event-loop thread, then hand the result back to the pool on the main thread.
//
// WHY THIS EXISTS (AAP 0.2.3 - "async bcrypt APIs must be used ... to avoid blocking
// the Node.js event loop"). The pure-JS `bcryptjs` library (chosen over native
// `bcrypt` to avoid a node-gyp build - AAP 0.3.1) computes a hash as a single
// uninterrupted chunk whenever that chunk finishes in under bcryptjs's internal
// 100ms yield threshold (a rounds=10 hash takes ~77-86ms, i.e. < 100ms). Its "async"
// callback form therefore still runs to completion on whatever thread invokes it
// without yielding, so issuing several hashes concurrently on the main thread
// serializes them and starves every other request (e.g. GET /health) for the whole
// batch. Running each hash inside a dedicated worker thread keeps that work entirely
// off the main event loop, so the main thread stays responsive while hashes run in
// parallel across the pool. This is the non-blocking behavior the AAP intends.
//
// SAME DEPENDENCY, SAME ASYNC API (no new packages - built-in `worker_threads` only).
// The worker requires the very same `bcryptjs` package and uses ONLY its
// promise-returning asynchronous forms (`bcrypt.hash` / `bcrypt.compare` with no
// callback). The blocking synchronous variants (`hashSync`, `compareSync`,
// `genSaltSync`) are NEVER used. The cost factor (`rounds`) is supplied by the caller
// in the message payload (ultimately BCRYPT_ROUNDS from config); this worker imports
// no application config of its own.
//
// SECURITY (AAP 0.8 / C6): performs NO logging whatsoever. The plaintext password
// crosses the thread boundary only as an in-memory structured-clone copy of the
// message - it is never written to console, any stream, or disk. Errors are returned
// as small {name, message} envelopes so the main thread can re-throw a faithful Error
// without leaking unexpected internals.
//
// PROTOCOL (with src/utils/passwordUtils.js):
//   inbound  message: { id:number, op:'hash'|'compare', password:string,
//                        rounds?:number|string, hashedPassword?:string }
//   outbound message: { id:number, ok:true,  result:string|boolean }
//                  or { id:number, ok:false, error:{ name:string, message:string } }
// Every inbound message produces EXACTLY one outbound message carrying the same `id`,
// so the pool can correlate responses to the promises awaiting them.
//
// Module system: CommonJS (require). No ESM. Never imports any pre-existing
// `file_*.js` / `filler.js` scaffold module (additive-only mandate - AAP 0.6.2).

'use strict';

// `parentPort` is the MessagePort connecting this worker to the spawning pool on the
// main thread. It is only defined when this file is executed as a worker thread.
const { parentPort } = require('worker_threads');

// The same pure-JS bcrypt implementation used everywhere else in the feature. We use
// only its async (Promise-returning) surface - see the ASYNC API note above.
const bcrypt = require('bcryptjs');

// Guard: this script must run as a worker thread (parentPort present). If it is ever
// require()'d on the main thread by mistake, fail loudly rather than silently no-op.
if (!parentPort) {
  throw new Error('passwordWorker.js must be executed as a worker thread (no parentPort present)');
}

/**
 * Convert an arbitrary thrown/rejected value into a small, clone-safe envelope so it
 * can be posted back to the main thread (Error objects do not survive structured
 * clone with their prototype/stack intact across the port in a useful way).
 *
 * @param {*} err The rejection reason / thrown value from bcryptjs.
 * @returns {{ name: string, message: string }} A minimal, serializable error shape.
 */
function toErrorEnvelope(err) {
  if (err && typeof err === 'object') {
    return {
      name: typeof err.name === 'string' ? err.name : 'Error',
      message: typeof err.message === 'string' ? err.message : String(err),
    };
  }
  return { name: 'Error', message: String(err) };
}

// Handle each work request. We deliberately do NOT make the listener `async`; instead
// we obtain the bcrypt Promise and attach handlers, posting exactly one response per
// request. Any synchronous throw (e.g. an unknown op) is also funneled to a single
// error response so the pool's awaiting promise can never hang.
parentPort.on('message', (msg) => {
  // Defensive destructure - a malformed message still yields one error response.
  const id = msg && msg.id;
  const op = msg && msg.op;

  try {
    let work;
    if (op === 'hash') {
      // Mirror passwordUtils' historical behavior precisely: coerce rounds with
      // Number(...) so bcryptjs treats it as a cost factor (auto-salting), and use
      // the no-callback Promise form. Each call uses a fresh random salt.
      work = bcrypt.hash(msg.password, Number(msg.rounds));
    } else if (op === 'compare') {
      // bcryptjs reads the salt/cost embedded in the stored hash; only the plaintext
      // and the stored hash are needed. Promise (no-callback) form.
      work = bcrypt.compare(msg.password, msg.hashedPassword);
    } else {
      // Unknown operation: respond with an error rather than leaving the caller hung.
      parentPort.postMessage({ id, ok: false, error: { name: 'Error', message: `passwordWorker: unknown op '${op}'` } });
      return;
    }

    work.then(
      (result) => parentPort.postMessage({ id, ok: true, result }),
      (err) => parentPort.postMessage({ id, ok: false, error: toErrorEnvelope(err) }),
    );
  } catch (err) {
    // Synchronous failure path (extremely unlikely for the async bcrypt API, but kept
    // so a single request always produces a single response).
    parentPort.postMessage({ id, ok: false, error: toErrorEnvelope(err) });
  }
});
