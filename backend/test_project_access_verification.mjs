import mongoose from 'mongoose';

const BASE = 'http://localhost:5000/api';
let passed = 0;
let failed = 0;

function assert(cond, msg, detail = '') {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}${detail ? ' | ' + detail : ''}`);
    failed++;
  }
}

const login = async (email, password = 'Test@12345') => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
};

async function run() {
  console.log('\n=== RUNNING PROJECT ACCESS & PERMISSIONS VERIFICATION ===\n');

  // Test users
  const studentMember = await login('arjun.mehta@test.com'); // TL of Smart Irrigation
  const studentNonMember = await login('ananya.singh@test.com'); // Student, not member
  const mentorAssigned = await login('amit.joshi@test.com'); // Assigned to Smart Irrigation
  const mentorUnassigned = await login('priya.nair@test.com'); // Mentor
  const projectAdmin = await login('vivek.malhotra@test.com'); // Project Admin
  const facultyCoord = await login('neha.verma@test.com'); // Faculty Coordinator
  const clubAdmin = await login('karan.shah@test.com'); // Club Admin

  // 1. Unauthenticated requests are rejected with 401
  console.log('\n--- 1. Testing Unauthenticated Requests ---');
  const unauthRes = await fetch(`${BASE}/projects`);
  assert(unauthRes.status === 401, 'GET /projects without token returns 401');
  const unauthDetailRes = await fetch(`${BASE}/projects/6acb6e6afa67e09d6e8969db`);
  assert(unauthDetailRes.status === 401, 'GET /projects/:id without token returns 401');

  // 2. Student (non-member) can browse all projects and open project details
  console.log('\n--- 2. Testing Student (Non-Member) Browse & View Details ---');
  const studentBrowseRes = await fetch(`${BASE}/projects`, {
    headers: { Authorization: `Bearer ${studentNonMember.token}` }
  });
  const studentBrowseData = await studentBrowseRes.json();
  assert(studentBrowseRes.status === 200, 'Student can browse projects (status 200)');
  assert(Array.isArray(studentBrowseData.data) && studentBrowseData.data.length > 0, 'Student receives projects list');

  const projectId = studentBrowseData.data.find(p => p.name === 'Smart Irrigation System')?._id || studentBrowseData.data[0]._id;
  const studentDetailRes = await fetch(`${BASE}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${studentNonMember.token}` }
  });
  const studentDetailData = await studentDetailRes.json();
  assert(studentDetailRes.status === 200, 'Student can open project details (status 200)');
  assert(studentDetailData.data?.name !== undefined, 'Project details include name');
  assert(studentDetailData.data?.teamLeaderId !== undefined, 'Project details include teamLeaderId');

  // 3. Student (non-member) CANNOT perform restricted project actions
  console.log('\n--- 3. Testing Student (Non-Member) Restricted Action Guards ---');
  // Cannot add material
  const addMatRes = await fetch(`${BASE}/projects/${projectId}/materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentNonMember.token}` },
    body: JSON.stringify({ name: 'Hacked Component', quantity: 1, source: 'self_purchased' })
  });
  assert(addMatRes.status === 403, 'Non-member student rejected when adding material (status 403)');

  // Cannot post update
  const addUpdRes = await fetch(`${BASE}/projects/${projectId}/updates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentNonMember.token}` },
    body: JSON.stringify({ title: 'Hacked Update', description: 'desc' })
  });
  assert(addUpdRes.status === 403, 'Non-member student rejected when posting update (status 403)');

  // Cannot update project details
  const patchProjRes = await fetch(`${BASE}/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentNonMember.token}` },
    body: JSON.stringify({ name: 'Hacked Project Name' })
  });
  assert(patchProjRes.status === 403, 'Non-member student rejected when modifying project (status 403)');

  // 4. Assigned Faculty Mentor access
  console.log('\n--- 4. Testing Assigned Faculty Mentor Access ---');
  const mentorProjectsRes = await fetch(`${BASE}/mentors/${mentorAssigned.user._id}/projects`, {
    headers: { Authorization: `Bearer ${mentorAssigned.token}` }
  });
  const mentorProjectsData = await mentorProjectsRes.json();
  assert(mentorProjectsRes.status === 200, 'Assigned mentor can fetch assigned projects (status 200)');
  assert(Array.isArray(mentorProjectsData.data), 'Mentor receives assigned projects array');

  // Assigned mentor reading materials of assigned project
  const mentorMatRes = await fetch(`${BASE}/projects/${projectId}/materials`, {
    headers: { Authorization: `Bearer ${mentorAssigned.token}` }
  });
  assert(mentorMatRes.status === 200, 'Assigned mentor can read materials of assigned project (status 200)');

  // Mentor CANNOT add materials (read-only for materials)
  const mentorAddMatRes = await fetch(`${BASE}/projects/${projectId}/materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mentorAssigned.token}` },
    body: JSON.stringify({ name: 'Mentor Pipe', quantity: 1, source: 'self_purchased' })
  });
  assert(mentorAddMatRes.status === 403, 'Mentor rejected when adding material (status 403)');

  // 5. Project Admin access and management
  console.log('\n--- 5. Testing Project Admin Access & Management ---');
  const adminProjRes = await fetch(`${BASE}/projects`, {
    headers: { Authorization: `Bearer ${projectAdmin.token}` }
  });
  assert(adminProjRes.status === 200, 'Project Admin can browse all projects (status 200)');

  const adminMatRes = await fetch(`${BASE}/projects/${projectId}/materials`, {
    headers: { Authorization: `Bearer ${projectAdmin.token}` }
  });
  assert(adminMatRes.status === 200, 'Project Admin can view materials across projects (status 200)');

  // 6. Faculty Coordinator & Club Admin permissions preserved
  console.log('\n--- 6. Testing Faculty Coordinator & Club Admin Permissions ---');
  const fcProjRes = await fetch(`${BASE}/projects`, {
    headers: { Authorization: `Bearer ${facultyCoord.token}` }
  });
  assert(fcProjRes.status === 200, 'Faculty Coordinator can browse projects (status 200)');

  const caProjRes = await fetch(`${BASE}/projects`, {
    headers: { Authorization: `Bearer ${clubAdmin.token}` }
  });
  assert(caProjRes.status === 200, 'Club Admin can browse projects (status 200)');

  // Faculty Coordinator CANNOT mutate projects (not a Project Admin)
  const fcMutateRes = await fetch(`${BASE}/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${facultyCoord.token}` },
    body: JSON.stringify({ name: 'Coordinator Rename' })
  });
  assert(fcMutateRes.status === 403, 'Faculty Coordinator cannot modify projects (status 403)');

  // Club Admin CANNOT mutate projects (not a Project Admin)
  const caMutateRes = await fetch(`${BASE}/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clubAdmin.token}` },
    body: JSON.stringify({ name: 'Club Admin Rename' })
  });
  assert(caMutateRes.status === 403, 'Club Admin cannot modify projects (status 403)');

  // 7. Invalid project IDs return correct errors
  console.log('\n--- 7. Testing Invalid Project IDs ---');
  const invalidIdRes = await fetch(`${BASE}/projects/invalid-id-format-xyz`, {
    headers: { Authorization: `Bearer ${studentNonMember.token}` }
  });
  const invalidIdData = await invalidIdRes.json();
  assert(invalidIdRes.status === 400, 'Malformed project ID returns 400');
  assert(invalidIdData.message === 'Invalid project ID format', 'Message is "Invalid project ID format"');

  const nonExistentIdRes = await fetch(`${BASE}/projects/6acb75ae5ddcdaf007d61ba9`, {
    headers: { Authorization: `Bearer ${studentNonMember.token}` }
  });
  const nonExistentData = await nonExistentIdRes.json();
  assert(nonExistentIdRes.status === 404, 'Non-existent project ID returns 404');
  assert(nonExistentData.message === 'Project not found', 'Message is "Project not found"');

  console.log('\n=========================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=========================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
