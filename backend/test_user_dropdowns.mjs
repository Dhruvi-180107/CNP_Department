/**
 * test_user_dropdowns.mjs
 * End-to-end verification script for Searchable User Dropdowns and Role Scoping.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import User from './src/models/User.js';
import Club from './src/models/Club.js';
import Project from './src/models/Project.js';
import ClubMembership from './src/models/ClubMembership.js';
import ProjectMembership from './src/models/ProjectMembership.js';
import ProjectMentor from './src/models/ProjectMentor.js';

const BASE = 'http://127.0.0.1:5000/api';

let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS — ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL — ${message}${details ? ' | ' + details : ''}`);
  }
}

async function loginUser(email, password = 'Test@12345') {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

async function req(method, path, body, token) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('\n=== RUNNING SEARCHABLE USER DROPDOWNS & ROLE SCOPING TESTS ===\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas.\n');

  let studentToken, coordToken, mentorToken, clubAdminToken, projectAdminToken;
  let testStudentUser, testStudent2User, testCoordUser, testCoord2User, testMentorUser, testMentor2User;
  let testProject, testClubManaged, testClubUnmanaged;

  try {
    // 1. Log in existing actors
    console.log('--- Phase 1: Authentication & Logins ---');
    const studentLogin = await loginUser('arjun.mehta@test.com');
    studentToken = studentLogin.token;

    const coordLogin = await loginUser('neha.verma@test.com');
    coordToken = coordLogin.token;

    const mentorLogin = await loginUser('amit.joshi@test.com');
    mentorToken = mentorLogin.token;

    const clubAdminLogin = await loginUser('karan.shah@test.com');
    clubAdminToken = clubAdminLogin.token;

    const projAdminLogin = await loginUser('vivek.malhotra@test.com');
    projectAdminToken = projAdminLogin.token;

    assert(Boolean(studentToken && coordToken && mentorToken && clubAdminToken && projectAdminToken), 'Successfully authenticated all 5 core project roles');

    // 2. Setup fresh test users and entities for isolated assertions
    console.log('\n--- Phase 2: Setup Test Data ---');
    const ts = Date.now();

    testStudentUser = await User.create({
      name: `Test Student Alpha ${ts}`,
      email: `test_std_alpha_${ts}@test.com`,
      password: 'Test@12345',
      role: 'student',
      department: 'CSE',
      semester: 4,
      universityId: `STD_A_${ts}`,
    });

    testStudent2User = await User.create({
      name: `Test Student Beta ${ts}`,
      email: `test_std_beta_${ts}@test.com`,
      password: 'Test@12345',
      role: 'student',
      department: 'ECE',
      semester: 6,
      universityId: `STD_B_${ts}`,
    });

    testCoordUser = await User.create({
      name: `Dr. Coord One ${ts}`,
      email: `test_coord_one_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_coordinator',
      department: 'Computer Science',
    });

    testCoord2User = await User.create({
      name: `Dr. Coord Two ${ts}`,
      email: `test_coord_two_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_coordinator',
      department: 'Mechanical',
    });

    testMentorUser = await User.create({
      name: `Dr. Mentor Alpha ${ts}`,
      email: `test_mentor_alpha_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_mentor',
      department: 'Computer Science',
    });

    testMentor2User = await User.create({
      name: `Dr. Mentor Beta ${ts}`,
      email: `test_mentor_beta_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_mentor',
      department: 'Electrical',
    });

    // Create test project
    testProject = await Project.create({
      name: `Dropdown Verification Project ${ts}`,
      description: 'Testing user dropdown additions',
      createdBy: projAdminLogin.user.id || projAdminLogin.user._id,
      teamLeaderId: testStudentUser._id,
      status: 'active',
    });

    // Create managed club for Dr. Neha Verma
    testClubManaged = await Club.create({
      name: `Managed Club ${ts}`,
      description: 'Club managed by Neha Verma',
      facultyCoordinatorId: coordLogin.user.id || coordLogin.user._id,
      createdBy: clubAdminLogin.user.id || clubAdminLogin.user._id,
    });

    // Create unmanaged club (managed by Dr. Coord Two)
    testClubUnmanaged = await Club.create({
      name: `Unmanaged Club ${ts}`,
      description: 'Club not managed by Neha Verma',
      facultyCoordinatorId: testCoord2User._id,
      createdBy: clubAdminLogin.user.id || clubAdminLogin.user._id,
    });

    console.log('Test fixtures created successfully.\n');

    // 3. User Listing API (GET /api/users) Security & Functionality
    console.log('--- Phase 3: GET /api/users API Security & Filtering ---');

    // 3a. Unauthenticated request should be 401
    const unauthRes = await req('GET', '/users');
    assert(unauthRes.status === 401, 'Unauthenticated request to GET /api/users is blocked with 401');

    // 3b. Student role request should be 403
    const studentGetUsersRes = await req('GET', '/users', null, studentToken);
    assert(studentGetUsersRes.status === 403, 'Student access to GET /api/users is blocked with 403 Forbidden');

    // 3c. Faculty Mentor request should be 403
    const mentorGetUsersRes = await req('GET', '/users', null, mentorToken);
    assert(mentorGetUsersRes.status === 403, 'Faculty Mentor access to GET /api/users is blocked with 403 Forbidden');

    // 3d. Project Admin fetching students
    const projAdminStudentsRes = await req('GET', '/users?role=student', null, projectAdminToken);
    assert(
      projAdminStudentsRes.status === 200 &&
      projAdminStudentsRes.data.success &&
      Array.isArray(projAdminStudentsRes.data.data) &&
      projAdminStudentsRes.data.data.every((u) => u.role === 'student'),
      'Project Admin can query registered users with role=student'
    );

    // 3e. Project Admin fetching faculty mentors
    const projAdminMentorsRes = await req('GET', '/users?role=faculty_mentor', null, projectAdminToken);
    assert(
      projAdminMentorsRes.status === 200 &&
      projAdminMentorsRes.data.success &&
      Array.isArray(projAdminMentorsRes.data.data) &&
      projAdminMentorsRes.data.data.every((u) => u.role === 'faculty_mentor'),
      'Project Admin can query registered users with role=faculty_mentor'
    );

    // 3f. Club Admin fetching faculty coordinators
    const clubAdminCoordsRes = await req('GET', '/users?role=faculty_coordinator', null, clubAdminToken);
    assert(
      clubAdminCoordsRes.status === 200 &&
      clubAdminCoordsRes.data.success &&
      Array.isArray(clubAdminCoordsRes.data.data) &&
      clubAdminCoordsRes.data.data.every((u) => u.role === 'faculty_coordinator'),
      'Club Admin can query registered users with role=faculty_coordinator'
    );

    // 3g. Faculty Coordinator querying role=student
    const coordStudentsRes = await req('GET', '/users?role=student', null, coordToken);
    assert(
      coordStudentsRes.status === 200 &&
      coordStudentsRes.data.success &&
      Array.isArray(coordStudentsRes.data.data) &&
      coordStudentsRes.data.data.every((u) => u.role === 'student'),
      'Faculty Coordinator can query registered users with role=student'
    );

    // 3h. Faculty Coordinator querying role=faculty_coordinator should be 403
    const coordIllegalQueryRes = await req('GET', '/users?role=faculty_coordinator', null, coordToken);
    assert(
      coordIllegalQueryRes.status === 403,
      'Faculty Coordinator is restricted from querying non-student roles (returns 403)'
    );

    // 3i. Sensitive fields check (No passwords, hashes, salts)
    const allFetched = projAdminStudentsRes.data.data;
    const hasSensitiveData = allFetched.some((u) => u.password !== undefined || u.hash !== undefined || u.salt !== undefined);
    assert(!hasSensitiveData, 'GET /api/users never leaks password, password hash, or sensitive tokens');

    // 3j. Search filtering by name/email
    const searchRes = await req('GET', `/users?role=student&search=${encodeURIComponent(testStudentUser.email)}`, null, projectAdminToken);
    assert(
      searchRes.status === 200 &&
      searchRes.data.data.some((u) => u._id.toString() === testStudentUser._id.toString()),
      'GET /api/users search parameter successfully filters by email'
    );

    // 4. Workflow 1: Project Admin adds Project Member
    console.log('\n--- Phase 4: Workflow 1 — Project Admin Adds Project Member ---');

    // 4a. Add valid student
    const addProjMemberRes = await req('POST', `/projects/${testProject._id}/members`, {
      studentId: testStudent2User._id.toString(),
    }, projectAdminToken);
    assert(addProjMemberRes.status === 201, 'Project Admin successfully adds an existing registered student to project (201)');

    // 4b. Reject duplicate student
    const dupProjMemberRes = await req('POST', `/projects/${testProject._id}/members`, {
      studentId: testStudent2User._id.toString(),
    }, projectAdminToken);
    assert(dupProjMemberRes.status === 409, 'Duplicate project membership attempt is rejected with 409 Conflict');

    // 4c. Reject adding non-student user (e.g. mentor)
    const invalidProjMemberRes = await req('POST', `/projects/${testProject._id}/members`, {
      studentId: testMentorUser._id.toString(),
    }, projectAdminToken);
    assert(invalidProjMemberRes.status === 400, 'Adding a non-student user as project member is rejected with 400');

    // 5. Workflow 2: Project Admin assigns Project Mentor
    console.log('\n--- Phase 5: Workflow 2 — Project Admin Assigns Project Mentor ---');

    // 5a. Assign first mentor -> primary mentor
    const assignMentor1Res = await req('POST', `/projects/${testProject._id}/mentors`, {
      mentorId: testMentorUser._id.toString(),
    }, projectAdminToken);
    assert(
      assignMentor1Res.status === 201 && assignMentor1Res.data.data.isPrimary === true,
      'Project Admin assigns first faculty mentor; automatically designated as primary mentor (201)'
    );

    // 5b. Assign second mentor -> secondary mentor
    const assignMentor2Res = await req('POST', `/projects/${testProject._id}/mentors`, {
      mentorId: testMentor2User._id.toString(),
    }, projectAdminToken);
    assert(
      assignMentor2Res.status === 201 && assignMentor2Res.data.data.isPrimary === false,
      'Project Admin assigns second faculty mentor; designated as secondary mentor (201)'
    );

    // 5c. Reject duplicate mentor assignment
    const dupMentorRes = await req('POST', `/projects/${testProject._id}/mentors`, {
      mentorId: testMentorUser._id.toString(),
    }, projectAdminToken);
    assert(dupMentorRes.status === 409, 'Duplicate mentor assignment is rejected with 409 Conflict');

    // 5d. Reject user with invalid role as mentor (e.g. student)
    const invalidMentorRes = await req('POST', `/projects/${testProject._id}/mentors`, {
      mentorId: testStudentUser._id.toString(),
    }, projectAdminToken);
    assert(invalidMentorRes.status === 403, 'Assigning user without faculty_mentor role is rejected with 403');

    // 6. Workflow 3: Club Admin assigns Faculty Coordinator
    console.log('\n--- Phase 6: Workflow 3 — Club Admin Assigns Faculty Coordinator ---');

    // 6a. Reassign coordinator to testCoordUser
    const assignCoordRes = await req('PATCH', `/clubs/${testClubManaged._id}/coordinator`, {
      facultyCoordinatorId: testCoordUser._id.toString(),
    }, clubAdminToken);
    assert(
      assignCoordRes.status === 200 &&
      assignCoordRes.data.data.facultyCoordinatorId._id.toString() === testCoordUser._id.toString(),
      'Club Admin successfully assigns faculty coordinator dynamically from registered users (200)'
    );

    // 6b. Reject assigning a student or non-coordinator as coordinator
    const invalidCoordRes = await req('PATCH', `/clubs/${testClubManaged._id}/coordinator`, {
      facultyCoordinatorId: testStudentUser._id.toString(),
    }, clubAdminToken);
    assert(invalidCoordRes.status === 400, 'Assigning a user without faculty_coordinator role is rejected with 400');

    // 7. Workflow 4: Club Admin adds Club Student
    console.log('\n--- Phase 7: Workflow 4 — Club Admin Adds Club Student ---');

    // 7a. Club Admin adds valid student
    const adminAddClubMemberRes = await req('POST', `/clubs/${testClubManaged._id}/members`, {
      studentId: testStudentUser._id.toString(),
      membershipType: 'member',
    }, clubAdminToken);
    assert(adminAddClubMemberRes.status === 201, 'Club Admin adds registered student to club (201)');

    // 7b. Duplicate rejected
    const dupClubMemberRes = await req('POST', `/clubs/${testClubManaged._id}/members`, {
      studentId: testStudentUser._id.toString(),
      membershipType: 'member',
    }, clubAdminToken);
    assert(dupClubMemberRes.status === 409, 'Duplicate club membership attempt is rejected with 409 Conflict');

    // 7c. Non-student rejected
    const nonStudentClubMemberRes = await req('POST', `/clubs/${testClubManaged._id}/members`, {
      studentId: testMentorUser._id.toString(),
      membershipType: 'member',
    }, clubAdminToken);
    assert(nonStudentClubMemberRes.status === 400, 'Adding a non-student user as club member is rejected with 400');

    // 8. Workflow 5: Faculty Coordinator adds Student to Club
    console.log('\n--- Phase 8: Workflow 5 — Faculty Coordinator Adds Student to Assigned Club ---');

    // Re-set coordinator of testClubManaged to Neha Verma
    await Club.findByIdAndUpdate(testClubManaged._id, {
      facultyCoordinatorId: coordLogin.user.id || coordLogin.user._id,
    });

    // 8a. Coordinator adds student to their assigned club
    const coordAddMemberRes = await req('POST', `/clubs/${testClubManaged._id}/members`, {
      studentId: testStudent2User._id.toString(),
      membershipType: 'core_team',
      position: 'Technical Lead',
    }, coordToken);
    assert(
      coordAddMemberRes.status === 201 &&
      coordAddMemberRes.data.data.position === 'Technical Lead',
      'Faculty Coordinator adds student with core_team position to their assigned club (201)'
    );

    // 8b. Coordinator cannot add to an unmanaged club
    const coordUnauthAddRes = await req('POST', `/clubs/${testClubUnmanaged._id}/members`, {
      studentId: testStudentUser._id.toString(),
      membershipType: 'member',
    }, coordToken);
    assert(
      coordUnauthAddRes.status === 403,
      'Faculty Coordinator trying to add student to an unmanaged club is rejected with 403 Forbidden'
    );

    // 8c. Duplicate rejected for coordinator
    const coordDupAddRes = await req('POST', `/clubs/${testClubManaged._id}/members`, {
      studentId: testStudent2User._id.toString(),
      membershipType: 'member',
    }, coordToken);
    assert(coordDupAddRes.status === 409, 'Faculty Coordinator duplicate membership attempt is rejected with 409');

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    // Cleanup test data
    console.log('\n--- Phase 9: Teardown & Clean up ---');
    if (testStudentUser) await User.findByIdAndDelete(testStudentUser._id);
    if (testStudent2User) await User.findByIdAndDelete(testStudent2User._id);
    if (testCoordUser) await User.findByIdAndDelete(testCoordUser._id);
    if (testCoord2User) await User.findByIdAndDelete(testCoord2User._id);
    if (testMentorUser) await User.findByIdAndDelete(testMentorUser._id);
    if (testMentor2User) await User.findByIdAndDelete(testMentor2User._id);
    if (testProject) {
      await ProjectMembership.deleteMany({ projectId: testProject._id });
      await ProjectMentor.deleteMany({ projectId: testProject._id });
      await Project.findByIdAndDelete(testProject._id);
    }
    if (testClubManaged) {
      await ClubMembership.deleteMany({ clubId: testClubManaged._id });
      await Club.findByIdAndDelete(testClubManaged._id);
    }
    if (testClubUnmanaged) {
      await ClubMembership.deleteMany({ clubId: testClubUnmanaged._id });
      await Club.findByIdAndDelete(testClubUnmanaged._id);
    }
    await mongoose.disconnect();
    console.log('Database disconnected.');

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  }
}

run();
