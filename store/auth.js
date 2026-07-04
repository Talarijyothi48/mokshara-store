'use strict';

// ============================================================
//  MOKSHSHARA — Self-Contained Auth System (localStorage)
//
//  No Firebase, no external dependencies, no config needed.
//  Works on any browser, including GitHub Pages / Blogger.
//
//  Data stored in localStorage:
//    mokshara_users     — array of registered user objects
//    mokshara_session   — current logged-in user uid
//    mokshara_txns      — array of all transactions
//    mokshara_purchased — array of { uid, bookId } pairs
// ============================================================

const MoksharaAuth = (() => {

  // ── Private helpers ──────────────────────────────────────────

  function _getUsers() {
    try { return JSON.parse(localStorage.getItem('mokshara_users') || '[]'); }
    catch { return []; }
  }

  function _saveUsers(users) {
    localStorage.setItem('mokshara_users', JSON.stringify(users));
  }

  function _getTxns() {
    try { return JSON.parse(localStorage.getItem('mokshara_txns') || '[]'); }
    catch { return []; }
  }

  function _saveTxns(txns) {
    localStorage.setItem('mokshara_txns', JSON.stringify(txns));
  }

  function _uid() {
    // Generate a unique ID (similar to Firebase push IDs)
    return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }

  function _txid() {
    return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }

  // Very simple hash — NOT cryptographic, but better than plaintext.
  // For a production system, use a backend with bcrypt.
  function _hashPassword(password) {
    let hash = 0;
    const salted = 'mokshara_salt_2026_' + password;
    for (let i = 0; i < salted.length; i++) {
      const char = salted.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit int
    }
    return 'h_' + Math.abs(hash).toString(36) + '_' + salted.length;
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Register a new user with email and password.
   * Returns { success: true, user } or { success: false, error: string }
   */
  function signUp(name, email, password) {
    if (!name || name.trim().length < 2) {
      return { success: false, error: 'Please enter your full name (at least 2 characters).' };
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const users = _getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
    }

    const user = {
      uid: _uid(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: _hashPassword(password),
      provider: 'email',
      photoURL: null,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    users.push(user);
    _saveUsers(users);

    // Start session
    localStorage.setItem('mokshara_session', user.uid);

    console.log('✅ MoksharaAuth: New user registered:', user.email);
    return { success: true, user: _publicUser(user) };
  }

  /**
   * Sign in with email and password.
   * Returns { success: true, user } or { success: false, error: string }
   */
  function signIn(email, password) {
    if (!email || !password) {
      return { success: false, error: 'Please enter your email and password.' };
    }

    const users = _getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return { success: false, error: 'No account found with this email. Please sign up first.' };
    }

    if (user.provider === 'google') {
      // Google-only account — sign in via Google button
      return { success: false, error: 'This email was registered with Google. Please use "Continue with Google" to sign in.' };
    }

    if (user.passwordHash !== _hashPassword(password)) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    _saveUsers(users);
    localStorage.setItem('mokshara_session', user.uid);

    console.log('✅ MoksharaAuth: User signed in:', user.email);
    return { success: true, user: _publicUser(user) };
  }

  /**
   * Sign in with Google (creates/reuses an account by email).
   * Since we can't do real OAuth without a backend, this creates a
   * Google-provider account that skips password checks.
   * Returns { success: true, user } or { success: false, error: string }
   */
  function signInWithGoogle(name, email) {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid Google email address.' };
    }

    const users = _getUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (user) {
      // Update last login and name if changed
      user.lastLoginAt = new Date().toISOString();
      if (!user.name && name) user.name = name;
      _saveUsers(users);
    } else {
      // Create new Google-provider account
      user = {
        uid: _uid(),
        name: name || email.split('@')[0],
        email: email.toLowerCase().trim(),
        passwordHash: null,
        provider: 'google',
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=7c3aed&color=fff&size=64`,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      users.push(user);
      _saveUsers(users);
    }

    localStorage.setItem('mokshara_session', user.uid);
    console.log('✅ MoksharaAuth: Google sign-in:', user.email);
    return { success: true, user: _publicUser(user) };
  }

  /**
   * Sign out the current user.
   */
  function signOut() {
    localStorage.removeItem('mokshara_session');
    localStorage.removeItem('mokshara_purchased_books');
    console.log('✅ MoksharaAuth: User signed out');
  }

  /**
   * Get the currently logged-in user (or null if not logged in).
   */
  function getCurrentUser() {
    try {
      const uid = localStorage.getItem('mokshara_session');
      if (!uid) return null;
      const users = _getUsers();
      const user = users.find(u => u.uid === uid);
      return user ? _publicUser(user) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get all registered users (for the returning-user hint).
   * Returns only public-safe fields.
   */
  function getAllUsers() {
    return _getUsers().map(_publicUser);
  }

  /**
   * Save a transaction to localStorage.
   */
  function saveTransaction(txData) {
    const txns = _getTxns();
    const tx = {
      id: _txid(),
      ...txData,
      createdAt: txData.createdAt || new Date().toISOString()
    };
    txns.unshift(tx); // Most recent first
    _saveTxns(txns);
    console.log('✅ MoksharaAuth: Transaction saved:', tx.id);
    return tx.id;
  }

  /**
   * Get all transactions for a specific user.
   */
  function getUserTransactions(uid) {
    if (!uid) return [];
    return _getTxns().filter(tx => tx.userId === uid);
  }

  /**
   * Check if a user has purchased a specific book.
   */
  function hasPurchased(uid, bookId) {
    if (!uid) return false;
    return _getTxns().some(tx =>
      tx.userId === uid &&
      tx.status === 'completed' &&
      tx.items.some(item => item.id === bookId)
    );
  }

  /**
   * Get all user registrations — for the admin to view in browser console.
   * Open browser DevTools → Console → type: MoksharaAuth.getAdminData()
   */
  function getAdminData() {
    const users = _getUsers();
    const txns = _getTxns();
    console.group('📊 Mokshara Store Admin Data');
    console.log(`👥 Total Registered Users: ${users.length}`);
    console.table(users.map(u => ({
      Name: u.name,
      Email: u.email,
      Provider: u.provider,
      'Joined': new Date(u.createdAt).toLocaleDateString(),
      'Last Login': new Date(u.lastLoginAt).toLocaleDateString()
    })));
    console.log(`💳 Total Transactions: ${txns.length}`);
    console.table(txns.map(tx => ({
      'Tx ID': tx.id,
      'User': tx.userEmail,
      'Amount': tx.totalAmount === 0 ? 'FREE' : '₹' + tx.totalAmount,
      'Method': tx.paymentMethod,
      'Ref': tx.paymentId,
      'Status': tx.status,
      'Date': new Date(tx.createdAt).toLocaleDateString()
    })));
    console.groupEnd();
    return { users, transactions: txns };
  }

  // ── Return only public-safe fields ───────────────────────────
  function _publicUser(user) {
    return {
      uid: user.uid,
      name: user.name,
      email: user.email,
      provider: user.provider,
      photoURL: user.photoURL || null,
      displayName: user.name, // alias for Firebase compat
      createdAt: user.createdAt
    };
  }

  // ── Expose public API ─────────────────────────────────────────
  return {
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    getCurrentUser,
    getAllUsers,
    saveTransaction,
    getUserTransactions,
    hasPurchased,
    getAdminData
  };

})();

// ── Dev helper: expose to console ─────────────────────────────
window.MoksharaAuth = MoksharaAuth;
console.log('✅ Mokshara Auth System ready. Run MoksharaAuth.getAdminData() in console to view all users & transactions.');
