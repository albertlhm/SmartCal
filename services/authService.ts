import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "./firebase";
import { User } from '../types';

export const AuthService = {
  register: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return {
        id: userCredential.user.uid,
        username: userCredential.user.email || 'User'
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  login: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        id: userCredential.user.uid,
        username: userCredential.user.email || 'User'
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  logout: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  },

  subscribeToAuthChanges: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        callback({
          id: firebaseUser.uid,
          username: firebaseUser.email || 'User'
        });
      } else {
        callback(null);
      }
    });
  }
};