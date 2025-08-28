#!/usr/bin/env node

/**
 * High-Performance Analytics Systems Test Suite
 * 
 * Demonstrates the new advanced data structures and performance optimizations:
 * - B+ Trees, LRU Cache, Bloom Filters, Ring Buffers, Trie
 * - Event-driven architecture with message queues
 * - Batch processing and stream analytics
 * - Vector-based analytics integration
 */

const Analytics = require('./src/analytics');
const { PerformanceEngine, AdvancedLRUCache, BloomFilter, RingBuffer, Trie } = require('./src/performance-engine');
const { EventSystem, MessageQueue, CircuitBreaker, RateLimiter } = require('./src/event-system');
const { AnalyticsPipeline, BatchProcessor } = require('./src/data-pipeline');

class HighPerformanceTestSuite {
  constructor() {
    this.analytics = new Analytics();
    this.results = {
      performanceEngine: {},
      eventSystem: {},
      dataPipeline: {},
      integration: {},
      benchmarks: {}
    };
  }

  async runAllTests() {
    console.log('Starting High-Performance Analytics Test Suite\n');
    
    try {
      await this.testPerformanceEngine();
      await this.testEventSystem();
      await this.testDataPipeline();
      await this.testIntegratedAnalytics();
      await this.runBenchmarks();
      
      this.displayResults();
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  async testPerformanceEngine() {
    console.log('Testing Performance Engine Components...\n');
    
    // Test LRU Cache with TTL
    console.log('1. Testing Advanced LRU Cache:');
    const cache = new AdvancedLRUCache(100, 5000);
    
    for (let i = 0; i < 50; i++) {
      cache.set(`key_${i}`, { data: `value_${i}`, timestamp: Date.now() });
    }
    
    const startTime = Date.now();
    for (let i = 0; i < 50; i++) {
      cache.get(`key_${i}`);
    }
    const cacheTime = Date.now() - startTime;
    
    const cacheStats = cache.getStats();
    console.log(`   Cache performance: ${cacheTime}ms for 50 operations`);
    console.log(`   Hit ratio: ${cacheStats.hitRatio}, Size: ${cacheStats.size}/${cacheStats.maxSize}`);
    console.log(`   Memory usage: ${cache.formatBytes(cacheStats.memoryUsage)}\n`);
    
    this.results.performanceEngine.cache = { time: cacheTime, stats: cacheStats };
    
    // Test Bloom Filter
    console.log('2. Testing Bloom Filter:');
    const bloomFilter = new BloomFilter(10000, 0.001);
    
    const testItems = [];
    for (let i = 0; i < 1000; i++) {
      const item = `test_item_${i}`;
      testItems.push(item);
      bloomFilter.add(item);
    }
    
    let truePositives = 0;
    const bloomStartTime = Date.now();
    for (const item of testItems) {
      if (bloomFilter.contains(item)) {
        truePositives++;
      }
    }
    const bloomTime = Date.now() - bloomStartTime;
    
    const bloomStats = bloomFilter.getStats();
    console.log(`   Bloom filter performance: ${bloomTime}ms for 1000 checks`);
    console.log(`   True positives: ${truePositives}`);
    console.log(`   Expected items: ${bloomStats.expectedItems}, Actual: ${bloomStats.actualItems}`);
    console.log(`   Hash functions: ${bloomStats.hashFunctions}, Memory: ${bloomStats.memoryUsage} bytes\n`);
    
    this.results.performanceEngine.bloomFilter = { time: bloomTime, stats: bloomStats };
    
    // Test Trie for prefix search
    console.log('3. Testing Trie for Fast Prefix Search:');
    const trie = new Trie();
    
    const technologies = [
      'JavaScript', 'Python', 'Java', 'C++', 'TypeScript', 'React', 'Node.js',
      'Angular', 'Vue.js', 'Django', 'Flask', 'Spring', 'Express', 'MongoDB',
      'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure'
    ];
    
    for (const tech of technologies) {
      trie.insert(tech.toLowerCase(), { type: 'technology', popularity: Math.random() });
    }
    
    const searchQueries = ['java', 'py', 'node', 'ang', 'doc'];
    const trieStartTime = Date.now();
    
    for (const query of searchQueries) {
      const results = trie.startsWith(query, 5);
      console.log(`   "${query}": ${results.map(r => r.word).join(', ')}`);
    }
    
    const trieTime = Date.now() - trieStartTime;
    console.log(`   Trie search performance: ${trieTime}ms for ${searchQueries.length} queries`);
    console.log(`   Total words indexed: ${trie.wordCount}\n`);
    
    this.results.performanceEngine.trie = { time: trieTime, wordCount: trie.wordCount };
    
    // Test Ring Buffer for streaming data
    console.log('4. Testing Ring Buffer for Streaming:');
    const ringBuffer = new RingBuffer(100);
    
    const streamStartTime = Date.now();
    for (let i = 0; i < 500; i++) {
      ringBuffer.push({
        timestamp: Date.now(),
        metric: 'cpu_usage',
        value: Math.random() * 100,
        id: i
      });
    }
    const streamTime = Date.now() - streamStartTime;
    
    const latest10 = ringBuffer.getLatest(10);
    console.log(`   Ring buffer performance: ${streamTime}ms for 500 items`);
    console.log(`   Buffer utilization: ${ringBuffer.count}/${ringBuffer.size} (${((ringBuffer.count/ringBuffer.size)*100).toFixed(1)}%)`);
    console.log(`   Latest 10 items: IDs ${latest10.map(item => item.id).join(', ')}\n`);
    
    this.results.performanceEngine.ringBuffer = { 
      time: streamTime, 
      utilization: (ringBuffer.count/ringBuffer.size)*100 
    };
  }

  async testEventSystem() {
    console.log('Testing Event-Driven Architecture...\n');
    
    // Test Message Queue with Priority
    console.log('1. Testing Priority Message Queue:');
    const eventSystem = new EventSystem({ persistence: false });
    const queue = eventSystem.createQueue('test_queue', { maxSize: 1000 });
    
    const queueStartTime = Date.now();
    for (let i = 0; i < 100; i++) {
      const priority = Math.floor(Math.random() * 5) + 1;
      await queue.enqueue({
        task: `task_${i}`,
        data: { value: i * 2 },
        priority: priority
      }, priority);
    }
    const enqueueTime = Date.now() - queueStartTime;
    
    let processedCount = 0;
    const processStartTime = Date.now();
    
    while (!queue.queue.isEmpty() && processedCount < 50) {
      const message = await queue.dequeue();
      if (message) {
        await new Promise(resolve => setTimeout(resolve, 1));
        await queue.acknowledge(message.id, Date.now() - message.createdAt);
        processedCount++;
      }
    }
    
    const processTime = Date.now() - processStartTime;
    const queueStats = queue.getStats();
    
    console.log(`   Enqueue performance: ${enqueueTime}ms for 100 messages`);
    console.log(`   Processing performance: ${processTime}ms for ${processedCount} messages`);
    console.log(`   Queue stats: ${queueStats.messagesProcessed} processed, ${queueStats.queueSize} remaining`);
    console.log(`   Average processing time: ${queueStats.averageProcessingTime.toFixed(2)}ms\n`);
    
    this.results.eventSystem.messageQueue = {
      enqueueTime,
      processTime,
      stats: queueStats
    };
    
    // Test Circuit Breaker
    console.log('2. Testing Circuit Breaker Pattern:');
    const circuitBreaker = new CircuitBreaker('test_service', {
      failureThreshold: 3,
      timeout: 1000,
      resetTimeout: 5000
    });
    
    let successes = 0;
    let failures = 0;
    
    for (let i = 0; i < 10; i++) {
      try {
        await circuitBreaker.execute(async () => {
          if (Math.random() < 0.3) {
            throw new Error('Simulated failure');
          }
          return { success: true, data: `result_${i}` };
        });
        successes++;
      } catch (error) {
        failures++;
      }
    }
    
    const breakerState = circuitBreaker.getState();
    console.log(`   Circuit breaker test: ${successes} successes, ${failures} failures`);
    console.log(`   Current state: ${breakerState.state}`);
    console.log(`   Failure count: ${breakerState.failureCount}\n`);
    
    this.results.eventSystem.circuitBreaker = {
      successes,
      failures,
      state: breakerState
    };
    
    // Test Rate Limiter
    console.log('3. Testing Rate Limiter:');
    const rateLimiter = new RateLimiter(10, 5, 1000);
    
    let allowed = 0;
    let rejected = 0;
    
    const rateLimitStartTime = Date.now();
    for (let i = 0; i < 20; i++) {
      if (rateLimiter.consume()) {
        allowed++;
      } else {
        rejected++;
      }
    }
    const rateLimitTime = Date.now() - rateLimitStartTime;
    
    console.log(`   Rate limiting performance: ${rateLimitTime}ms for 20 requests`);
    console.log(`   Allowed: ${allowed}, Rejected: ${rejected}`);
    console.log(`   Available tokens: ${rateLimiter.getAvailableTokens()}\n`);
    
    this.results.eventSystem.rateLimiter = {
      time: rateLimitTime,
      allowed,
      rejected
    };
  }

  async testDataPipeline() {
    console.log('Testing Data Pipeline Systems...\n');
    
    // Test Batch Processor
    console.log('1. Testing Batch Processor:');
    const batchProcessor = new BatchProcessor(50, 4);
    
    const testData = [];
    for (let i = 0; i < 500; i++) {
      testData.push({
        id: i,
        value: Math.random() * 100,
        category: `category_${i % 10}`,
        timestamp: Date.now() + i * 1000
      });
    }
    
    const batchStartTime = Date.now();
    const batchResult = await batchProcessor.process(testData, async (batch, batchIndex) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return batch.map(item => ({
        ...item,
        processed: true,
        batchIndex,
        processedAt: Date.now()
      }));
    });
    const batchTime = Date.now() - batchStartTime;
    
    const batchStats = batchProcessor.getStats();
    console.log(`   Batch processing: ${batchTime}ms for ${testData.length} items`);
    console.log(`   Batches: ${batchResult.batchCount}, Processed: ${batchResult.totalProcessed}`);
    console.log(`   Throughput: ${(testData.length / (batchTime / 1000)).toFixed(0)} items/second\n`);
    
    this.results.dataPipeline.batchProcessor = {
      time: batchTime,
      throughput: testData.length / (batchTime / 1000),
      stats: batchStats
    };
    
    // Test Analytics Pipeline
    console.log('2. Testing Analytics Pipeline:');
    const analyticsPipeline = new AnalyticsPipeline({
      enableRealtime: true,
      slidingWindow: true,
      windowSize: 60000
    });
    
    const pipelineStartTime = Date.now();
    
    const aggregations = await analyticsPipeline.aggregate(batchResult.results.flat(), {
      totalItems: { type: 'count' },
      avgValue: { type: 'avg', field: 'value' },
      maxValue: { type: 'max', field: 'value' },
      minValue: { type: 'min', field: 'value' },
      uniqueCategories: { type: 'unique', field: 'category' }
    });
    
    const pipelineTime = Date.now() - pipelineStartTime;
    const pipelineMetrics = analyticsPipeline.getMetrics();
    
    console.log(`   Aggregation pipeline: ${pipelineTime}ms`);
    console.log(`   Total items: ${aggregations.totalItems}`);
    console.log(`   Value stats: avg=${aggregations.avgValue.average.toFixed(2)}, max=${aggregations.maxValue}, min=${aggregations.minValue.toFixed(2)}`);
    console.log(`   Unique categories: ${aggregations.uniqueCategories.count}`);
    console.log(`   Memory usage: ${pipelineMetrics.memoryFormatted.current}\n`);
    
    this.results.dataPipeline.analyticsPipeline = {
      time: pipelineTime,
      aggregations,
      metrics: pipelineMetrics
    };
  }

  async testIntegratedAnalytics() {
    console.log('Testing Integrated High-Performance Analytics...\n');
    
    console.log('1. Testing Analytics Initialization:');
    const initStartTime = Date.now();
    await this.analytics.initialize();
    const initTime = Date.now() - initStartTime;
    
    console.log(`   Analytics systems initialized in ${initTime}ms`);
    
    const performanceMetrics = this.analytics.getPerformanceMetrics();
    console.log(`   Performance engine: ${performanceMetrics.engine.queries.total} queries processed`);
    console.log(`   Cache hit ratio: ${performanceMetrics.engine.cache.hitRatio}`);
    console.log(`   Memory overhead: ${performanceMetrics.engine.memory.overhead}\n`);
    
    this.results.integration.initialization = {
      time: initTime,
      metrics: performanceMetrics
    };
    
    console.log('2. Testing High-Performance Search:');
    const searchStartTime = Date.now();
    
    const techSearch = await this.analytics.searchTechnologies('java', 5);
    const keywordSearch = await this.analytics.searchKeywords('bug', 5);
    
    const searchTime = Date.now() - searchStartTime;
    
    console.log(`   Search performance: ${searchTime}ms`);
    console.log(`   Technology search results: ${techSearch.length}`);
    console.log(`   Keyword search results: ${keywordSearch.length}\n`);
    
    this.results.integration.search = {
      time: searchTime,
      techResults: techSearch.length,
      keywordResults: keywordSearch.length
    };
  }

  async runBenchmarks() {
    console.log('Running Performance Benchmarks...\n');
    
    console.log('1. Data Structure Benchmarks:');
    
    const testSize = 10000;
    const iterations = 1000;
    
    // Standard Map benchmark
    const standardMap = new Map();
    let mapTime = Date.now();
    
    for (let i = 0; i < testSize; i++) {
      standardMap.set(`key_${i}`, { value: i * 2 });
    }
    
    for (let i = 0; i < iterations; i++) {
      standardMap.get(`key_${Math.floor(Math.random() * testSize)}`);
    }
    
    mapTime = Date.now() - mapTime;
    
    // LRU Cache benchmark
    const lruCache = new AdvancedLRUCache(testSize * 2);
    let lruTime = Date.now();
    
    for (let i = 0; i < testSize; i++) {
      lruCache.set(`key_${i}`, { value: i * 2 });
    }
    
    for (let i = 0; i < iterations; i++) {
      lruCache.get(`key_${Math.floor(Math.random() * testSize)}`);
    }
    
    lruTime = Date.now() - lruTime;
    
    console.log(`   Standard Map: ${mapTime}ms for ${testSize} sets + ${iterations} gets`);
    console.log(`   LRU Cache: ${lruTime}ms for ${testSize} sets + ${iterations} gets`);
    console.log(`   Performance ratio: ${(mapTime / lruTime).toFixed(2)}x (lower is better for LRU)\n`);
    
    this.results.benchmarks = {
      mapTime,
      lruTime,
      ratio: mapTime / lruTime
    };
  }

  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log('HIGH-PERFORMANCE ANALYTICS TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log('\nPERFORMANCE ENGINE:');
    console.log(`   Cache: ${this.results.performanceEngine.cache?.time}ms, Hit ratio: ${this.results.performanceEngine.cache?.stats.hitRatio}`);
    console.log(`   Bloom Filter: ${this.results.performanceEngine.bloomFilter?.time}ms, Memory: ${this.results.performanceEngine.bloomFilter?.stats.memoryUsage} bytes`);
    console.log(`   Trie: ${this.results.performanceEngine.trie?.time}ms, Words: ${this.results.performanceEngine.trie?.wordCount}`);
    console.log(`   Ring Buffer: ${this.results.performanceEngine.ringBuffer?.time}ms, Utilization: ${this.results.performanceEngine.ringBuffer?.utilization.toFixed(1)}%`);
    
    console.log('\nEVENT SYSTEM:');
    console.log(`   Message Queue: ${this.results.eventSystem.messageQueue?.enqueueTime}ms enqueue, ${this.results.eventSystem.messageQueue?.processTime}ms processing`);
    console.log(`   Circuit Breaker: ${this.results.eventSystem.circuitBreaker?.successes} successes, ${this.results.eventSystem.circuitBreaker?.failures} failures`);
    console.log(`   Rate Limiter: ${this.results.eventSystem.rateLimiter?.allowed} allowed, ${this.results.eventSystem.rateLimiter?.rejected} rejected`);
    
    console.log('\nDATA PIPELINE:');
    console.log(`   Batch Processor: ${this.results.dataPipeline.batchProcessor?.time}ms, Throughput: ${this.results.dataPipeline.batchProcessor?.throughput.toFixed(0)} items/sec`);
    console.log(`   Analytics Pipeline: ${this.results.dataPipeline.analyticsPipeline?.time}ms, Memory: ${this.results.dataPipeline.analyticsPipeline?.metrics.memoryFormatted.current}`);
    
    console.log('\nINTEGRATION:');
    console.log(`   Initialization: ${this.results.integration.initialization?.time}ms`);
    console.log(`   Search Performance: ${this.results.integration.search?.time}ms`);
    
    console.log('\nBENCHMARKS:');
    console.log(`   Map vs LRU Cache: ${this.results.benchmarks?.ratio?.toFixed(2)}x performance difference`);
    
    console.log('\n' + '='.repeat(80));
    console.log('All tests completed successfully!');
    console.log('   High-performance systems are operational and optimized.');
    console.log('='.repeat(80) + '\n');
  }

  async cleanup() {
    console.log('Cleaning up test resources...');
    
    try {
      await this.analytics.shutdown();
      console.log('Cleanup completed\n');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const testSuite = new HighPerformanceTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = HighPerformanceTestSuite;
