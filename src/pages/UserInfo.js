import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import Calendar from "../components/Calendar";
import { useContacts } from "../hooks/useContacts";
import { checkForUpcomingDates, handleReminder } from "../utils/reminderUtils";
import { Link } from "react-router-dom";

const UserInfo = () => {
  const { contacts, loading, error, addContact, updateContact, deleteContact } =
    useContacts();
  const [editingContact, setEditingContact] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showGiftGenerator, setShowGiftGenerator] = useState(false);
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="min-h-screen bg-[#FFF3E0] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-4">
            <Link
              to="/gift-generator"
              className="px-4 py-2 bg-[#5D4037] text-white rounded hover:bg-[#3E2723]"
            >
              Gift Ideas
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-[#3E2723]">
            Manage Your Contacts
          </h1>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="px-4 py-2 bg-[#5D4037] text-white rounded hover:bg-[#3E2723]"
          >
            {showCalendar ? "Show Contacts" : "Show Calendar"}
          </button>
        </div>

        {showCalendar ? (
          <Calendar contacts={contacts} />
        ) : (
          <>
            {/* Input Form */}
            <div className="bg-[#FFE0B2] rounded-lg shadow-lg p-6 mb-8">
              <div className="space-y-4">
                <input
                  type="text"
                  name="name"
                  value={currentPerson.name}
                  onChange={handleInputChange}
                  placeholder="Name"
                  className="w-full p-3 rounded border border-[#D7CCC8] bg-[#FFEFD5] text-[#5D4037]"
                />
                <input
                  type="text"
                  name="relation"
                  value={currentPerson.relation}
                  onChange={handleInputChange}
                  placeholder="Relation"
                  className="w-full p-3 rounded border border-[#D7CCC8] bg-[#FFEFD5] text-[#5D4037]"
                />

                {/* Date Inputs */}
                {currentPerson.dates.map((dateEntry, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <input
                      type="text"
                      value={dateEntry.label}
                      onChange={(e) =>
                        handleDateChange(index, "label", e.target.value)
                      }
                      placeholder="Label (e.g., Birthday)"
                      className="flex-1 p-3 rounded border border-[#D7CCC8] bg-[#FFEFD5] text-[#5D4037]"
                    />
                    <input
                      type="date"
                      value={dateEntry.date}
                      onChange={(e) =>
                        handleDateChange(index, "date", e.target.value)
                      }
                      className="p-3 rounded border border-[#D7CCC8] bg-[#FFEFD5] text-[#5D4037]"
                    />
                    <button
                      type="button"
                      onClick={() => removeDateField(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDateField}
                  className="w-full py-2 rounded bg-[#5D4037] text-white hover:bg-[#3E2723]"
                >
                  Add Date
                </button>

                {/* Notes */}
                <textarea
                  name="notes"
                  value={currentPerson.notes}
                  onChange={handleInputChange}
                  placeholder="Optional Notes"
                  className="w-full p-3 rounded border border-[#D7CCC8] bg-[#FFEFD5] text-[#5D4037]"
                />

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={savePerson}
                    className="flex-1 py-3 rounded bg-mediumBrown text-white hover:bg-darkBrown"
                  >
                    {editingContact ? "Update Contact" : "Save Contact"}
                  </button>
                  {editingContact && (
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="flex-1 py-3 rounded bg-gray-500 text-white hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List of Saved People */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#3E2723]">
                Saved Contacts
              </h2>
              {contacts.length === 0 ? (
                <p className="text-[#5D4037]">No contacts saved yet.</p>
              ) : (
                <ul className="space-y-4">
                  {contacts.map((person) => (
                    <li
                      key={person.id}
                      className="p-4 border border-[#D7CCC8] bg-[#FFEFD5] rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-lg font-bold text-[#3E2723]">
                            {person.name}
                          </p>
                          <p className="text-[#5D4037]">{person.relation}</p>
                          <ul className="mt-2">
                            {person.dates.map((d, i) => (
                              <li key={i} className="text-[#5D4037]">
                                {d.label}:{" "}
                                {d.date
                                  ? format(new Date(d.date), "MMM dd, yyyy")
                                  : "N/A"}
                              </li>
                            ))}
                          </ul>
                          {person.notes && (
                            <p className="mt-2 text-[#5D4037]">
                              {person.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-2 bg-[#5D4037] text-white rounded hover:bg-[#3E2723]"
                            onClick={() => startEditing(person)}
                          >
                            Edit
                          </button>
                          <button
                            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                            onClick={() => deleteContact(person.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserInfo;
