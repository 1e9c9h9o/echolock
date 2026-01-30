'use strict';

// Time Travel Utilities for Testing
// Mock time advancement for testing time-dependent functionality

import { jest } from '@jest/globals';

let originalDateNow;
let originalDateConstructor;
let currentMockTime;
let isMockingTime = false;

/**
 * Start mocking time at a specific timestamp
 * @param {number} timestamp - Unix timestamp in milliseconds (optional, defaults to current time)
 */
export function startTimeMock(timestamp) {
  // Use real Date.now() if not mocking yet
  const startTime = timestamp || Date.now();

  if (isMockingTime) {
    throw new Error('Time is already being mocked. Call stopTimeMock() first.');
  }

  originalDateNow = Date.now.bind(Date);
  originalDateConstructor = Date;
  currentMockTime = startTime;
  isMockingTime = true;

  // Mock Date.now()
  Date.now = jest.fn(() => currentMockTime);

  // Don't mock Date constructor - too risky
}

/**
 * Stop mocking time and restore original behavior
 */
export function stopTimeMock() {
  if (!isMockingTime) {
    return;
  }

  if (originalDateNow) {
    Date.now = originalDateNow;
  }
  isMockingTime = false;
  currentMockTime = null;
}

/**
 * Advance mocked time by specified milliseconds
 * @param {number} ms - Milliseconds to advance
 */
export function advanceTime(ms) {
  if (!isMockingTime) {
    throw new Error('Time is not being mocked. Call startTimeMock() first.');
  }

  currentMockTime += ms;
  // Note: We only need to advance Date.now(), not Jest fake timers
  // jest.advanceTimersByTime is only needed for setTimeout/setInterval
  // which we don't use in deadManSwitch core logic
}

/**
 * Advance time by hours
 * @param {number} hours - Hours to advance
 */
export function advanceHours(hours) {
  advanceTime(hours * 60 * 60 * 1000);
}

/**
 * Advance time by days
 * @param {number} days - Days to advance
 */
export function advanceDays(days) {
  advanceTime(days * 24 * 60 * 60 * 1000);
}

/**
 * Set time to a specific timestamp
 * @param {number} timestamp - Unix timestamp in milliseconds
 */
export function setTime(timestamp) {
  if (!isMockingTime) {
    throw new Error('Time is not being mocked. Call startTimeMock() first.');
  }

  currentMockTime = timestamp;
}

/**
 * Get current mocked time
 * @returns {number} Current mocked timestamp in milliseconds
 */
export function getCurrentMockTime() {
  if (!isMockingTime) {
    throw new Error('Time is not being mocked. Call startTimeMock() first.');
  }

  return currentMockTime;
}

/**
 * Travel to a specific date
 * @param {Date|string} date - Date to travel to
 */
export function travelTo(date) {
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  setTime(timestamp);
}

/**
 * Reset time to current real time
 */
export function resetTime() {
  stopTimeMock();
}

/**
 * Wait for a promise while advancing time
 * Useful for testing time-dependent async operations
 *
 * @param {Promise} promise - Promise to wait for
 * @param {number} advanceByMs - How much to advance time while waiting
 */
export async function waitWithTimeAdvance(promise, advanceByMs = 0) {
  if (advanceByMs > 0) {
    advanceTime(advanceByMs);
  }

  return await promise;
}

/**
 * Create a time controller for scoped time manipulation
 */
export class TimeController {
  constructor() {
    this.startTime = null;
    this.isActive = false;
  }

  start(timestamp) {
    if (this.isActive) {
      throw new Error('TimeController already started');
    }

    const startTime = timestamp || Date.now();
    startTimeMock(startTime);
    this.startTime = startTime;
    this.isActive = true;
  }

  stop() {
    if (!this.isActive) {
      return;
    }

    stopTimeMock();
    this.isActive = false;
    this.startTime = null;
  }

  advance(ms) {
    if (!this.isActive) {
      throw new Error('TimeController not started');
    }

    advanceTime(ms);
  }

  advanceHours(hours) {
    this.advance(hours * 60 * 60 * 1000);
  }

  advanceDays(days) {
    this.advance(days * 24 * 60 * 60 * 1000);
  }

  getCurrentTime() {
    if (!this.isActive) {
      throw new Error('TimeController not started');
    }

    return getCurrentMockTime();
  }

  getElapsedTime() {
    if (!this.isActive) {
      throw new Error('TimeController not started');
    }

    return getCurrentMockTime() - this.startTime;
  }
}

/**
 * Helper to run a test with time mocking
 * Automatically cleans up after test
 *
 * @param {Function} testFn - Test function to run
 * @param {number} startTime - Starting timestamp (optional)
 */
export async function withTimeMock(testFn, startTime) {
  const controller = new TimeController();

  try {
    controller.start(startTime);
    await testFn(controller);
  } finally {
    controller.stop();
  }
}