function formatLog(level, message) {
  return `[${new Date().toISOString()}] [${level}] ${message}`;
}

function write(level, message, meta) {
  const line = formatLog(level, message);

  if (meta) {
    console.log(line, meta);
    return;
  }

  console.log(line);
}

module.exports = {
  info(message, meta) {
    write('INFO', message, meta);
  },
  warn(message, meta) {
    write('WARN', message, meta);
  },
  error(message, meta) {
    write('ERROR', message, meta);
  }
};
