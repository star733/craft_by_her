#!/bin/bash

echo ""
echo "========================================"
echo "   CRAFTED BY HER - SYSTEM STARTUP"
echo "========================================"
echo ""

echo "🔍 Checking system requirements..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js is installed ($(node --version))"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not available"
    exit 1
fi

echo "✅ npm is available ($(npm --version))"

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install server dependencies
echo "Installing server dependencies..."
cd server
if [ ! -d "node_modules" ]; then
    echo "Installing server packages..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install server dependencies"
        exit 1
    fi
else
    echo "✅ Server dependencies already installed"
fi

# Install client dependencies
echo "Installing client dependencies..."
cd ../client
if [ ! -d "node_modules" ]; then
    echo "Installing client packages..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install client dependencies"
        exit 1
    fi
else
    echo "✅ Client dependencies already installed"
fi

cd ..

echo ""
echo "✅ All dependencies installed successfully!"
echo ""

# Check environment configuration
echo "🔧 Checking environment configuration..."

if [ ! -f "server/.env" ]; then
    echo "⚠️  Environment file not found"
    echo "Creating sample .env file..."
    
    cat > server/.env << EOF
# CraftedByHer Environment Configuration
# Database
MONGO_URI=mongodb://localhost:27017/foodily-auth-app

# Email Configuration (Required for OTP emails)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SENDER_NAME=CraftedByHer

# Server Configuration
PORT=5000
NODE_ENV=development
EOF
    
    echo "✅ Sample .env file created"
    echo "⚠️  Please update server/.env with your actual email credentials"
else
    echo "✅ Environment file exists"
fi

echo ""
echo "🚀 Starting the system..."
echo ""

# Function to start server
start_server() {
    echo "Starting backend server..."
    cd server
    npm start &
    SERVER_PID=$!
    cd ..
    echo "✅ Server started (PID: $SERVER_PID)"
}

# Function to start client
start_client() {
    echo "Starting frontend client..."
    cd client
    npm run dev &
    CLIENT_PID=$!
    cd ..
    echo "✅ Client started (PID: $CLIENT_PID)"
}

# Start both services
start_server
sleep 3  # Wait for server to start
start_client

echo ""
echo "========================================"
echo "   SYSTEM STARTUP COMPLETE!"
echo "========================================"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:5000"
echo ""
echo "📊 Dashboard URLs:"
echo "   Admin:       http://localhost:5173/admin"
echo "   Hub Manager: http://localhost:5173/hub-manager/login"
echo "   Customer:    http://localhost:5173/login"
echo ""
echo "💡 Tips:"
echo "   - Check server/.env for email configuration"
echo "   - Both services are running in the background"
echo "   - Press Ctrl+C to stop this script"
echo ""
echo "🎉 CraftedByHer Product Movement Control System is now running!"
echo ""

# Run system verification
echo "🧪 Running system verification..."
node verify-system.js

echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for user to stop
trap 'echo ""; echo "🛑 Stopping services..."; kill $SERVER_PID $CLIENT_PID 2>/dev/null; echo "✅ Services stopped"; exit 0' INT

# Keep script running
while true; do
    sleep 1
done