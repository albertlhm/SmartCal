import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  FirestoreError
} from "firebase/firestore";
import { db } from "./firebase";
import { Reminder, Todo, UserPreferences } from "../types";

export const DataService = {
  // --- Reminders ---

  subscribeToReminders: (
    userId: string, 
    onData: (reminders: Reminder[]) => void,
    onError?: (error: FirestoreError) => void
  ) => {
    const q = query(collection(db, `users/${userId}/reminders`));
    
    return onSnapshot(q, 
      (snapshot) => {
        const reminders: Reminder[] = [];
        snapshot.forEach((doc) => {
          reminders.push(doc.data() as Reminder);
        });
        onData(reminders);
      },
      (error) => {
        console.error("Firestore Reminder Sync Error:", error);
        if (onError) onError(error);
      }
    );
  },

  addReminder: async (userId: string, reminder: Reminder) => {
    try {
      const ref = doc(db, `users/${userId}/reminders`, reminder.id);
      await setDoc(ref, reminder);
    } catch (e) {
      console.error("Error adding reminder:", e);
      throw e;
    }
  },

  updateReminder: async (userId: string, reminder: Reminder) => {
    try {
      const ref = doc(db, `users/${userId}/reminders`, reminder.id);
      await setDoc(ref, reminder, { merge: true });
    } catch (e) {
      console.error("Error updating reminder:", e);
      throw e;
    }
  },

  deleteReminder: async (userId: string, reminderId: string) => {
    try {
      const ref = doc(db, `users/${userId}/reminders`, reminderId);
      await deleteDoc(ref);
    } catch (e) {
      console.error("Error deleting reminder:", e);
      throw e;
    }
  },

  // --- Todos ---

  subscribeToTodos: (
    userId: string, 
    onData: (todos: Todo[]) => void,
    onError?: (error: FirestoreError) => void
  ) => {
    const q = query(collection(db, `users/${userId}/todos`));
    
    return onSnapshot(q, 
      (snapshot) => {
        const todos: Todo[] = [];
        snapshot.forEach((doc) => {
          todos.push(doc.data() as Todo);
        });
        onData(todos);
      },
      (error) => {
        console.error("Firestore Todo Sync Error:", error);
        if (onError) onError(error);
      }
    );
  },

  addTodo: async (userId: string, todo: Todo) => {
    try {
      const ref = doc(db, `users/${userId}/todos`, todo.id);
      await setDoc(ref, todo);
    } catch (e) {
      console.error("Error adding todo:", e);
      throw e;
    }
  },

  updateTodo: async (userId: string, todo: Todo) => {
    try {
      const ref = doc(db, `users/${userId}/todos`, todo.id);
      await setDoc(ref, todo, { merge: true });
    } catch (e) {
      console.error("Error updating todo:", e);
      throw e;
    }
  },

  deleteTodo: async (userId: string, todoId: string) => {
    try {
      const ref = doc(db, `users/${userId}/todos`, todoId);
      await deleteDoc(ref);
    } catch (e) {
      console.error("Error deleting todo:", e);
      throw e;
    }
  },
  
  // --- Preferences ---
  
  subscribeToPreferences: (
    userId: string,
    onData: (prefs: UserPreferences) => void
  ) => {
    const ref = doc(db, `users/${userId}/settings/general`);
    return onSnapshot(ref, (doc) => {
      if (doc.exists()) {
        onData(doc.data() as UserPreferences);
      }
    });
  },

  updatePreferences: async (userId: string, prefs: UserPreferences) => {
    try {
      const ref = doc(db, `users/${userId}/settings/general`);
      await setDoc(ref, prefs, { merge: true });
    } catch (e) {
      console.error("Error updating preferences:", e);
    }
  },
  
  // Bulk import
  importData: async (userId: string, reminders: Reminder[], todos: Todo[]) => {
    const batchPromises = [];
    
    for (const r of reminders) {
      batchPromises.push(DataService.addReminder(userId, r));
    }
    
    for (const t of todos) {
        batchPromises.push(DataService.addTodo(userId, t));
    }
    
    await Promise.all(batchPromises);
  }
};