import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { useContacts } from "../hooks/useContacts";
import { checkForUpcomingDates } from "../utils/reminderUtils";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const UserInfo = () => {
  const { contacts, loading } = useContacts();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const navigate = useNavigate();

  // Get current user and their data
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Check for upcoming reminders
  useEffect(() => {
    if (contacts.length > 0) {
      const reminders = checkForUpcomingDates(contacts);
      setUpcomingReminders(reminders.slice(0, 3)); // Show only first 3
    }
  }, [contacts]);

  const getUserName = () => {
    if (userData?.firstName) {
      return userData.firstName;
    }
    if (user?.displayName) {
      return user.displayName.split(" ")[0];
    }
    return "there";
  };

  const handleManageContacts = () => {
    navigate("/manage-contacts");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8E1] via-[#FFF3E0] to-[#FFECB3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D7CCC8] border-t-[#8D6E63] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5D4037] text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8E1] via-[#FFF3E0] to-[#FFECB3]">
      {/* Header */}
      <div className="pt-16 pb-8 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <h1 className="text-5xl font-light text-[#3E2723] mb-3">
              Welcome back, <span className="font-medium">{getUserName()}</span>
            </h1>
            <p className="text-xl text-[#6D4C41] font-light">
              Ready to find the perfect gift or manage your connections?
            </p>
          </div>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="px-8 mb-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Generate Gift Ideas Button */}
            <Link
              to="/gift-flow"
              className="group relative overflow-hidden bg-gradient-to-br from-[#8D6E63] via-[#6D4C41] to-[#5D4037] 
                         rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 
                         transition-all duration-500 ease-out"
            >
              <div
                className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 
                              group-hover:opacity-100 transition-opacity duration-500"
              ></div>
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-500">
                  🎁
                </div>
                <h2 className="text-3xl font-light text-white mb-4">
                  Generate Gift Ideas
                </h2>
                <p className="text-[#FFCC80] text-lg font-light leading-relaxed">
                  Let our AI help you discover the perfect gift for any
                  occasion. Personalized suggestions based on your preferences.
                </p>
                <div
                  className="mt-6 inline-flex items-center text-white/80 group-hover:text-white 
                                transition-colors duration-300"
                >
                  <span className="mr-2">Start discovering</span>
                  <svg
                    className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Manage Contacts Button */}
            <button
              onClick={handleManageContacts}
              className="group relative overflow-hidden bg-gradient-to-br from-[#A1887F] via-[#8D6E63] to-[#6D4C41] 
                         rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 
                         transition-all duration-500 ease-out text-left w-full"
            >
              <div
                className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 
                              group-hover:opacity-100 transition-opacity duration-500"
              ></div>
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-500">
                  📇
                </div>
                <h2 className="text-3xl font-light text-white mb-4">
                  Manage Contacts
                </h2>
                <p className="text-[#FFCC80] text-lg font-light leading-relaxed">
                  Keep track of important dates, preferences, and gift history
                  for all your loved ones in one place.
                </p>
                <div
                  className="mt-6 inline-flex items-center text-white/80 group-hover:text-white 
                                transition-colors duration-300"
                >
                  <span className="mr-2">Organize contacts</span>
                  <svg
                    className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Reminders Section */}
      {upcomingReminders.length > 0 && (
        <div className="px-8 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
              <h3 className="text-2xl font-light text-[#3E2723] mb-6 text-center">
                Upcoming Occasions
              </h3>
              <div className="grid gap-4">
                {upcomingReminders.map((reminder, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white/80 rounded-xl 
                               shadow-sm border border-[#E8D5C4]/30 hover:shadow-md transition-shadow duration-300"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-12 h-12 bg-gradient-to-br from-[#FFCC80] to-[#FFB74D] 
                                      rounded-full flex items-center justify-center text-xl"
                      >
                        🎉
                      </div>
                      <div>
                        <p className="font-medium text-[#3E2723]">
                          {reminder.contactName}
                        </p>
                        <p className="text-[#6D4C41] text-sm">
                          {reminder.occasion}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[#5D4037] font-medium">
                        {format(new Date(reminder.date), "MMM dd")}
                      </p>
                      <p className="text-[#8D6E63] text-sm">
                        {reminder.daysUntil === 0
                          ? "Today"
                          : reminder.daysUntil === 1
                          ? "Tomorrow"
                          : `${reminder.daysUntil} days`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <button
                  onClick={handleManageContacts}
                  className="text-[#6D4C41] hover:text-[#5D4037] font-medium transition-colors duration-300"
                >
                  View all contacts →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
              <div className="text-3xl font-light text-[#5D4037] mb-2">
                {contacts.length}
              </div>
              <p className="text-[#6D4C41] font-light">Saved Contacts</p>
            </div>
            <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
              <div className="text-3xl font-light text-[#5D4037] mb-2">
                {upcomingReminders.length}
              </div>
              <p className="text-[#6D4C41] font-light">Upcoming Events</p>
            </div>
            <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
              <div className="text-3xl font-light text-[#5D4037] mb-2">✨</div>
              <p className="text-[#6D4C41] font-light">AI-Powered</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
