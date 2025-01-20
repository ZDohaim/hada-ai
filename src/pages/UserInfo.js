import React, { useState } from "react";
import { format } from "date-fns";

const UserInfo = () => {
  const [people, setPeople] = useState([]);
  const [currentPerson, setCurrentPerson] = useState({
    name: "",
    relation: "",
    dates: [{ label: "Birthday", date: "" }],
    notes: "",
  });

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

  const savePerson = () => {
    if (!currentPerson.name || !currentPerson.relation) {
      alert("Name and Relation are required!");
      return;
    }
    setPeople((prev) => [...prev, currentPerson]);
    setCurrentPerson({
      name: "",
      relation: "",
      dates: [{ label: "Birthday", date: "" }],
      notes: "",
    });
  };

  const removePerson = (index) => {
    setPeople((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#FFF3E0]"
      style={{ padding: "2rem" }}
    >
      <div
        className="w-full max-w-4xl bg-[#FFE0B2] rounded-lg shadow-lg p-6"
        style={{ color: "#3E2723" }}
      >
        <h1
          className="text-3xl font-bold mb-6 text-center"
          style={{ color: "#3E2723" }}
        >
          Manage Your Contacts
        </h1>

        {/* Input Form */}
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

          <button
            type="button"
            onClick={savePerson}
            className="w-full py-3 rounded bg-green-500 text-white hover:bg-green-600"
          >
            Save Contact
          </button>
        </div>

        {/* List of Saved People */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Saved Contacts</h2>
          {people.length === 0 ? (
            <p className="text-[#5D4037]">No contacts saved yet.</p>
          ) : (
            <ul className="space-y-4">
              {people.map((person, index) => (
                <li
                  key={index}
                  className="p-4 border border-[#D7CCC8] bg-[#FFEFD5] rounded-lg flex items-center justify-between"
                >
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
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-2 bg-[#5D4037] text-white rounded hover:bg-[#3E2723]"
                      onClick={() =>
                        alert("Edit functionality not implemented yet!")
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => removePerson(index)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
