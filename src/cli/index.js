'use strict';

// ECHOLOCK Interactive CLI
// Command-line interface for cryptographic dead man's switch

import readline from 'readline';
import * as dms from '../core/deadManSwitch.js';
import {
  logo, red, green, yellow, blue, cyan, dim, bright,
  statusBadge, progressBar, formatTime
} from './colors.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: cyan('echolock> ')
});

let currentSwitchId = null;

function showHelp() {
  console.log(bright('\nAvailable Commands:'));
  console.log(dim('─'.repeat(60)));
  console.log(green('  create') + '             Create a new dead man\'s switch');
  console.log(green('  check-in') + '           Reset the timer (perform check-in)');
  console.log(green('  status') + '             Show current status');
  console.log(green('  list') + '               List all switches');
  console.log(green('  select <id>') + '        Select a switch by ID');
  console.log(green('  test-release') + '       Manually trigger release (for testing)');
  console.log(green('  show-bitcoin-tx') + '    Preview Bitcoin transaction (unsigned)');
  console.log(green('  delete') + '             Delete current switch');
  console.log(green('  help') + '               Show this help message');
  console.log(green('  exit') + '               Quit the program');
  console.log(dim('─'.repeat(60)));
  console.log();
}

async function handleCreate() {
  console.log(yellow('\n📝 Create New Dead Man\'s Switch\n'));

  const message = await new Promise(resolve => {
    rl.question(bright('Enter secret message: '), resolve);
  });

  if (!message.trim()) {
    console.log(red('✗ Message cannot be empty\n'));
    return;
  }

  const hoursStr = await new Promise(resolve => {
    rl.question(bright('Check-in interval (hours) [72]: '), resolve);
  });

  const hours = parseInt(hoursStr) || 72;

  const useBitcoinStr = await new Promise(resolve => {
    rl.question(bright('Enable Bitcoin timelock? (yes/no) [yes]: '), resolve);
  });

  const useBitcoin = !useBitcoinStr || useBitcoinStr.toLowerCase() !== 'no';

  let password = null;
  if (useBitcoin) {
    password = await new Promise(resolve => {
      rl.question(bright('Enter password for Bitcoin key encryption: '), resolve);
    });

    if (!password) {
      console.log(red('✗ Password is required for Bitcoin timelock mode\n'));
      return;
    }
  }

  console.log(dim('\n⏳ Creating switch...'));

  try {
    const result = await dms.createSwitch(message, hours, useBitcoin, password);
    currentSwitchId = result.switchId;

    console.log(green('\n✓ Dead man\'s switch created successfully!\n'));
    console.log(bright('Switch ID: ') + cyan(result.switchId));
    console.log(bright('Fragments: ') + `${result.requiredFragments}-of-${result.fragmentCount} threshold`);
    console.log(bright('Check-in: ') + `Every ${hours} hours`);
    console.log(bright('Expires: ') + new Date(result.expiryTime).toLocaleString());

    if (result.bitcoin?.enabled) {
      console.log(bright('Bitcoin:   ') + green('Enabled'));
      console.log(bright('  Address: ') + cyan(result.bitcoin.address));
      console.log(bright('  Timelock: ') + `Block ${result.bitcoin.timelockHeight}`);
    }

    console.log(dim('\n💡 Use "status" to monitor or "check-in" to reset timer\n'));
  } catch (error) {
    console.log(red(`\n✗ Failed to create switch: ${error.message}\n`));
  }
}

async function handleCheckIn() {
  if (!currentSwitchId) {
    console.log(red('\n✗ No switch selected. Use "list" and "select <id>"\n'));
    return;
  }

  console.log(yellow('\n🔄 Performing check-in...\n'));

  const result = dms.checkIn(currentSwitchId);

  if (result.success) {
    console.log(green('✓ Check-in successful!\n'));
    console.log(bright('New expiry: ') + new Date(result.newExpiryTime).toLocaleString());
    console.log(bright('Check-ins: ') + result.checkInCount);
    console.log(dim('\n⏰ Timer has been reset\n'));
  } else {
    console.log(red(`✗ Check-in failed: ${result.message}\n`));
  }
}

function handleStatus() {
  if (!currentSwitchId) {
    console.log(red('\n✗ No switch selected. Use "list" and "select <id>"\n'));
    return;
  }

  const status = dms.getStatus(currentSwitchId);

  if (!status.found) {
    console.log(red(`\n✗ ${status.message}\n`));
    return;
  }

  console.log(yellow('\n📊 Switch Status\n'));
  console.log(dim('─'.repeat(60)));
  console.log(bright('Switch ID:    ') + cyan(status.switchId));
  console.log(bright('Status:       ') + statusBadge(status.status));
  console.log(bright('Created:      ') + new Date(status.createdAt).toLocaleString());
  console.log(bright('Last Check:   ') + new Date(status.lastCheckIn).toLocaleString());
  console.log(bright('Check-ins:    ') + status.checkInCount);
  console.log(bright('Interval:     ') + `${status.checkInHours} hours`);

  if (status.isExpired) {
    console.log(bright('Time Left:    ') + red('EXPIRED'));
    console.log(bright('Progress:     ') + progressBar(0, 40));
  } else {
    const totalTime = status.checkInHours * 60 * 60 * 1000;
    const percentage = (status.timeRemaining / totalTime) * 100;
    console.log(bright('Time Left:    ') + formatTime(status.timeRemaining));
    console.log(bright('Progress:     ') + progressBar(percentage, 40));
  }

  console.log(bright('Fragments:    ') + `${status.requiredFragments}-of-${status.fragmentCount}`);
  console.log(bright('Distribution: ') + status.distributionStatus);
  console.log(dim('─'.repeat(60)));
  console.log();
}

function handleList() {
  const switches = dms.listSwitches();

  if (switches.length === 0) {
    console.log(dim('\n📭 No switches found. Use "create" to make one.\n'));
    return;
  }

  console.log(yellow(`\n📋 All Switches (${switches.length})\n`));
  console.log(dim('─'.repeat(80)));

  for (const sw of switches) {
    const selected = sw.id === currentSwitchId ? cyan('► ') : '  ';
    const timeLeft = sw.timeRemaining > 0 ? formatTime(sw.timeRemaining) : red('EXPIRED');

    console.log(
      selected +
      bright(sw.id.substring(0, 8)) + '...' +
      ' │ ' +
      statusBadge(sw.status) +
      ' │ ' +
      bright('Time:') + ' ' + timeLeft +
      ' │ ' +
      bright('Checks:') + ' ' + sw.checkInCount
    );
  }

  console.log(dim('─'.repeat(80)));
  console.log(dim('\n💡 Use "select <id>" to choose a switch\n'));
}

function handleSelect(id) {
  if (!id) {
    console.log(red('\n✗ Please provide a switch ID\n'));
    return;
  }

  const status = dms.getStatus(id);

  if (!status.found) {
    console.log(red(`\n✗ Switch not found: ${id}\n`));
    return;
  }

  currentSwitchId = id;
  console.log(green(`\n✓ Selected switch: ${cyan(id.substring(0, 16))}...\n`));
}

async function handleTestRelease() {
  if (!currentSwitchId) {
    console.log(red('\n✗ No switch selected. Use "list" and "select <id>"\n'));
    return;
  }

  const status = await dms.getStatus(currentSwitchId);
  const hasBitcoin = status.bitcoin?.enabled;

  let password = null;
  if (hasBitcoin) {
    password = await new Promise(resolve => {
      rl.question(bright('Enter password to decrypt Bitcoin key (or press Enter to skip): '), resolve);
    });
  }

  console.log(yellow('\n🔓 Initiating test release...\n'));
  console.log(dim('1. Fetching encrypted fragments...'));
  console.log(dim('2. Reconstructing encryption key using Shamir SSS...'));
  console.log(dim('3. Decrypting message with AES-256-GCM...\n'));

  const result = await dms.testRelease(currentSwitchId, password, true);

  if (result.success) {
    console.log(green('✓ Message successfully reconstructed!\n'));
    console.log(dim('─'.repeat(60)));
    console.log(bright('📨 DECRYPTED MESSAGE:\n'));
    console.log(cyan(result.reconstructedMessage));
    console.log(dim('\n─'.repeat(60)));
    console.log(dim(`\nUsed ${result.sharesUsed} of ${result.totalShares} fragments\n`));

    if (result.bitcoinTx) {
      console.log(bright('🪙 Bitcoin Transaction:\n'));
      if (result.bitcoinTx.success) {
        console.log(green('✓ Transaction created (dry run)\n'));
        console.log(bright('  Inputs:  ') + result.bitcoinTx.details.inputs);
        console.log(bright('  Amount:  ') + result.bitcoinTx.details.outputAmount + ' sats');
        console.log(bright('  Fee:     ') + result.bitcoinTx.details.fee + ' sats');
        console.log(bright('  PSBT:    ') + cyan(result.bitcoinTx.psbt.substring(0, 40)) + '...');
        console.log(dim('\n💡 Use "show-bitcoin-tx" to see full transaction details\n'));
      } else {
        console.log(red(`✗ Bitcoin tx failed: ${result.bitcoinTx.error}\n`));
      }
    }
  } else {
    console.log(red(`✗ Release failed: ${result.message}\n`));
  }
}

async function handleShowBitcoinTx() {
  if (!currentSwitchId) {
    console.log(red('\n✗ No switch selected. Use "list" and "select <id>"\n'));
    return;
  }

  const status = await dms.getStatus(currentSwitchId, true);

  if (!status.bitcoin?.enabled) {
    console.log(red('\n✗ This switch does not have Bitcoin timelock enabled\n'));
    return;
  }

  console.log(yellow('\n🪙 Bitcoin Timelock Transaction\n'));
  console.log(dim('─'.repeat(60)));
  console.log(bright('Address:       ') + cyan(status.bitcoin.address));
  console.log(bright('Script:        ') + status.bitcoin.scriptAsm);
  console.log(bright('Timelock:      ') + `Block ${status.bitcoin.timelockHeight}`);
  console.log(bright('Current Block: ') + status.bitcoin.currentHeight);
  console.log(bright('Blocks Left:   ') + Math.max(0, status.bitcoin.blocksUntilValid));

  if (status.bitcoin.isValid) {
    console.log(bright('Status:        ') + green('✓ Valid - can spend'));
  } else {
    console.log(bright('Status:        ') + yellow('⏳ Not yet valid'));
  }

  console.log(dim('─'.repeat(60)));

  const password = await new Promise(resolve => {
    rl.question(bright('\nEnter password to create transaction preview (or press Enter to skip): '), resolve);
  });

  if (password) {
    console.log(dim('\n⏳ Creating transaction preview...\n'));

    try {
      const result = await dms.testRelease(currentSwitchId, password, true);

      if (result.bitcoinTx?.success) {
        console.log(green('✓ Transaction created successfully (unsigned)\n'));
        console.log(bright('Details:'));
        console.log(bright('  Inputs:       ') + result.bitcoinTx.details.inputs);
        console.log(bright('  Total Input:  ') + result.bitcoinTx.details.totalInput + ' sats');
        console.log(bright('  Output:       ') + result.bitcoinTx.details.outputAmount + ' sats');
        console.log(bright('  Fee:          ') + result.bitcoinTx.details.fee + ' sats');
        console.log(bright('  Fee Rate:     ') + result.bitcoinTx.details.feeRate + ' sat/vbyte');
        console.log(bright('  Size:         ') + result.bitcoinTx.details.estimatedSize + ' vbytes');
        console.log(bright('  Locktime:     ') + result.bitcoinTx.details.locktime);
        console.log(bright('\nPSBT (Base64):'));
        console.log(cyan(result.bitcoinTx.psbt));
        console.log(dim('\n⚠️  This is a dry run - transaction not signed or broadcast\n'));
      } else {
        console.log(red(`✗ Failed: ${result.bitcoinTx?.error || 'Unknown error'}\n`));
      }
    } catch (error) {
      console.log(red(`✗ Error: ${error.message}\n`));
    }
  }

  console.log();
}

async function handleDelete() {
  if (!currentSwitchId) {
    console.log(red('\n✗ No switch selected\n'));
    return;
  }

  const confirm = await new Promise(resolve => {
    rl.question(red('⚠️  Delete this switch? (yes/no): '), resolve);
  });

  if (confirm.toLowerCase() === 'yes') {
    dms.deleteSwitch(currentSwitchId);
    console.log(green('\n✓ Switch deleted\n'));
    currentSwitchId = null;
  } else {
    console.log(dim('\nCancelled\n'));
  }
}

async function processCommand(line) {
  const [cmd, ...args] = line.trim().split(/\s+/);

  switch (cmd.toLowerCase()) {
    case 'create':
      await handleCreate();
      break;
    case 'check-in':
    case 'checkin':
      await handleCheckIn();
      break;
    case 'status':
      handleStatus();
      break;
    case 'list':
      handleList();
      break;
    case 'select':
      handleSelect(args[0]);
      break;
    case 'test-release':
    case 'release':
      await handleTestRelease();
      break;
    case 'show-bitcoin-tx':
    case 'bitcoin-tx':
    case 'btc':
      await handleShowBitcoinTx();
      break;
    case 'delete':
      await handleDelete();
      break;
    case 'help':
      showHelp();
      break;
    case 'exit':
    case 'quit':
      console.log(cyan('\n👋 Goodbye!\n'));
      process.exit(0);
      break;
    case '':
      break;
    default:
      console.log(red(`\n✗ Unknown command: ${cmd}`));
      console.log(dim('Use "help" to see available commands\n'));
  }
}

// Main CLI loop
console.clear();
console.log(logo());
console.log(yellow('⚠️  WARNING: Experimental cryptographic software'));
console.log(dim('    Testnet only - not production ready\n'));
console.log(dim('Type "help" for available commands\n'));

rl.prompt();

rl.on('line', async (line) => {
  await processCommand(line);
  rl.prompt();
});

rl.on('close', () => {
  console.log(cyan('\n👋 Goodbye!\n'));
  process.exit(0);
});