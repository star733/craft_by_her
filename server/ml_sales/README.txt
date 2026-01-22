================================================================================
                    SALES PREDICTION ML SYSTEM
================================================================================

WHAT IT DOES:
-------------
Uses Linear Regression (Machine Learning) to predict future monthly sales
based on your historical order data.

SAFETY:
-------
✅ ONLY READS from MongoDB - never modifies or deletes data
✅ Your products, orders, and all data are 100% safe
✅ All existing functionality remains intact

FILES:
------
1. train_sales_model.py  - Trains the ML model from your order data
2. predict_sales.py      - Makes predictions using the trained model
3. requirements.txt      - Python dependencies list
4. setup.bat/setup.sh    - Installation scripts

================================================================================
                        QUICK START GUIDE
================================================================================

STEP 1: Install Python Dependencies
------------------------------------
Windows:
  setup.bat

Linux/Mac:
  chmod +x setup.sh
  ./setup.sh

Or manually:
  pip install pandas numpy scikit-learn pymongo joblib


STEP 2: Train the Model
------------------------
Make sure:
- MongoDB is running
- You have at least 3-4 delivered orders in your database

Then run:
  python train_sales_model.py

This will:
✅ Connect to MongoDB (READ-ONLY)
✅ Fetch your historical sales data
✅ Train a Linear Regression model
✅ Save the model as "sales_model.pkl"


STEP 3: Test Predictions
-------------------------
After training, test the prediction:

  python predict_sales.py 13

This predicts sales for month 13 (January 2025 if base is 2024)

Output example:
  {
    "success": true,
    "month_name": "January 2025",
    "predicted_sales": 45250.75,
    "predicted_sales_formatted": "₹45,250.75"
  }


STEP 4: Use in Your App
------------------------
The Node.js API endpoints are already set up:

1. Train model:
   POST http://localhost:5000/api/sales-prediction/train

2. Get historical data:
   GET http://localhost:5000/api/sales-prediction/monthly-data

3. Predict specific month:
   GET http://localhost:5000/api/sales-prediction/predict/13

4. Predict next N months:
   GET http://localhost:5000/api/sales-prediction/predict-next-months/3

================================================================================
                        API ENDPOINTS
================================================================================

1. GET /api/sales-prediction/monthly-data
   Returns: Historical monthly sales data from your database
   
2. POST /api/sales-prediction/train
   Action: Trains the ML model
   Note: Takes 5-30 seconds depending on data size
   
3. GET /api/sales-prediction/predict/:month
   Example: /api/sales-prediction/predict/15
   Returns: Predicted sales for month 15
   
4. GET /api/sales-prediction/predict-next-months/:count
   Example: /api/sales-prediction/predict-next-months/6
   Returns: Predictions for next 6 months

================================================================================
                        DISPLAY IN ADMIN DASHBOARD
================================================================================

Example React component code:

import { useState, useEffect } from 'react';

function SalesPrediction() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'http://localhost:5000/api/sales-prediction/predict-next-months/3'
      );
      const data = await response.json();
      if (data.success) {
        setPredictions(data.predictions);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const trainModel = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'http://localhost:5000/api/sales-prediction/train',
        { method: 'POST' }
      );
      const data = await response.json();
      alert(data.success ? 'Model trained!' : 'Training failed');
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>📊 Sales Predictions</h2>
      
      <button onClick={trainModel} disabled={loading}>
        Train Model
      </button>
      
      <button onClick={loadPredictions} disabled={loading}>
        Load Predictions
      </button>
      
      {predictions.map(pred => (
        <div key={pred.month_number}>
          <h3>{pred.month_name}</h3>
          <p>Predicted Sales: {pred.predicted_sales_formatted}</p>
        </div>
      ))}
    </div>
  );
}

================================================================================
                        TROUBLESHOOTING
================================================================================

Problem: "Python not found"
Solution: Install Python 3.8+ and add to PATH

Problem: "Module not found"
Solution: Run setup.bat (Windows) or setup.sh (Linux/Mac)

Problem: "No sales data"
Solution: Ensure you have delivered orders in MongoDB

Problem: "Model file not found"
Solution: Run train_sales_model.py first to create the model

================================================================================
                        HOW IT WORKS
================================================================================

1. LINEAR REGRESSION:
   - Simple ML algorithm that finds trends in data
   - Draws a "line of best fit" through your sales history
   - Predicts future values by extending that line

2. TRAINING:
   - Reads your historical order data
   - Groups sales by month
   - Learns the sales pattern
   - Creates a mathematical model

3. PREDICTION:
   - Uses the trained model
   - Takes a month number as input
   - Returns predicted sales amount

4. ACCURACY:
   - Improves with more historical data
   - R² score shows accuracy (0-1, higher is better)
   - Works best with consistent sales patterns

================================================================================

For questions or issues, check the code comments or console output.
All operations are safe and read-only!

================================================================================





