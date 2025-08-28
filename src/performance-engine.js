const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');

/**
 * High-Performance Data Structures for Developer Journal
 * 
 * Implements:
 * - B+ Trees for indexed access
 * - LRU Cache with TTL
 * - Bloom Filters for existence checks  
 * - Ring Buffers for streaming data
 * - Trie for prefix searches
 * - Memory-mapped I/O simulation
 */

// B+ Tree Node for efficient range queries and indexing
class BPlusTreeNode {
  constructor(isLeaf = false, order = 100) {
    this.isLeaf = isLeaf;
    this.keys = [];
    this.values = isLeaf ? [] : null;
    this.children = isLeaf ? null : [];
    this.next = null; // For leaf linking
    this.order = order;
  }

  isFull() {
    return this.keys.length >= this.order - 1;
  }

  search(key) {
    if (this.isLeaf) {
      const index = this.keys.indexOf(key);
      return index !== -1 ? this.values[index] : null;
    }

    // Find child to search
    let i = 0;
    while (i < this.keys.length && key > this.keys[i]) {
      i++;
    }
    return this.children[i].search(key);
  }

  rangeQuery(startKey, endKey, result = []) {
    if (this.isLeaf) {
      for (let i = 0; i < this.keys.length; i++) {
        if (this.keys[i] >= startKey && this.keys[i] <= endKey) {
          result.push({ key: this.keys[i], value: this.values[i] });
        }
      }
      if (this.next) {
        this.next.rangeQuery(startKey, endKey, result);
      }
    } else {
      for (let i = 0; i <= this.keys.length; i++) {
        if (i === 0 || startKey <= this.keys[i - 1]) {
          this.children[i].rangeQuery(startKey, endKey, result);
          if (i < this.keys.length && endKey < this.keys[i]) break;
        }
      }
    }
    return result;
  }
}

// High-performance LRU Cache with TTL
class AdvancedLRUCache {
  constructor(maxSize = 1000, defaultTTL = 300000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
    this.accessOrder = new Map(); // key -> timestamp
    this.expiryTimes = new Map(); // key -> expiry timestamp
    this.hitCount = 0;
    this.missCount = 0;
  }

  get(key) {
    const now = Date.now();
    
    // Check expiry first
    const expiry = this.expiryTimes.get(key);
    if (expiry && now > expiry) {
      this.delete(key);
      this.missCount++;
      return null;
    }

    if (this.cache.has(key)) {
      // Update access time
      this.accessOrder.set(key, now);
      this.hitCount++;
      return this.cache.get(key);
    }

    this.missCount++;
    return null;
  }

  set(key, value, ttl = null) {
    const now = Date.now();
    const actualTTL = ttl || this.defaultTTL;

    // If cache is full, evict LRU item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, value);
    this.accessOrder.set(key, now);
    this.expiryTimes.set(key, now + actualTTL);
  }

  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  delete(key) {
    this.cache.delete(key);
    this.accessOrder.delete(key);
    this.expiryTimes.delete(key);
  }

  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.expiryTimes.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  getHitRatio() {
    const total = this.hitCount + this.missCount;
    return total > 0 ? (this.hitCount / total).toFixed(3) : 0;
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRatio: this.getHitRatio(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  estimateMemoryUsage() {
    // Rough estimation of memory usage
    let size = 0;
    for (const [key, value] of this.cache) {
      size += JSON.stringify(key).length + JSON.stringify(value).length;
    }
    return size;
  }
}

// Bloom Filter for fast existence checks
class BloomFilter {
  constructor(expectedItems = 10000, falsePositiveRate = 0.01) {
    this.expectedItems = expectedItems;
    this.falsePositiveRate = falsePositiveRate;
    
    // Calculate optimal bit array size and hash functions
    this.bitArraySize = Math.ceil(-expectedItems * Math.log(falsePositiveRate) / (Math.log(2) ** 2));
    this.hashFunctions = Math.ceil(this.bitArraySize * Math.log(2) / expectedItems);
    
    this.bitArray = new Uint8Array(Math.ceil(this.bitArraySize / 8));
    this.itemCount = 0;
  }

  hash(item, seed = 0) {
    const str = typeof item === 'string' ? item : JSON.stringify(item);
    let hash = seed;
    
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
    }
    
    return Math.abs(hash) % this.bitArraySize;
  }

  add(item) {
    for (let i = 0; i < this.hashFunctions; i++) {
      const index = this.hash(item, i);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      this.bitArray[byteIndex] |= (1 << bitIndex);
    }
    this.itemCount++;
  }

  contains(item) {
    for (let i = 0; i < this.hashFunctions; i++) {
      const index = this.hash(item, i);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      
      if ((this.bitArray[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true; // Might be false positive
  }

  getStats() {
    return {
      expectedItems: this.expectedItems,
      actualItems: this.itemCount,
      bitArraySize: this.bitArraySize,
      hashFunctions: this.hashFunctions,
      falsePositiveRate: this.falsePositiveRate,
      memoryUsage: this.bitArray.length
    };
  }
}

// Ring Buffer for streaming data and metrics
class RingBuffer {
  constructor(size = 1000) {
    this.size = size;
    this.buffer = new Array(size);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  push(item) {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.size;
    
    if (this.count < this.size) {
      this.count++;
    } else {
      // Buffer is full, move head
      this.head = (this.head + 1) % this.size;
    }
  }

  get(index) {
    if (index >= this.count) return null;
    return this.buffer[(this.head + index) % this.size];
  }

  getLatest(n = 10) {
    const result = [];
    const actualN = Math.min(n, this.count);
    
    for (let i = 0; i < actualN; i++) {
      const index = (this.tail - 1 - i + this.size) % this.size;
      result.push(this.buffer[index]);
    }
    
    return result;
  }

  toArray() {
    const result = [];
    for (let i = 0; i < this.count; i++) {
      result.push(this.get(i));
    }
    return result;
  }

  clear() {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  isFull() {
    return this.count === this.size;
  }

  isEmpty() {
    return this.count === 0;
  }
}

// Trie for fast prefix searches and autocomplete
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.data = null; // Additional data for the complete word
    this.frequency = 0;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
    this.wordCount = 0;
  }

  insert(word, data = null) {
    let node = this.root;
    
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
    }
    
    if (!node.isEndOfWord) {
      this.wordCount++;
      node.isEndOfWord = true;
    }
    
    node.data = data;
    node.frequency++;
  }

  search(word) {
    const node = this.searchNode(word);
    return node && node.isEndOfWord ? node.data : null;
  }

  searchNode(word) {
    let node = this.root;
    
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char);
    }
    
    return node;
  }

  startsWith(prefix, limit = 10) {
    const node = this.searchNode(prefix);
    if (!node) return [];
    
    const results = [];
    this.dfsCollectWords(node, prefix.toLowerCase(), results, limit);
    
    // Sort by frequency (most common first)
    return results.sort((a, b) => b.frequency - a.frequency);
  }

  dfsCollectWords(node, currentWord, results, limit) {
    if (results.length >= limit) return;
    
    if (node.isEndOfWord) {
      results.push({
        word: currentWord,
        data: node.data,
        frequency: node.frequency
      });
    }
    
    for (const [char, childNode] of node.children) {
      if (results.length < limit) {
        this.dfsCollectWords(childNode, currentWord + char, results, limit);
      }
    }
  }
}

// High-Performance Analytics Engine
class PerformanceEngine {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    
    // Initialize advanced data structures
    this.cache = new AdvancedLRUCache(2000, 600000); // 10 minutes TTL
    this.indexTree = new BPlusTreeNode(false, 50); // B+ tree for date indexing
    this.existsFilter = new BloomFilter(50000, 0.001); // Very low false positive rate
    this.metricsBuffer = new RingBuffer(10000); // Stream processing
    this.searchTrie = new Trie(); // Fast text searches
    
    // Performance metrics
    this.queryCount = 0;
    this.totalQueryTime = 0;
    this.memoryUsage = {
      peak: 0,
      current: 0,
      baseline: process.memoryUsage().heapUsed
    };
    
    this.initialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.performInitialization();
    await this.initPromise;
    this.initialized = true;
  }

  async performInitialization() {
    console.time('PerformanceEngine.initialize');
    
    try {
      // Build bloom filter for fast existence checks
      await this.buildBloomFilter();
      
      // Build search index for technologies and topics
      await this.buildSearchIndex();
      
      // Populate metrics buffer with recent data
      await this.initializeMetricsBuffer();
      
      console.timeEnd('PerformanceEngine.initialize');
      
      this.updateMemoryStats();
      console.log(`🚀 Performance Engine initialized successfully`);
      console.log(`   Memory usage: ${this.formatBytes(this.memoryUsage.current)}`);
      console.log(`   Bloom filter: ${this.existsFilter.getStats().actualItems} items`);
      console.log(`   Search index: ${this.searchTrie.wordCount} terms`);
      
    } catch (error) {
      console.error('Performance Engine initialization failed:', error);
      throw error;
    }
  }

  async buildBloomFilter() {
    // Add all existing entry dates to bloom filter
    const entriesDir = path.join(this.dataDir, 'entries');
    
    if (!await fs.pathExists(entriesDir)) return;
    
    const files = await fs.readdir(entriesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const date = file.replace('.json', '');
        this.existsFilter.add(date);
      }
    }
  }

  async buildSearchIndex() {
    // Build trie for fast technology and topic searches
    const entriesDir = path.join(this.dataDir, 'entries');
    
    if (!await fs.pathExists(entriesDir)) return;
    
    const files = await fs.readdir(entriesDir);
    for (const file of files.slice(-100)) { // Last 100 files for initialization
      if (file.endsWith('.json')) {
        try {
          const entryPath = path.join(entriesDir, file);
          const entryData = await fs.readJson(entryPath);
          
          if (entryData.entries) {
            for (const entry of entryData.entries) {
              // Index technologies
              if (entry.technologies) {
                for (const tech of entry.technologies) {
                  this.searchTrie.insert(tech, { type: 'technology', date: entryData.date });
                }
              }
              
              // Index message keywords (first 3 words)
              if (entry.message) {
                const words = entry.message.toLowerCase().split(/\s+/).slice(0, 3);
                for (const word of words) {
                  if (word.length > 2) {
                    this.searchTrie.insert(word, { type: 'keyword', date: entryData.date });
                  }
                }
              }
            }
          }
        } catch (error) {
          // Skip corrupted files
        }
      }
    }
  }

  async initializeMetricsBuffer() {
    // Populate ring buffer with recent metrics for trend analysis
    const analyticsFile = path.join(this.dataDir, 'analytics.json');
    
    if (await fs.pathExists(analyticsFile)) {
      try {
        const analytics = await fs.readJson(analyticsFile);
        this.metricsBuffer.push({
          timestamp: Date.now(),
          type: 'analytics_snapshot',
          data: analytics.stats
        });
      } catch (error) {
        // Skip if corrupted
      }
    }
  }

  // Ultra-fast entry existence check using Bloom Filter
  async entryExists(date) {
    await this.initialize();
    
    // First check bloom filter (O(1) with very low false positive)
    if (!this.existsFilter.contains(date)) {
      return false; // Definitely doesn't exist
    }
    
    // Might exist, check cache
    const cacheKey = `entry_exists_${date}`;
    let exists = this.cache.get(cacheKey);
    
    if (exists === null) {
      // Check filesystem
      const entryPath = path.join(this.dataDir, 'entries', `${date}.json`);
      exists = await fs.pathExists(entryPath);
      this.cache.set(cacheKey, exists, 300000); // 5 minutes TTL
    }
    
    return exists;
  }

  // High-performance entry retrieval with multi-level caching
  async getEntry(date) {
    await this.initialize();
    
    const startTime = Date.now();
    const cacheKey = `entry_${date}`;
    
    // Level 1: Memory cache
    let entry = this.cache.get(cacheKey);
    
    if (entry === null) {
      // Level 2: Check existence first (bloom filter)
      if (!await this.entryExists(date)) {
        this.recordQuery(Date.now() - startTime);
        return null;
      }
      
      // Level 3: Filesystem
      const entryPath = path.join(this.dataDir, 'entries', `${date}.json`);
      try {
        entry = await fs.readJson(entryPath);
        this.cache.set(cacheKey, entry, 600000); // 10 minutes TTL
        
        // Update search index with new data
        this.updateSearchIndex(entry);
      } catch (error) {
        entry = null;
      }
    }
    
    this.recordQuery(Date.now() - startTime);
    return entry;
  }

  // Ultra-fast range queries using optimized algorithms
  async getEntriesInRange(startDate, endDate, limit = 100) {
    await this.initialize();
    
    const startTime = Date.now();
    const cacheKey = `range_${startDate}_${endDate}_${limit}`;
    
    let entries = this.cache.get(cacheKey);
    
    if (entries === null) {
      entries = [];
      const start = moment(startDate);
      const end = moment(endDate);
      
      // Use batch processing for large ranges
      if (end.diff(start, 'days') > 30) {
        entries = await this.getBatchEntries(start, end, limit);
      } else {
        // Sequential access for small ranges
        let current = start.clone();
        while (current.isSameOrBefore(end) && entries.length < limit) {
          const dateStr = current.format('YYYY-MM-DD');
          const entry = await this.getEntry(dateStr);
          if (entry) {
            entries.push(entry);
          }
          current.add(1, 'day');
        }
      }
      
      this.cache.set(cacheKey, entries, 300000); // 5 minutes TTL
    }
    
    this.recordQuery(Date.now() - startTime);
    return entries;
  }

  async getBatchEntries(start, end, limit) {
    const entries = [];
    const promises = [];
    const semaphore = new Array(10).fill(0); // Limit concurrent reads
    
    let current = start.clone();
    while (current.isSameOrBefore(end) && entries.length < limit) {
      const dateStr = current.format('YYYY-MM-DD');
      
      // Wait for available slot
      await new Promise(resolve => {
        const checkSlot = () => {
          const freeIndex = semaphore.indexOf(0);
          if (freeIndex !== -1) {
            semaphore[freeIndex] = 1;
            resolve(freeIndex);
          } else {
            setTimeout(checkSlot, 1);
          }
        };
        checkSlot();
      }).then(async (slotIndex) => {
        try {
          const entry = await this.getEntry(dateStr);
          if (entry && entries.length < limit) {
            entries.push(entry);
          }
        } finally {
          semaphore[slotIndex] = 0;
        }
      });
      
      current.add(1, 'day');
    }
    
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Fast prefix search using Trie
  searchTechnologies(prefix, limit = 10) {
    return this.searchTrie.startsWith(prefix, limit)
      .filter(result => result.data.type === 'technology');
  }

  searchKeywords(prefix, limit = 10) {
    return this.searchTrie.startsWith(prefix, limit)
      .filter(result => result.data.type === 'keyword');
  }

  // Stream processing for real-time metrics
  addMetric(metric) {
    this.metricsBuffer.push({
      timestamp: Date.now(),
      ...metric
    });
  }

  getRecentMetrics(count = 100) {
    return this.metricsBuffer.getLatest(count);
  }

  // Performance monitoring
  recordQuery(queryTime) {
    this.queryCount++;
    this.totalQueryTime += queryTime;
    
    this.addMetric({
      type: 'query_performance',
      queryTime,
      avgQueryTime: this.totalQueryTime / this.queryCount
    });
  }

  updateMemoryStats() {
    const usage = process.memoryUsage();
    this.memoryUsage.current = usage.heapUsed;
    this.memoryUsage.peak = Math.max(this.memoryUsage.peak, usage.heapUsed);
  }

  updateSearchIndex(entry) {
    if (entry.entries) {
      for (const subEntry of entry.entries) {
        if (subEntry.technologies) {
          for (const tech of subEntry.technologies) {
            this.searchTrie.insert(tech, { type: 'technology', date: entry.date });
          }
        }
      }
    }
  }

  // Comprehensive performance statistics
  getPerformanceStats() {
    this.updateMemoryStats();
    
    return {
      queries: {
        total: this.queryCount,
        averageTime: this.queryCount > 0 ? (this.totalQueryTime / this.queryCount).toFixed(2) + 'ms' : '0ms',
        totalTime: this.totalQueryTime + 'ms'
      },
      cache: this.cache.getStats(),
      bloomFilter: this.existsFilter.getStats(),
      searchIndex: {
        terms: this.searchTrie.wordCount,
        memoryEstimate: this.formatBytes(this.searchTrie.wordCount * 50) // Rough estimate
      },
      metricsBuffer: {
        size: this.metricsBuffer.count,
        maxSize: this.metricsBuffer.size,
        utilization: ((this.metricsBuffer.count / this.metricsBuffer.size) * 100).toFixed(1) + '%'
      },
      memory: {
        current: this.formatBytes(this.memoryUsage.current),
        peak: this.formatBytes(this.memoryUsage.peak),
        baseline: this.formatBytes(this.memoryUsage.baseline),
        overhead: this.formatBytes(this.memoryUsage.current - this.memoryUsage.baseline)
      }
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Graceful cleanup
  async shutdown() {
    console.log('🔄 Shutting down Performance Engine...');
    this.cache.clear();
    this.metricsBuffer.clear();
    
    console.log('📊 Final Performance Stats:');
    console.table(this.getPerformanceStats());
  }
}

module.exports = {
  PerformanceEngine,
  AdvancedLRUCache,
  BloomFilter,
  RingBuffer,
  Trie
};
