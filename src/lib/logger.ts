type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  severity?: string;
  message: string;
  event?: string;
  userId?: string;
  ip?: string;
  [key: string]: unknown;
}

function log(level: LogLevel, entry: LogEntry) {
  const severity = level === "info" ? "INFO" : level === "warn" ? "WARNING" : "ERROR";
  const output = JSON.stringify({ ...entry, severity, timestamp: new Date().toISOString() });
  if (level === "error") {
    console.error(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  authSuccess(userId: string, method: string, ip?: string) {
    log("info", { message: "auth.login.success", event: "auth", userId, method, ip });
  },
  authFailure(email: string, reason: string, ip?: string) {
    log("warn", { message: "auth.login.failure", event: "auth", reason, ip, emailHash: hashEmail(email) });
  },
  authLogout(userId: string) {
    log("info", { message: "auth.logout", event: "auth", userId });
  },
  accountDeleted(userId: string) {
    log("info", { message: "account.deleted", event: "gdpr", userId });
  },
  rateLimited(ip: string, endpoint: string) {
    log("warn", { message: "rate.limit.exceeded", event: "security", ip, endpoint });
  },
  error(message: string, err: unknown) {
    log("error", { message, event: "error", error: String(err) });
  },
};

function hashEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0;
  }
  return `sha:${Math.abs(hash).toString(16)}`;
}
