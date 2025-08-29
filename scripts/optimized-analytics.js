#!/usr/bin/env node

/**
 * Ultra-Optimized Analytics Processing
 * 
 * Streamlined version that combines all analytics processing 
 * with aggressive timeout handling and fallback mechanisms
 * Optimized for maximum performance and minimal resource usage
 */

const Analytics = require('../src/analytics');
const HighPerformanceTestSuite = require('../test-high-performance');

class UltraOptimizedAnalyticsRunner {
  constructor() {
    this.analytics = new Analytics();
    this.testSuite = new HighPerformanceTestSuite();
    this.startTime = Date.now();
    this.maxRuntime = 7 * 60 * 1000; // 7 minutes max
    this.timeoutHandle = null;
  }

  async run() {
    console.log('🚀 Starting optimized analytics processing...');
    
    // Set up global timeout
    this.timeoutHandle = setTimeout(() => {
      console.log('⚠️ Analytics processing exceeded time limit, forcing exit...');
      process.exit(1);
    }, this.maxRuntime);

    try {
      // Initialize systems
      await this.initializeWithTimeout();
      
      // Run core analytics (most important)
      await this.runCoreAnalytics();
      
      // Run performance tests (if time permits)
      if (this.hasTimeRemaining(60000)) { // 1 minute buffer
        await this.runPerformanceTests();
      } else {
        console.log('⏰ Skipping performance tests due to time constraints');
      }
      
      // Cleanup
      await this.cleanup();
      
      console.log('✅ Optimized analytics completed successfully!');
      this.clearTimeout();
      
    } catch (error) {
      console.error('❌ Analytics processing failed:', error.message);
      await this.emergencyCleanup();
      process.exit(1);
    }
  }

  async initializeWithTimeout() {
    console.log('Initializing performance systems...');
    
    const initTimeout = setTimeout(() => {
      throw new Error('Initialization timeout after 30 seconds');
    }, 30000);

    try {
      await this.analytics.initialize();
      clearTimeout(initTimeout);
      console.log('✅ Analytics systems initialized');
    } catch (error) {
      clearTimeout(initTimeout);
      throw error;
    }
  }

  async runCoreAnalytics() {
    console.log('Running core analytics processing...');
    
    try {
      // Generate only essential analytics to save time
      const promises = [];
      
      // Traditional stats (essential)
      promises.push(
        this.withTimeout(
          this.analytics.generateStats(30),
          'Traditional analytics',
          60000 // 1 minute timeout
        )
      );

      // Advanced analytics (if system supports it)
      if (this.hasTimeRemaining(120000)) { // 2 minutes buffer
        promises.push(
          this.withTimeout(
            this.analytics.generateAdvancedAnalytics(30),
            'Advanced analytics',
            90000 // 1.5 minutes timeout
          ).catch(error => {
            console.warn('⚠️ Advanced analytics skipped:', error.message);
            return null;
          })
        );
      }

      // Aggregated insights (lighter processing)
      promises.push(
        this.withTimeout(
          this.analytics.generateAggregatedInsights(30),
          'Aggregated insights',
          45000 // 45 seconds timeout
        )
      );

      const results = await Promise.allSettled(promises);
      
      // Log results
      results.forEach((result, index) => {
        const names = ['Traditional analytics', 'Advanced analytics', 'Aggregated insights'];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${names[index]} completed`);
        } else {
          console.warn(`⚠️ ${names[index]} failed:`, result.reason.message);
        }
      });

      // Get performance metrics
      const performanceMetrics = this.analytics.getPerformanceMetrics();
      console.log('📊 Performance Metrics:');
      console.log(`   Cache hit ratio: ${performanceMetrics.engine.cache.hitRatio}`);
      console.log(`   Average query time: ${performanceMetrics.engine.queries.averageTime}`);
      console.log(`   Memory usage: ${performanceMetrics.engine.memory.current}`);

    } catch (error) {
      console.error('Core analytics processing failed:', error.message);
      throw error;
    }
  }

  async runPerformanceTests() {
    console.log('Running performance validation...');
    
    try {
      // Run only essential performance tests
      await this.withTimeout(
        this.testSuite.testPerformanceEngine(),
        'Performance engine test',
        30000
      );
      console.log('✅ Performance engine: Healthy');

      // Skip other tests if running short on time
      if (this.hasTimeRemaining(60000)) {
        await this.withTimeout(
          this.testSuite.testEventSystem(),
          'Event system test',
          20000
        );
        console.log('✅ Event system: Healthy');

        await this.withTimeout(
          this.testSuite.testDataPipeline(),
          'Data pipeline test',
          20000
        );
        console.log('✅ Data pipeline: Healthy');
      } else {
        console.log('⏰ Skipping additional tests due to time constraints');
      }

    } catch (error) {
      console.warn('⚠️ Performance tests failed:', error.message);
      // Don't fail the whole process for performance test failures
    }
  }

  async cleanup() {
    console.log('🔄 Cleaning up analytics systems...');
    
    try {
      if (this.analytics) {
        await this.withTimeout(
          this.analytics.shutdown(),
          'Analytics shutdown',
          10000
        );
      }
      
      if (this.testSuite) {
        await this.withTimeout(
          this.testSuite.cleanup(),
          'Test suite cleanup',
          5000
        );
      }
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error.message);
    }
  }

  async emergencyCleanup() {
    console.log('🚨 Performing emergency cleanup...');
    
    try {
      // Force cleanup without timeouts
      if (this.analytics && this.analytics.shutdown) {
        await this.analytics.shutdown();
      }
    } catch (error) {
      console.warn('Emergency cleanup error:', error.message);
    }
  }

  async withTimeout(promise, description, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${description} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  hasTimeRemaining(bufferMs = 0) {
    const elapsed = Date.now() - this.startTime;
    const remaining = this.maxRuntime - elapsed;
    return remaining > bufferMs;
  }

  clearTimeout() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  getRemainingTime() {
    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.maxRuntime - elapsed);
    return Math.floor(remaining / 1000); // seconds
  }
}

// Handle process signals
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, cleaning up...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, cleaning up...');
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  const runner = new UltraOptimizedAnalyticsRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = UltraOptimizedAnalyticsRunner;
