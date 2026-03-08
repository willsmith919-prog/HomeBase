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


// ============================================================
// MEMBERS (formerly "kids")
// ============================================================

// Get all family members (kids and parents)
// Returns: [{ id, name, role, avatar, theme, age }, ...]
export async function getMembers() {
  const snapshot = await getDocs(membersRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get only kids
export async function getKids() {
  const q = query(membersRef, where('role', '==', 'child'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Listen for real-time changes to members
// Returns an unsubscribe function (call it when your component unmounts)
export function onMembersChange(callback) {
  return onSnapshot(membersRef, (snapshot) => {
    const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(members);
  });
}

// Listen for real-time changes to kids only
export function onKidsChange(callback) {
  const q = query(membersRef, where('role', '==', 'child'));
  return onSnapshot(q, (snapshot) => {
    const kids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(kids);
  });
}

// Add a new member
export async function addMember({ name, role, avatar, theme, age }) {
  return addDoc(membersRef, {
    name,
    role: role || 'child',
    avatar: avatar || null,
    theme: theme || null,
    age: age || null
  });
}

// Update a member
export async function updateMember(memberId, updates) {
  const memberDoc = doc(database, 'families', FAMILY_ID, 'members', memberId);
  return updateDoc(memberDoc, updates);
}

// Delete a member
export async function deleteMember(memberId) {
  const memberDoc = doc(database, 'families', FAMILY_ID, 'members', memberId);
  return deleteDoc(memberDoc);
}


// ============================================================
// JOB LIBRARY
// ============================================================

// Get all jobs in the library
export async function getJobLibrary() {
  const q = query(jobLibraryRef, where('active', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Listen for real-time changes to the job library
export function onJobLibraryChange(callback) {
  const q = query(jobLibraryRef, where('active', '==', true));
  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(jobs);
  });
}

// Add a job to the library
export async function addJob({ title, instructions, defaultValue, category }) {
  return addDoc(jobLibraryRef, {
    title,
    instructions: instructions || '',
    defaultValue: defaultValue || 0,
    category: category || 'uncategorized',
    active: true
  });
}

// Update a job
export async function updateJob(jobId, updates) {
  const jobDoc = doc(database, 'families', FAMILY_ID, 'jobLibrary', jobId);
  return updateDoc(jobDoc, updates);
}

// Soft-delete a job (mark inactive, don't actually remove)
export async function deactivateJob(jobId) {
  const jobDoc = doc(database, 'families', FAMILY_ID, 'jobLibrary', jobId);
  return updateDoc(jobDoc, { active: false });
}


// ============================================================
// ASSIGNMENTS
// ============================================================

// Get all active assignments
export async function getAssignments() {
  const q = query(assignmentsRef, where('status', '==', 'active'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get assignments for a specific kid
export async function getAssignmentsForMember(memberId) {
  const q = query(
    assignmentsRef,
    where('status', '==', 'active'),
    where('assignees', 'array-contains', memberId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Listen for real-time changes to assignments
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

// Listen for a specific kid's assignments
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

// Create a new assignment
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

// Create multiple assignments at once (used by the NL feature)
export async function createAssignmentsBatch(assignmentDataArray) {
  const batch = writeBatch(database);

  for (const data of assignmentDataArray) {
    const newRef = doc(assignmentsRef); // Auto-generate ID
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

  return batch.commit(); // All succeed or all fail
}

// Update an assignment
export async function updateAssignment(assignmentId, updates) {
  const assignmentDoc = doc(
    database, 'families', FAMILY_ID, 'assignments', assignmentId
  );
  return updateDoc(assignmentDoc, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}

// Archive an assignment (soft delete)
export async function archiveAssignment(assignmentId) {
  return updateAssignment(assignmentId, { status: 'archived' });
}


// ============================================================
// COMPLETIONS
// ============================================================

// Mark a chore as complete
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

// Get completions for a specific date range
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

// Get completions for a specific kid
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

// Listen for today's completions (useful for the main dashboard)
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

// Mark a completion as paid
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
// UTILITY: Name ↔ ID mapping
// Used by the NL feature to convert names from the LLM response
// into member IDs for Firestore
// ============================================================

export async function getMemberNameToIdMap() {
  const members = await getMembers();
  const map = {};
  for (const member of members) {
    // Store lowercase for case-insensitive matching
    map[member.name.toLowerCase()] = member.id;
  }
  return map;
}