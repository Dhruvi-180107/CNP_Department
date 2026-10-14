import mongoose from 'mongoose';

const BASE = 'http://localhost:5000/api';
let passed = 0;
let failed = 0;

function assert(condition, message, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}${detail ? ' | ' + detail : ''}`);
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

async function runRegressionSuite() {
  console.log('\n======================================================================');
  console.log(' RUNNING 403 FORBIDDEN REGRESSION TEST SUITE FOR PROJECT ENDPOINTS');
  console.log('======================================================================\n');

  // Authenticate accounts for each relevant role
  const projectAdmin = await login('vivek.malhotra@test.com');
  const assignedMentor = await login('amit.joshi@test.com');
  const unassignedMentor = await login('priya.nair@test.com'); // Unassigned for Campus Energy Monitor
  const studentTL = await login('arjun.mehta@test.com'); // TL of Smart Irrigation
  const studentMember = await login('riya.sharma@test.com'); // Member of Smart Irrigation
  const studentUnrelated = await login('ananya.singh@test.com'); // Non-member of Smart Irrigation
  const facultyCoord = await login('neha.verma@test.com');
  const clubAdmin = await login('karan.shah@test.com');

  // Fetch project IDs
  const pListRes = await fetch(`${BASE}/projects`, {
    headers: { Authorization: `Bearer ${projectAdmin.token}` }
  });
  const pList = await pListRes.json();
  const smartIrrigation = pList.data.find(p => p.name === 'Smart Irrigation System');
  const energyMonitor = pList.data.find(p => p.name === 'Campus Energy Monitor');

  const p1Id = smartIrrigation._id;
  const p2Id = energyMonitor._id;

  console.log(`Smart Irrigation ID: ${p1Id}`);
  console.log(`Campus Energy Monitor ID: ${p2Id}`);

  // 1. Missing authentication returns 401
  console.log('\n--- 1. Testing Unauthenticated Requests (401 Expected) ---');
  for (const ep of [
    `/projects/${p1Id}/updates`,
    `/projects/${p1Id}/materials`,
    `/projects/${p1Id}/feedback`,
    `/material-requests/project/${p1Id}`
  ]) {
    const res = await fetch(`${BASE}${ep}`);
    assert(res.status === 401, `GET ${ep} without token returns 401`);
  }

  // 2. Project Admin can read all four resource types for ANY project
  console.log('\n--- 2. Testing Project Admin Global Read Access (200 Expected) ---');
  for (const projId of [p1Id, p2Id]) {
    for (const ep of [
      `/projects/${projId}/updates`,
      `/projects/${projId}/materials`,
      `/projects/${projId}/feedback`,
      `/material-requests/project/${projId}`
    ]) {
      const res = await fetch(`${BASE}${ep}`, {
        headers: { Authorization: `Bearer ${projectAdmin.token}` }
      });
      assert(res.status === 200, `Project Admin can read ${ep} (status 200)`);
    }
  }

  // 3. Assigned Faculty Mentor can read all four resource types for their assigned project
  console.log('\n--- 3. Testing Assigned Faculty Mentor Read Access (200 Expected) ---');
  for (const ep of [
    `/projects/${p1Id}/updates`,
    `/projects/${p1Id}/materials`,
    `/projects/${p1Id}/feedback`,
    `/material-requests/project/${p1Id}`
  ]) {
    const res = await fetch(`${BASE}${ep}`, {
      headers: { Authorization: `Bearer ${assignedMentor.token}` }
    });
    assert(res.status === 200, `Assigned Mentor can read ${ep} (status 200)`);
  }

  // 4. Project Member (student) can read resources permitted by existing student rules
  console.log('\n--- 4. Testing Project Member (Student) Read Access (200 Expected) ---');
  for (const ep of [
    `/projects/${p1Id}/updates`,
    `/projects/${p1Id}/materials`,
    `/projects/${p1Id}/feedback`,
    `/material-requests/project/${p1Id}`
  ]) {
    const res = await fetch(`${BASE}${ep}`, {
      headers: { Authorization: `Bearer ${studentMember.token}` }
    });
    assert(res.status === 200, `Project Member can read ${ep} (status 200)`);
  }

  // 5. Team Leader can read all four resource types
  console.log('\n--- 5. Testing Team Leader (Student) Read Access (200 Expected) ---');
  for (const ep of [
    `/projects/${p1Id}/updates`,
    `/projects/${p1Id}/materials`,
    `/projects/${p1Id}/feedback`,
    `/material-requests/project/${p1Id}`
  ]) {
    const res = await fetch(`${BASE}${ep}`, {
      headers: { Authorization: `Bearer ${studentTL.token}` }
    });
    assert(res.status === 200, `Team Leader can read ${ep} (status 200)`);
  }

  // 6. Unrelated Student cannot read member-restricted resources (403 Expected)
  console.log('\n--- 6. Testing Unrelated Student Read Access (403 Expected) ---');
  for (const ep of [
    `/projects/${p1Id}/updates`,
    `/projects/${p1Id}/materials`,
    `/projects/${p1Id}/feedback`,
    `/material-requests/project/${p1Id}`
  ]) {
    const res = await fetch(`${BASE}${ep}`, {
      headers: { Authorization: `Bearer ${studentUnrelated.token}` }
    });
    assert(res.status === 403, `Unrelated student blocked with 403 from ${ep}`);
  }

  // 7. Unassigned Mentor cannot access restricted project resources (403 Expected)
  console.log('\n--- 7. Testing Unassigned Faculty Mentor Read Access (403 Expected) ---');
  // Dr. Priya Nair is NOT assigned to Campus Energy Monitor
  for (const ep of [
    `/projects/${p2Id}/updates`,
    `/projects/${p2Id}/materials`,
    `/projects/${p2Id}/feedback`,
    `/material-requests/project/${p2Id}`
  ]) {
    const res = await fetch(`${BASE}${ep}`, {
      headers: { Authorization: `Bearer ${unassignedMentor.token}` }
    });
    assert(res.status === 403, `Unassigned mentor blocked with 403 from ${ep}`);
  }

  // 8. Faculty Coordinator and Club Admin cannot access restricted project resources (403 Expected)
  console.log('\n--- 8. Testing Faculty Coordinator & Club Admin Access (403 Expected) ---');
  for (const ep of [
    `/projects/${p1Id}/updates`,
    `/projects/${p1Id}/materials`,
    `/projects/${p1Id}/feedback`,
    `/material-requests/project/${p1Id}`
  ]) {
    const fcRes = await fetch(`${BASE}${ep}`, {
      headers: { Authorization: `Bearer ${facultyCoord.token}` }
    });
    assert(fcRes.status === 403, `Faculty Coordinator blocked with 403 from ${ep}`);

    const caRes = await fetch(`${BASE}${ep}`, {
      headers: { Authorization: `Bearer ${clubAdmin.token}` }
    });
    assert(caRes.status === 403, `Club Admin blocked with 403 from ${ep}`);
  }

  // 9. Team Leader-only writes remain restricted to current Team Leader
  console.log('\n--- 9. Testing Team Leader-Only Write Operations ---');
  // Non-TL Member tries to add material directly (should be 403)
  const nonTlAddMat = await fetch(`${BASE}/projects/${p1Id}/materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentMember.token}` },
    body: JSON.stringify({ name: 'Unauthorized Sensor', quantity: 2, source: 'self_purchased' })
  });
  assert(nonTlAddMat.status === 403, 'Non-TL member cannot add material directly (403)');

  // Non-TL Member tries to submit material request (should be 403)
  const nonTlMatReq = await fetch(`${BASE}/material-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentMember.token}` },
    body: JSON.stringify({
      projectId: p1Id,
      inventoryItemId: '6acb6e6bfa67e09d6e8969e0',
      quantity: 1,
      reason: 'Unauthorized material request'
    })
  });
  assert(nonTlMatReq.status === 403, 'Non-TL member cannot submit material request (403)');

  // 10. Malformed ID and non-existent ID handling
  console.log('\n--- 10. Testing Error Codes for Malformed and Non-existent IDs ---');
  const malformedMat = await fetch(`${BASE}/projects/invalid-id-xyz/materials`, {
    headers: { Authorization: `Bearer ${projectAdmin.token}` }
  });
  assert(malformedMat.status === 400, 'Malformed ID to /materials returns 400');

  const malformedReq = await fetch(`${BASE}/material-requests/project/invalid-id-xyz`, {
    headers: { Authorization: `Bearer ${projectAdmin.token}` }
  });
  assert(malformedReq.status === 400, 'Malformed ID to /material-requests/project/:id returns 400');

  const notFoundMat = await fetch(`${BASE}/projects/6acb75ae5ddcdaf007d61ba9/materials`, {
    headers: { Authorization: `Bearer ${projectAdmin.token}` }
  });
  assert(notFoundMat.status === 404, 'Non-existent project ID to /materials returns 404');

  const notFoundReq = await fetch(`${BASE}/material-requests/project/6acb75ae5ddcdaf007d61ba9`, {
    headers: { Authorization: `Bearer ${projectAdmin.token}` }
  });
  assert(notFoundReq.status === 404, 'Non-existent project ID to /material-requests/project/:id returns 404');

  console.log('\n======================================================================');
  console.log(`REGRESSION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runRegressionSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
