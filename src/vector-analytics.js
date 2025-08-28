const { Matrix } = require('ml-matrix');
const moment = require('moment');

class VectorAnalytics {
  constructor() {
    this.dimensions = {
      PRODUCTIVITY: 0,
      TIME_SPENT: 1,
      MOOD_SCORE: 2,
      TECH_COUNT: 3,
      HOUR_OF_DAY: 4,
      DAY_OF_WEEK: 5,
      STREAK_MOMENTUM: 6
    };
    
    this.moodMap = {
      'Great': 5,
      'Excited': 5,
      'Focused': 4,
      'Okay': 3,
      'Struggling': 2,
      'Confused': 1
    };
    
    this.productivityMap = {
      'Very High': 5,
      'High': 4,
      'Medium': 3,
      'Low': 2,
      'Very Low': 1
    };
  }

  /**
   * Convert journal entries to feature vectors for machine learning analysis
   */
  entriesToVectors(entries) {
    const vectors = [];
    const metadata = [];
    
    for (const dayEntry of entries) {
      if (!dayEntry.entries || dayEntry.entries.length === 0) continue;
      
      // Aggregate daily metrics
      const dayMetrics = this.aggregateDayMetrics(dayEntry);
      
      // Create feature vector
      const vector = [
        dayMetrics.productivity,     // 0: Productivity score (1-5)
        dayMetrics.timeSpent,        // 1: Hours spent coding
        dayMetrics.moodScore,        // 2: Mood score (1-5)
        dayMetrics.techCount,        // 3: Number of technologies used
        dayMetrics.avgHour,          // 4: Average hour of activity (0-23)
        dayMetrics.dayOfWeek,        // 5: Day of week (0-6)
        dayMetrics.streakMomentum    // 6: Streak momentum indicator
      ];
      
      vectors.push(vector);
      metadata.push({
        date: dayEntry.date,
        entries: dayEntry.entries,
        technologies: dayMetrics.technologies
      });
    }
    
    return {
      matrix: new Matrix(vectors),
      metadata,
      dimensions: Object.keys(this.dimensions).length
    };
  }

  aggregateDayMetrics(dayEntry) {
    const entries = dayEntry.entries;
    let totalProductivity = 0;
    let totalTimeSpent = 0;
    let totalMood = 0;
    let hourSum = 0;
    const techSet = new Set();
    
    for (const entry of entries) {
      // Productivity
      if (entry.productivity) {
        totalProductivity += this.productivityMap[entry.productivity] || 3;
      }
      
      // Time spent
      if (typeof entry.timeSpent === 'number') {
        totalTimeSpent += entry.timeSpent;
      }
      
      // Mood
      if (entry.mood) {
        totalMood += this.moodMap[entry.mood] || 3;
      }
      
      // Hour of activity
      if (entry.timestamp) {
        hourSum += moment(entry.timestamp).hour();
      }
      
      // Technologies
      if (entry.technologies && Array.isArray(entry.technologies)) {
        entry.technologies.forEach(tech => techSet.add(tech));
      }
    }
    
    const entryCount = entries.length;
    const dayOfWeek = moment(dayEntry.date).day(); // 0 = Sunday, 6 = Saturday
    
    // Calculate streak momentum (could be enhanced with actual streak data)
    const streakMomentum = this.calculateStreakMomentum(dayEntry.date);
    
    return {
      productivity: entryCount > 0 ? totalProductivity / entryCount : 0,
      timeSpent: totalTimeSpent,
      moodScore: entryCount > 0 ? totalMood / entryCount : 0,
      techCount: techSet.size,
      avgHour: entryCount > 0 ? hourSum / entryCount : 12, // Default to noon
      dayOfWeek: dayOfWeek,
      streakMomentum: streakMomentum,
      technologies: Array.from(techSet)
    };
  }

  calculateStreakMomentum(date) {
    // Simple momentum calculation - could be enhanced with actual streak data
    const dayOfWeek = moment(date).day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return isWeekend ? 0.7 : 1.0; // Weekend coding shows higher momentum
  }

  /**
   * Perform clustering analysis to identify patterns in coding behavior
   */
  findCodingPatterns(vectorData, k = 3) {
    const { matrix, metadata } = vectorData;
    
    if (matrix.rows < k) {
      return { clusters: [], centroids: [], insights: [] };
    }
    
    // Simple k-means clustering
    const clusters = this.kMeansCluster(matrix, k);
    const insights = this.interpretClusters(clusters, metadata);
    
    return {
      clusters: clusters.assignments,
      centroids: clusters.centroids,
      insights
    };
  }

  kMeansCluster(matrix, k, maxIterations = 100) {
    const rows = matrix.rows;
    const cols = matrix.columns;
    
    // Initialize centroids randomly
    let centroids = Matrix.random(k, cols);
    let assignments = new Array(rows).fill(0);
    let prevAssignments = new Array(rows).fill(-1);
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign points to nearest centroid
      for (let i = 0; i < rows; i++) {
        const point = matrix.getRow(i);
        let minDistance = Infinity;
        let bestCluster = 0;
        
        for (let j = 0; j < k; j++) {
          const centroid = centroids.getRow(j);
          const distance = this.euclideanDistance(point, centroid);
          
          if (distance < minDistance) {
            minDistance = distance;
            bestCluster = j;
          }
        }
        
        assignments[i] = bestCluster;
      }
      
      // Check for convergence
      if (assignments.every((val, idx) => val === prevAssignments[idx])) {
        break;
      }
      
      prevAssignments = [...assignments];
      
      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterPoints = [];
        
        for (let i = 0; i < rows; i++) {
          if (assignments[i] === j) {
            clusterPoints.push(matrix.getRow(i));
          }
        }
        
        if (clusterPoints.length > 0) {
          const newCentroid = new Array(cols).fill(0);
          
          for (const point of clusterPoints) {
            for (let col = 0; col < cols; col++) {
              newCentroid[col] += point[col];
            }
          }
          
          for (let col = 0; col < cols; col++) {
            newCentroid[col] /= clusterPoints.length;
            centroids.set(j, col, newCentroid[col]);
          }
        }
      }
    }
    
    return { assignments, centroids };
  }

  euclideanDistance(point1, point2) {
    let sum = 0;
    for (let i = 0; i < point1.length; i++) {
      sum += Math.pow(point1[i] - point2[i], 2);
    }
    return Math.sqrt(sum);
  }

  interpretClusters(clusters, metadata) {
    const insights = [];
    const { assignments, centroids } = clusters;
    
    for (let i = 0; i < centroids.rows; i++) {
      const centroid = centroids.getRow(i);
      const clusterPoints = assignments
        .map((assignment, idx) => assignment === i ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (clusterPoints.length === 0) continue;
      
      const insight = {
        clusterId: i,
        size: clusterPoints.length,
        characteristics: {
          avgProductivity: centroid[this.dimensions.PRODUCTIVITY].toFixed(2),
          avgTimeSpent: centroid[this.dimensions.TIME_SPENT].toFixed(2),
          avgMood: centroid[this.dimensions.MOOD_SCORE].toFixed(2),
          avgTechCount: centroid[this.dimensions.TECH_COUNT].toFixed(1),
          avgHour: Math.round(centroid[this.dimensions.HOUR_OF_DAY]),
          preferredDay: this.dayOfWeekName(Math.round(centroid[this.dimensions.DAY_OF_WEEK])),
          streakMomentum: centroid[this.dimensions.STREAK_MOMENTUM].toFixed(2)
        },
        description: this.describeCluster(centroid),
        dates: clusterPoints.map(idx => metadata[idx].date),
        commonTechnologies: this.findCommonTechnologies(
          clusterPoints.map(idx => metadata[idx].technologies)
        )
      };
      
      insights.push(insight);
    }
    
    return insights;
  }

  describeCluster(centroid) {
    const productivity = centroid[this.dimensions.PRODUCTIVITY];
    const timeSpent = centroid[this.dimensions.TIME_SPENT];
    const mood = centroid[this.dimensions.MOOD_SCORE];
    const techCount = centroid[this.dimensions.TECH_COUNT];
    
    let description = '';
    
    if (productivity >= 4) {
      description += 'High-productivity ';
    } else if (productivity >= 3) {
      description += 'Moderate-productivity ';
    } else {
      description += 'Low-productivity ';
    }
    
    if (timeSpent >= 6) {
      description += 'intensive coding ';
    } else if (timeSpent >= 3) {
      description += 'regular coding ';
    } else {
      description += 'light coding ';
    }
    
    if (mood >= 4) {
      description += 'sessions with positive mood';
    } else if (mood >= 3) {
      description += 'sessions with neutral mood';
    } else {
      description += 'sessions with challenging mood';
    }
    
    if (techCount >= 3) {
      description += ' and diverse technology usage';
    } else if (techCount >= 2) {
      description += ' with moderate technology variety';
    } else {
      description += ' with focused technology use';
    }
    
    return description;
  }

  dayOfWeekName(day) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'Unknown';
  }

  findCommonTechnologies(techArrays) {
    const techCount = {};
    const totalArrays = techArrays.length;
    
    for (const technologies of techArrays) {
      for (const tech of technologies) {
        techCount[tech] = (techCount[tech] || 0) + 1;
      }
    }
    
    // Return technologies used in at least 50% of the cluster
    return Object.entries(techCount)
      .filter(([, count]) => count >= Math.ceil(totalArrays * 0.5))
      .sort(([, a], [, b]) => b - a)
      .map(([tech]) => tech)
      .slice(0, 5);
  }

  /**
   * Calculate correlation matrix for different metrics
   */
  calculateCorrelations(vectorData) {
    const { matrix } = vectorData;
    const corrMatrix = new Array(matrix.columns).fill(null)
      .map(() => new Array(matrix.columns).fill(0));
    
    for (let i = 0; i < matrix.columns; i++) {
      for (let j = i; j < matrix.columns; j++) {
        const col1 = matrix.getColumn(i);
        const col2 = matrix.getColumn(j);
        const correlation = this.pearsonCorrelation(col1, col2);
        
        corrMatrix[i][j] = correlation;
        corrMatrix[j][i] = correlation;
      }
    }
    
    return this.interpretCorrelations(corrMatrix);
  }

  pearsonCorrelation(x, y) {
    const n = x.length;
    if (n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  interpretCorrelations(corrMatrix) {
    const insights = [];
    const dimensionNames = Object.keys(this.dimensions);
    
    for (let i = 0; i < corrMatrix.length; i++) {
      for (let j = i + 1; j < corrMatrix[i].length; j++) {
        const correlation = corrMatrix[i][j];
        
        if (Math.abs(correlation) > 0.5) { // Significant correlation
          insights.push({
            metric1: dimensionNames[i],
            metric2: dimensionNames[j],
            correlation: correlation.toFixed(3),
            strength: Math.abs(correlation) > 0.7 ? 'Strong' : 'Moderate',
            direction: correlation > 0 ? 'Positive' : 'Negative',
            interpretation: this.interpretCorrelationPair(
              dimensionNames[i], 
              dimensionNames[j], 
              correlation
            )
          });
        }
      }
    }
    
    return insights;
  }

  interpretCorrelationPair(metric1, metric2, correlation) {
    const isPositive = correlation > 0;
    const strength = Math.abs(correlation) > 0.7 ? 'strongly' : 'moderately';
    
    const interpretations = {
      'PRODUCTIVITY_TIME_SPENT': isPositive 
        ? `Higher productivity ${strength} correlates with more time spent coding`
        : `Higher productivity ${strength} correlates with less time needed`,
      'PRODUCTIVITY_MOOD_SCORE': isPositive
        ? `Better mood ${strength} correlates with higher productivity`
        : `Better mood ${strength} correlates with lower productivity (surprising!)`,
      'TIME_SPENT_TECH_COUNT': isPositive
        ? `More coding time ${strength} correlates with using more technologies`
        : `More coding time ${strength} correlates with focused technology use`,
      'MOOD_SCORE_DAY_OF_WEEK': isPositive
        ? `Certain days of the week ${strength} correlate with better mood`
        : `Certain days of the week ${strength} correlate with worse mood`
    };
    
    const key = `${metric1}_${metric2}`;
    return interpretations[key] || `${metric1} and ${metric2} are ${strength} ${isPositive ? 'positively' : 'negatively'} correlated`;
  }

  /**
   * Predict optimal coding conditions based on historical patterns
   */
  predictOptimalConditions(vectorData) {
    const { matrix, metadata } = vectorData;
    
    if (matrix.rows < 5) {
      return { prediction: 'Insufficient data for predictions', confidence: 0 };
    }
    
    // Find top 20% of productive days
    const productivityColumn = matrix.getColumn(this.dimensions.PRODUCTIVITY);
    const timeColumn = matrix.getColumn(this.dimensions.TIME_SPENT);
    const moodColumn = matrix.getColumn(this.dimensions.MOOD_SCORE);
    
    // Create composite score
    const compositeScores = productivityColumn.map((prod, i) => ({
      index: i,
      score: prod * 0.4 + (timeColumn[i] / 10) * 0.3 + moodColumn[i] * 0.3
    }));
    
    compositeScores.sort((a, b) => b.score - a.score);
    const topIndices = compositeScores
      .slice(0, Math.max(1, Math.floor(matrix.rows * 0.2)))
      .map(item => item.index);
    
    // Analyze optimal conditions
    const optimalVectors = topIndices.map(i => matrix.getRow(i));
    const avgOptimal = new Array(matrix.columns).fill(0);
    
    for (const vector of optimalVectors) {
      for (let i = 0; i < vector.length; i++) {
        avgOptimal[i] += vector[i];
      }
    }
    
    for (let i = 0; i < avgOptimal.length; i++) {
      avgOptimal[i] /= optimalVectors.length;
    }
    
    return {
      optimalConditions: {
        productivity: avgOptimal[this.dimensions.PRODUCTIVITY].toFixed(2),
        timeSpent: avgOptimal[this.dimensions.TIME_SPENT].toFixed(1),
        mood: avgOptimal[this.dimensions.MOOD_SCORE].toFixed(2),
        techCount: Math.round(avgOptimal[this.dimensions.TECH_COUNT]),
        optimalHour: Math.round(avgOptimal[this.dimensions.HOUR_OF_DAY]),
        bestDay: this.dayOfWeekName(Math.round(avgOptimal[this.dimensions.DAY_OF_WEEK])),
        streakMomentum: avgOptimal[this.dimensions.STREAK_MOMENTUM].toFixed(2)
      },
      confidence: Math.min(0.95, topIndices.length / 10), // Higher confidence with more data
      sampleSize: topIndices.length,
      recommendations: this.generateRecommendations(avgOptimal)
    };
  }

  generateRecommendations(optimalVector) {
    const recommendations = [];
    
    const optimalHour = optimalVector[this.dimensions.HOUR_OF_DAY];
    const optimalDay = Math.round(optimalVector[this.dimensions.DAY_OF_WEEK]);
    const optimalTechCount = optimalVector[this.dimensions.TECH_COUNT];
    
    if (optimalHour >= 9 && optimalHour <= 11) {
      recommendations.push('🌅 You tend to be most productive in the morning (9-11 AM)');
    } else if (optimalHour >= 14 && optimalHour <= 16) {
      recommendations.push('☀️ Your peak productivity hours are in the afternoon (2-4 PM)');
    } else if (optimalHour >= 19 && optimalHour <= 21) {
      recommendations.push('🌆 Evening coding sessions (7-9 PM) work best for you');
    }
    
    if (optimalDay >= 1 && optimalDay <= 5) {
      recommendations.push('📅 Weekdays tend to be your most productive coding days');
    } else {
      recommendations.push('🎮 Weekend coding sessions work well for your schedule');
    }
    
    if (optimalTechCount >= 3) {
      recommendations.push('🚀 You thrive when working with multiple technologies in a session');
    } else if (optimalTechCount <= 1) {
      recommendations.push('🎯 Focused, single-technology sessions optimize your productivity');
    }
    
    return recommendations;
  }

  /**
   * Generate comprehensive vector-based analytics report
   */
  async generateVectorReport(entries) {
    if (!entries || entries.length < 3) {
      return {
        status: 'insufficient_data',
        message: 'Need at least 3 days of data for vector analysis',
        dataPoints: entries ? entries.length : 0
      };
    }
    
    const vectorData = this.entriesToVectors(entries);
    const patterns = this.findCodingPatterns(vectorData);
    const correlations = this.calculateCorrelations(vectorData);
    const predictions = this.predictOptimalConditions(vectorData);
    
    return {
      status: 'success',
      generatedAt: moment().toISOString(),
      dataPoints: vectorData.matrix.rows,
      dimensions: vectorData.dimensions,
      analysis: {
        patterns: {
          clusters: patterns.insights,
          totalClusters: patterns.clusters.length
        },
        correlations: {
          significantRelationships: correlations,
          totalRelationships: correlations.length
        },
        predictions: predictions
      },
      performance: {
        processingOptimized: true,
        algorithmComplexity: 'O(n*k) for clustering, O(n²) for correlations',
        memoryEfficient: true
      }
    };
  }
}

module.exports = VectorAnalytics;
