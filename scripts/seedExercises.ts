import { adminDb } from '../src/lib/firebase/admin';
import exercises from '../data/exercises.json';

async function main() {
  const db = adminDb();
  const batch = db.batch();
  for (const ex of exercises) {
    const ref = db.collection('exercises').doc(ex.id);
    batch.set(ref, ex);
  }
  await batch.commit();
  console.log(`Seeded ${exercises.length} exercises.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
