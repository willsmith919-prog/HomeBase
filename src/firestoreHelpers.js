// src/firestoreHelpers.js
//
// All Firestore read/write operations for HomeBase.
// Import these functions in your components instead of writing
// Firestore queries directly in .jsx files.
//
// NOTE: In our firebase.js, Firestore is exported as "database"
//       and Realtime Database is exported as "db".

import { database } from './firebase';
import { FAMILY_ID } from './familyConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';

// ============================================================
// COLLECTION REFERENCES
// These are shortcuts so you don't have to type the full path
// every time. Think of them as bookmarks to your data.
// ============================================================

const familyRef = doc(database, 'families', FAMILY_ID);
const membersRef = collection(database, 'families', FAMILY_ID, 'members');
const jobLibraryRef = collection(database, 'families', FAMILY_ID, 'jobLibrary');
const assignmentsRef = collection(database, 'families', FAMILY_ID, 'assignments');
const completionsRef = collection(database, 'families', FAMILY_ID, 'completions');
const jobBoardRef = collection(database, 'families', FAMILY_ID, 'jobBoard');


// ============================================================
// MEMBERS (formerly "kids")
// ============================================================

export async function getMembers() {
  const snapshot = await getDocs(membersRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getKids() {
  const q = query(membersRef, where('role', '==', 'child'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function onMembersChange(callback) {
  return onSnapshot(membersRef, (snapshot) => {
    const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(members);
  });
}

export function onKidsChange(callback) {
  const q = query(membersRef, where('role', '==', 'child'));
  return onSnapshot(q, (snapshot) => {
    const kids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(kids);
  });
}

export async function addMember({ name, role, avatar, theme, age }) {
  return addDoc(membersRef, {
    name,
    role: role || 'child',
    avatar: avatar || null,
    theme: theme || null,
    age: age || null
  });
}

export async function updateMember(memberId, updates) {
  const memberDoc = doc(database, 'families', FAMILY_ID, 'members', memberId);
  return updateDoc(memberDoc, updates);
}

export async function deleteMember(memberId) {
  const memberDoc = doc(database, 'families', FAMILY_ID, 'members', memberId);
  return deleteDoc(memberDoc);
}


// ============================================================
// JOB LIBRARY
// ============================================================

export async function getJobLibrary() {
  const q = query(jobLibraryRef, where('active', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function onJobLibraryChange(callback) {
  const q = query(jobLibraryRef, where('active', '==', true));
  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(jobs);
  });
}

export async function addJob({ title, instructions, defaultValue, category }) {
  return addDoc(jobLibraryRef, {
    title,
    instructions: instructions || '',
    defaultValue: defaultValue || 0,
    category: category || 'uncategorized',
    active: true
  });
}

export async function updateJob(jobId, updates) {
  const jobDoc = doc(database, 'families', FAMILY_ID, 'jobLibrary', jobId);
  return updateDoc(jobDoc, updates);
}

export async function deactivateJob(jobId) {
  const jobDoc = doc(database, 'families', FAMILY_ID, 'jobLibrary', jobId);
  return updateDoc(jobDoc, { active: false });
}


// ============================================================
// ASSIGNMENTS
// ============================================================

export async function getAssignments() {
  const q = query(assignmentsRef, where('status', '==', 'active'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getAssignmentsForMember(memberId) {
  const q = query(
    assignmentsRef,
    where('status', '==', 'active'),
    where('assignees', 'array-contains', memberId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function onAssignmentsChange(callback) {
  const q = query(assignmentsRef, where('status', '==', 'active'));
  return onSnapshot(q, (snapshot) => {
    const assignments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(assignments);
  });
}

export function onMemberAssignmentsChange(memberId, callback) {
  const q = query(
    assignmentsRef,
    where('status', '==', 'active'),
    where('assignees', 'array-contains', memberId)
  );
  return onSnapshot(q, (snapshot) => {
    const assignments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(assignments);
  });
}

export async function createAssignment({
  title, instructions, assignees, value, category,
  recurrence, createdBy, createdVia, originalInput
}) {
  return addDoc(assignmentsRef, {
    jobId: null,
    title,
    instructions: instructions || '',
    assignees: assignees || [],
    value: value || 0,
    category: category || 'uncategorized',
    recurrence: recurrence || { type: 'once', daysOfWeek: null,
      dayOfMonth: null, timeOfDay: null, timeInferred: false },
    status: 'active',
    createdBy: createdBy || 'unknown',
    createdVia: createdVia || 'form',
    originalInput: originalInput || null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
}

export async function createAssignmentsBatch(assignmentDataArray) {
  const batch = writeBatch(database);

  for (const data of assignmentDataArray) {
    const newRef = doc(assignmentsRef);
    batch.set(newRef, {
      jobId: data.jobId || null,
      title: data.title,
      instructions: data.instructions || '',
      assignees: data.assignees || [],
      value: data.value || 0,
      category: data.category || 'uncategorized',
      recurrence: data.recurrence || { type: 'once', daysOfWeek: null,
        dayOfMonth: null, timeOfDay: null, timeInferred: false },
      status: 'active',
      createdBy: data.createdBy || 'unknown',
      createdVia: data.createdVia || 'natural_language',
      originalInput: data.originalInput || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  return batch.commit();
}

export async function updateAssignment(assignmentId, updates) {
  const assignmentDoc = doc(
    database, 'families', FAMILY_ID, 'assignments', assignmentId
  );
  return updateDoc(assignmentDoc, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}

export async function archiveAssignment(assignmentId) {
  return updateAssignment(assignmentId, { status: 'archived' });
}


// ============================================================
// COMPLETIONS
// ============================================================

export async function markComplete({ assignmentId, memberId, value }) {
  return addDoc(completionsRef, {
    assignmentId,
    memberId,
    completedAt: Timestamp.now(),
    verifiedBy: null,
    paid: false,
    paidAt: null,
    value: value || 0
  });
}

export async function getCompletions(startDate, endDate) {
  const q = query(
    completionsRef,
    where('completedAt', '>=', Timestamp.fromDate(startDate)),
    where('completedAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('completedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getCompletionsForMember(memberId, startDate, endDate) {
  const q = query(
    completionsRef,
    where('memberId', '==', memberId),
    where('completedAt', '>=', Timestamp.fromDate(startDate)),
    where('completedAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('completedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Listen for today's completions (used by KidsPortal for "done today" view)
export function onTodaysCompletionsChange(callback) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const q = query(
    completionsRef,
    where('completedAt', '>=', Timestamp.fromDate(startOfDay)),
    orderBy('completedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const completions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(completions);
  });
}

// ── NEW: Listen for ALL unpaid completions (no date filter) ──────
// FIX for Issue #1: Completions from yesterday/last week that haven't
// been paid will now persist on the Dashboard until parents pay them.
// The old onTodaysCompletionsChange filtered by date, so unpaid work
// disappeared at midnight. This query uses paid==false instead.
export function onUnpaidCompletionsChange(callback) {
  const q = query(
    completionsRef,
    where('paid', '==', false),
    orderBy('completedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const completions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(completions);
  });
}

export async function markPaid(completionId) {
  const completionDoc = doc(
    database, 'families', FAMILY_ID, 'completions', completionId
  );
  return updateDoc(completionDoc, {
    paid: true,
    paidAt: Timestamp.now()
  });
}


// ============================================================
// JOB BOARD (Available Jobs — kids self-assign)
// ============================================================
// Schema per document:
//   title, instructions, value, category, postedBy,
//   claimedBy (memberId or null), claimedAt, status,
//   createdAt, updatedAt

export function onAvailableJobBoardChange(callback) {
  const q = query(
    jobBoardRef,
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(jobs);
  });
}

export function onAllJobBoardChange(callback) {
  const q = query(jobBoardRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(jobs);
  });
}

export async function postJobToBoard({ title, instructions, value, category, postedBy }) {
  return addDoc(jobBoardRef, {
    title,
    instructions: instructions || '',
    value: value || 0,
    category: category || 'uncategorized',
    postedBy: postedBy || 'parent',
    claimedBy: null,
    claimedAt: null,
    status: 'available',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
}

// Kid claims a job — updates the board post AND creates a real
// assignment so the job appears in their normal chore list
export async function claimJobBoardPost(jobBoardId, memberId) {
  const jobDoc = doc(database, 'families', FAMILY_ID, 'jobBoard', jobBoardId);
  const snap = await getDoc(jobDoc);
  if (!snap.exists()) throw new Error('Job not found');
  const jobData = snap.data();
  if (jobData.status !== 'available') throw new Error('Job already claimed');

  await updateDoc(jobDoc, {
    claimedBy: memberId,
    claimedAt: Timestamp.now(),
    status: 'claimed',
    updatedAt: Timestamp.now()
  });

  await createAssignment({
    title: jobData.title,
    instructions: jobData.instructions,
    assignees: [memberId],
    value: jobData.value,
    category: jobData.category || 'uncategorized',
    recurrence: { type: 'once', daysOfWeek: null, dayOfMonth: null, timeOfDay: null, timeInferred: false },
    createdBy: jobData.postedBy || 'parent',
    createdVia: 'job_board',
  });
}

export async function removeJobBoardPost(jobBoardId) {
  const jobDoc = doc(database, 'families', FAMILY_ID, 'jobBoard', jobBoardId);
  return deleteDoc(jobDoc);
}

export async function reopenJobBoardPost(jobBoardId) {
  const jobDoc = doc(database, 'families', FAMILY_ID, 'jobBoard', jobBoardId);
  return updateDoc(jobDoc, {
    claimedBy: null,
    claimedAt: null,
    status: 'available',
    updatedAt: Timestamp.now()
  });
}


// ============================================================
// UTILITY: Name ↔ ID mapping
// ============================================================

export async function getMemberNameToIdMap() {
  const members = await getMembers();
  const map = {};
  for (const member of members) {
    map[member.name.toLowerCase()] = member.id;
  }
  return map;
}
