import winston from 'winston';

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

const isDev = process.env.NODE_ENV === 'development';

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: isDev ? devFormat : prodFormat,
  transports: [new winston.transports.Console()],
});

export default logger;
