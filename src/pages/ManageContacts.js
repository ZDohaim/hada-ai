import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import Calendar from "../components/Calendar";
import { useContacts } from "../hooks/useContacts";
import { checkForUpcomingDates, handleReminder } from "../utils/reminderUtils";
import { Link } from "react-router-dom";

const ManageContacts = () => {
  const { contacts, loading, error, addContact, updateContact, deleteContact } =
    useContacts();
  const [editingContact, setEditingContact] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentPerson, setCurrentPerson] = useState({
    name: "",
    relation: "",
    dates: [{ label: "Birthday", date: "" }],
    notes: "",
  });

  // Check for reminders every hour
  useEffect(() => {
    const checkReminders = () => {
      const reminders = checkForUpcomingDates(contacts);
      reminders.forEach(handleReminder);
    };

    checkReminders(); // Initial check
    const interval = setInterval(checkReminders, 3600000); // Check every hour

    return () => clearInterval(interval);
  }, [contacts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentPerson((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (index, field, value) => {
    const updatedDates = currentPerson.dates.map((d, i) =>
      i === index ? { ...d, [field]: value } : d
    );
    setCurrentPerson((prev) => ({ ...prev, dates: updatedDates }));
  };

  const addDateField = () => {
    setCurrentPerson((prev) => ({
      ...prev,
      dates: [...prev.dates, { label: "", date: "" }],
    }));
  };

  const removeDateField = (index) => {
    setCurrentPerson((prev) => ({
      ...prev,
      dates: prev.dates.filter((_, i) => i !== index),
    }));
  };

  const savePerson = async () => {
    try {
      if (!currentPerson.name || !currentPerson.relation) {
        alert("Name and Relation are required!");
        return;
      }

      if (editingContact) {
        await updateContact(editingContact.id, currentPerson);
      } else {
        const newContactId = await addContact(currentPerson);
        console.log("New contact added with ID:", newContactId);
      }

      setCurrentPerson({
        name: "",
        relation: "",
        dates: [{ label: "Birthday", date: "" }],
        notes: "",
      });
      setEditingContact(null);
    } catch (err) {
      console.error("Error details:", err);
      alert("Error saving contact: " + err.message);
    }
  };

  const startEditing = (person) => {
    setEditingContact(person);
    setCurrentPerson({
      ...person,
      dates: person.dates || [{ label: "Birthday", date: "" }],
    });
  };

  const cancelEditing = () => {
    setEditingContact(null);
    setCurrentPerson({
      name: "",
      relation: "",
      dates: [{ label: "Birthday", date: "" }],
      notes: "",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8E1] via-[#FFF3E0] to-[#FFECB3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D7CCC8] border-t-[#8D6E63] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5D4037] text-lg">Loading your contacts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8E1] via-[#FFF3E0] to-[#FFECB3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Error: {error}</p>
          <Link
            to="/UserInfo"
            className="px-6 py-3 bg-[#5D4037] text-white rounded-lg hover:bg-[#3E2723] transition-colors duration-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8E1] via-[#FFF3E0] to-[#FFECB3]">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <Link
              to="/UserInfo"
              className="flex items-center text-[#6D4C41] hover:text-[#5D4037] transition-colors duration-300"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </Link>
            <Link
              to="/gift-flow"
              className="px-6 py-3 bg-gradient-to-r from-[#8D6E63] to-[#6D4C41] text-white rounded-xl 
                         hover:from-[#6D4C41] hover:to-[#5D4037] transition-all duration-300 shadow-lg"
            >
              🎁 Generate Gift Ideas
            </Link>
          </div>
          <h1 className="text-4xl font-light text-[#3E2723]">
            Manage Your Contacts
          </h1>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="px-6 py-3 bg-white/60 backdrop-blur-sm text-[#5D4037] rounded-xl border border-white/20
                       hover:bg-white/80 transition-all duration-300 shadow-lg"
          >
            {showCalendar ? "📇 Show Contacts" : "📅 Show Calendar"}
          </button>
        </div>

        {showCalendar ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
            <Calendar contacts={contacts} />
          </div>
        ) : (
          <>
            {/* Input Form */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-12">
              <h2 className="text-2xl font-light text-[#3E2723] mb-8 text-center">
                {editingContact ? "Edit Contact" : "Add New Contact"}
              </h2>
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <input
                    type="text"
                    name="name"
                    value={currentPerson.name}
                    onChange={handleInputChange}
                    placeholder="Name"
                    className="w-full p-4 rounded-xl border border-[#E8D5C4]/50 bg-white/80 text-[#5D4037] 
                               focus:outline-none focus:ring-2 focus:ring-[#8D6E63]/30 focus:border-[#8D6E63] 
                               transition-all duration-300"
                  />
                  <input
                    type="text"
                    name="relation"
                    value={currentPerson.relation}
                    onChange={handleInputChange}
                    placeholder="Relation"
                    className="w-full p-4 rounded-xl border border-[#E8D5C4]/50 bg-white/80 text-[#5D4037] 
                               focus:outline-none focus:ring-2 focus:ring-[#8D6E63]/30 focus:border-[#8D6E63] 
                               transition-all duration-300"
                  />
                </div>

                {/* Date Inputs */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[#5D4037]">
                    Important Dates
                  </h3>
                  {currentPerson.dates.map((dateEntry, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <input
                        type="text"
                        value={dateEntry.label}
                        onChange={(e) =>
                          handleDateChange(index, "label", e.target.value)
                        }
                        placeholder="Label (e.g., Birthday)"
                        className="flex-1 p-4 rounded-xl border border-[#E8D5C4]/50 bg-white/80 text-[#5D4037] 
                                   focus:outline-none focus:ring-2 focus:ring-[#8D6E63]/30 focus:border-[#8D6E63] 
                                   transition-all duration-300"
                      />
                      <input
                        type="date"
                        value={dateEntry.date}
                        onChange={(e) =>
                          handleDateChange(index, "date", e.target.value)
                        }
                        className="p-4 rounded-xl border border-[#E8D5C4]/50 bg-white/80 text-[#5D4037] 
                                   focus:outline-none focus:ring-2 focus:ring-[#8D6E63]/30 focus:border-[#8D6E63] 
                                   transition-all duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeDateField(index)}
                        className="px-4 py-3 bg-red-500/80 text-white rounded-xl hover:bg-red-600 
                                   transition-all duration-300 shadow-lg"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addDateField}
                    className="w-full py-3 rounded-xl bg-[#8D6E63]/20 text-[#5D4037] border-2 border-dashed 
                               border-[#8D6E63]/30 hover:bg-[#8D6E63]/30 transition-all duration-300"
                  >
                    + Add Date
                  </button>
                </div>

                {/* Notes */}
                <textarea
                  name="notes"
                  value={currentPerson.notes}
                  onChange={handleInputChange}
                  placeholder="Optional Notes (preferences, interests, etc.)"
                  rows="4"
                  className="w-full p-4 rounded-xl border border-[#E8D5C4]/50 bg-white/80 text-[#5D4037] 
                             focus:outline-none focus:ring-2 focus:ring-[#8D6E63]/30 focus:border-[#8D6E63] 
                             transition-all duration-300 resize-none"
                />

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={savePerson}
                    className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[#8D6E63] to-[#6D4C41] text-white 
                               hover:from-[#6D4C41] hover:to-[#5D4037] transition-all duration-300 shadow-lg 
                               font-medium text-lg"
                  >
                    {editingContact ? "Update Contact" : "Save Contact"}
                  </button>
                  {editingContact && (
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="flex-1 py-4 rounded-xl bg-gray-500/80 text-white hover:bg-gray-600 
                                 transition-all duration-300 shadow-lg font-medium text-lg"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List of Saved People */}
            <div className="space-y-6">
              <h2 className="text-3xl font-light text-[#3E2723] text-center">
                Your Contacts ({contacts.length})
              </h2>
              {contacts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📇</div>
                  <p className="text-xl text-[#6D4C41] font-light">
                    No contacts saved yet.
                  </p>
                  <p className="text-[#8D6E63] mt-2">
                    Add your first contact above to get started!
                  </p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {contacts.map((person) => (
                    <div
                      key={person.id}
                      className="p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 
                                 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-12 h-12 bg-gradient-to-br from-[#FFCC80] to-[#FFB74D] 
                                            rounded-full flex items-center justify-center text-xl"
                            >
                              👤
                            </div>
                            <div>
                              <h3 className="text-xl font-medium text-[#3E2723]">
                                {person.name}
                              </h3>
                              <p className="text-[#6D4C41]">
                                {person.relation}
                              </p>
                            </div>
                          </div>

                          {person.dates && person.dates.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-[#5D4037] mb-2">
                                Important Dates:
                              </h4>
                              <div className="grid gap-2">
                                {person.dates.map((d, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-2 text-[#6D4C41]"
                                  >
                                    <span className="text-lg">📅</span>
                                    <span className="font-medium">
                                      {d.label}:
                                    </span>
                                    <span>
                                      {d.date
                                        ? format(
                                            new Date(d.date),
                                            "MMM dd, yyyy"
                                          )
                                        : "N/A"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {person.notes && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-[#5D4037] mb-2">
                                Notes:
                              </h4>
                              <p className="text-[#6D4C41] bg-white/50 rounded-lg p-3">
                                {person.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 ml-6">
                          <button
                            className="px-4 py-2 bg-[#8D6E63] text-white rounded-xl hover:bg-[#6D4C41] 
                                       transition-all duration-300 shadow-lg"
                            onClick={() => startEditing(person)}
                          >
                            Edit
                          </button>
                          <button
                            className="px-4 py-2 bg-red-500/80 text-white rounded-xl hover:bg-red-600 
                                       transition-all duration-300 shadow-lg"
                            onClick={() => deleteContact(person.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ManageContacts;
