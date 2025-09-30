'use strict';

// Mock Nostr Relay Server for Testing
// Simulates Nostr relay behavior without network calls

import { EventEmitter } from 'events';

/**
 * Mock Nostr relay that stores events in memory
 */
export class MockRelayServer extends EventEmitter {
  constructor(url, options = {}) {
    super();
    this.url = url;
    this.events = new Map(); // event_id -> event
    this.isConnected = true;
    this.shouldFail = options.shouldFail || false;
    this.latency = options.latency || 0; // Simulated network latency in ms
    this.censoredTags = options.censoredTags || []; // Tags to censor (simulate censorship)
  }

  /**
   * Simulate connection
   */
  async connect() {
    await this._delay(this.latency);

    if (this.shouldFail) {
      throw new Error(`Failed to connect to ${this.url}`);
    }

    this.isConnected = true;
    this.emit('connect');
    return true;
  }

  /**
   * Simulate disconnection
   */
  disconnect() {
    this.isConnected = false;
    this.emit('disconnect');
  }

  /**
   * Publish an event to the relay
   */
  async publish(event) {
    await this._delay(this.latency);

    if (!this.isConnected) {
      throw new Error('Relay not connected');
    }

    if (this.shouldFail) {
      throw new Error('Relay publish failed');
    }

    // Check if event should be censored
    const isCensored = this.censoredTags.some(tag => {
      const eventTags = event.tags || [];
      return eventTags.some(t => t[0] === tag[0] && t[1] === tag[1]);
    });

    if (isCensored) {
      // Pretend to accept but don't store
      return { success: true, censored: true };
    }

    // Store event
    this.events.set(event.id, { ...event, relay: this.url });
    this.emit('published', event);

    return { success: true, eventId: event.id };
  }

  /**
   * Subscribe to events matching filters
   */
  async subscribe(filters) {
    await this._delay(this.latency);

    if (!this.isConnected) {
      throw new Error('Relay not connected');
    }

    if (this.shouldFail) {
      throw new Error('Relay subscribe failed');
    }

    const matchingEvents = [];

    for (const event of this.events.values()) {
      if (this._matchesFilter(event, filters)) {
        matchingEvents.push(event);
      }
    }

    return matchingEvents;
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(eventId) {
    await this._delay(this.latency);

    if (!this.isConnected) {
      throw new Error('Relay not connected');
    }

    return this.events.get(eventId) || null;
  }

  /**
   * Check if filter matches event
   */
  _matchesFilter(event, filters) {
    if (!filters) return true;

    // Match by IDs
    if (filters.ids && filters.ids.length > 0) {
      if (!filters.ids.includes(event.id)) return false;
    }

    // Match by authors
    if (filters.authors && filters.authors.length > 0) {
      if (!filters.authors.includes(event.pubkey)) return false;
    }

    // Match by kinds
    if (filters.kinds && filters.kinds.length > 0) {
      if (!filters.kinds.includes(event.kind)) return false;
    }

    // Match by tags
    if (filters['#d']) {
      const dTags = (event.tags || []).filter(t => t[0] === 'd').map(t => t[1]);
      if (!filters['#d'].some(d => dTags.includes(d))) return false;
    }

    // Match by since/until
    if (filters.since && event.created_at < filters.since) return false;
    if (filters.until && event.created_at > filters.until) return false;

    return true;
  }

  /**
   * Simulate network latency
   */
  _delay(ms) {
    if (ms === 0) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all stored events
   */
  clear() {
    this.events.clear();
  }

  /**
   * Get event count
   */
  getEventCount() {
    return this.events.size;
  }

  /**
   * Set failure mode
   */
  setFailureMode(shouldFail) {
    this.shouldFail = shouldFail;
  }

  /**
   * Add censored tag
   */
  addCensoredTag(tag) {
    this.censoredTags.push(tag);
  }
}

/**
 * Create multiple mock relays
 */
export function createMockRelays(urls, options = {}) {
  return urls.map(url => new MockRelayServer(url, options[url] || {}));
}

/**
 * Mock relay pool manager
 */
export class MockRelayPool {
  constructor(relays = []) {
    this.relays = relays;
  }

  /**
   * Publish to all relays
   */
  async publishToAll(event) {
    const results = await Promise.allSettled(
      this.relays.map(relay => relay.publish(event))
    );

    return results.map((result, index) => ({
      relay: this.relays[index].url,
      success: result.status === 'fulfilled',
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  }

  /**
   * Subscribe to all relays and collect results
   */
  async subscribeToAll(filters) {
    const results = await Promise.allSettled(
      this.relays.map(relay => relay.subscribe(filters))
    );

    const allEvents = [];
    const seenIds = new Set();

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const event of result.value) {
          if (!seenIds.has(event.id)) {
            seenIds.add(event.id);
            allEvents.push(event);
          }
        }
      }
    }

    return allEvents;
  }

  /**
   * Connect all relays
   */
  async connectAll() {
    await Promise.all(this.relays.map(relay => relay.connect()));
  }

  /**
   * Disconnect all relays
   */
  disconnectAll() {
    this.relays.forEach(relay => relay.disconnect());
  }

  /**
   * Clear all relay data
   */
  clearAll() {
    this.relays.forEach(relay => relay.clear());
  }
}