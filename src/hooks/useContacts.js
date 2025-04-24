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
} from "firebase/firestore";
import { db } from "../firebase";

export const useContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscribe to contacts collection
  useEffect(() => {
    const q = query(collection(db, "contacts"), orderBy("name"));

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
  }, []);

  const addContact = async (contactData) => {
    try {
      const docRef = await addDoc(collection(db, "contacts"), {
        ...contactData,
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
      // Remove the id field from the data if it exists
      const { id, ...dataToUpdate } = contactData;

      const contactRef = doc(db, "contacts", contactId);
      await updateDoc(contactRef, {
        ...dataToUpdate,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error("Error updating contact:", err);
      throw err;
    }
  };

  const deleteContact = async (id) => {
    try {
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
  };
};
