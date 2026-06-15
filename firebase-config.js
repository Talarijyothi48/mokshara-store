'use strict';

// ============================================================
//  MOKSHSHARA — Firebase Configuration
//  
//  SETUP INSTRUCTIONS:
//  1. Go to https://console.firebase.google.com
//  2. Click "Create a project" → name it "mokshshara-store"
//  3. Go to Project Settings → General → Your apps → Add web app
//  4. Copy the firebaseConfig values below
//  5. Enable Authentication:
//     - Go to Authentication → Sign-in method
//     - Enable "Email/Password"
//     - Enable "Google" (set support email)
//  6. Enable Firestore:
//     - Go to Firestore Database → Create database
//     - Choose "Start in test mode" (we'll secure it later)
//     - Select region: asia-south1 (Mumbai)
// ============================================================

// ⚠️ REPLACE THESE VALUES with your Firebase project config
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ⚠️ REPLACE with your Razorpay Key ID (from Dashboard → Settings → API Keys)
// Use test key for testing: rzp_test_xxxxx
// Use live key for production: rzp_live_xxxxx
const RAZORPAY_KEY_ID = "YOUR_RAZORPAY_KEY_ID_HERE";

// ⚠️ REPLACE with your UPI ID for manual payments
const MERCHANT_UPI_ID = "your-upi-id@upi";

// Store name for payment receipts
const STORE_NAME = "Mokshara Ebook Store";
const STORE_LOGO = "https://talarijyothi48.github.io/mokshara-store/assets/logo.png";

// ============================================================
//  Firebase Initialization
// ============================================================
let db = null;
let auth = null;
let googleProvider = null;
let firebaseReady = false;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded. Features requiring database will be limited.');
      return false;
    }

    // Check if already initialized
    if (firebase.apps.length === 0) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    db = firebase.firestore();
    auth = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');

    firebaseReady = true;
    console.log('✅ Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    return false;
  }
}

// ============================================================
//  Auth Helper Functions
// ============================================================

async function signUpWithEmail(name, email, password) {
  if (!firebaseReady) throw new Error('Firebase not initialized');
  
  const userCredential = await auth.createUserWithEmailAndPassword(email, password);
  const user = userCredential.user;

  // Update display name
  await user.updateProfile({ displayName: name });

  // Store user in Firestore
  await db.collection('users').doc(user.uid).set({
    name: name,
    email: email,
    provider: 'email',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  });

  return user;
}

async function signInWithEmail(email, password) {
  if (!firebaseReady) throw new Error('Firebase not initialized');
  
  const userCredential = await auth.signInWithEmailAndPassword(email, password);
  
  // Update last login
  await db.collection('users').doc(userCredential.user.uid).update({
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  });

  return userCredential.user;
}

async function signInWithGoogle() {
  if (!firebaseReady) throw new Error('Firebase not initialized');
  
  const result = await auth.signInWithPopup(googleProvider);
  const user = result.user;

  // Check if user doc exists, if not create it
  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists) {
    await db.collection('users').doc(user.uid).set({
      name: user.displayName || 'User',
      email: user.email,
      provider: 'google',
      photoURL: user.photoURL || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    await db.collection('users').doc(user.uid).update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  return user;
}

async function signOutUser() {
  if (!firebaseReady) throw new Error('Firebase not initialized');
  await auth.signOut();
}

// ============================================================
//  Transaction / Order Helper Functions
// ============================================================

async function saveTransaction(transactionData) {
  if (!firebaseReady) throw new Error('Firebase not initialized');
  
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const transaction = {
    userId: user.uid,
    userEmail: user.email,
    userName: user.displayName || 'User',
    items: transactionData.items.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price,
      category: item.categoryLabel || item.category
    })),
    totalAmount: transactionData.totalAmount,
    paymentMethod: transactionData.paymentMethod, // 'razorpay' | 'upi_manual' | 'free'
    paymentId: transactionData.paymentId || null,
    razorpayOrderId: transactionData.razorpayOrderId || null,
    upiRefNumber: transactionData.upiRefNumber || null,
    status: transactionData.status || 'completed',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection('transactions').add(transaction);
  console.log('✅ Transaction saved:', docRef.id);
  return docRef.id;
}

async function getUserTransactions() {
  if (!firebaseReady) return [];
  
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const snapshot = await db.collection('transactions')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

// ============================================================
//  Newsletter Helper
// ============================================================

async function saveNewsletterSubscription(email) {
  if (!firebaseReady) return false;
  
  try {
    await db.collection('newsletter').doc(email).set({
      email: email,
      subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
      userId: auth.currentUser?.uid || null
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving newsletter subscription:', error);
    return false;
  }
}
