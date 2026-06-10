// reportRepository.js - In-memory report-source data, seeded (CommonJS; no DB/ORM; 'const store = []' idiom)
//
// REPOSITORY LAYER (Reporting feature). This module owns the feature's raw,
// seeded SOURCE data and the read methods that expose it. It deliberately holds
// ONLY persistence/data-source concerns:
//   * It DECLARES module-level seeded arrays (members, dues, occupancy), which
//     are this feature's realization of the scaffold's `const store = [];`
//     idiom -- here several seeded stores instead of one empty one.
//   * It RETURNS shallow clones of those rows so the immutable seed can never be
//     mutated by callers.
//
// It performs NO aggregation, NO summation/counting, NO outstanding-balance or
// daysOverdue computation, and NO DTO shaping. By design there is:
//   * NO database, ORM, SQL, migration, or query builder,
//   * NO file system, HTTP, or any other network/disk I/O,
//   * NO external/third-party dependency,
//   * nothing async.
// The structure (read methods over private arrays) is intentionally shaped so a
// real database-backed implementation could replace the in-memory store later
// without changing this module's public contract.
//
// Consumers load this module via CommonJS `require('../repositories/reportRepository')`:
//   - src/services/reportService.js -> reads these source rows and aggregates
//     them into the four domain reports:
//       * `members`     (Member Directory)  <- getMembers()
//       * `dues`        (Dues & Collection)  <- getDues()
//       * `outstanding` (Outstanding Payments) DERIVED by the service from
//                        getDues() (filter balance > 0, compute daysOverdue
//                        from dueDate) -- there is intentionally NO
//                        getOutstanding() here.
//       * `occupancy`   (Occupancy)          <- getOccupancy()
//
// Row field names are chosen to line up 1:1 with the reportModel row factories
// (createMemberRow / createDuesRow / createOccupancyRow) so the service can map
// source rows into report DTOs with minimal effort. The canonical role strings
// come from the DOMAIN layer (src/domain/user.js) -- this file imports ROLES
// rather than hardcoding the literals 'admin'/'member'.

'use strict';

// Domain role constants (single source of truth). Imported so the member seed's
// `role` field uses ROLES.ADMIN / ROLES.MEMBER instead of bare string literals,
// keeping the seed in lock-step with the canonical roles defined in the domain
// layer. ROLES is a frozen object: { ADMIN: 'admin', MEMBER: 'member' }.
const { ROLES } = require('../domain/user');

/**
 * Member Directory source rows -- one record per OCCUPIED unit.
 *
 * The vacant unit (B-202) intentionally has NO member record here; occupancy of
 * that unit is represented only in the `occupancy` store below. Field names
 * align with reportModel.createMemberRow: { unitNumber, memberName, email,
 * phone, role }. Exactly one ADMIN (the society secretary, Meera Nair / B-201);
 * everyone else is a standard MEMBER. Contact data uses the reserved-for-docs
 * `*.example` domain so it can never collide with a real mailbox.
 *
 * @type {Array<{ unitNumber: string, memberName: string, email: string, phone: string, role: string }>}
 */
const members = [
  { unitNumber: 'A-101', memberName: 'Asha Rao',     email: 'asha.rao@society.example',     phone: '+91-90000-00001', role: ROLES.MEMBER },
  { unitNumber: 'A-102', memberName: 'Vikram Singh',  email: 'vikram.singh@society.example',  phone: '+91-90000-00002', role: ROLES.MEMBER },
  { unitNumber: 'B-201', memberName: 'Meera Nair',    email: 'meera.nair@society.example',    phone: '+91-90000-00003', role: ROLES.ADMIN  },
  { unitNumber: 'C-301', memberName: 'Rahul Gupta',   email: 'rahul.gupta@society.example',   phone: '+91-90000-00004', role: ROLES.MEMBER },
];

/**
 * Maintenance-dues source rows -- the raw billing/collection ledger.
 *
 * Field names align with reportModel.createDuesRow inputs PLUS a `dueDate` that
 * the SERVICE uses to derive the outstanding report's `daysOverdue`:
 *   { unitNumber, memberName, period, amountDue, amountPaid, dueDate }.
 *
 * Intentionally there is NO `balance` field -- reportModel.createDuesRow derives
 * `balance = amountDue - amountPaid` when absent, so storing it here would risk
 * drift between the stored and derived values. `amountPaid` is the collections
 * ("payments") view, captured as a paid amount rather than a separate payments
 * array to keep the seed coherent and non-redundant.
 *
 * The data is deliberately a MIX so the dues/outstanding reports are meaningful:
 *   - fully paid  : amountPaid === amountDue (balance 0)            e.g. A-101, B-201
 *   - partially   : 0 < amountPaid < amountDue                      e.g. A-102
 *   - unpaid      : amountPaid === 0                                e.g. B-202, C-301
 * The current period '2026-05' is present for all five units; the prior period
 * '2026-04' is present (fully paid) for two units to give the report history.
 *
 * @type {Array<{ unitNumber: string, memberName: string, period: string, amountDue: number, amountPaid: number, dueDate: string }>}
 */
const dues = [
  // Current period (2026-05) -- one row per unit, covering the full paid/partial/unpaid mix.
  { unitNumber: 'A-101', memberName: 'Asha Rao',     period: '2026-05', amountDue: 2500, amountPaid: 2500, dueDate: '2026-05-10' }, // fully paid
  { unitNumber: 'A-102', memberName: 'Vikram Singh',  period: '2026-05', amountDue: 2500, amountPaid: 1000, dueDate: '2026-05-10' }, // partially paid
  { unitNumber: 'B-201', memberName: 'Meera Nair',    period: '2026-05', amountDue: 3000, amountPaid: 3000, dueDate: '2026-05-10' }, // fully paid
  { unitNumber: 'B-202', memberName: '',              period: '2026-05', amountDue: 3000, amountPaid: 0,    dueDate: '2026-05-10' }, // unpaid (vacant unit still billed)
  { unitNumber: 'C-301', memberName: 'Rahul Gupta',   period: '2026-05', amountDue: 2500, amountPaid: 0,    dueDate: '2026-05-10' }, // unpaid
  // Prior period (2026-04) history -- fully settled, to give the dues report depth.
  { unitNumber: 'A-101', memberName: 'Asha Rao',     period: '2026-04', amountDue: 2500, amountPaid: 2500, dueDate: '2026-04-10' }, // history, fully paid
  { unitNumber: 'A-102', memberName: 'Vikram Singh',  period: '2026-04', amountDue: 2500, amountPaid: 2500, dueDate: '2026-04-10' }, // history, fully paid
];

/**
 * Occupancy source rows -- exactly one record per unit (all five units).
 *
 * Field names align with reportModel.createOccupancyRow: { unitNumber, status,
 * occupantName, occupantsCount }. `status` is either 'occupied' or 'vacant'.
 * The single vacant unit (B-202) carries an empty occupantName and a zero
 * occupantsCount; every occupied unit carries a positive occupantsCount. These
 * status strings are presentation/source values specific to occupancy and are
 * intentionally NOT role constants.
 *
 * @type {Array<{ unitNumber: string, status: string, occupantName: string, occupantsCount: number }>}
 */
const occupancy = [
  { unitNumber: 'A-101', status: 'occupied', occupantName: 'Asha Rao',     occupantsCount: 3 },
  { unitNumber: 'A-102', status: 'occupied', occupantName: 'Vikram Singh',  occupantsCount: 2 },
  { unitNumber: 'B-201', status: 'occupied', occupantName: 'Meera Nair',    occupantsCount: 4 },
  { unitNumber: 'B-202', status: 'vacant',   occupantName: '',              occupantsCount: 0 },
  { unitNumber: 'C-301', status: 'occupied', occupantName: 'Rahul Gupta',   occupantsCount: 1 },
];

/**
 * Produce a shallow copy of a single seed row.
 *
 * All read methods return rows through this helper so callers receive
 * independent objects: mutating a returned row (or the returned array) can never
 * reach back and corrupt the module-level seed. Every seed row holds only
 * primitive values, so a shallow spread (`{ ...row }`) is a complete, safe copy.
 * This function is private (NOT exported).
 *
 * @param {Object} row - A single seed row from one of the source arrays.
 * @returns {Object} A new object with the same own-enumerable keys/values.
 */
function clone(row) {
  return { ...row };
}

/**
 * Return all Member Directory source rows.
 *
 * Each row is a fresh shallow clone of the seed, so the returned array and its
 * elements are safe for the service layer to read, sort, or reshape without
 * affecting the seed. No aggregation or DTO shaping is performed here.
 *
 * @returns {Array<{ unitNumber: string, memberName: string, email: string, phone: string, role: string }>}
 *   A new array of cloned member source rows.
 */
function getMembers() {
  return members.map(clone);
}

/**
 * Return all maintenance-dues source rows (current + prior periods).
 *
 * Each row is a fresh shallow clone of the seed. The SERVICE derives the `dues`
 * report directly from these rows and derives the `outstanding` report by
 * filtering for a positive balance (amountDue - amountPaid) and computing
 * daysOverdue from `dueDate`. This method performs neither calculation -- it only
 * returns the raw rows (note: no `balance` field is stored).
 *
 * @returns {Array<{ unitNumber: string, memberName: string, period: string, amountDue: number, amountPaid: number, dueDate: string }>}
 *   A new array of cloned dues source rows.
 */
function getDues() {
  return dues.map(clone);
}

/**
 * Return all occupancy source rows (one per unit).
 *
 * Each row is a fresh shallow clone of the seed. The service maps these rows to
 * the occupancy report and may derive summary figures (e.g. occupied vs. vacant
 * counts) itself; this method returns only the raw per-unit rows.
 *
 * @returns {Array<{ unitNumber: string, status: string, occupantName: string, occupantsCount: number }>}
 *   A new array of cloned occupancy source rows.
 */
function getOccupancy() {
  return occupancy.map(clone);
}

module.exports = { getMembers, getDues, getOccupancy };
