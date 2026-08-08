
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { firebaseConfig } from '@/firebase/config';

let db: Firestore;
let adminAuth: Auth;
let storage: Storage;

function initializeAdmin() {
  const apps = getApps();
  let app = apps.length > 0 ? apps[0] : null;

  if (!app) {
    try {
      app = initializeApp({
        credential: applicationDefault(),
        databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
        storageBucket: firebaseConfig.storageBucket,
      });
      console.log('Firebase Admin SDK initialized.');
    } catch (error: any) {
      console.error('Firebase admin initialization error', error);
    }
  }

  if (app) {
    if (!db) db = getFirestore(app);
    if (!adminAuth) adminAuth = getAuth(app);
    if (!storage) storage = getStorage(app);
  }

  return { db, adminAuth, storage };
}

export { initializeAdmin as getFirebaseAdmin };
