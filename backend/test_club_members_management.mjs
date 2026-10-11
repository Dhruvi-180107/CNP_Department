import 'dotenv/config';
import mongoose from 'mongoose';
import Club from './src/models/Club.js';
import User from './src/models/User.js';
import ClubMembership from './src/models/ClubMembership.js';

const API_URL = 'http://localhost:5000/api';

async function getToken(email) {
  const res = await fetch(API_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test@12345' })
  });
  const data = await res.json();
  return data.token;
}

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI);

  const admin = await User.findOne({ email: 'karan.shah@test.com' });
  const fc1 = await User.findOne({ email: 'neha.verma@test.com' });
  const fc2 = await User.findOne({ email: 'rahul.desai@test.com' });
  const student1 = await User.findOne({ email: 'ananya.singh@test.com' });
  
  if (!admin || !fc1 || !fc2 || !student1) {
    console.error('Test users not found. Ensure seeds are run.');
    process.exit(1);
  }

  const tokenAdmin = await getToken(admin.email);
  const tokenFc1 = await getToken(fc1.email);
  const tokenFc2 = await getToken(fc2.email);
  const tokenStudent = await getToken(student1.email);

  const club1 = await Club.findOne({ facultyCoordinatorId: fc1._id });
  const club2 = await Club.findOne({ facultyCoordinatorId: fc2._id });

  if (!club1 || !club2) {
    console.error('Test clubs not found.');
    process.exit(1);
  }

  // Save original memberships to restore at the end
  const originalMembership1 = await ClubMembership.findOne({ studentId: student1._id, clubId: club1._id }).lean();
  const originalMembership2 = await ClubMembership.findOne({ studentId: student1._id, clubId: club2._id }).lean();

  let membership = await ClubMembership.findOne({ studentId: student1._id, clubId: club1._id });
  if (!membership) {
    membership = await ClubMembership.create({ studentId: student1._id, clubId: club1._id, membershipType: 'member' });
  }

  console.log('--- Running Tests ---');

  let res = await fetch(API_URL + '/clubs/' + club1._id + '/members/' + student1._id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + tokenStudent }
  });
  console.assert(res.status === 403, 'H. Student cannot delete (Expected 403)');

  res = await fetch(API_URL + '/clubs/' + club1._id + '/members/' + student1._id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + tokenFc2 }
  });
  console.assert(res.status === 403, 'B. FC cannot delete from another club (Expected 403)');

  res = await fetch(API_URL + '/clubs/' + club1._id + '/members/' + student1._id, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + tokenFc2, 'Content-Type': 'application/json' },
    body: JSON.stringify({ membershipType: 'core_team' })
  });
  console.assert(res.status === 403, 'G. FC cannot modify another club (Expected 403)');

  res = await fetch(API_URL + '/clubs/' + club1._id + '/members/' + student1._id, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + tokenFc1, 'Content-Type': 'application/json' },
    body: JSON.stringify({ membershipType: 'invalid_type' })
  });
  console.assert(res.status === 400, 'J. Invalid membershipType returns 400');

  res = await fetch(API_URL + '/clubs/' + club1._id + '/members/' + student1._id, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + tokenFc1, 'Content-Type': 'application/json' },
    body: JSON.stringify({ membershipType: 'core_team' })
  });
  console.assert(res.status === 200, 'D. FC can change member -> core_team');

  res = await fetch(API_URL + '/clubs/' + club1._id + '/members/' + student1._id, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + tokenFc1, 'Content-Type': 'application/json' },
    body: JSON.stringify({ position: 'Senior Wizard' })
  });
  let json = await res.json();
  console.assert(res.status === 200 && json.data.position === 'Senior Wizard', 'F. FC can update position');

  res = await fetch(API_URL + '/clubs/' + club1._id + '/members/' + student1._id, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + tokenFc1, 'Content-Type': 'application/json' },
    body: JSON.stringify({ membershipType: 'member', position: null })
  });
  console.assert(res.status === 200, 'E. FC can change core_team -> member');

  res = await fetch(API_URL + '/clubs/' + club1._id + '/members/' + student1._id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + tokenFc1 }
  });
  console.assert(res.status === 200, 'A. FC can remove member from assigned club');

  res = await fetch(API_URL + '/clubs/' + club1._id + '/members/' + student1._id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + tokenFc1 }
  });
  console.assert(res.status === 404, 'I. Missing membership returns 404');

  let membership2 = await ClubMembership.findOne({ studentId: student1._id, clubId: club2._id });
  if (!membership2) {
    membership2 = await ClubMembership.create({ studentId: student1._id, clubId: club2._id, membershipType: 'member' });
  }
  res = await fetch(API_URL + '/clubs/' + club2._id + '/members/' + student1._id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + tokenAdmin }
  });
  console.assert(res.status === 200, 'C. Club Admin can remove member from any club');

  console.log('--- Restoring State ---');
  await ClubMembership.deleteOne({ studentId: student1._id, clubId: club1._id });
  await ClubMembership.deleteOne({ studentId: student1._id, clubId: club2._id });

  if (originalMembership1) {
    await ClubMembership.create({
      studentId: student1._id,
      clubId: club1._id,
      membershipType: originalMembership1.membershipType,
      position: originalMembership1.position,
      joinedAt: originalMembership1.joinedAt
    });
  }
  
  if (originalMembership2) {
    await ClubMembership.create({
      studentId: student1._id,
      clubId: club2._id,
      membershipType: originalMembership2.membershipType,
      position: originalMembership2.position,
      joinedAt: originalMembership2.joinedAt
    });
  }

  console.log('All tests finished.');
  process.exit(0);
}

runTests().catch(console.error);
