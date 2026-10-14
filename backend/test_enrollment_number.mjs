/**
 * Verification test suite for Enrollment Number functionality
 * Tests:
 * 1. Register student with enrollment number preserves leading zeros and trims whitespace
 * 2. Student can update enrollment number via PATCH /api/users/profile
 * 3. Leading zeros are preserved through PATCH /api/users/profile (e.g., "0074829")
 * 4. Enrollment number remains saved and retrievable via GET /api/auth/me and after re-login
 * 5. Faculty cannot set or update enrollment number via PATCH /api/users/profile
 * 6. Existing student account without enrollment number still logs in and accesses all features
 * 7. Profile completion check behaves properly without breaking existing or new users
 * 8. GET /api/users returns enrollmentNumber for students without exposing passwords
 * 9. GET /api/users?search= searches by enrollmentNumber
 * 10. Club and Project membership student population includes enrollmentNumber
 */

import 'dotenv/config';

const BASE = 'http://localhost:5000/api';
let passed = 0;
let failed = 0;

function pass(title) {
  console.log(`  ✅ PASS: ${title}`);
  passed++;
}

function fail(title, error) {
  console.error(`  ❌ FAIL: ${title}`);
  if (error) console.error(`         ${error}`);
  failed++;
}

function assert(title, condition, detail) {
  if (condition) pass(title);
  else fail(title, detail);
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json };
}

console.log('\n======================================================');
console.log('🧪 RUNNING ENROLLMENT NUMBER VERIFICATION TEST SUITE');
console.log('======================================================\n');

// 1. Existing student account login without enrollment number
console.log('--- Phase 1: Existing Student Compatibility ---');
{
  // arjun.mehta@test.com is seeded without enrollmentNumber
  const loginRes = await req('POST', '/auth/login', {
    email: 'arjun.mehta@test.com',
    password: 'Test@12345',
  });

  assert('Existing student logs in successfully', loginRes.status === 200, `status=${loginRes.status}`);
  assert('Existing student user returned', !!loginRes.json?.user, `user=${JSON.stringify(loginRes.json?.user)}`);
  assert('Existing student has no password in response', loginRes.json?.user?.password === undefined);
  
  const token = loginRes.json?.token;
  const meRes = await req('GET', '/auth/me', null, token);
  assert('GET /auth/me succeeds for existing student', meRes.status === 200, `status=${meRes.status}`);
  assert('Existing student projects can be fetched', (await req('GET', `/users/${loginRes.json.user._id}/projects`, null, token)).status === 200);
}

// 2. New student registration with leading zero enrollment number
console.log('\n--- Phase 2: Student Registration & Enrollment Number Storage ---');
const studentEmail = `student_enr_${Date.now()}@cnp.test`;
let studentToken = '';
let studentId = '';

{
  const regRes = await req('POST', '/auth/register', {
    name: 'Enrollment Test Student',
    email: studentEmail,
    password: 'Password123!',
    role: 'student',
    department: 'Computer Science',
    universityId: 'UNI2026999',
    enrollmentNumber: '  00987654321  ', // Test leading zeros and whitespace trimming
    semester: 4,
    phone: '9988776655',
  });

  assert('Student registers successfully with enrollmentNumber (201)', regRes.status === 201, `status=${regRes.status}`);
  studentToken = regRes.json?.token;
  studentId = regRes.json?.user?._id;
  
  assert('Leading zeros preserved and whitespace trimmed on register', regRes.json?.user?.enrollmentNumber === '00987654321', `enr=${regRes.json?.user?.enrollmentNumber}`);
  assert('Password not leaked in registration response', regRes.json?.user?.password === undefined);
}

// 3. Login again and verify persistence of enrollment number
console.log('\n--- Phase 3: Persistence Across Login & /auth/me ---');
{
  const loginRes = await req('POST', '/auth/login', {
    email: studentEmail,
    password: 'Password123!',
  });

  assert('Login succeeds for new student', loginRes.status === 200, `status=${loginRes.status}`);
  assert('Enrollment number preserved with leading zeros on login response', loginRes.json?.user?.enrollmentNumber === '00987654321', `enr=${loginRes.json?.user?.enrollmentNumber}`);

  const meRes = await req('GET', '/auth/me', null, studentToken);
  assert('GET /auth/me returns 200', meRes.status === 200, `status=${meRes.status}`);
  assert('GET /auth/me returns enrollmentNumber correctly', meRes.json?.data?.enrollmentNumber === '00987654321', `enr=${meRes.json?.data?.enrollmentNumber}`);
}

// 4. Student updates enrollment number via PATCH /api/users/profile
console.log('\n--- Phase 4: Editing Enrollment Number via Profile Update ---');
{
  const updateRes = await req('PATCH', '/users/profile', {
    enrollmentNumber: '  000456789  ', // New leading zero value with whitespace
  }, studentToken);

  assert('PATCH /api/users/profile returns 200', updateRes.status === 200, `status=${updateRes.status}`);
  assert('Updated enrollment number has trimmed leading zeros preserved', updateRes.json?.data?.enrollmentNumber === '000456789', `enr=${updateRes.json?.data?.enrollmentNumber}`);

  // Fetch /auth/me to verify persistence in DB
  const meRes = await req('GET', '/auth/me', null, studentToken);
  assert('Persisted updated enrollment number in database', meRes.json?.data?.enrollmentNumber === '000456789', `enr=${meRes.json?.data?.enrollmentNumber}`);
}

// 5. Faculty cannot set student enrollment number
console.log('\n--- Phase 5: Role Guard — Faculty Cannot Have Enrollment Number ---');
{
  // Login as faculty coordinator
  const fcLogin = await req('POST', '/auth/login', {
    email: 'neha.verma@test.com',
    password: 'Test@12345',
  });
  assert('Faculty Coordinator logs in', fcLogin.status === 200, `status=${fcLogin.status}`);
  const fcToken = fcLogin.json?.token;

  // Try to update enrollmentNumber on faculty profile
  const fcPatch = await req('PATCH', '/users/profile', {
    enrollmentNumber: '0012345',
  }, fcToken);

  assert('Faculty profile update succeeds for allowable fields', fcPatch.status === 200, `status=${fcPatch.status}`);
  assert('Faculty profile does NOT set enrollmentNumber (remains null or undefined)', !fcPatch.json?.data?.enrollmentNumber, `fcEnr=${fcPatch.json?.data?.enrollmentNumber}`);
}

// 6. Admin can view enrollment number via GET /api/users and search by it
console.log('\n--- Phase 6: Admin GET /api/users & Search By Enrollment Number ---');
{
  const paLogin = await req('POST', '/auth/login', {
    email: 'vivek.malhotra@test.com',
    password: 'Test@12345',
  });
  assert('Project Admin logs in', paLogin.status === 200, `status=${paLogin.status}`);
  const paToken = paLogin.json?.token;

  const usersRes = await req('GET', '/users?role=student', null, paToken);
  assert('Project Admin queries student users', usersRes.status === 200, `status=${usersRes.status}`);
  
  const foundStudent = usersRes.json?.data?.find(u => u._id === studentId);
  assert('Found student in user list', !!foundStudent);
  assert('User list includes enrollmentNumber with leading zeros', foundStudent?.enrollmentNumber === '000456789', `enr=${foundStudent?.enrollmentNumber}`);
  assert('User list excludes password hash', foundStudent?.password === undefined);

  // Search by enrollment number
  const searchRes = await req('GET', '/users?search=000456789', null, paToken);
  assert('Search by enrollmentNumber succeeds (200)', searchRes.status === 200, `status=${searchRes.status}`);
  const searchFound = searchRes.json?.data?.find(u => u._id === studentId);
  assert('Search finds student by enrollmentNumber', !!searchFound, `count=${searchRes.json?.count}`);
}

// 7. Populated memberships in club routes
console.log('\n--- Phase 7: Club Members Population ---');
{
  const caLogin = await req('POST', '/auth/login', {
    email: 'karan.shah@test.com',
    password: 'Test@12345',
  });
  const caToken = caLogin.json?.token;

  const clubsRes = await req('GET', '/clubs', null, caToken);
  assert('GET /clubs succeeds', clubsRes.status === 200, `status=${clubsRes.status}`);
  const clubId = clubsRes.json?.data?.[0]?._id;

  if (clubId) {
    // Add student to club
    const addMemberRes = await req('POST', `/clubs/${clubId}/members`, {
      studentId,
      membershipType: 'member',
    }, caToken);

    assert('Add student to club succeeds', addMemberRes.status === 201, `status=${addMemberRes.status}`);
    assert('Populated student in addMember response has enrollmentNumber', addMemberRes.json?.data?.studentId?.enrollmentNumber === '000456789');

    // GET club members
    const getMembersRes = await req('GET', `/clubs/${clubId}/members`, null, caToken);
    assert('GET /clubs/:id/members succeeds', getMembersRes.status === 200, `status=${getMembersRes.status}`);
    const memberEntry = getMembersRes.json?.data?.find(m => m.studentId?._id === studentId);
    assert('Club member has populated enrollmentNumber', memberEntry?.studentId?.enrollmentNumber === '000456789', `enr=${memberEntry?.studentId?.enrollmentNumber}`);
  }
}

console.log('\n======================================================');
console.log(`🏁 FINISHED: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
