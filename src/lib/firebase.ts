import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  getDocFromServer,
  collection,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Visita, BlingConfig, Promotora } from '../types';
import { queueOfflineVisita } from './offlineManager';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Enable IndexedDB offline persistence for Firestore
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistência do Firestore desativada: Múltiplas abas simultâneas.');
    } else if (err.code === 'unimplemented') {
      console.warn('Navegador atual não suporta IndexedDB do Firestore.');
    }
  });
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("Firebase Firestore connection warning:", error.message);
    }
  }
}

export async function saveVisitaToFirestore(visita: Visita) {
  const docPath = `visitas/${visita.id}`;
  try {
    const docRef = doc(db, 'visitas', visita.id);
    await setDoc(docRef, {
      ...visita,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Visita ${visita.id} salva com sucesso no Firestore.`);
  } catch (err) {
    console.warn(`Dispositivo sem internet ou erro no Firestore. Salvando visita ${visita.id} na fila offline local.`);
    queueOfflineVisita(visita);
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function updateVisitaInFirestore(id: string, updatedData: Partial<Visita>) {
  const docPath = `visitas/${id}`;
  try {
    const docRef = doc(db, 'visitas', id);
    await setDoc(docRef, {
      ...updatedData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Visita ${id} atualizada com sucesso no Firestore.`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export async function saveBlingConfigToFirestore(config: Partial<BlingConfig>) {
  const docPath = `settings/bling`;
  try {
    const docRef = doc(db, 'settings', 'bling');
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Configurações do Bling salvas com sucesso no Firestore.`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function getBlingConfigFromFirestore(): Promise<BlingConfig | null> {
  const docPath = `settings/bling`;
  try {
    const docRef = doc(db, 'settings', 'bling');
    const snap = await getDocFromServer(docRef);
    if (snap.exists()) {
      return snap.data() as BlingConfig;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, docPath);
    return null;
  }
}

export async function savePromotoraToFirestore(promotora: Promotora) {
  const docPath = `promotoras/${promotora.id}`;
  try {
    const docRef = doc(db, 'promotoras', promotora.id);
    await setDoc(docRef, {
      ...promotora,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Promotora ${promotora.nome} (${promotora.id}) salva no Firestore.`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function updatePromotoraInFirestore(id: string, updatedData: Partial<Promotora>) {
  const docPath = `promotoras/${id}`;
  try {
    const docRef = doc(db, 'promotoras', id);
    await setDoc(docRef, {
      ...updatedData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Promotora ${id} atualizada no Firestore.`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export async function deletePromotoraFromFirestore(id: string) {
  const docPath = `promotoras/${id}`;
  try {
    const docRef = doc(db, 'promotoras', id);
    await deleteDoc(docRef);
    console.log(`Promotora ${id} removida do Firestore.`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

export async function getPromotorasFromFirestore(): Promise<Promotora[]> {
  const docPath = `promotoras`;
  try {
    const colRef = collection(db, 'promotoras');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Promotora);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, docPath);
    return [];
  }
}

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  firebaseSignOut, 
  onAuthStateChanged,
  updateProfile,
  type FirebaseUser
};
