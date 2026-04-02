/**
 * Helix Browser Extension - Offline Queue
 * Handles offline request queuing with retry and exponential backoff
 */

const QUEUE_KEY = 'helixOfflineQueue';
const MAX_RETRIES = 5;
const BASE_DELAY = 1000; // 1 second
const MAX_DELAY = 32000; // 32 seconds

class OfflineQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize queue from storage
   */
  async initialize() {
    try {
      const stored = await chrome.storage.local.get([QUEUE_KEY]);
      this.queue = stored[QUEUE_KEY] || [];
      console.log(`[OfflineQueue] Loaded ${this.queue.length} queued requests`);
    } catch (error) {
      console.error('[OfflineQueue] Initialization failed:', error);
      this.queue = [];
    }
  }

  /**
   * Add request to queue
   */
  async enqueue(request) {
    const queueItem = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: request.url,
      method: request.method,
      headers: request.headers || {},
      body: request.body,
      priority: request.priority || 'medium',
      createdAt: Date.now(),
      retryCount: 0,
      lastError: null
    };

    this.queue.push(queueItem);
    await this.save();

    console.log(`[OfflineQueue] Enqueued: ${request.method} ${request.url}`);
    return queueItem.id;
  }

  /**
   * Process the queue
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    console.log(`[OfflineQueue] Processing ${this.queue.length} queued requests`);

    const sorted = this.sortByPriority([...this.queue]);

    for (const item of sorted) {
      try {
        await this.processItem(item);
        await this.remove(item.id);
        console.log(`[OfflineQueue] Processed: ${item.method} ${item.url}`);
      } catch (error) {
        item.retryCount++;
        item.lastError = error.message;

        if (item.retryCount >= MAX_RETRIES) {
          console.error(`[OfflineQueue] Max retries reached: ${item.url}`);
          await this.remove(item.id);
        } else {
          const delay = this.getRetryDelay(item.retryCount);
          console.log(`[OfflineQueue] Retry ${item.retryCount}/${MAX_RETRIES} in ${delay}ms`);
          await this.sleep(delay);
          await this.save();
        }
      }
    }

    this.isProcessing = false;
    console.log('[OfflineQueue] Processing complete');
  }

  /**
   * Process a single queue item
   */
  async processItem(item) {
    const response = await fetch(item.url, {
      method: item.method,
      headers: item.headers,
      body: item.body
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Remove item from queue
   */
  async remove(itemId) {
    this.queue = this.queue.filter(item => item.id !== itemId);
    await this.save();
  }

  /**
   * Clear entire queue
   */
  async clear() {
    this.queue = [];
    await this.save();
    console.log('[OfflineQueue] Queue cleared');
  }

  /**
   * Get queue stats
   */
  getStats() {
    const priorityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    let oldest = null;

    for (const item of this.queue) {
      priorityCounts[item.priority]++;
      if (!oldest || item.createdAt < oldest) {
        oldest = item.createdAt;
      }
    }

    return {
      total: this.queue.length,
      pending: this.queue.filter(i => i.retryCount < MAX_RETRIES).length,
      failed: this.queue.filter(i => i.retryCount >= MAX_RETRIES).length,
      oldestRequest: oldest,
      priorityBreakdown: priorityCounts
    };
  }

  /**
   * Sort queue by priority
   */
  sortByPriority(queue) {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return queue.sort((a, b) => {
      const diff = order[a.priority] - order[b.priority];
      return diff !== 0 ? diff : a.createdAt - b.createdAt;
    });
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  getRetryDelay(retryCount) {
    const exponential = Math.min(BASE_DELAY * Math.pow(2, retryCount - 1), MAX_DELAY);
    const jitter = Math.random() * 1000;
    return exponential + jitter;
  }

  /**
   * Save queue to storage
   */
  async save() {
    try {
      await chrome.storage.local.set({ [QUEUE_KEY]: this.queue });
    } catch (error) {
      console.error('[OfflineQueue] Save failed:', error);
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
const offlineQueue = new OfflineQueue();
export default offlineQueue;