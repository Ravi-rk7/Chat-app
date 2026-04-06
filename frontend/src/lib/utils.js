const isDateValid = (value) => value && !Number.isNaN(new Date(value).getTime());

export function formatMessageTime(date) {
  if (!isDateValid(date)) return "";

  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isSameDay(leftDate, rightDate) {
  if (!isDateValid(leftDate) || !isDateValid(rightDate)) return false;

  const left = new Date(leftDate);
  const right = new Date(rightDate);

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatMessageDateLabel(date) {
  if (!isDateValid(date)) return "";

  const value = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(value, today)) return "Today";
  if (isSameDay(value, yesterday)) return "Yesterday";

  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: value.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export function formatPreviewTime(date) {
  if (!isDateValid(date)) return "";

  const value = new Date(date);
  const today = new Date();

  if (isSameDay(value, today)) {
    return formatMessageTime(value);
  }

  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatLastSeen(date) {
  if (!isDateValid(date)) return "recently";

  const value = new Date(date);
  const diffInMinutes = Math.max(0, Math.floor((Date.now() - value.getTime()) / 60000));

  if (diffInMinutes < 1) return "just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  if (isSameDay(value, new Date())) {
    return `today at ${formatMessageTime(value)}`;
  }

  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getMessagePreview(message) {
  if (!message) return "Start a conversation";
  if (message.text?.trim()) return message.text;
  if (message.image || message.hasImage) return "Photo attachment";
  return "Start a conversation";
}

export function getMessageStatus(message, isOwnMessage) {
  if (!isOwnMessage) return "";
  if (message.seenAt) return "Seen";
  if (message.deliveredAt) return "Delivered";
  return message.isSending ? "Sending..." : "Sent";
}
