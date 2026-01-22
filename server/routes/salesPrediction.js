const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");
const Order = require("../models/Order");

/**
 * SALES PREDICTION API
 * =====================
 * This route provides ML-based sales predictions using Linear Regression.
 * 
 * SAFETY: All operations are READ-ONLY - no data is modified or deleted.
 */

/**
 * Helper function to execute Python script
 * @param {string} scriptName - Name of the Python script
 * @param {Array} args - Arguments to pass to the script
 * @returns {Promise} - Resolves with script output
 */
function runPythonScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    // Path to Python script
    const scriptPath = path.join(__dirname, '..', 'ml_sales', scriptName);
    
    // Spawn Python process
    const pythonProcess = spawn('python', [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    // Collect stdout
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Collect stderr
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || 'Python script failed'));
      } else {
        try {
          // Parse JSON output from Python
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error('Failed to parse Python output'));
        }
      }
    });
    
    // Handle errors
    pythonProcess.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * GET /api/sales-prediction/monthly-data
 * =======================================
 * Fetch historical monthly sales data from MongoDB
 * 
 * SAFETY: READ-ONLY operation - aggregates existing order data
 */
router.get("/monthly-data", async (req, res) => {
  try {
    // Aggregate sales by month
    // This is a READ-ONLY aggregation query - no data is modified
    const monthlySales = await Order.aggregate([
      {
        // Filter: Only delivered orders
        $match: {
          orderStatus: 'delivered',
          createdAt: { $exists: true }
        }
      },
      {
        // Group by year and month
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      {
        // Sort by year and month
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format the response
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
 * POST /api/sales-prediction/train
 * =================================
 * Train the Linear Regression model
 * 
 * SAFETY: Calls Python script that ONLY READS from MongoDB
 */
router.post("/train", async (req, res) => {
  try {
    console.log("🤖 Starting model training...");
    
    // Check if we have enough data
    const orderCount = await Order.countDocuments({ orderStatus: 'delivered' });
    
    if (orderCount < 3) {
      return res.status(400).json({
        success: false,
        error: "Not enough data to train model",
        message: "Please ensure you have at least 3 delivered orders in the database"
      });
    }

    // Run Python training script
    // This script ONLY READS from MongoDB - it never modifies data
    const trainingProcess = spawn('python', [
      path.join(__dirname, '..', 'ml_sales', 'train_sales_model.py')
    ]);

    let stdout = '';
    let stderr = '';

    trainingProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(output);
    });

    trainingProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    trainingProcess.on('close', (code) => {
      if (code === 0) {
        return res.json({
          success: true,
          message: "Model trained successfully",
          output: stdout
        });
      } else {
        return res.status(500).json({
          success: false,
          error: "Training failed",
          details: stderr
        });
      }
    });

    trainingProcess.on('error', (error) => {
      return res.status(500).json({
        success: false,
        error: "Failed to start training process",
        details: error.message
      });
    });

  } catch (error) {
    console.error("Error training model:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to train model"
    });
  }
});

/**
 * GET /api/sales-prediction/predict/:month
 * =========================================
 * Predict sales for a specific month
 * 
 * SAFETY: Only loads pre-trained model - no database operations
 * 
 * Example: GET /api/sales-prediction/predict/13
 * Returns: { predicted_sales: 45000.50, month_name: "January 2025" }
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

    console.log(`🔮 Predicting sales for month ${monthNumber}...`);

    // Run Python prediction script
    // This script ONLY READS the saved model - no database access
    const result = await runPythonScript('predict_sales.py', [monthNumber.toString()]);

    if (result.success) {
      console.log(`✅ Prediction: ₹${result.predicted_sales}`);
      
      return res.json({
        success: true,
        prediction: {
          month_number: result.month_number,
          month_name: result.month_name,
          year: result.year,
          month: result.month,
          predicted_sales: result.predicted_sales,
          predicted_sales_formatted: result.predicted_sales_formatted
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
        message: result.message || "Prediction failed"
      });
    }

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
 * GET /api/sales-prediction/predict-next-months/:count
 * =====================================================
 * Predict sales for the next N months
 * 
 * Example: GET /api/sales-prediction/predict-next-months/3
 * Returns predictions for next 3 months
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

    // Get the latest month number from database
    const latestOrder = await Order.findOne({ orderStatus: 'delivered' })
      .sort({ createdAt: -1 });

    if (!latestOrder) {
      return res.status(400).json({
        success: false,
        error: "No order data available"
      });
    }

    const latestDate = new Date(latestOrder.createdAt);
    const currentYear = latestDate.getFullYear();
    const currentMonth = latestDate.getMonth() + 1;
    
    // Calculate current month number (assuming base year 2024)
    const currentMonthNumber = (currentYear - 2024) * 12 + currentMonth;

    // Predict for next N months
    const predictions = [];
    
    for (let i = 1; i <= count; i++) {
      const monthNumber = currentMonthNumber + i;
      
      try {
        const result = await runPythonScript('predict_sales.py', [monthNumber.toString()]);
        
        if (result.success) {
          predictions.push({
            month_number: result.month_number,
            month_name: result.month_name,
            year: result.year,
            month: result.month,
            predicted_sales: result.predicted_sales,
            predicted_sales_formatted: result.predicted_sales_formatted
          });
        }
      } catch (error) {
        console.error(`Error predicting month ${monthNumber}:`, error);
      }
    }

    return res.json({
      success: true,
      predictions: predictions,
      count: predictions.length
    });

  } catch (error) {
    console.error("Error predicting multiple months:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to make predictions"
    });
  }
});

module.exports = router;





