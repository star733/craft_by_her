const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// Simple Express app just to serve the track.html if needed
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST']
	}
});

// Serve static files from this folder so track.html can be opened via http://localhost:3000/track.html
app.use(express.static(path.join(__dirname)));

// Simulation state
let isRunning = false;
let timer = null;
let updateCount = 0;
let intervalMs = 3000; // 3 seconds default between updates
let stepsTarget = 0;
let outForDeliveryEmitted = false;

// Initial coordinate (Kochi as example)
let current = {
	lat: 9.9312,
	lon: 76.2673
};

// Destination point for ETA calculation (default)
let DESTINATION = {
	lat: 9.9368,
	lon: 76.2745
};

function randomStep() {
	// Simulate small random movement in degrees (~5-20 meters)
	const dLat = (Math.random() - 0.5) * 0.0005;
	const dLon = (Math.random() - 0.5) * 0.0005;
	current.lat += dLat;
	current.lon += dLon;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371000; // Earth's radius in meters
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon/2) * Math.sin(dLon/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return R * c;
}

// Distance-based step controls
let totalDistanceM = 0;
let stepDistanceM = 0; // per tick
let speedMps = 0;      // derived from stepDistanceM and interval

function emitLocation() {
    const remainingM = calculateDistance(current.lat, current.lon, DESTINATION.lat, DESTINATION.lon);
    const etaSec = speedMps > 0 ? Math.max(0, Math.round(remainingM / speedMps)) : 0;

    const payload = {
        latitude: Number(current.lat.toFixed(6)),
        longitude: Number(current.lon.toFixed(6)),
        remainingMeters: Math.round(remainingM),
        etaMinutes: Math.max(0, Math.round(etaSec / 60)),
        timestamp: Date.now()
    };

    // Also provide legacy fields for older clients
    const legacy = {
        lat: payload.latitude,
        lon: payload.longitude,
        timestamp: payload.timestamp,
        count: updateCount
    };

    io.emit('location-D1', payload);
    io.emit('location-D1', legacy);
    console.log('[SIM]', new Date().toISOString(), `Tick ${updateCount} | remaining: ${Math.round(remainingM)} m | eta: ${payload.etaMinutes} min`);
}

function startSimulation(opts = {}) {
    if (isRunning) return;
    // Optional overrides
    if (opts.start && typeof opts.start.lat === 'number' && typeof opts.start.lon === 'number') {
        current = { lat: opts.start.lat, lon: opts.start.lon };
    }
    if (opts.dest && typeof opts.dest.lat === 'number' && typeof opts.dest.lon === 'number') {
        DESTINATION = { lat: opts.dest.lat, lon: opts.dest.lon };
    }
    intervalMs = Math.max(500, (opts.intervalSeconds ? opts.intervalSeconds * 1000 : intervalMs));
    const durationSeconds = Math.max(10, Number(opts.durationSeconds || 120)); // default 2 minutes

    // Compute total distance and step distance so that total duration ≈ durationSeconds
    totalDistanceM = calculateDistance(current.lat, current.lon, DESTINATION.lat, DESTINATION.lon);
    stepsTarget = Math.max(1, Math.round(durationSeconds / (intervalMs / 1000))); // e.g., 120/3s = 40 steps
    stepDistanceM = totalDistanceM / stepsTarget;
    speedMps = stepDistanceM / (intervalMs / 1000);

    console.log('[SIM] Start', {
        start: current,
        dest: DESTINATION,
        totalDistanceM: Math.round(totalDistanceM),
        intervalMs,
        stepDistanceM: Math.round(stepDistanceM),
        speedMps: Number(speedMps.toFixed(2))
    });

    isRunning = true;
    updateCount = 0;
    outForDeliveryEmitted = false;
    emitLocation();
    timer = setInterval(() => {
        if (!isRunning) return;
        updateCount += 1;

        const remainingBefore = calculateDistance(current.lat, current.lon, DESTINATION.lat, DESTINATION.lon);
        if (remainingBefore <= 50) {
            finishDelivered();
            return;
        }

        // Emit "out for delivery" at midpoint (~1 minute for 2-minute run)
        if (!outForDeliveryEmitted && updateCount >= Math.round(stepsTarget / 2)) {
            io.emit('orderStatus', { status: 'out_for_delivery', timestamp: Date.now() });
            outForDeliveryEmitted = true;
        }

        // Move along the straight line towards destination by fraction
        const fraction = Math.min(1, stepDistanceM / Math.max(remainingBefore, 1e-6));
        current.lat += (DESTINATION.lat - current.lat) * fraction;
        current.lon += (DESTINATION.lon - current.lon) * fraction;

        emitLocation();

        const remainingAfter = calculateDistance(current.lat, current.lon, DESTINATION.lat, DESTINATION.lon);
        if (remainingAfter <= 50) {
            finishDelivered();
        }
    }, intervalMs);
}

function finishDelivered() {
    // Snap to exact destination before emitting final update
    current = { lat: DESTINATION.lat, lon: DESTINATION.lon };
    updateCount += 1;
    
    // Emit final location update with exact destination coordinates
    const finalPayload = {
        latitude: Number(current.lat.toFixed(6)),
        longitude: Number(current.lon.toFixed(6)),
        remainingMeters: 0,
        etaMinutes: 0,
        timestamp: Date.now(),
        delivered: true
    };
    
    const finalLegacy = {
        lat: finalPayload.latitude,
        lon: finalPayload.longitude,
        timestamp: finalPayload.timestamp,
        count: updateCount,
        delivered: true
    };
    
    io.emit('location-D1', finalPayload);
    io.emit('location-D1', finalLegacy);

    stopSimulation();
    io.emit('orderDelivered', {
        delivered: true,
        timestamp: Date.now(),
        finalLocation: {
            latitude: current.lat,
            longitude: current.lon
        }
    });
    io.emit('orderStatus', { status: 'delivered', timestamp: Date.now() });
}

function stopSimulation() {
	isRunning = false;
	if (timer) clearInterval(timer);
	timer = null;
}

io.on('connection', (socket) => {
	console.log('Client connected:', socket.id);

	// Send current state immediately
	const remainingM = calculateDistance(current.lat, current.lon, DESTINATION.lat, DESTINATION.lon);
	const etaSec = speedMps > 0 ? Math.max(0, Math.round(remainingM / speedMps)) : 0;

	socket.emit('location-D1', {
		latitude: Number(current.lat.toFixed(6)),
		longitude: Number(current.lon.toFixed(6)),
		remainingMeters: Math.round(remainingM),
		etaMinutes: Math.max(0, Math.round(etaSec / 60)),
		timestamp: Date.now()
	});

	// Auto-start a ~1 minute simulation if not already running
	if (!isRunning) {
		startSimulation({});
		io.emit('simulation-state', { running: isRunning });
	}

	// Control events from clients
	socket.on('start-simulation', (opts) => {
		startSimulation(opts || {});
		io.emit('simulation-state', { running: isRunning });
	});

	socket.on('stop-simulation', () => {
		stopSimulation();
		io.emit('simulation-state', { running: isRunning });
	});

	socket.on('disconnect', () => {
		console.log('Client disconnected:', socket.id);
	});
});

const PORT = Number(process.env.RT_PORT || 3000);
server.listen(PORT, () => {
    console.log(`Realtime tracking server listening on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT}/track.html to view the buyer tracking page`);
});

// Simple REST endpoint to allow client apps to start simulation on pickup
app.post('/start', (req, res) => {
    if (!isRunning) {
        startSimulation({});
    }
    res.json({ running: isRunning });
});


