import React from "react";
import { format, isSameMonth, addMonths, startOfMonth } from "date-fns";

const Calendar = ({ contacts }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  // Group all dates by month
  const datesByMonth = React.useMemo(() => {
    const months = {};
    const today = new Date();

    // Look ahead 12 months
    for (let i = 0; i < 12; i++) {
      const month = addMonths(startOfMonth(today), i);
      months[format(month, "yyyy-MM")] = [];
    }

    contacts.forEach((contact) => {
      contact.dates.forEach((dateInfo) => {
        const eventDate = new Date(dateInfo.date);
        const monthKey = format(eventDate, "yyyy-MM");

        if (months[monthKey]) {
          months[monthKey].push({
            ...dateInfo,
            contactName: contact.name,
            contactId: contact.id,
          });
        }
      });
    });

    return months;
  }, [contacts]);

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const previousMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const currentMonthKey = format(currentMonth, "yyyy-MM");
  const currentDates = datesByMonth[currentMonthKey] || [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={previousMonth}
          className="px-3 py-1 bg-[#5D4037] text-white rounded hover:bg-[#3E2723]"
        >
          Previous
        </button>
        <h2 className="text-xl font-bold text-[#3E2723]">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={nextMonth}
          className="px-3 py-1 bg-[#5D4037] text-white rounded hover:bg-[#3E2723]"
        >
          Next
        </button>
      </div>

      {currentDates.length > 0 ? (
        <ul className="space-y-3">
          {currentDates
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map((event, index) => (
              <li
                key={`${event.contactId}-${event.label}-${index}`}
                className="p-3 bg-[#FFEFD5] rounded-lg border border-[#D7CCC8]"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-[#3E2723]">
                      {event.contactName} - {event.label}
                    </p>
                    <p className="text-[#5D4037]">
                      {format(new Date(event.date), "MMMM do, yyyy")}
                    </p>
                  </div>
                </div>
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-center text-[#5D4037]">No events this month</p>
      )}
    </div>
  );
};

export default Calendar;
