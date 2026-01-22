#!/bin/bash
# ============================================
#   Foodily App - Start All Services
# ============================================

echo ""
echo "============================================"
echo "  Starting Foodily E-Commerce Platform"
echo "============================================"
echo ""

# Check if all required software is installed
echo "[1/3] Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  [ERROR] Node.js is not installed!"
    echo "  Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo "  [OK] Node.js installed ($(node --version))"

# Check Python
SKIP_ML=0
if ! command -v python3 &> /dev/null; then
    echo "  [WARNING] Python not found - ML recommendations will use basic mode"
    echo "  To enable AI recommendations, install Python from https://www.python.org/"
    SKIP_ML=1
else
    echo "  [OK] Python installed ($(python3 --version))"
fi

# Check MongoDB
echo "  [INFO] Make sure MongoDB is running on localhost:27017"
echo ""

echo "[2/3] Starting services..."
echo ""

# Function to open new terminal based on OS
open_terminal() {
    local title=$1
    local command=$2
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e "tell app \"Terminal\" to do script \"cd $(pwd) && $command\""
    elif command -v gnome-terminal &> /dev/null; then
        # Linux with GNOME
        gnome-terminal --title="$title" -- bash -c "$command; exec bash"
    elif command -v xterm &> /dev/null; then
        # Fallback to xterm
        xterm -T "$title" -e "$command; bash" &
    else
        echo "  [WARNING] Could not open new terminal. Run manually: $command"
    fi
}

# Start ML Service (if Python available)
if [ $SKIP_ML -eq 0 ]; then
    echo "  Starting ML Recommendation Service (Port 5001)..."
    open_terminal "ML Service" "cd server && ./start-ml-service.sh"
    sleep 2
else
    echo "  [SKIP] ML Service (Python not available - using basic recommendations)"
fi

# Start Node.js Backend
echo "  Starting Node.js Backend (Port 5000)..."
open_terminal "Backend Server" "cd server && npm start"
sleep 2

# Start React Frontend
echo "  Starting React Frontend (Port 3000)..."
open_terminal "Frontend Client" "cd client && npm start"

echo ""
echo "[3/3] All services starting..."
echo ""
echo "============================================"
echo "  Services Started Successfully!"
echo "============================================"
echo ""
echo "  - Frontend:  http://localhost:3000"
echo "  - Backend:   http://localhost:5000"
if [ $SKIP_ML -eq 0 ]; then
    echo "  - ML Service: http://localhost:5001"
    echo "  - Health:     http://localhost:5001/health"
fi
echo ""
echo "  Check the opened terminal windows for logs"
echo "  Press Ctrl+C in each window to stop services"
echo ""
echo "============================================"
echo ""



