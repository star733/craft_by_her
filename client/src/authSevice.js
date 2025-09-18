// src/authService.js
import { auth } from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';

// Login with Google
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const { user } = await signInWithPopup(auth, provider);
  const idToken = await user.getIdToken();

  await fetch('http://localhost:5000/api/auth/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    }
  });

  return user;
}



// Login with Email/Password
export async function loginWithEmail(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await user.getIdToken();

  await fetch('http://localhost:5000/api/auth/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    }
  });

  return user;
}

// Register new user (email/password)
export async function registerWithEmail(name, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  const idToken = await user.getIdToken();

  await fetch('http://localhost:5000/api/auth/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    }
  });

  return user;
}
