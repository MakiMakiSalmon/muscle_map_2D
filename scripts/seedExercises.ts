import { config } from 'dotenv';
import path from 'path';
import { adminDb } from '../src/lib/firebase/admin';
import exercises from '../data/exercises.json';

// Next.js と違い tsx は .env.local を自動ロードしないため明示的にロードする。
// adminDb() は main() 内の遅延呼び出しなので、ここで env が注入されていれば問題ない。
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
}).then(() => process.exit(0));
