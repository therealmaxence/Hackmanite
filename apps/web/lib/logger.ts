import winston from "winston";
import path from "path";
import fs from "fs";

const { combine, timestamp, json, colorize, simple } = winston.format;
const isDev = process.env.NODE_ENV === "development";
const fmt = combine(timestamp(), json());

const logDir = process.env.LOG_DIR || path.join(process.cwd(), "logs");

const transports: winston.transport[] = [
  new winston.transports.Console({ format: isDev ? combine(colorize(), simple()) : fmt })
];

try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  ["error", "combined"].forEach(type => {
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, `${type}.log`),
        level: type === "error" ? "error" : undefined,
        maxsize: 5242880,
        maxFiles: 5
      })
    );
  });
} catch (e) {}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: fmt,
  defaultMeta: { service: "datalake-graph-web" },
  transports
});

export const log = {
  api: (route: string, method: string, extra?: object) => logger.info("API request", { route, method, ...extra }),
  error: (code: string, message: string, extra?: object) => logger.error("Application error", { code, message, ...extra }),
  job: (jobId: string, event: string, extra?: object) => logger.info("Queue job", { jobId, event, ...extra })
};

