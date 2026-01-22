// src/authService.js
import { auth } from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Login with Google
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const { user } = await signInWithPopup(auth, provider);
  const idToken = await user.getIdToken();

  try {
    const response = await fetch(`${API_BASE}/api/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 0) {
        throw new Error('Cannot connect to server. Please check your internet connection and ensure the server is running.');
      } else {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('Cannot connect to server')) {
      throw new Error('Cannot connect to server. Please check your internet connection and ensure the server is running.');
    }
    throw error;
  }

  return user;
}

// Login with Email/Password
export async function loginWithEmail(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await user.getIdToken();

  try {
    const response = await fetch(`${API_BASE}/api/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 0) {
        throw new Error('Cannot connect to server. Please check your internet connection and ensure the server is running.');
      } else {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('Cannot connect to server')) {
      throw new Error('Cannot connect to server. Please check your internet connection and ensure the server is running.');
    }
    throw error;
  }

  return user;
}

// Register new user (email/password)
export async function registerWithEmail(name, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  const idToken = await user.getIdToken();

  try {
    const response = await fetch(`${API_BASE}/api/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 0) {
        throw new Error('Cannot connect to server. Please check your internet connection and ensure the server is running.');
      } else {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('Cannot connect to server')) {
      throw new Error('Cannot connect to server. Please check your internet connection and ensure the server is running.');
    }
    throw error;
  }

  return user;
}