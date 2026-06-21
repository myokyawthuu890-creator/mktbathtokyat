import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export function getOwnerId(): string {
  let ownerId = localStorage.getItem('localOwnerId');
  if (!ownerId) {
    ownerId = 'user_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('localOwnerId', ownerId);
  }
  return ownerId;
}

