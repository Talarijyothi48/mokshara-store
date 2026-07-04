
  'use strict';

  // ⚠️ PASTE YOUR GOOGLE APPS SCRIPT DEPLOYMENT URL BELOW
  // Follow the setup instructions to get this URL
  const GOOGLE_SHEETS_URL = '';

  const MoksharaAuth = (() => {

    // ── Private helpers ──────────────────────────────────────────

    function _getUsers() {
      try { return JSON.parse(localStorage.getItem('mokshara_users') || '[]'); }
      catch(e) { return []; }
    }
    function _saveUsers(users) {
      localStorage.setItem('mokshara_users', JSON.stringify(users));
    }
    function _getTxns() {
      try { return JSON.parse(localStorage.getItem('mokshara_txns') || '[]'); }
      catch(e) { return []; }
    }
    function _saveTxns(txns) {
      localStorage.setItem('mokshara_txns', JSON.stringify(txns));
    }
    function _uid() {
      return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }
    function _txid() {
      return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }
    function _hashPassword(password) {
      let hash = 0;
      const salted = 'mokshara_salt_2026_' + password;
      for (let i = 0; i < salted.length; i++) {
        const char = salted.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return 'h_' + Math.abs(hash).toString(36) + '_' + salted.length;
    }

    // ── Google Sheets Sync ────────────────────────────────────────
    // Sends data to your Google Sheet in the background (non-blocking)
    function _postToSheet(type, data) {
      if (!GOOGLE_SHEETS_URL) return; // Skip if URL not configured yet
      try {
        fetch(GOOGLE_SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: type, ...data, timestamp: new Date().toISOString() })
        }).catch(() => {}); // Silent fail — localStorage is the primary store
      } catch(e) { /* ignore */ }
    }

    // ── Public API ───────────────────────────────────────────────

    function signUp(name, email, password) {
      if (!name || name.trim().length < 2) return { success: false, error: 'Please enter your full name (at least 2 characters).' };
      if (!email || !email.includes('@') || !email.includes('.')) return { success: false, error: 'Please enter a valid email address.' };
      if (!password || password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

      const users = _getUsers();
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
      }

      const user = {
        uid: _uid(), name: name.trim(), email: email.toLowerCase().trim(),
        passwordHash: _hashPassword(password), provider: 'email', photoURL: null,
        createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString()
      };
      users.push(user);
      _saveUsers(users);
      localStorage.setItem('mokshara_session', user.uid);

      // 📤 Send to Google Sheet
      _postToSheet('user_signup', { name: user.name, email: user.email, provider: 'email' });

      return { success: true, user: _publicUser(user) };
    }

    function signIn(email, password) {
      if (!email || !password) return { success: false, error: 'Please enter your email and password.' };
      const users = _getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (!user) return { success: false, error: 'No account found with this email. Please sign up first.' };
      if (user.provider === 'google') return { success: false, error: 'This email was registered with Google. Please use "Continue with Google" to sign in.' };
      if (user.passwordHash !== _hashPassword(password)) return { success: false, error: 'Incorrect password. Please try again.' };

      user.lastLoginAt = new Date().toISOString();
      _saveUsers(users);
      localStorage.setItem('mokshara_session', user.uid);
      return { success: true, user: _publicUser(user) };
    }

    function signInWithGoogle(name, email) {
      if (!email || !email.includes('@')) return { success: false, error: 'Invalid Google email address.' };
      const users = _getUsers();
      let user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      let isNew = false;

      if (user) {
        user.lastLoginAt = new Date().toISOString();
        if (!user.name && name) user.name = name;
        _saveUsers(users);
      } else {
        isNew = true;
        user = {
          uid: _uid(), name: name || email.split('@')[0],
          email: email.toLowerCase().trim(), passwordHash: null, provider: 'google',
          photoURL: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || email) + '&background=7c3aed&color=fff&size=64',
          createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString()
        };
        users.push(user);
        _saveUsers(users);
      }
      localStorage.setItem('mokshara_session', user.uid);

      // 📤 Send new Google users to Google Sheet
      if (isNew) _postToSheet('user_signup', { name: user.name, email: user.email, provider: 'google' });

      return { success: true, user: _publicUser(user) };
    }

    function signOut() {
      localStorage.removeItem('mokshara_session');
      localStorage.removeItem('mokshara_purchased_books');
    }

    function getCurrentUser() {
      try {
        const uid = localStorage.getItem('mokshara_session');
        if (!uid) return null;
        const user = _getUsers().find(u => u.uid === uid);
        return user ? _publicUser(user) : null;
      } catch(e) { return null; }
    }

    function getAllUsers() { return _getUsers().map(_publicUser); }

    function saveTransaction(txData) {
      const txns = _getTxns();
      const tx = { id: _txid(), ...txData, createdAt: txData.createdAt || new Date().toISOString() };
      txns.unshift(tx);
      _saveTxns(txns);

      // 📤 Send transaction to Google Sheet
      _postToSheet('transaction', {
        userEmail: tx.userEmail,
        userName: tx.userName,
        books: tx.items.map(i => i.title).join(', '),
        bookIds: tx.items.map(i => i.id).join(', '),
        totalAmount: tx.totalAmount,
        paymentMethod: tx.paymentMethod,
        paymentId: tx.paymentId,
        status: tx.status
      });

      return tx.id;
    }

    function getUserTransactions(uid) {
      if (!uid) return [];
      return _getTxns().filter(tx => tx.userId === uid);
    }

    function hasPurchased(uid, bookId) {
      if (!uid) return false;
      return _getTxns().some(tx => tx.userId === uid && tx.status === 'completed' && tx.items.some(item => item.id === bookId));
    }

    function getAdminData() {
      const users = _getUsers(); const txns = _getTxns();
      console.group('📊 Mokshara Store Admin Data');
      console.log('👥 Total Users:', users.length);
      console.table(users.map(u => ({ Name: u.name, Email: u.email, Provider: u.provider, Joined: new Date(u.createdAt).toLocaleDateString() })));
      console.log('💳 Total Transactions:', txns.length);
      console.table(txns.map(tx => ({ User: tx.userEmail, Amount: tx.totalAmount === 0 ? 'FREE' : '₹'+tx.totalAmount, Method: tx.paymentMethod, Ref: tx.paymentId, Status: tx.status, Date: new Date(tx.createdAt).toLocaleDateString() })));
      const totalRevenue = txns.filter(t => t.status === 'completed').reduce((s,t) => s + (t.totalAmount || 0), 0);
      console.log('💰 Total Revenue: ₹' + totalRevenue);
      console.groupEnd();
      return { users, transactions: txns, totalRevenue };
    }

    function _publicUser(user) {
      return { uid: user.uid, name: user.name, email: user.email, provider: user.provider, photoURL: user.photoURL || null, displayName: user.name, createdAt: user.createdAt };
    }

    return { signUp, signIn, signInWithGoogle, signOut, getCurrentUser, getAllUsers, saveTransaction, getUserTransactions, hasPurchased, getAdminData };
  })();
  window.MoksharaAuth = MoksharaAuth;
  