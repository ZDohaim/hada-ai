import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";

export const useContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Track authentication state
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(true); // Reset loading when user changes
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to user-specific contacts collection
  useEffect(() => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    // Query contacts that belong to the current user
    const q = query(
      collection(db, "contacts"),
      where("userId", "==", user.uid),
      orderBy("name")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const contactsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setContacts(contactsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching contacts:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addContact = async (contactData) => {
    try {
      if (!user) {
        throw new Error("User must be authenticated to add contacts");
      }

      const docRef = await addDoc(collection(db, "contacts"), {
        ...contactData,
        userId: user.uid, // Add user ID to the contact
        createdAt: new Date(),
      });
      return docRef.id;
    } catch (err) {
      console.error("Error adding contact:", err);
      throw err;
    }
  };

  const updateContact = async (contactId, contactData) => {
    try {
      if (!user) {
        throw new Error("User must be authenticated to update contacts");
      }

      // Remove the id field from the data if it exists
      const { id, ...dataToUpdate } = contactData;

      const contactRef = doc(db, "contacts", contactId);
      await updateDoc(contactRef, {
        ...dataToUpdate,
        userId: user.uid, // Ensure userId is maintained
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error("Error updating contact:", err);
      throw err;
    }
  };

  const deleteContact = async (id) => {
    try {
      if (!user) {
        throw new Error("User must be authenticated to delete contacts");
      }

      await deleteDoc(doc(db, "contacts", id));
    } catch (err) {
      console.error("Error deleting contact:", err);
      throw err;
    }
  };

  return {
    contacts,
    loading,
    error,
    addContact,
    updateContact,
    deleteContact,
    user, // Expose user state for components that need it
  };
};
