export const formatTimeValue = (timeValue) => {
  if (!timeValue) {
    return "0:00";
  }
  const minutes = Math.floor(timeValue / 60);
  const seconds = Math.floor(timeValue % 60);
  const secondsFormatted = seconds >= 10 ? seconds : `0${seconds}`;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const minutesRemainder = Math.floor(minutes % 60);
    const minutesFormatted = minutesRemainder >= 10 ? minutesRemainder : `0${minutesRemainder}`;
    return `${hours}:${minutesFormatted}:${secondsFormatted}`;
  }
  return `${minutes}:${secondsFormatted}`;
};
