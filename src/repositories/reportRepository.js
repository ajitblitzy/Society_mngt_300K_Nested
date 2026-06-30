// reportRepository.js - In-memory report-source data, seeded (CommonJS; no DB/ORM; 'const store = []' idiom)
'use strict';

/**
 * Report repository (REPOSITORY layer) for the Society Management Reporting feature.
 *
 * Responsibility (single, narrow): hold the raw, seeded source rows that back the
 * four domain reports and expose read-only accessors over them. It is the bottom
 * of the Reporting dependency chain and the data-source contract that
 * `src/services/reportService.js` consumes (the service performs all aggregation;
 * `src/models/reportModel.js` performs DTO shaping).
 *
 * Architectural contract (must be preserved):
 *   - In-memory ONLY. The seed is realized as module-level arrays, mirroring the
 *     scaffold's `const store = []` idiom (AAP §0.4.1). There is intentionally NO
 *     database, ORM, SQL, migration, or file/network I/O here (AAP §0.6.2). The
 *     shape below is deliberately swappable for a real persistence layer later.
 *   - This module ONLY stores and returns raw source rows. It performs NO
 *     aggregation, summation, counting, outstanding-filtering, `balance`, or
 *     `daysOverdue` computation — all of that belongs to `reportService`, and DTO
 *     shaping belongs to `reportModel`.
 *   - Encapsulation: every accessor returns shallow CLONES of the seed rows, so a
 *     caller can never mutate shared module state through a returned value.
 *   - Dependencies: the only internal import is `../domain/user` (for `ROLES`).
 *     There are no third-party libraries and no Node core I/O modules.
 *
 * The seed models one small, COHERENT society of five units so the four reports
 * cross-reference sensibly:
 *   - A-101, A-102, B-201, C-301 are occupied (each has a member + occupancy row);
 *   - B-202 is vacant (no member; vacant occupancy row; an unpaid dues row).
 * Every `unitNumber` used in `members` and `dues` exists in the `occupancy` unit
 * set, keeping the reports internally consistent.
 *
 * @module repositories/reportRepository
 */

const { ROLES } = require('../domain/user'); // { ADMIN: 'admin', MEMBER: 'member' }

/**
 * Member Directory source rows — one entry per OCCUPIED unit (the vacant unit
 * B-202 has no member). Field names align with `reportModel.createMemberRow`
 * (`unitNumber`, `memberName`, `email`, `phone`, `role`) so the service can map
 * each row into a member-directory DTO with no transformation.
 *
 * The `role` value is sourced from the canonical {@link ROLES} domain constants
 * (never hard-coded). The society secretary (B-201) is the administrator; all
 * other residents are standard members. Contact details use an example domain.
 *
 * @type {Array<{unitNumber: string, memberName: string, email: string, phone: string, role: string}>}
 */
const members = [
  { unitNumber: 'A-101', memberName: 'Asha Rao',     email: 'asha.rao@society.example',     phone: '+91-90000-00001', role: ROLES.MEMBER },
  { unitNumber: 'A-102', memberName: 'Vikram Singh',  email: 'vikram.singh@society.example', phone: '+91-90000-00002', role: ROLES.MEMBER },
  { unitNumber: 'B-201', memberName: 'Meera Nair',    email: 'meera.nair@society.example',   phone: '+91-90000-00003', role: ROLES.ADMIN  },
  { unitNumber: 'C-301', memberName: 'Rahul Gupta',   email: 'rahul.gupta@society.example',  phone: '+91-90000-00004', role: ROLES.MEMBER },
];

/**
 * Maintenance-dues source rows. Field names align with the inputs of
 * `reportModel.createDuesRow` PLUS a `dueDate` that the service uses to derive
 * the Outstanding Payments report:
 * (`unitNumber`, `memberName`, `period`, `amountDue`, `amountPaid`, `dueDate`).
 *
 * Deliberately NO `balance` field is stored: `reportModel` derives
 * `balance = amountDue - amountPaid`, so storing it here would risk drift.
 * `amountPaid` captures collections (the "payments" view) directly on the row,
 * keeping the seed coherent and non-redundant.
 *
 * The set provides a meaningful mix for the current period `'2026-05'` (all five
 * units) and a short history for the prior period `'2026-04'` (two units, both
 * fully paid):
 *   - fully paid    → `amountPaid === amountDue` (e.g. A-101, B-201, history rows)
 *   - partially paid → `0 < amountPaid < amountDue` (A-102, 2026-05)
 *   - unpaid        → `amountPaid === 0` (B-202 vacant, C-301)
 * `dueDate` is an ISO date string falling within the billing period.
 *
 * @type {Array<{unitNumber: string, memberName: string, period: string, amountDue: number, amountPaid: number, dueDate: string}>}
 */
const dues = [
  { unitNumber: 'A-101', memberName: 'Asha Rao',     period: '2026-05', amountDue: 2500, amountPaid: 2500, dueDate: '2026-05-10' }, // paid
  { unitNumber: 'A-102', memberName: 'Vikram Singh',  period: '2026-05', amountDue: 2500, amountPaid: 1000, dueDate: '2026-05-10' }, // partial
  { unitNumber: 'B-201', memberName: 'Meera Nair',    period: '2026-05', amountDue: 3000, amountPaid: 3000, dueDate: '2026-05-10' }, // paid
  { unitNumber: 'B-202', memberName: '',              period: '2026-05', amountDue: 3000, amountPaid: 0,    dueDate: '2026-05-10' }, // unpaid (vacant)
  { unitNumber: 'C-301', memberName: 'Rahul Gupta',   period: '2026-05', amountDue: 2500, amountPaid: 0,    dueDate: '2026-05-10' }, // unpaid
  { unitNumber: 'A-101', memberName: 'Asha Rao',     period: '2026-04', amountDue: 2500, amountPaid: 2500, dueDate: '2026-04-10' }, // history (paid)
  { unitNumber: 'A-102', memberName: 'Vikram Singh',  period: '2026-04', amountDue: 2500, amountPaid: 2500, dueDate: '2026-04-10' }, // history (paid)
];

/**
 * Occupancy source rows — exactly one row per unit (all five). Field names align
 * with `reportModel.createOccupancyRow` (`unitNumber`, `status`, `occupantName`,
 * `occupantsCount`). `status` is `'occupied'` or `'vacant'`; the single vacant
 * unit (B-202) carries an empty `occupantName` and a zero `occupantsCount`, while
 * every occupied unit carries a positive `occupantsCount`.
 *
 * @type {Array<{unitNumber: string, status: string, occupantName: string, occupantsCount: number}>}
 */
const occupancy = [
  { unitNumber: 'A-101', status: 'occupied', occupantName: 'Asha Rao',     occupantsCount: 3 },
  { unitNumber: 'A-102', status: 'occupied', occupantName: 'Vikram Singh',  occupantsCount: 2 },
  { unitNumber: 'B-201', status: 'occupied', occupantName: 'Meera Nair',    occupantsCount: 4 },
  { unitNumber: 'B-202', status: 'vacant',   occupantName: '',              occupantsCount: 0 },
  { unitNumber: 'C-301', status: 'occupied', occupantName: 'Rahul Gupta',   occupantsCount: 1 },
];

/**
 * Produce a shallow copy of a seed row.
 *
 * All seed rows contain only primitive fields (strings and numbers), so a shallow
 * spread fully detaches the returned object from the stored one. This is the
 * mechanism that prevents callers from mutating shared module state.
 *
 * @param {Object} row A seed row to copy.
 * @returns {Object} A new object with the same enumerable own properties.
 */
function clone(row) {
  return { ...row };
}

/**
 * Return all Member Directory source rows as independent clones.
 *
 * @returns {Array<{unitNumber: string, memberName: string, email: string, phone: string, role: string}>}
 *   A fresh array of cloned member rows; mutating it (or its rows) never affects the seed.
 */
function getMembers() {
  return members.map(clone);
}

/**
 * Return all maintenance-dues source rows as independent clones.
 *
 * The service derives the Dues & Collection Summary report directly from these
 * rows and derives the Outstanding Payments report by filtering on a positive
 * balance and computing `daysOverdue` from each row's `dueDate`.
 *
 * @returns {Array<{unitNumber: string, memberName: string, period: string, amountDue: number, amountPaid: number, dueDate: string}>}
 *   A fresh array of cloned dues rows; mutating it (or its rows) never affects the seed.
 */
function getDues() {
  return dues.map(clone);
}

/**
 * Return all occupancy source rows as independent clones.
 *
 * @returns {Array<{unitNumber: string, status: string, occupantName: string, occupantsCount: number}>}
 *   A fresh array of cloned occupancy rows; mutating it (or its rows) never affects the seed.
 */
function getOccupancy() {
  return occupancy.map(clone);
}

module.exports = { getMembers, getDues, getOccupancy };
