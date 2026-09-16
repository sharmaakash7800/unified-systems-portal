const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Test Suite to verify critical security and RBAC logic independently
async function runTests() {
  console.log('=== RUNNING SECURITY & RBAC LOGIC TESTS ===\n');

  // 1. Verify bcrypt hashing
  console.log('1. Testing Password Hashing & Comparison...');
  const plainPassword = 'SuperSecurePassword@123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(plainPassword, salt);
  const isMatch = await bcrypt.compare(plainPassword, hash);
  const isFalseMatch = await bcrypt.compare('WrongPassword', hash);

  if (!isMatch || isFalseMatch) {
    throw new Error('Password verification logic failed');
  }
  console.log('   ✔ Password hashing and verification working securely.\n');

  // 2. Verify JWT token issuance and signature
  console.log('2. Testing JWT Signing & Expiration Verification...');
  const secret = 'test_secret_key_12345';
  const token = jwt.sign({ userId: 'user123', role: 'Super Admin' }, secret, { expiresIn: '1h' });
  const decoded = jwt.verify(token, secret);

  if (decoded.userId !== 'user123') {
    throw new Error('JWT verification payload mismatch');
  }
  console.log('   ✔ JWT token verification passed.\n');

  // 3. Test RBAC canAccessSystem logic
  console.log('3. Testing Dynamic RBAC Permission Logic...');
  const { canAccessSystem } = require('../middleware/permissions');

  const superAdminUser = {
    role: { permissions: ['*'] },
    systemAccess: [],
  };

  const supplyUser = {
    role: { permissions: ['portal.dashboard.view', 'supply-pms.access'] },
    systemAccess: ['supply-pms'],
  };

  const serviceUser = {
    role: { permissions: ['portal.dashboard.view', 'service-pms.access'] },
    systemAccess: ['service-pms'],
  };

  const supplySystem = { slug: 'supply-pms', requiredPermission: 'supply-pms.access' };
  const serviceSystem = { slug: 'service-pms', requiredPermission: 'service-pms.access' };

  // Assertions
  if (!canAccessSystem(superAdminUser, supplySystem) || !canAccessSystem(superAdminUser, serviceSystem)) {
    throw new Error('Super Admin wildcard failed to grant access to all systems');
  }

  if (!canAccessSystem(supplyUser, supplySystem) || canAccessSystem(supplyUser, serviceSystem)) {
    throw new Error('Supply user RBAC boundary violation');
  }

  if (canAccessSystem(serviceUser, supplySystem) || !canAccessSystem(serviceUser, serviceSystem)) {
    throw new Error('Service user RBAC boundary violation');
  }

  console.log('   ✔ Super Admin granted access to all systems via wildcard (*).');
  console.log('   ✔ Supply user strictly restricted to Supply PMS.');
  console.log('   ✔ Service user strictly restricted to Service PMS.\n');

  console.log('=== ALL CORE SECURITY & RBAC TESTS PASSED ===');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
