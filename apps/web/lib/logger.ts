import winston from "winston";

const { combine, timestamp, json, colorize, simple } = winston.format;
const isDev = process.env.NODE_ENV === "development";
const fmt = combine(timestamp(), json());

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: fmt,
  defaultMeta: { service: "datalake-graph-web" },
  transports: [
    new winston.transports.Console({ format: isDev ? combine(colorize(), simple()) : fmt }),
    ...["error", "combined"].map(type => new winston.transports.File({
      filename: `logs/${type}.log`, level: type === "error" ? "error" : undefined, maxsize: 5242880, maxFiles: 5
    }))
  ]
});

export const log = {
  api: (route: string, method: string, extra?: object) => logger.info("API request", { route, method, ...extra }),
  error: (code: string, message: string, extra?: object) => logger.error("Application error", { code, message, ...extra }),
  job: (jobId: string, event: string, extra?: object) => logger.info("Queue job", { jobId, event, ...extra })
};
