const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

/**
 * SIMPLE SALES PREDICTION (No Python Required!)
 * ==============================================
 * Uses JavaScript-based Linear Regression
 * Works without Python installation
 * 
 * SAFETY: READ-ONLY operations only
 */

/**
 * Simple Linear Regression Implementation
 * Calculates trend line from historical data
 */
class SimpleLinearRegression {
  constructor() {
    this.slope = 0;
    this.intercept = 0;
    this.trained = false;
  }

  /**
   * Train the model with X (month numbers) and Y (sales amounts)
   */
  train(X, Y) {
    if (X.length === 0 || Y.length === 0 || X.length !== Y.length) {
      throw new Error('Invalid training data');
    }

    const n = X.length;
    
    // Calculate means
    const meanX = X.reduce((a, b) => a + b, 0) / n;
    const meanY = Y.reduce((a, b) => a + b, 0) / n;
    
    // Calculate slope (m) and intercept (b) for y = mx + b
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (X[i] - meanX) * (Y[i] - meanY);
      denominator += (X[i] - meanX) ** 2;
    }
    
    this.slope = denominator === 0 ? 0 : numerator / denominator;
    this.intercept = meanY - (this.slope * meanX);
    this.trained = true;
    
    return {
      slope: this.slope,
      intercept: this.intercept,
      accuracy: this.calculateR2(X, Y)
    };
  }

  /**
   * Predict sales for a given month number
   */
  predict(monthNumber) {
    if (!this.trained) {
      throw new Error('Model not trained yet');
    }
    
    const prediction = (this.slope * monthNumber) + this.intercept;
    return Math.max(0, prediction); // Never predict negative sales
  }

  /**
   * Calculate R² (coefficient of determination) for accuracy
   */
  calculateR2(X, Y) {
    if (!this.trained) return 0;
    
    const meanY = Y.reduce((a, b) => a + b, 0) / Y.length;
    
    let totalSumSquares = 0;
    let residualSumSquares = 0;
    
    for (let i = 0; i < X.length; i++) {
      const predicted = this.predict(X[i]);
      totalSumSquares += (Y[i] - meanY) ** 2;
      residualSumSquares += (Y[i] - predicted) ** 2;
    }
    
    const r2 = 1 - (residualSumSquares / totalSumSquares);
    return Math.max(0, Math.min(1, r2)); // Clamp between 0 and 1
  }
}

// Global model instance (stored in memory)
let globalModel = new SimpleLinearRegression();
let lastTrainingData = null;

/**
 * Helper: Get month name from number
 */
function getMonthName(monthNumber, baseYear = 2024) {
  const yearsOffset = Math.floor((monthNumber - 1) / 12);
  const monthInYear = ((monthNumber - 1) % 12) + 1;
  const year = baseYear + yearsOffset;
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return {
    name: `${monthNames[monthInYear - 1]} ${year}`,
    year,
    month: monthInYear
  };
}

/**
 * GET /api/sales-prediction-simple/monthly-data
 * Fetch historical monthly sales data
 */
router.get("/monthly-data", async (req, res) => {
  try {
    // Delivery commission per order
    const DELIVERY_COMMISSION = 50;
    
    const monthlySales = await Order.aggregate([
      {
        $match: {
          orderStatus: { $in: ['delivered', 'confirmed', 'processing', 'pending'] }, // All valid orders
          createdAt: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          grossRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          deliveredCount: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          // Net revenue = Gross revenue - (Delivery commission × Delivered orders)
          totalSales: {
            $subtract: [
              '$grossRevenue',
              { $multiply: ['$deliveredCount', DELIVERY_COMMISSION] }
            ]
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const formattedData = monthlySales.map((record, index) => ({
      month_number: index + 1,
      year: record._id.year,
      month: record._id.month,
      total_sales: record.totalSales,
      order_count: record.orderCount
    }));

    return res.json({
      success: true,
      data: formattedData,
      total_months: formattedData.length
    });

  } catch (error) {
    console.error("Error fetching monthly sales data:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch monthly sales data"
    });
  }
});

/**
 * POST /api/sales-prediction-simple/train
 * Train the JavaScript-based model
 */
router.post("/train", async (req, res) => {
  try {
    console.log("🤖 Training JavaScript-based ML model...");
    
    // Delivery commission per order
    const DELIVERY_COMMISSION = 50;
    
    // Fetch sales data with NET revenue calculation
    const monthlySales = await Order.aggregate([
      {
        $match: {
          orderStatus: { $in: ['delivered', 'confirmed', 'processing', 'pending'] },
          createdAt: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          grossRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          deliveredCount: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          // Net revenue = Gross revenue - (Delivery commission × Delivered orders)
          totalSales: {
            $subtract: [
              '$grossRevenue',
              { $multiply: ['$deliveredCount', DELIVERY_COMMISSION] }
            ]
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    if (monthlySales.length < 1) {
      return res.status(400).json({
        success: false,
        error: "Not enough data to train model",
        message: "Please ensure you have at least one delivered order in the database"
      });
    }

    // Prepare training data
    const X = monthlySales.map((_, index) => index + 1); // Month numbers
    const Y = monthlySales.map(record => record.totalSales); // Sales amounts

    // Train the model
    const model = new SimpleLinearRegression();
    const trainingResult = model.train(X, Y);

    // Store globally
    globalModel = model;
    lastTrainingData = { X, Y, timestamp: new Date() };

    console.log("✅ Model trained successfully!");
    console.log(`   Slope: ${trainingResult.slope.toFixed(2)}`);
    console.log(`   Intercept: ${trainingResult.intercept.toFixed(2)}`);
    console.log(`   Accuracy (R²): ${(trainingResult.accuracy * 100).toFixed(2)}%`);

    return res.json({
      success: true,
      message: "Model trained successfully",
      stats: {
        dataPoints: monthlySales.length,
        slope: trainingResult.slope,
        intercept: trainingResult.intercept,
        accuracy: trainingResult.accuracy,
        accuracyPercent: `${(trainingResult.accuracy * 100).toFixed(2)}%`
      }
    });

  } catch (error) {
    console.error("Error training model:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to train model",
      details: error.message
    });
  }
});

/**
 * GET /api/sales-prediction-simple/predict/:month
 * Predict sales for a specific month
 */
router.get("/predict/:month", async (req, res) => {
  try {
    const monthNumber = parseInt(req.params.month);

    if (isNaN(monthNumber) || monthNumber <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid month number"
      });
    }

    if (!globalModel.trained) {
      return res.status(400).json({
        success: false,
        error: "Model not trained yet",
        message: "Please train the model first by clicking 'Initialize ML Model'"
      });
    }

    // Make prediction
    const predictedSales = globalModel.predict(monthNumber);
    const monthInfo = getMonthName(monthNumber);

    console.log(`🔮 Prediction for month ${monthNumber}: ₹${predictedSales.toFixed(2)}`);

    return res.json({
      success: true,
      prediction: {
        month_number: monthNumber,
        month_name: monthInfo.name,
        year: monthInfo.year,
        month: monthInfo.month,
        predicted_sales: Math.round(predictedSales * 100) / 100,
        predicted_sales_formatted: `₹${predictedSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
      }
    });

  } catch (error) {
    console.error("Error making prediction:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to make prediction",
      details: error.message
    });
  }
});

/**
 * GET /api/sales-prediction-simple/predict-next-months/:count
 * Predict sales for next N months
 */
router.get("/predict-next-months/:count", async (req, res) => {
  try {
    const count = parseInt(req.params.count);

    if (isNaN(count) || count <= 0 || count > 12) {
      return res.status(400).json({
        success: false,
        error: "Count must be between 1 and 12"
      });
    }

    if (!globalModel.trained) {
      return res.status(400).json({
        success: false,
        error: "Model not trained yet",
        message: "Please train the model first"
      });
    }

    // Get the latest month number from training data
    const currentMonthNumber = lastTrainingData ? lastTrainingData.X.length : 0;

    if (currentMonthNumber === 0) {
      return res.status(400).json({
        success: false,
        error: "No training data available"
      });
    }

    // Predict for next N months
    const predictions = [];
    
    for (let i = 1; i <= count; i++) {
      const monthNumber = currentMonthNumber + i;
      const predictedSales = globalModel.predict(monthNumber);
      const monthInfo = getMonthName(monthNumber);
      
      predictions.push({
        month_number: monthNumber,
        month_name: monthInfo.name,
        year: monthInfo.year,
        month: monthInfo.month,
        predicted_sales: Math.round(predictedSales * 100) / 100,
        predicted_sales_formatted: `₹${predictedSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
      });
    }

    console.log(`✅ Generated ${predictions.length} predictions`);

    return res.json({
      success: true,
      predictions: predictions,
      count: predictions.length
    });

  } catch (error) {
    console.error("Error predicting multiple months:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to make predictions",
      details: error.message
    });
  }
});

/**
 * GET /api/sales-prediction-simple/status
 * Check if model is trained
 */
router.get("/status", (req, res) => {
  return res.json({
    success: true,
    trained: globalModel.trained,
    lastTrainingDate: lastTrainingData ? lastTrainingData.timestamp : null,
    dataPoints: lastTrainingData ? lastTrainingData.X.length : 0
  });
});

module.exports = router;

