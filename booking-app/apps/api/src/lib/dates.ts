export function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function setMinutesOnDate(date: Date, minutes: number) {
  const copy = new Date(date);
  copy.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return copy;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export function dollars(value: unknown) {
  return Number(value).toFixed(2);
}
