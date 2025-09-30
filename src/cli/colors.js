'use strict';

// ANSI color codes for terminal output

export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

export function colorize(text, color) {
  return `${color}${text}${colors.reset}`;
}

export function red(text) { return colorize(text, colors.red); }
export function green(text) { return colorize(text, colors.green); }
export function yellow(text) { return colorize(text, colors.yellow); }
export function blue(text) { return colorize(text, colors.blue); }
export function magenta(text) { return colorize(text, colors.magenta); }
export function cyan(text) { return colorize(text, colors.cyan); }
export function bright(text) { return colorize(text, colors.bright); }
export function dim(text) { return colorize(text, colors.dim); }

export function logo() {
  return `
${cyan('███████╗ ██████╗██╗  ██╗ ██████╗ ██╗      ██████╗  ██████╗██╗  ██╗')}
${cyan('██╔════╝██╔════╝██║  ██║██╔═══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝')}
${cyan('█████╗  ██║     ███████║██║   ██║██║     ██║   ██║██║     █████╔╝ ')}
${cyan('██╔══╝  ██║     ██╔══██║██║   ██║██║     ██║   ██║██║     ██╔═██╗ ')}
${cyan('███████╗╚██████╗██║  ██║╚██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗')}
${cyan('╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝')}
${dim('                    Cryptographic Dead Man\'s Switch                  ')}
`;
}

export function progressBar(percentage, width = 40) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  let color;
  if (percentage > 50) {
    color = colors.green;
  } else if (percentage > 20) {
    color = colors.yellow;
  } else {
    color = colors.red;
  }

  return `${color}[${'█'.repeat(filled)}${dim('░'.repeat(empty))}]${colors.reset} ${percentage.toFixed(1)}%`;
}

export function formatTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function statusBadge(status) {
  switch (status) {
    case 'ARMED':
      return `${colors.bgGreen}${colors.black} ARMED ${colors.reset}`;
    case 'TRIGGERED':
      return `${colors.bgRed}${colors.white} TRIGGERED ${colors.reset}`;
    case 'RELEASED':
      return `${colors.bgYellow}${colors.black} RELEASED ${colors.reset}`;
    default:
      return `${colors.bgWhite}${colors.black} ${status} ${colors.reset}`;
  }
}