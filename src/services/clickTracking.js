import { db } from "../firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
} from "firebase/firestore";

/**
 * Track a click to a company store
 * @param {string} company - Company name (niceone, jarir)
 * @param {string} productName - Name of the clicked product
 * @param {string} category - Category of the gift
 * @param {string} userId - User ID (if authenticated)
 */
export const trackClick = async (
  company,
  productName,
  category,
  userId = null
) => {
  try {
    const companyKey = company.toLowerCase();

    // Update overall company click count
    const companyDocRef = doc(db, "clickTracking", companyKey);
    const companyDoc = await getDoc(companyDocRef);

    if (companyDoc.exists()) {
      await updateDoc(companyDocRef, {
        totalClicks: increment(1),
        lastClicked: new Date(),
      });
    } else {
      await setDoc(companyDocRef, {
        companyName: company,
        totalClicks: 1,
        createdAt: new Date(),
        lastClicked: new Date(),
      });
    }

    // Update total clicks across all companies
    const totalDocRef = doc(db, "clickTracking", "total");
    const totalDoc = await getDoc(totalDocRef);

    if (totalDoc.exists()) {
      await updateDoc(totalDocRef, {
        totalClicks: increment(1),
        lastClicked: new Date(),
      });
    } else {
      await setDoc(totalDocRef, {
        totalClicks: 1,
        createdAt: new Date(),
        lastClicked: new Date(),
      });
    }

    // Store detailed click event
    await addDoc(collection(db, "clickEvents"), {
      company: companyKey,
      productName,
      category,
      userId,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
    });

    console.log(`✓ Click tracked for ${company}: ${productName}`);
  } catch (error) {
    console.error("Error tracking click:", error);
  }
};

/**
 * Get click statistics for all companies
 * @returns {Promise<Object>} Object with click stats for each company
 */
export const getClickStats = async () => {
  try {
    const stats = {};

    // Get company-specific stats
    const companies = ["niceone", "jarir"];

    for (const company of companies) {
      const companyDocRef = doc(db, "clickTracking", company);
      const companyDoc = await getDoc(companyDocRef);

      if (companyDoc.exists()) {
        stats[company] = companyDoc.data();
      } else {
        stats[company] = {
          companyName: company,
          totalClicks: 0,
          createdAt: null,
          lastClicked: null,
        };
      }
    }

    // Get total stats
    const totalDocRef = doc(db, "clickTracking", "total");
    const totalDoc = await getDoc(totalDocRef);

    if (totalDoc.exists()) {
      stats.total = totalDoc.data();
    } else {
      stats.total = {
        totalClicks: 0,
        createdAt: null,
        lastClicked: null,
      };
    }

    return stats;
  } catch (error) {
    console.error("Error getting click stats:", error);
    return {};
  }
};
