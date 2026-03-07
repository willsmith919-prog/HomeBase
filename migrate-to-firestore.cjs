// migrate-to-firestore.js
//
// One-time script to copy data from Realtime Database → Firestore.
// Run with: node migrate-to-firestore.js
//
// IMPORTANT: This only COPIES data. It does not delete anything from RTDB.
// Your existing app keeps working exactly as before.

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');
const {
  getFirestore, collection, doc, setDoc, writeBatch, Timestamp
} = require('firebase/firestore');

// ============================================================
// CONFIGURATION — Update these three values
// ============================================================

const FAMILY_ID = 'HTKeT2kGKMd6RE6gDlaI'; // From Step 3

const firebaseConfig = {
  // Copy your config from src/firebase.js
  apiKey: "AIzaSyD6yimm9jgGTAfFje6S63eduIxFwKOuQ8g",
  authDomain: "smith-family-home-admin-app.firebaseapp.com",
  databaseURL: "https://smith-family-home-admin-app-default-rtdb.firebaseio.com",
  projectId: "smith-family-home-admin-app",
  storageBucket: "smith-family-home-admin-app.firebasestorage.app",
  messagingSenderId: "524059404018",
  appId: "1:524059404018:web:ba5223ac4dfccaf560926b"
};

// ============================================================
// DO NOT EDIT BELOW THIS LINE
// ============================================================

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);
const firestore = getFirestore(app);

// Helper: convert a date string to a Firestore Timestamp
function toTimestamp(dateStr) {
  if (!dateStr) return Timestamp.now();
  try {
    return Timestamp.fromDate(new Date(dateStr));
  } catch {
    return Timestamp.now();
  }
}

// Helper: figure out the day of week from a date string (0=Sun, 1=Mon, ...)
function getDayOfWeek(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).getDay();
  } catch {
    return null;
  }
}

// Convert flat recurrence string → structured object
function parseRecurrence(recurrence, dueDate) {
  const base = {
    type: recurrence || 'once',
    daysOfWeek: null,
    dayOfMonth: null,
    timeOfDay: null,
    timeInferred: false
  };

  switch (recurrence) {
    case 'daily':
      base.daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Every day
      break;
    case 'weekly':
      const day = getDayOfWeek(dueDate);
      base.daysOfWeek = day !== null ? [day] : [1]; // Default to Monday
      break;
    case 'monthly':
      if (dueDate) {
        try {
          base.dayOfMonth = new Date(dueDate).getDate();
        } catch {
          base.dayOfMonth = 1;
        }
      }
      break;
    default:
      base.type = 'once';
  }

  return base;
}

async function migrateMembers() {
  console.log('\n📋 Migrating kids → members...');
  const snapshot = await get(ref(rtdb, 'kids'));

  if (!snapshot.exists()) {
    console.log('   No kids found in RTDB. Skipping.');
    return {};
  }

  const kids = snapshot.val();
  const nameToId = {}; // We'll need this to map kidId → memberId later

  for (const [kidId, kid] of Object.entries(kids)) {
    const memberRef = doc(firestore, 'families', FAMILY_ID, 'members', kidId);
    await setDoc(memberRef, {
      name: kid.name || 'Unknown',
      role: 'child',
      avatar: kid.avatar || null,
      theme: kid.theme || null,
      age: null  // You can fill this in manually later
    });

    nameToId[kidId] = kidId; // In this case IDs stay the same
    console.log(`   ✅ ${kid.name} (${kidId})`);
  }

  console.log(`   Migrated ${Object.keys(kids).length} members`);
  return nameToId;
}

async function migrateJobLibrary() {
  console.log('\n📚 Migrating jobLibrary...');
  const snapshot = await get(ref(rtdb, 'jobLibrary'));

  if (!snapshot.exists()) {
    console.log('   No jobs found in RTDB. Skipping.');
    return;
  }

  const jobs = snapshot.val();

  for (const [jobId, job] of Object.entries(jobs)) {
    const jobRef = doc(firestore, 'families', FAMILY_ID, 'jobLibrary', jobId);
    await setDoc(jobRef, {
      title: job.title || 'Untitled',
      instructions: job.instructions || '',
      defaultValue: job.value || 0,
      category: 'uncategorized', // You can recategorize later
      active: true
    });
    console.log(`   ✅ ${job.title} (${jobId})`);
  }

  console.log(`   Migrated ${Object.keys(jobs).length} jobs`);
}

async function migrateAssignments() {
  console.log('\n📝 Migrating assignments...');
  const snapshot = await get(ref(rtdb, 'assignments'));

  if (!snapshot.exists()) {
    console.log('   No assignments found in RTDB. Skipping.');
    return;
  }

  const assignments = snapshot.val();
  let assignmentCount = 0;
  let completionCount = 0;

  for (const [id, a] of Object.entries(assignments)) {
    // Create the assignment in new format
    const assignmentRef = doc(
      firestore, 'families', FAMILY_ID, 'assignments', id
    );

    await setDoc(assignmentRef, {
      jobId: null,
      title: a.title || 'Untitled',
      instructions: a.instructions || '',
      assignees: a.kidId ? [a.kidId] : [],
      value: a.value || 0,
      category: 'uncategorized',
      recurrence: parseRecurrence(a.recurrence, a.dueDate),
      status: 'active',
      createdBy: 'migrated',
      createdVia: 'form',
      originalInput: null,
      createdAt: toTimestamp(a.createdDate),
      updatedAt: Timestamp.now()
    });
    assignmentCount++;
    console.log(`   ✅ Assignment: ${a.title} → ${a.kidId || 'unassigned'}`);

    // If it was completed, create a completion record
    if (a.completed && a.completedDate) {
      const completionRef = doc(
        collection(firestore, 'families', FAMILY_ID, 'completions')
      );

      await setDoc(completionRef, {
        assignmentId: id,
        memberId: a.kidId || 'unknown',
        completedAt: toTimestamp(a.completedDate),
        verifiedBy: null,
        paid: a.paid || false,
        paidAt: null,
        value: a.value || 0
      });
      completionCount++;
      console.log(`      ↳ + completion record`);
    }
  }

  console.log(`   Migrated ${assignmentCount} assignments`);
  console.log(`   Created ${completionCount} completion records`);
}

// ============================================================
// RUN THE MIGRATION
// ============================================================

async function main() {
  console.log('🚀 Starting HomeBase migration to Firestore');
  console.log(`   Family ID: ${FAMILY_ID}`);
  console.log('   This will COPY data — nothing is deleted from RTDB.\n');

  try {
    await migrateMembers();
    await migrateJobLibrary();
    await migrateAssignments();

    console.log('\n✨ Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Check Firebase Console → Firestore to verify the data');
    console.log('2. Add parent member(s) manually in Firestore');
    console.log('3. Fill in ages for each kid if you want');
    console.log('4. Start updating your .jsx files to read from Firestore');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Your RTDB data is untouched. Fix the error and try again.');
  }

  process.exit(0);
}

main();