import winston from "winston";
import "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure the daily rotate file transport
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: "%DATE%.log",
  datePattern: "YYYY-MM-DD",
  dirname: logsDir,
  maxFiles: "14d", // Keep logs for 14 days
  createSymlink: true,
  symlinkName: "current.log",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

// Create the Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "graphql-mcp" },
  transports: [
    fileRotateTransport,
    // Also log to console in non-production environments
    ...(process.env.NODE_ENV !== "production"
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp(),
              winston.format.printf(
                ({ timestamp, level, message, ...meta }) => {
                  return `${timestamp} ${level}: ${message} ${
                    Object.keys(meta).length
                      ? JSON.stringify(meta, null, 2)
                      : ""
                  }`;
                }
              )
            ),
          }),
        ]
      : []),
  ],
});

export default logger;
