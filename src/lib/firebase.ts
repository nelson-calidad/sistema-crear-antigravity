import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

// Firestore Helpers
export const subscribeToAppointments = (callback: (appointments: any[]) => void) => {
  const q = collection(db, 'appointments');
  return onSnapshot(q, (snapshot) => {
    const apps = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(apps);
  });
};

export const saveAppointment = async (data: any, id?: string) => {
  if (id) {
    const ref = doc(db, 'appointments', id);
    await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
  } else {
    await addDoc(collection(db, 'appointments'), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
};

export const deleteAppointment = async (id: string) => {
  await deleteDoc(doc(db, 'appointments', id));
};
