// Test script to verify authentication is working
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:4000';

async function testAuth() {
  console.log('🧪 Testing Authentication System\n');

  // Test 1: Signup
  console.log('1️⃣ Testing Signup...');
  const signupRes = await fetch(`${SERVER_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser', password: 'test123' }),
  });
  const signupData = await signupRes.json();
  console.log('   Signup Result:', signupData);
  console.log('   ✅ Signup should succeed\n');

  // Test 2: Duplicate Signup
  console.log('2️⃣ Testing Duplicate Signup...');
  const dupSignupRes = await fetch(`${SERVER_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser', password: 'test123' }),
  });
  const dupSignupData = await dupSignupRes.json();
  console.log('   Duplicate Signup Result:', dupSignupData);
  console.log('   ✅ Should say "Username already taken"\n');

  // Test 3: Login with correct password
  console.log('3️⃣ Testing Login with Correct Password...');
  const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser', password: 'test123' }),
  });
  const loginData = await loginRes.json();
  console.log('   Login Result:', loginData);
  console.log('   ✅ Login should succeed with token\n');

  // Test 4: Login with wrong password
  console.log('4️⃣ Testing Login with Wrong Password...');
  const wrongLoginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser', password: 'wrongpass' }),
  });
  const wrongLoginData = await wrongLoginRes.json();
  console.log('   Wrong Password Result:', wrongLoginData);
  console.log('   ✅ Should say "Invalid username or password"\n');

  // Test 5: Login with non-existent user
  console.log('5️⃣ Testing Login with Non-existent User...');
  const noUserRes = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'nobody', password: 'test123' }),
  });
  const noUserData = await noUserRes.json();
  console.log('   Non-existent User Result:', noUserData);
  console.log('   ✅ Should say "Invalid username or password"\n');

  console.log('✅ All tests complete!');
}

testAuth().catch(console.error);
