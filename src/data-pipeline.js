const fs = require('fs-extra');
const path = require('path');
const { Transform, Writable, pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

/**
 * High-Performance Data Pipeline System
 * 
 * Implements:
 * - Stream-based processing for large datasets
 * - Batch processing with configurable sizes
 * - Data transformation pipelines
 * - Memory-efficient processing
 * - Real-time and batch analytics
 * - Data validation and sanitization
 * - Parallel processing streams
 */

// Efficient batch processor for large datasets
class BatchProcessor {
  constructor(batchSize = 1000, maxConcurrency = 4) {
    this.batchSize = batchSize;
    this.maxConcurrency = maxConcurrency;
    this.currentBatch = [];
    this.activeBatches = 0;
    this.totalProcessed = 0;
    this.totalErrors = 0;
    this.processingQueue = [];
  }

  async process(items, processingFunction) {
    const batches = this.createBatches(items);
    const results = [];

    // Process batches with concurrency control
    for (let i = 0; i < batches.length; i += this.maxConcurrency) {
      const currentBatchGroup = batches.slice(i, i + this.maxConcurrency);
      
      const batchPromises = currentBatchGroup.map(async (batch, index) => {
        try {
          this.activeBatches++;
          const batchResult = await processingFunction(batch, i + index);
          this.totalProcessed += batch.length;
          return batchResult;
        } catch (error) {
          this.totalErrors += batch.length;
          console.error(`Batch processing error:`, error);
          return { error: error.message, batch };
        } finally {
          this.activeBatches--;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      ));
    }

    return {
      results,
      totalProcessed: this.totalProcessed,
      totalErrors: this.totalErrors,
      batchCount: batches.length
    };
  }

  createBatches(items) {
    const batches = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    return batches;
  }

  getStats() {
    return {
      batchSize: this.batchSize,
      maxConcurrency: this.maxConcurrency,
      activeBatches: this.activeBatches,
      totalProcessed: this.totalProcessed,
      totalErrors: this.totalErrors
    };
  }
}

// Stream-based data transformer for real-time processing
class DataTransformStream extends Transform {
  constructor(transformFunction, options = {}) {
    super({ 
      objectMode: true,
      highWaterMark: options.highWaterMark || 16,
      ...options 
    });
    
    this.transformFunction = transformFunction;
    this.processed = 0;
    this.errors = 0;
    this.startTime = Date.now();
  }

  _transform(chunk, encoding, callback) {
    try {
      const result = this.transformFunction(chunk, this.processed);
      this.processed++;
      
      if (result !== null && result !== undefined) {
        this.push(result);
      }
      
      callback();
    } catch (error) {
      this.errors++;
      this.emit('error', error);
      callback();
    }
  }

  _flush(callback) {
    const duration = Date.now() - this.startTime;
    this.emit('stats', {
      processed: this.processed,
      errors: this.errors,
      duration,
      rate: this.processed / (duration / 1000)
    });
    callback();
  }
}

// High-performance data aggregator
class DataAggregator extends Writable {
  constructor(aggregationFunctions, options = {}) {
    super({ 
      objectMode: true,
      highWaterMark: options.highWaterMark || 16,
      ...options 
    });
    
    this.aggregationFunctions = aggregationFunctions;
    this.aggregatedData = {};
    this.itemCount = 0;
  }

  _write(chunk, encoding, callback) {
    try {
      this.itemCount++;
      
      for (const [key, aggregateFunc] of Object.entries(this.aggregationFunctions)) {
        if (!this.aggregatedData[key]) {
          this.aggregatedData[key] = aggregateFunc.initialValue !== undefined 
            ? aggregateFunc.initialValue 
            : null;
        }
        
        this.aggregatedData[key] = aggregateFunc.fn(
          this.aggregatedData[key], 
          chunk, 
          this.itemCount
        );
      }
      
      callback();
    } catch (error) {
      this.emit('error', error);
      callback();
    }
  }

  getResults() {
    return {
      aggregatedData: this.aggregatedData,
      itemCount: this.itemCount
    };
  }
}

// Memory-efficient data reader for large files
class MemoryEfficientReader {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.chunkSize = options.chunkSize || 64 * 1024; // 64KB chunks
    this.parseFunction = options.parseFunction || JSON.parse;
    this.filterFunction = options.filterFunction || (() => true);
  }

  async *readChunks() {
    const fileHandle = await fs.open(this.filePath, 'r');
    const buffer = Buffer.allocUnsafe(this.chunkSize);
    let position = 0;
    let remainder = '';

    try {
      while (true) {
        const { bytesRead } = await fileHandle.read(buffer, 0, this.chunkSize, position);
        if (bytesRead === 0) break;

        const chunk = remainder + buffer.toString('utf8', 0, bytesRead);
        const lines = chunk.split('\n');
        
        // Keep the last incomplete line for the next iteration
        remainder = lines.pop();
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = this.parseFunction(line);
              if (this.filterFunction(parsed)) {
                yield parsed;
              }
            } catch (error) {
              // Skip invalid lines
              continue;
            }
          }
        }
        
        position += bytesRead;
      }

      // Process the final remainder
      if (remainder.trim()) {
        try {
          const parsed = this.parseFunction(remainder);
          if (this.filterFunction(parsed)) {
            yield parsed;
          }
        } catch (error) {
          // Skip invalid final line
        }
      }
    } finally {
      await fileHandle.close();
    }
  }

  async processInBatches(batchProcessor, transformFunction) {
    const items = [];
    
    for await (const item of this.readChunks()) {
      items.push(item);
      
      if (items.length >= batchProcessor.batchSize) {
        const batch = items.splice(0, batchProcessor.batchSize);
        await batchProcessor.process(batch, transformFunction);
      }
    }
    
    // Process remaining items
    if (items.length > 0) {
      await batchProcessor.process(items, transformFunction);
    }
  }
}

// Analytics pipeline for real-time insights
class AnalyticsPipeline {
  constructor(options = {}) {
    this.options = {
      windowSize: options.windowSize || 1000,
      slidingWindow: options.slidingWindow || false,
      enableRealtime: options.enableRealtime !== false,
      metricsInterval: options.metricsInterval || 30000,
      ...options
    };

    this.metrics = {
      itemsProcessed: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      peakMemoryUsage: 0,
      currentMemoryUsage: 0,
      throughput: 0,
      errorRate: 0,
      errors: 0
    };

    this.slidingWindow = [];
    this.realtimeCallbacks = new Set();
    
    if (this.options.enableRealtime) {
      this.startMetricsCollection();
    }
  }

  // Core pipeline processing
  async processData(data, transformations = []) {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage().heapUsed;

    try {
      let processedData = data;
      
      // Apply transformations sequentially
      for (const transformation of transformations) {
        if (Array.isArray(processedData)) {
          // Batch processing
          const batchProcessor = new BatchProcessor(
            transformation.batchSize || 1000,
            transformation.concurrency || 4
          );
          
          const result = await batchProcessor.process(
            processedData, 
            transformation.fn
          );
          
          processedData = result.results.flat();
        } else {
          // Single item processing
          processedData = transformation.fn(processedData);
        }
      }

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, initialMemory);
      
      // Update sliding window
      if (this.options.slidingWindow) {
        this.updateSlidingWindow(processedData);
      }

      // Trigger realtime callbacks
      if (this.options.enableRealtime) {
        this.notifyRealtimeCallbacks(processedData);
      }

      return processedData;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  // Stream processing pipeline
  async processStream(inputStream, transformations = [], outputPath = null) {
    const streams = [inputStream];
    
    // Add transformation streams
    for (const transformation of transformations) {
      const transformStream = new DataTransformStream(
        transformation.fn,
        transformation.options || {}
      );
      
      transformStream.on('stats', (stats) => {
        this.updateStreamStats(stats);
      });
      
      streams.push(transformStream);
    }

    // Add output stream if specified
    if (outputPath) {
      streams.push(fs.createWriteStream(outputPath));
    }

    try {
      await pipelineAsync(...streams);
      return { success: true, metrics: this.metrics };
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  // Aggregation pipeline for analytics
  async aggregate(data, aggregationConfig) {
    const aggregations = {};
    
    // Define common aggregation functions
    const standardAggregations = {
      count: {
        initialValue: 0,
        fn: (acc, item) => acc + 1
      },
      sum: {
        initialValue: 0,
        fn: (acc, item, field) => acc + (item[field] || 0)
      },
      avg: {
        initialValue: { sum: 0, count: 0 },
        fn: (acc, item, field) => ({
          sum: acc.sum + (item[field] || 0),
          count: acc.count + 1,
          average: (acc.sum + (item[field] || 0)) / (acc.count + 1)
        })
      },
      min: {
        initialValue: Infinity,
        fn: (acc, item, field) => Math.min(acc, item[field] || Infinity)
      },
      max: {
        initialValue: -Infinity,
        fn: (acc, item, field) => Math.max(acc, item[field] || -Infinity)
      },
      unique: {
        initialValue: new Set(),
        fn: (acc, item, field) => {
          acc.add(item[field]);
          return acc;
        }
      }
    };

    // Process aggregations
    for (const [key, config] of Object.entries(aggregationConfig)) {
      const aggregationFn = standardAggregations[config.type] || config;
      let result = aggregationFn.initialValue;
      
      if (Array.isArray(data)) {
        for (const item of data) {
          result = aggregationFn.fn(result, item, config.field);
        }
      }
      
      // Post-process results
      if (config.type === 'unique' && result instanceof Set) {
        result = { count: result.size, values: Array.from(result) };
      }
      
      aggregations[key] = result;
    }

    return aggregations;
  }

  // Time-series analysis
  async analyzeTimeSeries(data, options = {}) {
    const {
      timeField = 'timestamp',
      valueField = 'value',
      interval = 'hour',
      metrics = ['count', 'avg', 'min', 'max']
    } = options;

    const buckets = new Map();
    
    for (const item of data) {
      const timestamp = new Date(item[timeField]);
      const bucketKey = this.getBucketKey(timestamp, interval);
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          timestamp: bucketKey,
          values: [],
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity
        });
      }
      
      const bucket = buckets.get(bucketKey);
      const value = item[valueField] || 0;
      
      bucket.values.push(value);
      bucket.count++;
      bucket.sum += value;
      bucket.min = Math.min(bucket.min, value);
      bucket.max = Math.max(bucket.max, value);
    }

    // Calculate final metrics
    const results = Array.from(buckets.values()).map(bucket => {
      const result = {
        timestamp: bucket.timestamp,
        count: bucket.count
      };
      
      if (metrics.includes('avg')) {
        result.avg = bucket.count > 0 ? bucket.sum / bucket.count : 0;
      }
      
      if (metrics.includes('sum')) {
        result.sum = bucket.sum;
      }
      
      if (metrics.includes('min')) {
        result.min = bucket.min === Infinity ? 0 : bucket.min;
      }
      
      if (metrics.includes('max')) {
        result.max = bucket.max === -Infinity ? 0 : bucket.max;
      }
      
      if (metrics.includes('median')) {
        const sorted = bucket.values.sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        result.median = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      }
      
      return result;
    });

    return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  getBucketKey(timestamp, interval) {
    const date = new Date(timestamp);
    
    switch (interval) {
      case 'minute':
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
      case 'hour':
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`;
      case 'day':
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()} (Week)`;
      case 'month':
        return `${date.getFullYear()}-${date.getMonth() + 1}`;
      case 'year':
        return `${date.getFullYear()}`;
      default:
        return date.toISOString();
    }
  }

  updateMetrics(duration, initialMemory) {
    this.metrics.itemsProcessed++;
    this.metrics.totalProcessingTime += duration;
    this.metrics.averageProcessingTime = 
      this.metrics.totalProcessingTime / this.metrics.itemsProcessed;

    const currentMemory = process.memoryUsage().heapUsed;
    this.metrics.currentMemoryUsage = currentMemory;
    this.metrics.peakMemoryUsage = Math.max(
      this.metrics.peakMemoryUsage,
      currentMemory
    );

    this.metrics.errorRate = this.metrics.errors / this.metrics.itemsProcessed;
  }

  updateStreamStats(stats) {
    this.metrics.throughput = stats.rate;
    this.metrics.itemsProcessed += stats.processed;
    this.metrics.errors += stats.errors;
  }

  updateSlidingWindow(data) {
    this.slidingWindow.push({
      data,
      timestamp: Date.now()
    });

    // Keep only items within the window
    const cutoff = Date.now() - this.options.windowSize;
    this.slidingWindow = this.slidingWindow.filter(
      item => item.timestamp > cutoff
    );
  }

  notifyRealtimeCallbacks(data) {
    for (const callback of this.realtimeCallbacks) {
      try {
        callback(data, this.metrics);
      } catch (error) {
        console.error('Realtime callback error:', error);
      }
    }
  }

  startMetricsCollection() {
    setInterval(() => {
      this.metrics.currentMemoryUsage = process.memoryUsage().heapUsed;
      
      // Emit metrics event
      if (this.realtimeCallbacks.size > 0) {
        this.notifyRealtimeCallbacks(null);
      }
    }, this.options.metricsInterval);
  }

  addRealtimeCallback(callback) {
    this.realtimeCallbacks.add(callback);
  }

  removeRealtimeCallback(callback) {
    this.realtimeCallbacks.delete(callback);
  }

  getMetrics() {
    return {
      ...this.metrics,
      slidingWindowSize: this.slidingWindow.length,
      memoryFormatted: {
        current: this.formatBytes(this.metrics.currentMemoryUsage),
        peak: this.formatBytes(this.metrics.peakMemoryUsage)
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

  reset() {
    this.metrics = {
      itemsProcessed: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      peakMemoryUsage: 0,
      currentMemoryUsage: process.memoryUsage().heapUsed,
      throughput: 0,
      errorRate: 0,
      errors: 0
    };
    
    this.slidingWindow = [];
  }
}

module.exports = {
  AnalyticsPipeline,
  BatchProcessor,
  DataTransformStream,
  DataAggregator,
  MemoryEfficientReader
};
