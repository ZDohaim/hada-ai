import { addDays, isWithinInterval, startOfDay } from "date-fns";

export const REMINDER_TYPES = {
  EMAIL: "email",
  NOTIFICATION: "notification",
  CONSOLE: "console",
};

export const DEFAULT_LEAD_TIMES = [
  { days: 7, type: REMINDER_TYPES.EMAIL },
  { days: 3, type: REMINDER_TYPES.NOTIFICATION },
  { days: 1, type: REMINDER_TYPES.CONSOLE },
];

export const checkForUpcomingDates = (
  contacts,
  leadTimes = DEFAULT_LEAD_TIMES
) => {
  const today = startOfDay(new Date());
  const reminders = [];

  contacts.forEach((contact) => {
    contact.dates.forEach((dateInfo) => {
      const eventDate = new Date(dateInfo.date);

      leadTimes.forEach(({ days, type }) => {
        const reminderDate = startOfDay(addDays(today, days));

        if (
          isWithinInterval(eventDate, {
            start: today,
            end: reminderDate,
          })
        ) {
          reminders.push({
            contactName: contact.name,
            eventLabel: dateInfo.label,
            eventDate,
            daysUntil: days,
            type,
          });
        }
      });
    });
  });

  return reminders;
};

export const handleReminder = (reminder) => {
  const message = `Upcoming ${reminder.eventLabel} for ${
    reminder.contactName
  } in ${reminder.daysUntil} days (${reminder.eventDate.toLocaleDateString()})`;

  switch (reminder.type) {
    case REMINDER_TYPES.EMAIL:
      // Implement email notification
      console.log("Email reminder:", message);
      break;
    case REMINDER_TYPES.NOTIFICATION:
      // Implement browser notification
      if (Notification.permission === "granted") {
        new Notification("Gift Reminder", { body: message });
      }
      break;
    case REMINDER_TYPES.CONSOLE:
      console.log("Console reminder:", message);
      break;
    default:
      console.log("Unknown reminder type:", reminder.type);
  }
};
