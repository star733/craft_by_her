import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { useConfirm } from "../context/ConfirmContext";
import { toast } from "react-toastify";

export default function TrackOrder() {
	const { orderId } = useParams();
	const navigate = useNavigate();
	const { confirm } = useConfirm();
	const [order, setOrder] = useState(null);
	const [live, setLive] = useState({ connected: false, updates: 0, distanceM: 0, coords: null, delivered: false, outForDelivery: false, etaText: "--", remainingM: 0, simulationRunning: false });
	const [error, setError] = useState(null);
	const [trackingStarted, setTrackingStarted] = useState(false);
	const socketRef = useRef(null);
	const localSimRef = useRef({ timer: null, running: false });
	// Realtime server URL with auto-fallback; start with 3001 and fallback to 3000 if unreachable
	const rtUrlRef = useRef((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_RT_URL) || 'http://localhost:3001');
	const START_DEFAULT = { lat: 9.5341, lon: 76.7852 }; // Delivery boy hub (Kanjirappally)

	// Leaflet instances for reuse across handlers (socket/local sim)
	const mapRef = useRef(null);
	const markerRef = useRef(null);
	const polylineRef = useRef(null);
	const coordsRef = useRef([]);

	const pingRealtimeServer = async () => {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 2500);
			// Try current URL first
			await fetch(`${rtUrlRef.current}/track.html`, { method: 'GET', mode: 'no-cors', signal: controller.signal });
			clearTimeout(timeout);
			return true; // no-cors won't give status, treat reachability as true if no network error
		} catch (e) {
			// Try fallback to port 3000
			try {
				const controller2 = new AbortController();
				const timeout2 = setTimeout(() => controller2.abort(), 2500);
				await fetch(`http://localhost:3000/track.html`, { method: 'GET', mode: 'no-cors', signal: controller2.signal });
				clearTimeout(timeout2);
				rtUrlRef.current = 'http://localhost:3000';
				return true;
			} catch {
				return false;
			}
		}
	};

	const persistDeliveredToServer = async () => {
		try {
			if (!auth.currentUser || !orderId) return;
			const token = await auth.currentUser.getIdToken();
			await fetch(`http://localhost:5000/api/orders/${orderId}/delivered`, {
				method: 'PATCH',
				headers: { Authorization: `Bearer ${token}` }
			});
		} catch (e) {
			console.warn('Failed to persist delivered to server (will rely on UI/localStorage):', e?.message || e);
		}
	};
	
	// Only restore delivered status if order is actually delivered on server
	useEffect(() => {
		const checkDeliveredStatus = async () => {
			try {
				// First, always clear any old localStorage data for this order
				localStorage.removeItem(`delivery-status-${orderId}`);
				
				// Reset live state to default
				setLive(prev => ({ ...prev, delivered: false, simulationRunning: false }));
				
				// Then fetch the actual order status from server
				if (!auth.currentUser || !orderId) return;
				
				const token = await auth.currentUser.getIdToken();
				const response = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				
				if (response.ok) {
					const orderData = await response.json();
					console.log('[TrackOrder] Server order status:', orderData.orderStatus);
					
					// Only set delivered status if server confirms it
					if (orderData.orderStatus === "delivered") {
						console.log('[TrackOrder] Order is delivered, updating UI');
						setLive(prev => ({ ...prev, delivered: true, simulationRunning: false }));
						localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
					} else {
						console.log('[TrackOrder] Order is NOT delivered, current status:', orderData.orderStatus);
						// Ensure delivered is false
						setLive(prev => ({ ...prev, delivered: false, simulationRunning: false }));
					}
				}
			} catch (err) {
				console.log('Error checking delivery status:', err.message);
				// On error, clear everything to be safe
				localStorage.removeItem(`delivery-status-${orderId}`);
				setLive(prev => ({ ...prev, delivered: false, simulationRunning: false }));
			}
		};
		
		checkDeliveredStatus();
	}, [orderId]);

	// Simple geocoding for common Indian cities (no API needed - uses predefined coordinates)
	const geocodeAddress = (address) => {
		try {
			const city = address?.city?.toLowerCase() || '';
			const state = address?.state?.toLowerCase() || '';
			
			// Common Indian city coordinates (no API required)
			const cityCoords = {
				'mumbai': { lat: 19.0760, lon: 72.8777 },
				'delhi': { lat: 28.7041, lon: 77.1025 },
				'bangalore': { lat: 12.9716, lon: 77.5946 },
				'chennai': { lat: 13.0827, lon: 80.2707 },
				'hyderabad': { lat: 17.3850, lon: 78.4867 },
				'pune': { lat: 18.5204, lon: 73.8567 },
				'kolkata': { lat: 22.5726, lon: 88.3639 },
				'ahmedabad': { lat: 23.0225, lon: 72.5714 },
				'kochi': { lat: 9.9312, lon: 76.2673 },
				'cochin': { lat: 9.9312, lon: 76.2673 },
				'thiruvananthapuram': { lat: 8.5241, lon: 76.9366 },
				'kozhikode': { lat: 11.2588, lon: 75.7804 },
				'thrissur': { lat: 10.5276, lon: 76.2144 },
				'kannur': { lat: 11.8745, lon: 75.3704 },
				'kollam': { lat: 8.8932, lon: 76.6141 },
				'alappuzha': { lat: 9.4981, lon: 76.3388 },
				'palakkad': { lat: 10.7867, lon: 76.6548 },
				'pala': { lat: 9.7129, lon: 76.6833 }, // Pala, Kottayam district
				'malappuram': { lat: 11.0509, lon: 76.0711 },
				'ernakulam': { lat: 9.9816, lon: 76.2999 },
				'kottayam': { lat: 9.5900, lon: 76.5222 },
				'pathanamthitta': { lat: 9.2647, lon: 76.7870 },
				'idukki': { lat: 9.8497, lon: 76.9686 },
				'wayanad': { lat: 11.6850, lon: 76.1319 },
				'kasargod': { lat: 12.5000, lon: 75.0000 },
				// Add more cities as needed
				'goa': { lat: 15.2993, lon: 74.1240 },
				'jaipur': { lat: 26.9124, lon: 75.7873 },
				'lucknow': { lat: 26.8467, lon: 80.9462 },
				'kanpur': { lat: 26.4499, lon: 80.3319 },
				'nagpur': { lat: 21.1458, lon: 79.0882 },
				'indore': { lat: 22.7196, lon: 75.8577 },
				'bhopal': { lat: 23.2599, lon: 77.4126 },
				'visakhapatnam': { lat: 17.6868, lon: 83.2185 },
				'vijayawada': { lat: 16.5062, lon: 80.6480 },
				'coimbatore': { lat: 11.0168, lon: 76.9558 },
				'madurai': { lat: 9.9252, lon: 78.1198 },
				'tiruchirappalli': { lat: 10.7905, lon: 78.7047 },
				'salem': { lat: 11.6643, lon: 78.1460 },
				'tirunelveli': { lat: 8.7139, lon: 77.7567 },
				'rajkot': { lat: 22.3039, lon: 70.8022 },
				'surat': { lat: 21.1702, lon: 72.8311 },
				'vadodara': { lat: 22.3072, lon: 73.1812 },
				'patna': { lat: 25.5941, lon: 85.1376 },
				'ranchi': { lat: 23.3441, lon: 85.3096 },
				'jamshedpur': { lat: 22.8046, lon: 86.2029 },
				'bhubaneswar': { lat: 20.2961, lon: 85.8245 },
				'cuttack': { lat: 20.4625, lon: 85.8820 },
				'guwahati': { lat: 26.1445, lon: 91.7362 },
				'shillong': { lat: 25.5788, lon: 91.8933 },
				'imphal': { lat: 24.8170, lon: 93.9368 },
				'agartala': { lat: 23.8315, lon: 91.2862 },
				'kohima': { lat: 25.6751, lon: 94.1106 },
				'itanagar': { lat: 28.2180, lon: 94.7278 },
				'gangtok': { lat: 27.3314, lon: 88.6138 },
				'chandigarh': { lat: 30.7333, lon: 76.7794 },
				'shimla': { lat: 31.1048, lon: 77.1734 },
				'dehradun': { lat: 30.3165, lon: 78.0322 },
				'jammu': { lat: 32.7266, lon: 74.8570 },
				'srinagar': { lat: 34.0837, lon: 74.7973 },
				'leh': { lat: 34.1526, lon: 77.5771 }
			};
			
			// Try to find city coordinates - prioritize exact matches
			// First try exact match
			if (cityCoords[city]) {
				console.log(`Exact match found for ${city}: ${cityCoords[city].lat}, ${cityCoords[city].lon}`);
				return cityCoords[city];
			}
			
			// Then try partial matches
			for (const [cityName, coords] of Object.entries(cityCoords)) {
				if (city.includes(cityName) || cityName.includes(city)) {
					console.log(`Partial match found for ${city} -> ${cityName}: ${coords.lat}, ${coords.lon}`);
					return coords;
				}
			}
			
			// Default to Kochi if not found
			console.log(`City "${city}" not found in database, using Kochi coordinates`);
			return { lat: 9.9312, lon: 76.2673 };
		} catch (err) {
			console.error('Error in geocoding:', err);
			return { lat: 9.9312, lon: 76.2673 };
		}
	};

	// Fetch order data to get real delivery address
	useEffect(() => {
		const fetchOrder = async () => {
			try {
				// Try to fetch real order data if user is authenticated
				if (auth.currentUser) {
					try {
						const token = await auth.currentUser.getIdToken();
						const response = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
							headers: { Authorization: `Bearer ${token}` }
						});
						
						if (response.ok) {
							const orderData = await response.json();
							setOrder(orderData);
							return;
						}
					} catch (error) {
						console.error("Error fetching order:", error);
						// If order not found, show a helpful message
						if (error.message?.includes('404') || error.message?.includes('not found')) {
							setError(`Order ${orderId} not found. Please check your order ID or contact support.`);
						}
					}
				}
				
				// Fallback: Use demo data to keep functionality working
				console.log("Using demo data for order tracking");
				setOrder({
					_id: orderId,
					orderStatus: "in_transit", // Set demo order as in_transit for testing
					buyerDetails: {
						name: "Demo Customer",
						phone: "9876543210",
						address: {
							street: "Demo Street",
							city: "Kochi",
							state: "Kerala",
							pincode: "682001",
							landmark: "Near Demo Landmark"
						}
					},
					deliveryInfo: {
						agentId: "DA0001", // Demo delivery agent
						customerLocation: {
							latitude: 9.9368,
							longitude: 76.2745
						}
					}
				});
			} catch (err) {
				console.error("Error in fetchOrder:", err);
				setError("Failed to load order data");
			}
		};
		
		fetchOrder();
	}, [orderId]);

	// Poll order status periodically so UI reflects transitions like picked_up → in_transit
	useEffect(() => {
		let timer;
		const poll = async () => {
			try {
				if (!orderId) return;
				if (!auth.currentUser) return; // only poll real orders when logged in
				
				// Check localStorage first - if delivered, don't poll
				const savedStatus = localStorage.getItem(`delivery-status-${orderId}`);
				if (savedStatus) {
					const parsed = JSON.parse(savedStatus);
					if (parsed.delivered) {
						console.log('[TrackOrder] Order already delivered according to localStorage, skipping poll');
						return;
					}
				}
				
				const token = await auth.currentUser.getIdToken();
				const response = await fetch(`http://localhost:5000/api/orders/${orderId}` , { headers: { Authorization: `Bearer ${token}` } });
				if (response.ok) {
					const fresh = await response.json();
					setOrder(prev => {
						if (!prev || prev.orderStatus !== fresh.orderStatus) {
							console.log('[TrackOrder] Order status updated from server:', fresh.orderStatus);
							return fresh;
						}
						return prev;
					});
				}
			} catch {}
			finally {
				timer = setTimeout(poll, 5000);
			}
		};
		// Only poll while not delivered
		if (order?.orderStatus !== 'delivered' && order?.orderStatus !== 'confirmed') {
			poll();
		}
		return () => { if (timer) clearTimeout(timer); };
	}, [orderId, order?.orderStatus]);

	const loadScript = (src) => new Promise((resolve, reject) => {
		if (document.querySelector(`script[src="${src}"]`)) return resolve();
		const s = document.createElement("script"); s.src = src; s.async = true; s.onload = resolve; s.onerror = reject; document.body.appendChild(s);
	});
	const loadCss = (href) => new Promise((resolve, reject) => {
		if (document.querySelector(`link[href="${href}"]`)) return resolve();
		const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; l.onload = resolve; l.onerror = reject; document.head.appendChild(l);
	});

	useEffect(() => {
		let socket; let map; let marker; let polyline; let coords = [];
		
		try {
			const haversine = (lat1, lon1, lat2, lon2) => {
				const toRad = (v) => (v * Math.PI) / 180; const R = 6371000; const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1);
				const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2; return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
			};
			
			// Get destination from order data or use default
			const getDestination = () => {
				if (order?.deliveryInfo?.customerLocation?.latitude && order?.deliveryInfo?.customerLocation?.longitude) {
					return { 
						lat: order.deliveryInfo.customerLocation.latitude, 
						lon: order.deliveryInfo.customerLocation.longitude 
					};
				}
				// Fallback: geocode the address
				if (order?.buyerDetails?.address) {
					return geocodeAddress(order.buyerDetails.address);
				}
				// Final fallback: default Kochi location
				return { lat: 9.9368, lon: 76.2745 };
			};
			
			const DEST = getDestination();
			const SPEED_KMH = 25; // average speed for ETA
			const formatEta = (seconds) => {
				if (!isFinite(seconds) || seconds <= 0) return "~1 min";
				const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60);
				if (m >= 60) { const h = Math.floor(m / 60); const rm = m % 60; return `${h}h ${rm}m`; }
				return `${m}m ${s}s`;
			};
			
			const setup = async () => {
				if (!order) return; // Wait for order data
				
				try {
					await loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
					await loadScript("https://cdn.socket.io/4.7.4/socket.io.min.js");
					await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
					const hasLeaflet = Boolean(window.L);
					
						// Ensure map container exists before initializing and avoid double init
						const mapContainer = document.getElementById("track-map");
						if (!mapContainer) {
							throw new Error("Map container not found.");
						}
						if (mapRef.current && mapRef.current._leaflet_id) {
							// Already initialized; skip re-init
							return;
						}
					
					// Center map on destination
					// eslint-disable-next-line no-undef
					if (hasLeaflet) {
						map = window.L.map("track-map").setView([DEST.lat, DEST.lon], 14);
						mapRef.current = map;
					}
					// eslint-disable-next-line no-undef
					if (hasLeaflet && map) {
						window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
					}
					// eslint-disable-next-line no-undef
						if (hasLeaflet && map) {
							// Create delivery boy marker at starting position (not destination)
							const startPos = START_DEFAULT; // Delivery boy starts from here
							marker = window.L.marker([startPos.lat, startPos.lon]).addTo(map);
							markerRef.current = marker;
							
							// Check if order is already delivered from localStorage
							const savedStatus = localStorage.getItem(`delivery-status-${orderId}`);
							const isDelivered = savedStatus ? JSON.parse(savedStatus).delivered : false;
							if (isDelivered) {
								// If delivered, move marker to destination and show delivered status
								marker.setLatLng([DEST.lat, DEST.lon]);
								marker.bindPopup('Delivered ✅').openPopup();
								// Update live state to reflect delivered status
								setLive(prev => ({ ...prev, delivered: true, simulationRunning: false }));
							} else {
								marker.bindPopup('Delivery Boy is on the way 🚚').openPopup();
							}
						}
					// eslint-disable-next-line no-undef
						if (hasLeaflet && map) {
							polyline = window.L.polyline([], { color: '#2563eb', weight: 4 }).addTo(map);
							polylineRef.current = polyline;
							coordsRef.current = [];
						}
					// Destination marker (buyer's location)
					// eslint-disable-next-line no-undef
					if (hasLeaflet && map) {
						const destMarker = window.L.marker([DEST.lat, DEST.lon], { 
							title: 'Buyer Location',
							icon: window.L.divIcon({
								className: 'custom-destination-marker',
								html: '<div style="background: #dc2626; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">📍</div>',
								iconSize: [20, 20],
								iconAnchor: [10, 10]
							})
						}).addTo(map);
						destMarker.bindPopup('Buyer Location 📍');
					}
					
					// Setup socket connection (guard against missing global)
					const reachable = await pingRealtimeServer();
					if (!reachable) {
						console.warn('Realtime server not reachable, will use local simulation if user clicks Start Tracking');
						setLive((p) => ({ ...p, connected: false }));
						// DO NOT auto-start simulation - wait for user to manually start tracking
						return; // skip socket setup
					}
					const ioFn = (typeof window !== 'undefined' && window.io) ? window.io : null;
					if (typeof ioFn !== 'function') {
						throw new Error('Socket.io client not available');
					}
					
					// Prefer HTTP long-polling first; fallback to websocket after connection established
					socket = ioFn(rtUrlRef.current, { 
						transports: ['polling', 'websocket'],
						withCredentials: true,
						reconnectionAttempts: 5,
						reconnectionDelay: 1000,
						timeout: 5000
					});
					socketRef.current = socket;
					socket.on('connect', () => {
						console.log('Connected to tracking server');
						setLive((p) => ({ ...p, connected: true }));
						// Don't auto-start - let user manually start tracking
					});
					socket.on('connect_error', (error) => {
						console.log('Socket connection error:', error?.message || error);
						setLive((p) => ({ ...p, connected: false }));
						// If initial attempt used websocket first somewhere, force a retry with polling-only
						try {
							if (socket && socket.io && socket.io.opts && socket.io.opts.transports && socket.io.opts.transports.length > 1) {
								// Try a conservative reconnect using polling only
								socket.io.opts.transports = ['polling'];
								socket.connect();
							}
						} catch (_) {}
					});
					socket.on('disconnect', () => {
						console.log('Disconnected from tracking server');
						setLive((p) => ({ ...p, connected: false }));
					});
						socket.on('location-D1', (p) => {
						console.log('[CLIENT] location-D1 event received:', p);
						const { latitude, longitude, updateCount, remainingDistance, ETA, delivered, lat, lon } = p; 
						
						// Handle both new and legacy payload formats
						const finalLat = latitude || lat;
						const finalLon = longitude || lon;
						const isDelivered = delivered || false;
						
							if (hasLeaflet && (markerRef.current || marker) && (mapRef.current || map)) { 
								const m = markerRef.current || marker; const mp = mapRef.current || map;
								
								// Move delivery boy marker to new position
								m.setLatLng([finalLat, finalLon]); 
								
								// Keep map centered on delivery boy's current position
								mp.setView([finalLat, finalLon], mp.getZoom()); 
								
							// Update marker popup based on delivery status
							if (isDelivered) {
									console.log('[CLIENT] Marking as delivered in location update');
									m.bindPopup('Delivered ✅').openPopup();
									// When delivered, center map on destination
									mp.setView([DEST.lat, DEST.lon], mp.getZoom());
							} else {
									m.bindPopup('Delivery Boy is on the way 🚚');
							}
						}
							coords.push([finalLat, finalLon]); 
							coordsRef.current = coords;
                            if (hasLeaflet && (polylineRef.current || polyline)) {
                                const pl = polylineRef.current || polyline;
                                pl.setLatLngs(coords);
                            }
						
						// Calculate total distance traveled
						let add = 0; 
						if (coords.length >= 2) { 
							const prev = coords[coords.length-2]; 
							add = haversine(prev[0], prev[1], finalLat, finalLon); 
						}
						
						setLive((pr) => ({ 
							...pr, 
							updates: updateCount || pr.updates + 1, 
							coords: { lat: finalLat, lon: finalLon }, 
							distanceM: Number((pr.distanceM + add).toFixed(1)), 
							remainingM: remainingDistance || 0, 
							etaText: isDelivered ? "Delivered ✅" : formatEta(ETA || 0),
							delivered: isDelivered || pr.delivered
						}));
						
						// Persist delivery status
						if (isDelivered) {
							console.log('[CLIENT] Persisting delivered status to localStorage');
							localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
							persistDeliveredToServer();
						}
					});
					socket.on('orderDelivered', (data) => {
						console.log('[CLIENT] orderDelivered event received:', data);
						setLive((p) => ({ ...p, delivered: true, simulationRunning: false }));
						localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
						persistDeliveredToServer();
						// Update marker popup to show delivered status
						if (hasLeaflet && marker) {
							marker.bindPopup('Delivered ✅').openPopup();
						}
					});
					
					// Handle additional delivery events
					socket.on('delivered-D1', (data) => {
						console.log('[CLIENT] delivered-D1 event received:', data);
						setLive((p) => ({ ...p, delivered: true, simulationRunning: false }));
						localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
						persistDeliveredToServer();
						if (hasLeaflet && marker) {
							marker.bindPopup('Delivered ✅').openPopup();
						}
					});
					
					socket.on('delivery-complete', (data) => {
						console.log('[CLIENT] delivery-complete event received:', data);
						setLive((p) => ({ ...p, delivered: true, simulationRunning: false }));
						localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
						persistDeliveredToServer();
						if (hasLeaflet && marker) {
							marker.bindPopup('Delivered ✅').openPopup();
						}
					});
						socket.on('simulation-state', (data) => {
							setLive((p) => ({ ...p, simulationRunning: data.running }));
							if (data.running) setLive((p) => ({ ...p, outForDelivery: true }));
						});
					socket.on('orderStatus', (data) => {
						if (data?.status === 'out_for_delivery') setLive((p) => ({ ...p, outForDelivery: true }));
						if (data?.status === 'delivered') setLive((p) => ({ ...p, delivered: true, simulationRunning: false }));
					});
					
					// Handle path updates for better visualization
					socket.on('path-update', (data) => {
						console.log('[CLIENT] Path update received:', data);
						if (hasLeaflet && coordsRef.current) {
							// Add the new position to the path
							coordsRef.current.push([data.to.lat, data.to.lon]);
							if (polylineRef.current) {
								polylineRef.current.setLatLngs(coordsRef.current);
							}
						}
					});
				} catch (setupError) {
					console.error("Error setting up map/socket:", setupError);
					setError("Failed to initialize tracking system");
				}
			};
			
			setup();
		} catch (err) {
			console.error("Error in useEffect:", err);
			setError("Failed to load tracking system");
		}
		
		return () => { 
			try { 
				if (mapRef.current && mapRef.current.remove) { mapRef.current.remove(); }
				mapRef.current = null;
				markerRef.current = null;
				polylineRef.current = null;
			} catch {}
			try { if (socketRef.current) { socketRef.current.close(); } } catch {}
			socketRef.current = null;
			if (localSimRef.current?.timer) { clearInterval(localSimRef.current.timer); localSimRef.current = { timer: null, running: false }; }
		};
	}, [order]);

	// Local fallback simulation if realtime server is unavailable
	const startLocalSimulation = (destination, startPoint) => {
		if (localSimRef.current.running) return;
		localSimRef.current.running = true;
		setLive(prev => ({ ...prev, simulationRunning: true }));
		let current = startPoint || { lat: destination.lat - 0.05, lon: destination.lon - 0.05 };
		const stepMs = 3000;
		localSimRef.current.timer = setInterval(() => {
			try {
				const toRad = (v) => (v * Math.PI) / 180; const R = 6371000;
				const dLat = (destination.lat - current.lat); const dLon = (destination.lon - current.lon);
				const remaining = Math.sqrt((dLat*dLat) + (dLon*dLon));
				current.lat += dLat * 0.2; // move 20% each tick
				current.lon += dLon * 0.2;
				// Update map visuals
				if (mapRef.current && markerRef.current) {
					markerRef.current.setLatLng([current.lat, current.lon]);
					mapRef.current.setView([current.lat, current.lon]);
				}
				coordsRef.current = [...(coordsRef.current || []), [current.lat, current.lon]];
				if (polylineRef.current) polylineRef.current.setLatLngs(coordsRef.current);
				setLive(pr => ({
					...pr,
					updates: pr.updates + 1,
					coords: { lat: current.lat, lon: current.lon },
					etaText: remaining < 0.0002 ? 'Delivered ✅' : pr.etaText,
					simulationRunning: remaining >= 0.0002,
					connected: pr.connected
				}));
				if (remaining < 0.0002) {
					clearInterval(localSimRef.current.timer);
					localSimRef.current = { timer: null, running: false };
						setLive(pr => ({ ...pr, delivered: true }));
						// Persist delivered locally and to server
						try {
							localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
							persistDeliveredToServer();
						} catch {}
				}
			} catch {}
		}, stepMs);
	};

	const handleStartTracking = async () => {
		// Only allow tracking to start if order is picked_up, in_transit, or shipped
		if (order.orderStatus !== 'picked_up' && order.orderStatus !== 'in_transit' && order.orderStatus !== 'shipped') {
			console.log('Cannot start tracking: Order not picked up yet. Current status:', order.orderStatus);
			return;
		}
		
		setTrackingStarted(true);
		
		// Update order status to in_transit when tracking starts
		if (order.orderStatus === 'picked_up' || order.orderStatus === 'shipped') {
			try {
				const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: 'in_transit' })
				});
				if (response.ok) {
					console.log('Order status updated to in_transit');
					// Refresh order data
					const orderResponse = await fetch(`http://localhost:5000/api/orders/${orderId}`);
					if (orderResponse.ok) {
						const orderData = await orderResponse.json();
						setOrder(orderData);
					}
				}
			} catch (error) {
				console.error('Failed to update order status:', error);
			}
		}
		
		try {
			// Start server-side simulation
			await fetch(`${rtUrlRef.current}/start`, { method: 'POST' });
			console.log('Tracking started manually');
		} catch (e) {
			console.warn('Failed to start server tracking, will use local simulation');
			// Fallback to local simulation if server not available
			const destination = order?.deliveryInfo?.customerLocation?.latitude && order?.deliveryInfo?.customerLocation?.longitude
				? { lat: order.deliveryInfo.customerLocation.latitude, lon: order.deliveryInfo.customerLocation.longitude }
				: geocodeAddress(order?.buyerDetails?.address) || { lat: 9.9368, lon: 76.2745 };
			startLocalSimulation(destination, START_DEFAULT);
		}
	};

	return (
		<div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
				<h1 style={{ margin: 0, color: "#5c4033" }}>Track Order {orderId ? `#${orderId}` : ""}</h1>
				<div style={{ display: "flex", gap: "8px" }}>
					<button onClick={() => navigate(-1)} style={{ padding: "8px 12px", background: "#6c757d", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Back</button>
				</div>
			</div>

			{error ? (
				<div style={{ textAlign: "center", padding: "40px", background: "#fff", borderRadius: "12px", border: "1px solid #dc3545" }}>
					<h3 style={{ color: "#dc3545" }}>⚠️ Error Loading Page</h3>
					<p style={{ color: "#6c757d" }}>{error}</p>
					<p style={{ fontSize: "14px", color: "#6c757d" }}>
						The tracking system is running in demo mode. All features should still work.
					</p>
				</div>
			) : !order ? (
				<div style={{ textAlign: "center", padding: "40px", background: "#fff", borderRadius: "12px", border: "1px solid #ddd" }}>
					<h3>Loading order details...</h3>
					<p>Please wait while we fetch your order information.</p>
				</div>
			) : (
				<>
					{/* Demo Mode Notice */}
					{order.buyerDetails.name === "Demo Customer" && (
						<div style={{ background: "#e3f2fd", border: "1px solid #2196f3", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
							<h4 style={{ margin: "0 0 8px 0", color: "#1976d2" }}>🎯 Demo Mode Active</h4>
							<p style={{ margin: 0, fontSize: "14px", color: "#1976d2" }}>
								This is a demonstration of the delivery tracking system. The order ID "{orderId}" was not found in the database, so demo data is being used for testing purposes.
								{!auth.currentUser && " Please log in to track your actual orders."}
							</p>
							<div style={{ marginTop: "8px", fontSize: "12px", color: "#1976d2", background: "#f0f9ff", padding: "8px", borderRadius: "6px" }}>
								<strong>📍 Geocoding:</strong> Uses built-in coordinates for 50+ Indian cities (no API required). 
								Supports Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune, Kolkata, and all major Kerala cities.
							</div>
						</div>
					)}

					{/* Delivery Assignment Status - Only show for non-delivered orders */}
					{order.buyerDetails.name !== "Demo Customer" && order.orderStatus !== "delivered" && order.orderStatus !== "confirmed" && (
						<div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
							<h3 style={{ marginTop: 0, color: "#5c4033" }}>Delivery Status</h3>
							{!order.deliveryInfo?.agentId ? (
								<div style={{ background: "#fff3cd", border: "1px solid #ffeaa7", borderRadius: "8px", padding: "12px" }}>
									<p style={{ margin: 0, color: "#856404" }}>
										⏳ <strong>Waiting for Assignment:</strong> Your order is being processed. A delivery boy will be assigned soon.
									</p>
								</div>
							) : order.orderStatus === "assigned" ? (
								<div style={{ background: "#d1ecf1", border: "1px solid #bee5eb", borderRadius: "8px", padding: "12px" }}>
									<p style={{ margin: 0, color: "#0c5460" }}>
										📋 <strong>Delivery Boy Assigned:</strong> {order.deliveryInfo?.agentId || "Delivery agent"} has been assigned to your order. 
										Waiting for acceptance...
									</p>
								</div>
							) : order.orderStatus === "accepted" ? (
								<div style={{ background: "#d4edda", border: "1px solid #c3e6cb", borderRadius: "8px", padding: "12px" }}>
									<p style={{ margin: 0, color: "#155724" }}>
										✅ <strong>Delivery Accepted:</strong> {order.deliveryInfo.agentId} has accepted your order. 
										Waiting for pickup... Real-time tracking will start once the delivery boy picks up the order.
									</p>
								</div>
							) : order.orderStatus === "picked_up" || order.orderStatus === "in_transit" || order.orderStatus === "shipped" ? (
								<div style={{ background: "#d4edda", border: "1px solid #c3e6cb", borderRadius: "8px", padding: "16px" }}>
									<p style={{ margin: "0 0 12px 0", color: "#155724" }}>
										🚚 <strong>Shipped:</strong> {order.deliveryInfo.agentId} has picked up your order and it's on the way!
									</p>
									{!trackingStarted ? (
										<button
											onClick={handleStartTracking}
											style={{
												width: "100%",
												padding: "12px 24px",
												background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
												color: "white",
												border: "none",
												borderRadius: "8px",
												fontSize: "16px",
												fontWeight: "700",
												cursor: "pointer",
												boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)",
												transition: "all 0.3s ease",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												gap: "8px"
											}}
											onMouseEnter={(e) => {
												e.target.style.transform = "translateY(-2px)";
												e.target.style.boxShadow = "0 6px 16px rgba(40, 167, 69, 0.4)";
											}}
											onMouseLeave={(e) => {
												e.target.style.transform = "translateY(0)";
												e.target.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.3)";
											}}
										>
											🚀 Start Real-Time Tracking
										</button>
									) : (
										<p style={{ margin: 0, color: "#155724", fontSize: "14px", fontWeight: "600" }}>
											✅ Real-time tracking is now active!
										</p>
									)}
								</div>
							) : (
								<div style={{ background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: "8px", padding: "12px" }}>
									<p style={{ margin: 0, color: "#721c24" }}>
										❌ <strong>Unknown Status:</strong> Order status is {order.orderStatus}
									</p>
								</div>
							)}
						</div>
					)}

					{/* Delivered Status - Only show when order is actually delivered on server */}
					{order.buyerDetails.name !== "Demo Customer" && order.orderStatus === "delivered" ? (
						<div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
							<h3 style={{ marginTop: 0, color: "#5c4033" }}>Delivery Status</h3>
							<div style={{ background: "#d4edda", border: "1px solid #c3e6cb", borderRadius: "8px", padding: "12px" }}>
								<p style={{ margin: 0, color: "#155724" }}>
									✅ <strong>Order Delivered:</strong> Your order has been successfully delivered by {order.deliveryInfo?.agentId || "delivery agent"}!
								</p>
								<div style={{ marginTop: "8px", fontSize: "12px", color: "#155724" }}>
									Delivery confirmed
								</div>
							</div>
						</div>
					) : null}

					{/* Socket Connection Notice */}
					{!live.connected && (
						<div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
							<h4 style={{ margin: "0 0 8px 0", color: "#dc2626" }}>⚠️ Tracking Server Disconnected</h4>
							<p style={{ margin: 0, fontSize: "14px", color: "#dc2626" }}>
								The real-time tracking server is not running. Please start the server or use the "Open Full Page" button for standalone tracking.
							</p>
						</div>
					)}

					{/* Delivery Address Info */}
					{order.buyerDetails?.address && (
						<div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 12 }}>
							<h3 style={{ marginTop: 0, color: "#5c4033" }}>Delivery Address</h3>
							{order.buyerDetails.name === "Demo Customer" && (
								<div style={{ background: "#fff3cd", border: "1px solid #ffeaa7", borderRadius: "6px", padding: "8px", marginBottom: "12px", fontSize: "12px" }}>
									⚠️ <strong>Demo Mode:</strong> Using sample data. Real order data could not be loaded.
								</div>
							)}
							<div style={{ fontSize: "14px", lineHeight: "1.5" }}>
								<div><strong>Name:</strong> {order.buyerDetails.name}</div>
								<div><strong>Phone:</strong> {order.buyerDetails.phone}</div>
								<div><strong>Address:</strong> {order.buyerDetails.address.street}, {order.buyerDetails.address.city}, {order.buyerDetails.address.state} - {order.buyerDetails.address.pincode}</div>
								{order.buyerDetails.address.landmark && <div><strong>Landmark:</strong> {order.buyerDetails.address.landmark}</div>}
								{order.deliveryInfo?.customerLocation?.latitude && (
									<div style={{ marginTop: "8px", padding: "8px", background: "#f0f9ff", borderRadius: "6px", fontSize: "12px" }}>
										<strong>📍 Coordinates:</strong> {order.deliveryInfo.customerLocation.latitude.toFixed(6)}, {order.deliveryInfo.customerLocation.longitude.toFixed(6)}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Map */}
					<div id="track-map" style={{ width: "100%", height: "420px", borderRadius: 12, border: "1px solid #eee", marginBottom: 12 }} />

			{/* Status Timeline */}
			<div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 12 }}>
				<h3 style={{ marginTop: 0, color: "#5c4033" }}>Status</h3>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
					{["Order Placed", "Shipped", "Out for Delivery", "Delivered"].map((label, i) => {
						let active = false;
						
						if (label === "Order Placed") {
							// Always show Order Placed as active (order exists)
							active = true;
						} else if (label === "Shipped") {
							// Show when delivery boy marks as picked up
							active = order?.orderStatus === "picked_up" || order?.orderStatus === "in_transit" || order?.orderStatus === "shipped" || order?.orderStatus === "delivered";
						} else if (label === "Out for Delivery") {
							// Show when tracking simulation starts (in_transit status)
							active = (order?.orderStatus === "in_transit" || order?.orderStatus === "delivered") && (live.simulationRunning || live.updates > 0 || trackingStarted);
						} else if (label === "Delivered") {
							// Only show when actually delivered on server
							active = order?.orderStatus === "delivered";
						}
						
						return (
							<div key={label} style={{ 
								padding: 12, 
								borderRadius: 10, 
								textAlign: "center", 
								background: active ? "#d1fae5" : "#f3f4f6", 
								color: active ? "#065f46" : "#374151", 
								border: `1px solid ${active ? '#10b981' : '#e5e7eb'}` 
							}}>
								{label}
							</div>
						);
					})}
				</div>
			</div>

			{/* Live Metrics */}
			<div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 12, padding: 16, display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, fontSize: 13 }}>
				<span style={{ background: live.connected ? "#d1fae5" : "#fef2f2", padding: "6px 10px", borderRadius: 8, color: live.connected ? "#065f46" : "#dc2626" }}>
					Socket: {live.connected ? "✅ Connected" : "❌ Disconnected"}
				</span>
				<span style={{ background: "#f3f4f6", padding: "6px 10px", borderRadius: 8 }}>Updates: {live.updates}</span>
				<span style={{ background: "#f3f4f6", padding: "6px 10px", borderRadius: 8 }}>Distance: {live.distanceM} m</span>
				<span style={{ background: "#f3f4f6", padding: "6px 10px", borderRadius: 8 }}>Remaining: {live.remainingM} m</span>
				<span style={{ background: "#dbeafe", padding: "6px 10px", borderRadius: 8, color: "#1e3a8a" }}>ETA: {live.etaText}</span>
				{live.coords && <span style={{ background: "#f3f4f6", padding: "6px 10px", borderRadius: 8 }}>Lat: {live.coords.lat?.toFixed(5)}, Lon: {live.coords.lon?.toFixed(5)}</span>}
			</div>

			{/* Tracking Availability Notice - Only show for non-delivered orders */}
					{order.buyerDetails.name !== "Demo Customer" && order.orderStatus !== "picked_up" && order.orderStatus !== "shipped" && order.orderStatus !== "in_transit" && order.orderStatus !== "delivered" && order.orderStatus !== "confirmed" && (
				<div style={{ background: "#fff3cd", border: "1px solid #ffeaa7", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
					<h4 style={{ margin: "0 0 8px 0", color: "#856404" }}>📱 Real-time Tracking</h4>
					<p style={{ margin: 0, fontSize: "14px", color: "#856404" }}>
								Real-time tracking will be available once your delivery boy marks the order as "Picked Up / Shipped". 
						Currently, your order status is: <strong>{order.orderStatus}</strong>
					</p>
				</div>
			)}


			{/* Mark as Delivered Button - Only show for in_transit orders */}
			{order && order.orderStatus === "in_transit" && order.buyerDetails.name !== "Demo Customer" && (
				<div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 12 }}>
					<h4 style={{ margin: "0 0 12px 0", color: "#5c4033" }}>Confirm Delivery</h4>
					<p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#666" }}>
						Has your order been delivered? Click the button below to confirm delivery.
					</p>
				<button
					onClick={async () => {
						const confirmed = await confirm({
							title: 'Confirm Delivery',
							message: 'Confirm that your order has been delivered?',
							type: 'success',
							confirmText: 'Confirm'
						});
						
						if (confirmed) {
							try {
								const token = await auth.currentUser.getIdToken();
								const response = await fetch(`http://localhost:5000/api/orders/${orderId}/delivered`, {
									method: "PATCH",
									headers: {
										"Content-Type": "application/json",
										Authorization: `Bearer ${token}`
									}
								});

								if (response.ok) {
									const data = await response.json();
									if (data.success) {
										// Update local state
										setOrder(prev => ({ ...prev, orderStatus: "delivered" }));
										setLive(prev => ({ ...prev, delivered: true, simulationRunning: false }));
										
										// Save to localStorage
										localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
										
										// Show success message
										toast.success("✅ Order marked as delivered! The delivery boy and admin have been notified.");
									} else {
										toast.error("Failed to mark order as delivered: " + data.error);
									}
								} else {
									const errorData = await response.json();
									toast.error("Failed to mark order as delivered: " + errorData.error);
								}
							} catch (error) {
								console.error("Error marking order as delivered:", error);
								toast.error("Error marking order as delivered. Please try again.");
							}
						}
					}}
						style={{
							backgroundColor: "#10b981",
							color: "white",
							border: "none",
							padding: "12px 24px",
							borderRadius: "8px",
							cursor: "pointer",
							fontSize: "16px",
							fontWeight: "600"
						}}
					>
						✅ Mark as Delivered
					</button>
				</div>
			)}
				</>
			)}
		</div>
	);
}
