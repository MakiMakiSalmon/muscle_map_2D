import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK の singleton 初期化。
 * モジュールレベルで一度だけ評価され、Vercel の warm instance や Next.js の
 * HMR でも再初期化されない。詳細設計 §19-2 参照。
 *
 * Route Handler からは `adminAuth` / `adminDb` を直接 import して使うこと。
 * `initializeApp` を Route Handler 側で呼んではいけない。
 */
const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
