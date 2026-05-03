import { config } from 'dotenv';
import path from 'path';
import { adminDb } from '../src/lib/firebase/admin';
import exercises from '../data/exercises.json';

// Load .env.local for Node.js scripts (unlike Next.js, tsx doesn't auto-load it)
config({ path: path.resolve(__dirname, '../.env.local') });

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
