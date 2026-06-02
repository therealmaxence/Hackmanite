import winston from "winston";

const { combine, timestamp, json, colorize, simple } = winston.format;

const isDev = process.env.NODE_ENV === "development";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp(), json()),
  defaultMeta: { service: "datalake-graph-web" },
  transports: [
    // Console
    new winston.transports.Console({
      format: isDev ? combine(colorize(), simple()) : combine(timestamp(), json()),
    }),
    // Error log
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5_242_880, // 5MB
      maxFiles: 5,
    }),
    // Combined log
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5_242_880,
      maxFiles: 5,
    }),
  ],
});

export const log = {
  api: (route: string, method: string, extra?: object) =>
    logger.info("API request", { route, method, ...extra }),
  error: (code: string, message: string, extra?: object) =>
    logger.error("Application error", { code, message, ...extra }),
  job: (jobId: string, event: string, extra?: object) =>
    logger.info("Queue job", { jobId, event, ...extra }),
};
