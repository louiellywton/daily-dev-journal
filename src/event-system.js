const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

/**
 * High-Performance Event-Driven Architecture
 * 
 * Implements:
 * - Message Queues with Priority
 * - Event Bus with Async Processing
 * - Worker Pools for CPU-intensive tasks
 * - Circuit Breaker pattern
 * - Rate Limiting and Throttling
 * - Dead Letter Queues
 */

// Priority Queue for message processing
class PriorityQueue {
  constructor() {
    this.heap = [];
    this.size = 0;
  }

  push(item, priority) {
    const node = { item, priority, timestamp: Date.now() };
    this.heap.push(node);
    this.size++;
    this.heapifyUp(this.size - 1);
  }

  pop() {
    if (this.size === 0) return null;
    
    const result = this.heap[0];
    const lastNode = this.heap.pop();
    this.size--;
    
    if (this.size > 0) {
      this.heap[0] = lastNode;
      this.heapifyDown(0);
    }
    
    return result;
  }

  peek() {
    return this.size > 0 ? this.heap[0] : null;
  }

  isEmpty() {
    return this.size === 0;
  }

  heapifyUp(index) {
    const parentIndex = Math.floor((index - 1) / 2);
    
    if (parentIndex >= 0 && this.heap[parentIndex].priority < this.heap[index].priority) {
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      this.heapifyUp(parentIndex);
    }
  }

  heapifyDown(index) {
    const leftChild = 2 * index + 1;
    const rightChild = 2 * index + 2;
    let largest = index;

    if (leftChild < this.size && this.heap[leftChild].priority > this.heap[largest].priority) {
      largest = leftChild;
    }

    if (rightChild < this.size && this.heap[rightChild].priority > this.heap[largest].priority) {
      largest = rightChild;
    }

    if (largest !== index) {
      [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
      this.heapifyDown(largest);
    }
  }
}

// High-performance message queue with persistence
class MessageQueue {
  constructor(name, options = {}) {
    this.name = name;
    this.queue = new PriorityQueue();
    this.processing = new Map();
    this.deadLetterQueue = [];
    this.consumers = new Set();
    
    this.options = {
      maxSize: options.maxSize || 10000,
      persistence: options.persistence || false,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      deadLetterThreshold: options.deadLetterThreshold || 5,
      ...options
    };

    this.stats = {
      messagesProcessed: 0,
      messagesDropped: 0,
      messagesRetried: 0,
      deadLetterCount: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0
    };

    if (this.options.persistence) {
      this.persistenceFile = path.join(__dirname, '..', 'data', 'queues', `${name}.json`);
      this.loadFromDisk();
    }
  }

  async enqueue(message, priority = 1, options = {}) {
    if (this.queue.size >= this.options.maxSize) {
      this.stats.messagesDropped++;
      throw new Error(`Queue ${this.name} is full`);
    }

    const messageId = this.generateId();
    const queueMessage = {
      id: messageId,
      data: message,
      priority,
      attempts: 0,
      createdAt: Date.now(),
      ...options
    };

    this.queue.push(queueMessage, priority);

    if (this.options.persistence) {
      await this.saveToDisk();
    }

    // Notify consumers
    this.notifyConsumers();

    return messageId;
  }

  async dequeue() {
    const message = this.queue.pop();
    if (!message) return null;

    const messageId = message.item.id;
    this.processing.set(messageId, {
      ...message.item,
      dequeuedAt: Date.now()
    });

    return message.item;
  }

  async acknowledge(messageId, processingTime = 0) {
    if (this.processing.has(messageId)) {
      this.processing.delete(messageId);
      this.stats.messagesProcessed++;
      
      // Update average processing time
      this.stats.totalProcessingTime += processingTime;
      this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.messagesProcessed;

      if (this.options.persistence) {
        await this.saveToDisk();
      }
    }
  }

  async reject(messageId, error, retry = true) {
    const message = this.processing.get(messageId);
    if (!message) return;

    this.processing.delete(messageId);
    
    if (retry && message.attempts < this.options.retryAttempts) {
      // Retry with exponential backoff
      const delay = this.options.retryDelay * Math.pow(2, message.attempts);
      
      setTimeout(async () => {
        message.attempts++;
        message.lastError = error.message;
        message.retriedAt = Date.now();
        
        this.queue.push(message, message.priority * 0.8); // Lower priority for retries
        this.stats.messagesRetried++;
        
        if (this.options.persistence) {
          await this.saveToDisk();
        }
        
        this.notifyConsumers();
      }, delay);
      
    } else {
      // Send to dead letter queue
      this.deadLetterQueue.push({
        ...message,
        deadLetterAt: Date.now(),
        finalError: error.message
      });
      
      this.stats.deadLetterCount++;
      
      // Cleanup old dead letter messages
      if (this.deadLetterQueue.length > this.options.deadLetterThreshold * 10) {
        this.deadLetterQueue = this.deadLetterQueue.slice(-this.options.deadLetterThreshold);
      }
    }
  }

  addConsumer(consumer) {
    this.consumers.add(consumer);
  }

  removeConsumer(consumer) {
    this.consumers.delete(consumer);
  }

  notifyConsumers() {
    for (const consumer of this.consumers) {
      setImmediate(() => consumer());
    }
  }

  generateId() {
    return `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async loadFromDisk() {
    try {
      if (await fs.pathExists(this.persistenceFile)) {
        const data = await fs.readJson(this.persistenceFile);
        
        // Restore queue
        for (const message of data.queue || []) {
          this.queue.push(message, message.priority);
        }
        
        // Restore processing messages (they should be requeued)
        for (const message of data.processing || []) {
          this.queue.push(message, message.priority * 0.5); // Lower priority
        }
        
        this.deadLetterQueue = data.deadLetterQueue || [];
        this.stats = { ...this.stats, ...data.stats };
      }
    } catch (error) {
      console.warn(`Failed to load queue ${this.name} from disk:`, error.message);
    }
  }

  async saveToDisk() {
    try {
      await fs.ensureDir(path.dirname(this.persistenceFile));
      
      const data = {
        queue: this.queue.heap.map(node => node.item),
        processing: Array.from(this.processing.values()),
        deadLetterQueue: this.deadLetterQueue,
        stats: this.stats,
        savedAt: Date.now()
      };
      
      await fs.writeJson(this.persistenceFile, data, { spaces: 2 });
    } catch (error) {
      console.warn(`Failed to save queue ${this.name} to disk:`, error.message);
    }
  }

  getStats() {
    return {
      name: this.name,
      queueSize: this.queue.size,
      processing: this.processing.size,
      consumers: this.consumers.size,
      deadLetterCount: this.deadLetterQueue.length,
      ...this.stats
    };
  }

  clear() {
    this.queue = new PriorityQueue();
    this.processing.clear();
    this.deadLetterQueue = [];
  }
}

// Circuit Breaker for fault tolerance
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      timeout: options.timeout || 60000,
      resetTimeout: options.resetTimeout || 30000,
      ...options
    };

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.options.timeout)
        )
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = 'CLOSED';
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Rate limiter with token bucket algorithm
class RateLimiter {
  constructor(capacity, refillRate, refillPeriod = 1000) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.refillPeriod = refillPeriod;
    this.lastRefill = Date.now();
  }

  consume(tokens = 1) {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed / this.refillPeriod) * this.refillRate);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  getAvailableTokens() {
    this.refill();
    return this.tokens;
  }
}

// High-performance event bus
class EventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxListeners: options.maxListeners || 100,
      enableMetrics: options.enableMetrics !== false,
      rateLimiting: options.rateLimiting || false,
      ...options
    };

    this.setMaxListeners(this.options.maxListeners);
    
    this.metrics = {
      eventsEmitted: 0,
      eventsHandled: 0,
      errors: 0,
      averageHandlingTime: 0,
      totalHandlingTime: 0
    };

    this.rateLimiters = new Map();
    this.circuitBreakers = new Map();
    
    if (this.options.enableMetrics) {
      this.setupMetrics();
    }
  }

  setupMetrics() {
    const originalEmit = this.emit.bind(this);
    
    this.emit = (eventName, ...args) => {
      if (this.options.enableMetrics) {
        this.metrics.eventsEmitted++;
        
        if (this.options.rateLimiting && !this.checkRateLimit(eventName)) {
          return false; // Rate limited
        }
      }
      
      return originalEmit(eventName, ...args);
    };
  }

  checkRateLimit(eventName) {
    if (!this.rateLimiters.has(eventName)) {
      this.rateLimiters.set(eventName, new RateLimiter(100, 10)); // 100 capacity, 10/second
    }
    
    return this.rateLimiters.get(eventName).consume();
  }

  async emitAsync(eventName, ...args) {
    const listeners = this.listeners(eventName);
    const promises = [];

    for (const listener of listeners) {
      const startTime = Date.now();
      
      const promise = this.executeWithCircuitBreaker(eventName, async () => {
        try {
          await listener(...args);
          
          if (this.options.enableMetrics) {
            const duration = Date.now() - startTime;
            this.metrics.eventsHandled++;
            this.metrics.totalHandlingTime += duration;
            this.metrics.averageHandlingTime = this.metrics.totalHandlingTime / this.metrics.eventsHandled;
          }
        } catch (error) {
          if (this.options.enableMetrics) {
            this.metrics.errors++;
          }
          throw error;
        }
      });
      
      promises.push(promise);
    }

    await Promise.allSettled(promises);
  }

  async executeWithCircuitBreaker(eventName, operation) {
    const breakerName = `event_${eventName}`;
    
    if (!this.circuitBreakers.has(breakerName)) {
      this.circuitBreakers.set(breakerName, new CircuitBreaker(breakerName));
    }
    
    const breaker = this.circuitBreakers.get(breakerName);
    return breaker.execute(operation);
  }

  getMetrics() {
    return {
      ...this.metrics,
      listeners: this.eventNames().reduce((acc, eventName) => {
        acc[eventName] = this.listenerCount(eventName);
        return acc;
      }, {}),
      rateLimiters: Array.from(this.rateLimiters.entries()).map(([event, limiter]) => ({
        event,
        availableTokens: limiter.getAvailableTokens()
      })),
      circuitBreakers: Array.from(this.circuitBreakers.values()).map(breaker => breaker.getState())
    };
  }
}

// Worker pool for CPU-intensive tasks
class WorkerPool {
  constructor(workerScript, poolSize = require('os').cpus().length) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.queue = [];
    this.activeJobs = new Map();
    
    this.stats = {
      jobsCompleted: 0,
      jobsFailed: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0
    };

    this.initialize();
  }

  initialize() {
    const { Worker } = require('worker_threads');
    
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript);
      
      worker.on('message', (result) => {
        this.handleWorkerMessage(worker.workerId, result);
      });
      
      worker.on('error', (error) => {
        this.handleWorkerError(worker.workerId, error);
      });
      
      worker.workerId = i;
      worker.busy = false;
      this.workers.push(worker);
    }
  }

  async execute(task, data) {
    return new Promise((resolve, reject) => {
      const job = {
        id: this.generateJobId(),
        task,
        data,
        resolve,
        reject,
        createdAt: Date.now()
      };

      this.queue.push(job);
      this.processQueue();
    });
  }

  processQueue() {
    const availableWorker = this.workers.find(worker => !worker.busy);
    
    if (availableWorker && this.queue.length > 0) {
      const job = this.queue.shift();
      this.assignJobToWorker(availableWorker, job);
    }
  }

  assignJobToWorker(worker, job) {
    worker.busy = true;
    this.activeJobs.set(job.id, { job, worker, startTime: Date.now() });
    
    worker.postMessage({
      jobId: job.id,
      task: job.task,
      data: job.data
    });
  }

  handleWorkerMessage(workerId, result) {
    const worker = this.workers[workerId];
    const activeJob = Array.from(this.activeJobs.values())
      .find(({ worker: w }) => w.workerId === workerId);

    if (activeJob) {
      const { job, startTime } = activeJob;
      const executionTime = Date.now() - startTime;
      
      this.activeJobs.delete(job.id);
      worker.busy = false;
      
      this.stats.jobsCompleted++;
      this.stats.totalExecutionTime += executionTime;
      this.stats.averageExecutionTime = this.stats.totalExecutionTime / this.stats.jobsCompleted;
      
      job.resolve(result);
      this.processQueue();
    }
  }

  handleWorkerError(workerId, error) {
    const worker = this.workers[workerId];
    const activeJob = Array.from(this.activeJobs.values())
      .find(({ worker: w }) => w.workerId === workerId);

    if (activeJob) {
      const { job } = activeJob;
      
      this.activeJobs.delete(job.id);
      worker.busy = false;
      
      this.stats.jobsFailed++;
      
      job.reject(error);
      this.processQueue();
    }
  }

  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      poolSize: this.poolSize,
      activeJobs: this.activeJobs.size,
      queueSize: this.queue.length,
      ...this.stats
    };
  }

  async terminate() {
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
    this.activeJobs.clear();
    this.queue = [];
  }
}

// Main Event System orchestrator
class EventSystem {
  constructor(options = {}) {
    this.eventBus = new EventBus(options.eventBus);
    this.queues = new Map();
    this.workerPools = new Map();
    
    this.options = {
      persistence: options.persistence || false,
      monitoring: options.monitoring !== false,
      ...options
    };

    if (this.options.monitoring) {
      this.startMonitoring();
    }

    this.setupEventHandlers();
  }

  createQueue(name, options = {}) {
    const queue = new MessageQueue(name, {
      persistence: this.options.persistence,
      ...options
    });
    
    this.queues.set(name, queue);
    return queue;
  }

  getQueue(name) {
    return this.queues.get(name);
  }

  createWorkerPool(name, workerScript, poolSize) {
    const pool = new WorkerPool(workerScript, poolSize);
    this.workerPools.set(name, pool);
    return pool;
  }

  getWorkerPool(name) {
    return this.workerPools.get(name);
  }

  setupEventHandlers() {
    // Log processing events
    this.eventBus.on('log.entry', async (data) => {
      const queue = this.getQueue('logs') || this.createQueue('logs', { persistence: true });
      await queue.enqueue(data, 2); // Medium priority
    });

    // Analytics processing
    this.eventBus.on('analytics.compute', async (data) => {
      const queue = this.getQueue('analytics') || this.createQueue('analytics');
      await queue.enqueue(data, 3); // High priority
    });

    // Error handling
    this.eventBus.on('error', (error) => {
      console.error('Event System Error:', error);
    });
  }

  startMonitoring() {
    setInterval(() => {
      const stats = this.getSystemStats();
      this.eventBus.emit('system.stats', stats);
    }, 30000); // Every 30 seconds
  }

  getSystemStats() {
    return {
      eventBus: this.eventBus.getMetrics(),
      queues: Array.from(this.queues.entries()).map(([name, queue]) => ({
        name,
        ...queue.getStats()
      })),
      workerPools: Array.from(this.workerPools.entries()).map(([name, pool]) => ({
        name,
        ...pool.getStats()
      })),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  async shutdown() {
    console.log('🔄 Shutting down Event System...');
    
    // Terminate worker pools
    for (const pool of this.workerPools.values()) {
      await pool.terminate();
    }

    // Save queue states if persistence is enabled
    if (this.options.persistence) {
      for (const queue of this.queues.values()) {
        await queue.saveToDisk();
      }
    }

    this.eventBus.removeAllListeners();
    console.log('✅ Event System shutdown complete');
  }
}

module.exports = {
  EventSystem,
  MessageQueue,
  EventBus,
  WorkerPool,
  CircuitBreaker,
  RateLimiter,
  PriorityQueue
};
