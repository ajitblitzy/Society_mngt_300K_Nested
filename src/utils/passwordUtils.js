// passwordUtils.js - Async bcrypt password hashing/verification helpers, backed by a
// worker-thread pool so the CPU-intensive work stays OFF the Node.js event loop.
//
// UTILS LAYER (foundational leaf): this module sits at the very bottom of the new
// Login feature's dependency graph, alongside the other src/utils helpers. It exposes
// exactly two operations the authentication flow needs - deriving a one-way bcrypt
// hash from a plaintext password (registration) and verifying a candidate password
// against a previously stored hash (login) - plus a lifecycle `shutdown()` used to
// tear the pool down cleanly. It contains no business logic, holds no domain state,
// and makes no policy decisions of its own.
//
// PUBLIC API IS UNCHANGED (drop-in): `hash(password, rounds) => Promise<string>` and
// `compare(password, hashedPassword) => Promise<boolean>` keep the EXACT same
// signatures and return types they always had, so src/services/authService.js (and
// the tests) require zero changes. The only addition is the optional, additive
// `shutdown()` export. Callers still do
// `const { hash, compare } = require('../utils/passwordUtils');`.
//
// WHY A WORKER POOL (AAP 0.2.3 - "the asynchronous bcrypt APIs must be used on the
// server to avoid blocking the Node.js event loop"). The pure-JS `bcryptjs` library
// (chosen over native `bcrypt` to avoid a node-gyp build - AAP 0.3.1) only yields to
// the event loop when an internal work chunk exceeds ~100ms. A rounds=10 hash takes
// ~77-86ms (< 100ms), so it runs as ONE uninterrupted chunk that never yields - even
// via bcryptjs's "async" callback form. Consequently, firing several hashes
// concurrently on the main thread serializes them and starves every other in-flight
// request (health checks, reports, everything) for the entire batch. Moving the hash
// /compare work into a small pool of Node.js worker threads keeps the main event loop
// free: the main thread only does cheap message passing, so GET /health and report
// endpoints stay responsive while hashes run in parallel across the pool. This is the
// non-blocking property the AAP intends, achieved WITHOUT switching to native bcrypt
// and WITHOUT adding any npm dependency (Node's built-in `worker_threads` only).
//
// POOL SIZING (no new env var - AAP keeps .env.example to its 4 documented vars). The
// pool size is derived from the host's available parallelism and CAPPED at
// MAX_POOL_SIZE so high-core machines do not over-spawn threads. It is intentionally
// NOT configurable via the environment.
//
// LAZY + EVENT-LOOP-FRIENDLY: workers are spawned on first use (so merely requiring
// this module is free), reused across requests (workers are long-lived, never
// per-request), and `unref()`'d whenever no work is outstanding. Reference counting
// re-`ref()`s them only while jobs are in flight. The practical effect: a process
// that has finished all hashing (e.g. a Jest test run) is NOT kept alive by idle
// workers, so the test runner exits cleanly with no open-handle hangs and no need for
// --forceExit; yet the process stays alive while a hash/compare is genuinely pending.
//
// ROBUSTNESS: a per-job id correlates each worker response to its awaiting promise;
// errors are propagated as real rejections; if a worker dies unexpectedly its in-
// flight job is rejected and the worker is respawned to keep the pool at strength;
// and queued work is dispatched as soon as a worker frees up.
//
// SECURITY (AAP 0.8 / C6 - passwords stored only as bcrypt hashes, never plaintext):
// this module performs NO logging whatsoever - it never writes the plaintext
// password, the resulting hash, the cost factor, or any other value to `console` or
// any stream. The plaintext crosses the worker boundary only as an in-memory
// structured-clone copy of the message; it is never persisted. The returned hash is a
// self-describing bcrypt string (algorithm, cost, and salt encoded in the value),
// which is exactly what should be persisted in the user record.
//
// Module system: CommonJS (require / module.exports). No ESM. The existing scaffold
// `file_*.js` / `src/utils/filler.js` modules are read-only filler and are neither
// referenced nor imported here (AAP 0.6.2).

'use strict';

const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');

// Absolute path to the worker script. Resolved from __dirname so it works regardless
// of the process's current working directory (server start, tests, ad-hoc scripts).
const WORKER_PATH = path.join(__dirname, 'passwordWorker.js');

// Hard cap on pool size. Four threads comfortably absorb a concurrent auth burst
// (e.g. the 20 simultaneous registrations exercised by load testing) while leaving
// the main thread free, and avoids spawning dozens of threads on high-core hosts.
const MAX_POOL_SIZE = 4;

/**
 * Compute the worker-pool size: the host's available parallelism, clamped to
 * [1, MAX_POOL_SIZE]. Falls back safely to 1 if the runtime cannot report core count.
 * @returns {number} The number of worker threads to run.
 */
function computePoolSize() {
  let cores;
  try {
    cores = typeof os.availableParallelism === 'function'
      ? os.availableParallelism()
      : os.cpus().length;
  } catch (_) {
    cores = 1;
  }
  if (!Number.isInteger(cores) || cores < 1) {
    cores = 1;
  }
  return Math.max(1, Math.min(MAX_POOL_SIZE, cores));
}

const POOL_SIZE = computePoolSize();

// ---------------------------------------------------------------------------
// Pool state (module-scoped singletons). The pool is a process-wide resource: one
// set of workers serves all hash/compare calls in the process.
// ---------------------------------------------------------------------------

// Each entry wraps one worker: { worker: Worker, busy: boolean,
// currentJobId: number|null, dead: boolean }.
let workers = [];

// Whether the pool has been lazily initialized yet.
let started = false;

// Monotonic id generator used to correlate responses to awaiting promises.
let nextJobId = 1;

// id -> { resolve, reject } for every submitted-but-unresolved job.
const pending = new Map();

// Jobs waiting for a free worker: { id: number, message: object }.
const queue = [];

// Count of outstanding jobs (in-flight + queued). Drives ref()/unref() so the process
// is kept alive while work is pending but not while the pool is idle.
let pendingCount = 0;

// Set while shutdown() is tearing the pool down, so worker 'exit' events do not
// trigger respawns during teardown.
let shuttingDown = false;

// ---------------------------------------------------------------------------
// ref/unref helpers: keep the process alive only while work is outstanding.
// ---------------------------------------------------------------------------

/** ref() every live worker so the event loop stays alive while jobs are pending. */
function refAll() {
  for (const wr of workers) {
    if (wr.worker && !wr.dead) {
      wr.worker.ref();
    }
  }
}

/** unref() every live worker so idle workers never keep the process (or Jest) alive. */
function unrefAll() {
  for (const wr of workers) {
    if (wr.worker && !wr.dead) {
      wr.worker.unref();
    }
  }
}

/** Increment the outstanding-job counter, ref()'ing the pool on the idle->busy edge. */
function incrementPending() {
  const was = pendingCount;
  pendingCount += 1;
  if (was === 0) {
    refAll();
  }
}

/** Decrement the outstanding-job counter, unref()'ing the pool on the busy->idle edge. */
function decrementPending() {
  pendingCount -= 1;
  if (pendingCount <= 0) {
    pendingCount = 0;
    unrefAll();
  }
}

// ---------------------------------------------------------------------------
// Worker lifecycle.
// ---------------------------------------------------------------------------

/**
 * Spawn one worker, wire its message/error/exit handlers, and register it in the
 * pool. Newly spawned workers inherit the current ref state (ref()'d only if work is
 * already outstanding) so they never independently keep the process alive when idle.
 * @returns {object} The worker wrapper.
 */
function spawnWorker() {
  const wrapper = { worker: null, busy: false, currentJobId: null, dead: false };
  const worker = new Worker(WORKER_PATH);
  wrapper.worker = worker;

  worker.on('message', (msg) => handleMessage(wrapper, msg));
  worker.on('error', (err) => handleWorkerError(wrapper, err));
  worker.on('exit', (code) => handleWorkerExit(wrapper, code));

  // Match the pool's current liveness: only keep the process alive if work is pending.
  if (pendingCount > 0) {
    worker.ref();
  } else {
    worker.unref();
  }

  workers.push(wrapper);
  return wrapper;
}

/** Lazily start the pool on first use. Spawning is deferred so `require` stays cheap. */
function ensureStarted() {
  if (started) {
    return;
  }
  started = true;
  for (let i = 0; i < POOL_SIZE; i += 1) {
    spawnWorker();
  }
}

/**
 * Assign a job to a specific (free) worker and dispatch it.
 * @param {object} wrapper The target worker wrapper.
 * @param {number} id The job id.
 * @param {object} message The full message (including id) to post.
 */
function assign(wrapper, id, message) {
  wrapper.busy = true;
  wrapper.currentJobId = id;
  wrapper.worker.postMessage(message);
}

/** Find a worker that is idle and alive, or undefined if all are busy/dead. */
function findFreeWorker() {
  return workers.find((wr) => !wr.busy && !wr.dead && wr.worker);
}

/** Dispatch as many queued jobs as there are free workers available. */
function dispatchQueued() {
  while (queue.length > 0) {
    const free = findFreeWorker();
    if (!free) {
      break;
    }
    const next = queue.shift();
    assign(free, next.id, next.message);
  }
}

/**
 * Handle a normal completion message from a worker: resolve/reject the awaiting
 * promise, free the worker, account for the finished job, and pull in queued work.
 * @param {object} wrapper The worker that produced the message.
 * @param {{id:number, ok:boolean, result?:*, error?:object}} msg The response.
 */
function handleMessage(wrapper, msg) {
  const id = msg && msg.id;
  // Mark the worker free regardless of whether we still track the job.
  wrapper.busy = false;
  wrapper.currentJobId = null;

  const job = pending.get(id);
  if (job) {
    pending.delete(id);
    if (msg.ok) {
      job.resolve(msg.result);
    } else {
      job.reject(reconstructError(msg.error));
    }
    decrementPending();
  }

  // A worker just freed up - hand it the next queued job, if any.
  dispatchQueued();
}

/**
 * Reject the in-flight job (if any) held by a worker that errored or exited.
 * @param {object} wrapper The affected worker wrapper.
 * @param {Error} err The error to reject with.
 */
function failWrapperJob(wrapper, err) {
  const id = wrapper.currentJobId;
  wrapper.busy = false;
  wrapper.currentJobId = null;
  if (id == null) {
    return;
  }
  const job = pending.get(id);
  if (job) {
    pending.delete(id);
    job.reject(err instanceof Error ? err : new Error(String(err)));
    decrementPending();
  }
}

/**
 * Handle a worker 'error' event (an uncaught exception inside the worker). bcryptjs's
 * async API rejects (it does not throw uncaught), so this is exceptional; we still
 * reject the in-flight job so its caller never hangs. Cleanup/respawn happens in the
 * subsequent 'exit' handler.
 * @param {object} wrapper The worker wrapper.
 * @param {Error} err The uncaught worker error.
 */
function handleWorkerError(wrapper, err) {
  failWrapperJob(wrapper, err instanceof Error ? err : new Error(String(err)));
}

/**
 * Handle a worker 'exit' event. During shutdown this is expected (we terminated it).
 * Otherwise the worker died unexpectedly: reject any in-flight job, drop it from the
 * pool, and respawn a replacement so the pool stays at strength and queued work can
 * still be served.
 * @param {object} wrapper The worker wrapper.
 * @param {number} code The worker exit code.
 */
function handleWorkerExit(wrapper, code) {
  wrapper.dead = true;

  // If it died mid-job (and 'error' did not already settle it), reject now so the
  // awaiting promise does not hang forever.
  if (wrapper.currentJobId != null) {
    failWrapperJob(
      wrapper,
      new Error(`passwordUtils: worker exited unexpectedly (code ${code}) during a job`),
    );
  }

  // Remove the dead worker from the pool.
  workers = workers.filter((wr) => wr !== wrapper);

  // During teardown we do not respawn; shutdown()'s terminate() drives these exits.
  if (shuttingDown) {
    return;
  }

  // Keep the pool at strength and continue serving any queued work.
  if (started && workers.length < POOL_SIZE) {
    spawnWorker();
    dispatchQueued();
  }
}

/**
 * Rebuild a real Error from the {name, message} envelope a worker posts back, so
 * callers see a faithful rejection (e.g. authService/login on a malformed hash).
 * @param {{name?:string, message?:string}} envelope The serialized error.
 * @returns {Error} A reconstructed Error.
 */
function reconstructError(envelope) {
  const message = envelope && typeof envelope.message === 'string'
    ? envelope.message
    : 'passwordUtils: worker reported an error';
  const err = new Error(message);
  if (envelope && typeof envelope.name === 'string') {
    err.name = envelope.name;
  }
  return err;
}

/**
 * Submit a unit of work to the pool and return a promise for its result. Lazily starts
 * the pool, allocates a correlation id, and either dispatches to a free worker or
 * queues the job until one frees up.
 * @param {object} message The work payload (op + args), WITHOUT an id.
 * @returns {Promise<*>} Resolves/rejects with the worker's result/error.
 */
function submit(message) {
  ensureStarted();
  return new Promise((resolve, reject) => {
    const id = nextJobId;
    nextJobId += 1;
    pending.set(id, { resolve, reject });
    incrementPending();

    const full = Object.assign({ id }, message);
    const free = findFreeWorker();
    if (free) {
      assign(free, id, full);
    } else {
      queue.push({ id, message: full });
    }
  });
}

// ---------------------------------------------------------------------------
// Public API (unchanged signatures) + additive shutdown().
// ---------------------------------------------------------------------------

/**
 * Asynchronously derive a bcrypt hash of a plaintext password, off the event loop.
 *
 * The work is performed inside a worker thread via {@link submit}; the returned
 * promise resolves to the self-describing bcrypt hash string (encoding algorithm,
 * cost, and a fresh random salt) suitable for persisting in the user record. The
 * `rounds` cost factor is ALWAYS provided by the caller (authService passes the
 * configured BCRYPT_ROUNDS); this helper neither imports config nor hardcodes a
 * default. Environment-derived values may be strings, so `rounds` is coerced with
 * `Number(...)` inside the worker (matching the historical single-call behavior).
 *
 * @param {string} password The plaintext password to hash. Never logged or stored.
 * @param {number|string} rounds The bcrypt cost factor (salt rounds) from the caller.
 * @returns {Promise<string>} Resolves to the bcrypt hash string.
 */
async function hash(password, rounds) {
  return submit({ op: 'hash', password, rounds });
}

/**
 * Asynchronously verify a plaintext password against a stored bcrypt hash, off the
 * event loop.
 *
 * The comparison runs inside a worker thread via {@link submit}. bcryptjs extracts the
 * algorithm, cost factor, and salt embedded in the stored hash and performs a
 * constant-time comparison, so the original cost factor is not (and must not be)
 * supplied here. The documented public signature is `compare(password, hash)`; the
 * second parameter is named `hashedPassword` internally purely for readability.
 *
 * @param {string} password The candidate plaintext password to verify. Never logged.
 * @param {string} hashedPassword The previously stored bcrypt hash to verify against.
 * @returns {Promise<boolean>} Resolves to `true` on match, `false` otherwise. Rejects
 *   only if bcrypt itself errors (e.g. a malformed hash string).
 */
async function compare(password, hashedPassword) {
  return submit({ op: 'compare', password, hashedPassword });
}

/**
 * Gracefully tear down the worker pool, terminating every worker thread and resolving
 * once they have all exited. Safe to call when the pool was never started (resolves
 * immediately) and idempotent across repeated calls. After teardown the pool can lazily
 * re-initialize on the next hash()/compare() call (useful for test isolation and
 * server restarts).
 *
 * Intended to be invoked from the process's graceful-shutdown path (see
 * src/server.js). In normal operation the HTTP server drains in-flight requests before
 * this is called, so there are no outstanding hash jobs at teardown; any that remain
 * are rejected so their callers never hang.
 *
 * @returns {Promise<void>} Resolves when all workers have terminated.
 */
function shutdown() {
  shuttingDown = true;

  const current = workers.slice();
  workers = [];
  started = false;

  // Reject any still-pending jobs so awaiting callers settle rather than hang.
  for (const [, job] of pending) {
    job.reject(new Error('passwordUtils: worker pool shut down before the job completed'));
  }
  pending.clear();
  queue.length = 0;
  pendingCount = 0;

  const terminations = current.map((wr) => {
    if (!wr.worker) {
      return Promise.resolve();
    }
    // terminate() stops the worker ASAP and resolves with its exit code; swallow any
    // termination error - we only care that the thread is gone.
    return wr.worker.terminate().catch(() => undefined);
  });

  return Promise.all(terminations).then(() => {
    // Pool fully torn down; allow lazy re-initialization on a subsequent call.
    shuttingDown = false;
  });
}

// CommonJS named exports. `hash` and `compare` keep their exact historical signatures
// (drop-in for authService and the existing tests); `shutdown` is an additive
// lifecycle hook used by the server's graceful-shutdown path.
module.exports = {
  hash,
  compare,
  shutdown,
};
