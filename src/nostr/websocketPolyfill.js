'use strict';

/**
 * WebSocket polyfill for Node.js
 * Provides WebSocket API compatibility using the 'ws' package
 */

import WebSocket from 'ws';

// Make WebSocket available globally for nostr-tools
if (typeof global !== 'undefined' && !global.WebSocket) {
  global.WebSocket = WebSocket;
}

export default WebSocket;