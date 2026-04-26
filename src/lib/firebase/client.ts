import { getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// NEXT_PUBLIC_ キーは公開鍵。アクセス制御は Firestore セキュリティルールで行う
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// typeof window guard: Firebase client SDK は SSR 時に初期化しない。
// next build 時(Node.js)は window が未定義のため空オブジェクトを返し、
// クライアントサイドでのみ実際の Firebase インスタンスを初期化する。
function getClientApp() {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

export const clientAuth: Auth =
  typeof window === 'undefined'
    ? ({} as Auth)
    : getAuth(getClientApp());

export const clientDb: Firestore =
  typeof window === 'undefined'
    ? ({} as Firestore)
    : getFirestore(getClientApp());
