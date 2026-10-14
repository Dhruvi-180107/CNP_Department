import 'dotenv/config';
import mongoose from 'mongoose';
import Club from './src/models/Club.js';
import User from './src/models/User.js';
import ClubMembership from './src/models/ClubMembership.js';

const API_URL = 'http://localhost:5000/api';

async function getToken(email, password = 'Test@12345') {
  const res = await fetch(API_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${data.message}`);
  }
  return data.token;
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB for testing...');

  const fcNeha = await User.findOne({ email: 'neha.verma@test.com' });
  const fcRahul = await User.findOne({ email: 'rahul.desai@test.com' });
  const admin = await User.findOne({ email: 'karan.shah@test.com' });
  const student = await User.findOne({ email: 'arjun.mehta@test.com' });

  assert(fcNeha && fcRahul && admin && student, 'All test users exist');

  const tokenNeha = await getToken(fcNeha.email);
  const tokenRahul = await getToken(fcRahul.email);
  const tokenAdmin = await getToken(admin.email);
  const tokenStudent = await getToken(student.email);

  const dbNehaClubs = await Club.find({ facultyCoordinatorId: fcNeha._id });
  console.log(`Neha is currently assigned to ${dbNehaClubs.length} clubs in DB: ${dbNehaClubs.map(c => c.name).join(', ')}`);

  console.log('\n--- Test 1 & 2: Coordinator assigned to multiple clubs sees EVERY assigned club dynamically ---');
  const resNehaClubs = await fetch(`${API_URL}/clubs?coordinatorId=${fcNeha._id}`, {
    headers: { Authorization: `Bearer ${tokenNeha}` }
  });
  assert(resNehaClubs.status === 200, 'GET /clubs?coordinatorId returns 200 for coordinator own ID');
  const nehaClubsData = await resNehaClubs.json();
  assert(nehaClubsData.success === true, 'Response success is true');
  assert(Array.isArray(nehaClubsData.data), 'Response data is an array');
  assert(
    nehaClubsData.data.length === dbNehaClubs.length && nehaClubsData.data.length >= 2,
    `Coordinator sees every assigned club (${nehaClubsData.data.length} clubs, matches DB ${dbNehaClubs.length})`
  );

  const returnedIds = nehaClubsData.data.map(c => c._id.toString()).sort();
  const expectedIds = dbNehaClubs.map(c => c._id.toString()).sort();
  assert(
    JSON.stringify(returnedIds) === JSON.stringify(expectedIds),
    'All assigned club IDs match the database records exactly'
  );

  console.log('\n--- Test 3: Member and core team counts are correct and distinct per club ---');
  for (const club of nehaClubsData.data) {
    const mems = await ClubMembership.find({ clubId: club._id });
    const coreCount = mems.filter(m => m.membershipType === 'core_team').length;
    const regCount = mems.filter(m => m.membershipType !== 'core_team').length;

    assert(
      club.totalMembers === mems.length,
      `Club "${club.name}" totalMembers matches DB (${club.totalMembers} === ${mems.length})`
    );
    assert(
      club.coreTeamCount === coreCount,
      `Club "${club.name}" coreTeamCount matches DB (${club.coreTeamCount} === ${coreCount})`
    );
    assert(
      club.regularMemberCount === regCount,
      `Club "${club.name}" regularMemberCount matches DB (${club.regularMemberCount} === ${regCount})`
    );
  }

  console.log('\n--- Test 4: Dedicated /coordinators/:id/clubs & /clubs/coordinator/:id endpoints ---');
  const resNehaCoord = await fetch(`${API_URL}/coordinators/${fcNeha._id}/clubs`, {
    headers: { Authorization: `Bearer ${tokenNeha}` }
  });
  assert(resNehaCoord.status === 200, 'GET /coordinators/:id/clubs returns 200');
  const coordData = await resNehaCoord.json();
  assert(coordData.data.length === dbNehaClubs.length, `GET /coordinators/:id/clubs returns all ${dbNehaClubs.length} clubs`);

  const resNehaClubsCoord = await fetch(`${API_URL}/clubs/coordinator/${fcNeha._id}`, {
    headers: { Authorization: `Bearer ${tokenNeha}` }
  });
  assert(resNehaClubsCoord.status === 200, 'GET /clubs/coordinator/:id returns 200');
  const clubsCoordData = await resNehaClubsCoord.json();
  assert(clubsCoordData.data.length === dbNehaClubs.length, `GET /clubs/coordinator/:id returns all ${dbNehaClubs.length} clubs`);

  console.log('\n--- Test 5: ?coordinatorId=me support ---');
  const resMe = await fetch(`${API_URL}/clubs?coordinatorId=me`, {
    headers: { Authorization: `Bearer ${tokenNeha}` }
  });
  assert(resMe.status === 200, 'GET /clubs?coordinatorId=me returns 200');
  const meData = await resMe.json();
  assert(meData.data.length === dbNehaClubs.length, `GET /clubs?coordinatorId=me returns all ${dbNehaClubs.length} clubs`);

  console.log('\n--- Test 6: Authorization - Coordinator CANNOT view another coordinator\'s clubs ---');
  const resForbidden = await fetch(`${API_URL}/clubs?coordinatorId=${fcRahul._id}`, {
    headers: { Authorization: `Bearer ${tokenNeha}` }
  });
  assert(resForbidden.status === 403, 'Neha cannot view Rahul\'s clubs via query param (403)');

  const resForbiddenPath = await fetch(`${API_URL}/coordinators/${fcRahul._id}/clubs`, {
    headers: { Authorization: `Bearer ${tokenNeha}` }
  });
  assert(resForbiddenPath.status === 403, 'Neha cannot view Rahul\'s clubs via /coordinators path (403)');

  const resForbiddenPath2 = await fetch(`${API_URL}/clubs/coordinator/${fcRahul._id}`, {
    headers: { Authorization: `Bearer ${tokenNeha}` }
  });
  assert(resForbiddenPath2.status === 403, 'Neha cannot view Rahul\'s clubs via /clubs/coordinator path (403)');

  const resStudentForbidden = await fetch(`${API_URL}/clubs?coordinatorId=${fcNeha._id}`, {
    headers: { Authorization: `Bearer ${tokenStudent}` }
  });
  assert(resStudentForbidden.status === 403, 'Student cannot filter clubs by coordinator (403)');

  console.log('\n--- Test 7: Coordinator sees NO clubs assigned to other coordinators ---');
  const rahulClubs = await Club.find({ facultyCoordinatorId: fcRahul._id });
  const rahulClubIds = rahulClubs.map(c => c._id.toString());
  const nehaReturnedIds = nehaClubsData.data.map(c => c._id.toString());
  const hasOverlap = rahulClubIds.some(id => nehaReturnedIds.includes(id));
  assert(!hasOverlap, 'Neha dashboard contains zero clubs belonging to Rahul');

  console.log('\n--- Test 8: Club Admin can view any coordinator\'s clubs and all clubs ---');
  const resAdminView = await fetch(`${API_URL}/clubs?coordinatorId=${fcNeha._id}`, {
    headers: { Authorization: `Bearer ${tokenAdmin}` }
  });
  assert(resAdminView.status === 200, 'Admin can view Neha\'s clubs (200)');
  const adminViewData = await resAdminView.json();
  assert(adminViewData.data.length === dbNehaClubs.length, `Admin receives ${dbNehaClubs.length} clubs for Neha`);

  const resAllClubs = await fetch(`${API_URL}/clubs`, {
    headers: { Authorization: `Bearer ${tokenAdmin}` }
  });
  assert(resAllClubs.status === 200, 'Admin can view all clubs (200)');
  const allClubsData = await resAllClubs.json();
  assert(allClubsData.data.length >= 3, 'All clubs returned (at least 3)');
  assert(
    allClubsData.data.every(c => typeof c.totalMembers === 'number' && typeof c.coreTeamCount === 'number'),
    'All clubs in GET /clubs have totalMembers and coreTeamCount attached'
  );

  console.log('\n--- Test 9: Reassigning a club removes it from old coordinator and adds to new coordinator ---');
  const codingClub = await Club.findOne({ name: 'Coding Club' });
  const originalCodingCoordinator = codingClub.facultyCoordinatorId;

  // Reassign Coding Club to Neha
  const reassignToNehaRes = await fetch(`${API_URL}/clubs/${codingClub._id}/coordinator`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenAdmin}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ facultyCoordinatorId: fcNeha._id.toString() })
  });
  assert(reassignToNehaRes.status === 200, 'Admin reassigns Coding Club to Neha (200)');

  // Now Neha has +1 club
  const resNehaPlus1 = await fetch(`${API_URL}/clubs?coordinatorId=${fcNeha._id}`, {
    headers: { Authorization: `Bearer ${tokenNeha}` }
  });
  const nehaPlus1Data = await resNehaPlus1.json();
  assert(
    nehaPlus1Data.data.length === dbNehaClubs.length + 1,
    `Neha now sees ${dbNehaClubs.length + 1} clubs (previously ${dbNehaClubs.length})`
  );
  assert(nehaPlus1Data.data.some(c => c.name === 'Coding Club'), 'Coding Club is immediately present in Neha dashboard');

  // Rahul lost Coding Club
  const resRahulMinus1 = await fetch(`${API_URL}/clubs?coordinatorId=${fcRahul._id}`, {
    headers: { Authorization: `Bearer ${tokenRahul}` }
  });
  const rahulMinus1Data = await resRahulMinus1.json();
  assert(!rahulMinus1Data.data.some(c => c.name === 'Coding Club'), 'Coding Club removed from Rahul dashboard');

  // Reassign Coding Club back to Rahul
  const reassignBackRes = await fetch(`${API_URL}/clubs/${codingClub._id}/coordinator`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenAdmin}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ facultyCoordinatorId: originalCodingCoordinator.toString() })
  });
  assert(reassignBackRes.status === 200, 'Admin reassigns Coding Club back to Rahul (200)');

  const resNehaRestored = await fetch(`${API_URL}/clubs?coordinatorId=${fcNeha._id}`, {
    headers: { Authorization: `Bearer ${tokenNeha}` }
  });
  const nehaRestoredData = await resNehaRestored.json();
  assert(nehaRestoredData.data.length === dbNehaClubs.length, 'Neha clubs count restored');
  assert(!nehaRestoredData.data.some(c => c.name === 'Coding Club'), 'Coding Club removed from Neha');

  const resRahulRestored = await fetch(`${API_URL}/clubs?coordinatorId=${fcRahul._id}`, {
    headers: { Authorization: `Bearer ${tokenRahul}` }
  });
  const rahulRestoredData = await resRahulRestored.json();
  assert(rahulRestoredData.data.some(c => c.name === 'Coding Club'), 'Coding Club restored to Rahul');

  console.log('\n--- Test 10: Coordinator with 0 assigned clubs ---');
  const tempCoordEmail = `temp.fc.${Date.now()}@test.com`;
  const tempCoord = await User.create({
    name: 'Dr. Zero Clubs Coordinator',
    email: tempCoordEmail,
    password: 'Password@123',
    role: 'faculty_coordinator',
    department: 'Computer Science'
  });
  const tokenTemp = await getToken(tempCoordEmail, 'Password@123');

  const resTemp0 = await fetch(`${API_URL}/clubs?coordinatorId=${tempCoord._id}`, {
    headers: { Authorization: `Bearer ${tokenTemp}` }
  });
  assert(resTemp0.status === 200, 'Coordinator with 0 clubs gets 200');
  const temp0Data = await resTemp0.json();
  assert(temp0Data.success === true, 'Response success is true');
  assert(Array.isArray(temp0Data.data), 'Response data is an array');
  assert(temp0Data.data.length === 0, 'Response array is empty (0 clubs assigned)');

  // Clean up temporary user
  await User.deleteOne({ _id: tempCoord._id });

  console.log(`\n========================================`);
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Test suite failed with error:', err);
  process.exit(1);
});
