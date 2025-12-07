import { auth } from "./firebase";
import { User } from '../types';
import firebase from "firebase/compat/app";

export const AuthService = {
  register: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
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
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
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
      await auth.signOut();
    } catch (error) {
      console.error("Logout failed", error);
    }
  },

  subscribeToAuthChanges: (callback: (user: User | null) => void) => {
    return auth.onAuthStateChanged((firebaseUser: firebase.User | null) => {
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