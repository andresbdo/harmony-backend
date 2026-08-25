export function daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Next date strictly after `fromDate` that falls on `day` of some month.
 * Clamps to the last day of the month when `day` doesn't exist in it (e.g. 31 in a 30-day month).
 */
export function nextOccurrenceOfDay(fromDate: Date, day: number): Date {
    const year = fromDate.getFullYear();
    const month = fromDate.getMonth();

    const thisMonthDay = Math.min(day, daysInMonth(year, month));
    const thisMonthOccurrence = new Date(year, month, thisMonthDay);

    if (thisMonthOccurrence > fromDate) {
        return thisMonthOccurrence;
    }

    const nextMonthDay = Math.min(day, daysInMonth(year, month + 1));
    return new Date(year, month + 1, nextMonthDay);
}
