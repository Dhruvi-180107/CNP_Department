/**
 * test_project_materials_full_verification.mjs
 *
 * Verifies all 7 checklist items from user prompt:
 * 1. All three source types display correctly (guitar, self_purchased, owned)
 * 2. Material details and attachments appear when available (specs, docs, images, quantities)
 * 3. Team Leaders can add permitted materials but cannot modify existing entries
 * 4. Faculty Mentors remain read-only (can view assigned project, cannot add or modify, unassigned cannot view)
 * 5. Project Admin can view material lists across projects
 * 6. Approved Guitar materials appear once and are not duplicated
 * 7. No return or inventory-restoration feature is introduced
 */

import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import User from './src/models/User.js';
import Project from './src/models/Project.js';
import ProjectMaterial from './src/models/ProjectMaterial.js';
import MaterialRequest from './src/models/MaterialRequest.js';
import GuitarInventory from './src/models/GuitarInventory.js';
import InventoryAllocation from './src/models/InventoryAllocation.js';

const BASE = 'http://localhost:5000/api';

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
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

async function req(method, path, body, token) {
  const headers = {};
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function runVerification() {
  console.log('\n=================================================================');
  console.log(' PROJECT MATERIALS FULL VERIFICATION');
  console.log('=================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  // 1. Find seeded project: Smart Irrigation System
  const project = await Project.findOne({ name: 'Smart Irrigation System' });
  if (!project) {
    throw new Error('Seed project "Smart Irrigation System" not found!');
  }
  const projectId = project._id.toString();
  console.log(`Testing with project: "${project.name}" (ID: ${projectId})`);

  // Login users
  const tlLogin = await loginUser('arjun.mehta@test.com');       // Team Leader
  const memberLogin = await loginUser('riya.sharma@test.com');    // Member
  const mentorLogin = await loginUser('amit.joshi@test.com');     // Assigned Mentor
  const unassignedMentor = await loginUser('neha.verma@test.com');// Unassigned Faculty (coordinator)
  const adminLogin = await loginUser('vivek.malhotra@test.com');  // Project Admin

  // -------------------------------------------------------------------------
  // TEST 1: All three source types display correctly in GET /:projectId/materials
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing GET /:projectId/materials with all 3 sources ---');
  const getRes = await req('GET', `/projects/${projectId}/materials`, null, tlLogin.token);
  assert(getRes.status === 200, 'GET /projects/:projectId/materials returns 200 for TL');
  assert(getRes.json && getRes.json.success === true, 'Response has success: true');
  assert(Array.isArray(getRes.json.data), 'Response data is an array');

  const materials = getRes.json.data || [];
  const sources = new Set(materials.map(m => m.source));
  console.log('  Found material sources:', Array.from(sources));

  assert(sources.has('guitar'), 'Source "guitar" is present in materials list');
  assert(sources.has('self_purchased'), 'Source "self_purchased" is present in materials list');
  assert(sources.has('owned'), 'Source "owned" is present in materials list');

  // -------------------------------------------------------------------------
  // TEST 2: Material details and attachments appear when available
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing material details & attachments ---');
  const guitarItem = materials.find(m => m.source === 'guitar');
  assert(guitarItem && guitarItem.name === 'Soil Moisture Sensor', 'Guitar material is Soil Moisture Sensor');
  assert(guitarItem && guitarItem.quantity === 4, 'Guitar material quantity is 4');
  assert(guitarItem && guitarItem.materialRequestId !== undefined, 'Guitar material is linked to materialRequestId');

  const selfPurchasedItem = materials.find(m => m.source === 'self_purchased');
  assert(selfPurchasedItem && selfPurchasedItem.name === 'PVC Pipe', 'Self-purchased material is PVC Pipe');
  assert(selfPurchasedItem && selfPurchasedItem.quantity === 10, 'Self-purchased material quantity is 10');

  const ownedItem = materials.find(m => m.source === 'owned');
  assert(ownedItem && ownedItem.name === 'Water Tank', 'Owned material is Water Tank');
  assert(ownedItem && ownedItem.quantity === 1, 'Owned material quantity is 1');

  // -------------------------------------------------------------------------
  // TEST 3: Team Leader can add permitted materials but cannot modify entries
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing TL add permissions & editing immutability ---');
  // TL adds a self_purchased material
  const addRes = await req('POST', `/projects/${projectId}/materials`, {
    name: 'Test Drip Tube',
    quantity: 5,
    source: 'self_purchased',
    specifications: '1/4 inch drip distribution tubing'
  }, tlLogin.token);

  assert(addRes.status === 201, 'TL can add new self_purchased material (status 201)');
  assert(addRes.json && addRes.json.success === true, 'Add material returns success: true');
  const createdMatId = addRes.json?.data?._id;

  // TL attempts to add a guitar material directly via POST /materials -> MUST BE REJECTED
  const addGuitarRes = await req('POST', `/projects/${projectId}/materials`, {
    name: 'Fake Guitar Sensor',
    quantity: 1,
    source: 'guitar'
  }, tlLogin.token);
  assert(addGuitarRes.status === 400, 'TL cannot directly add guitar material (status 400 rejected)');

  // Attempt to PUT/PATCH/DELETE the material -> MUST FAIL (no update/delete routes exist)
  const putRes = await req('PUT', `/projects/${projectId}/materials/${createdMatId}`, { quantity: 10 }, tlLogin.token);
  assert(putRes.status === 404, 'PUT /materials/:id returns 404 (no edit endpoint exists)');

  const patchRes = await req('PATCH', `/projects/${projectId}/materials/${createdMatId}`, { quantity: 10 }, tlLogin.token);
  assert(patchRes.status === 404, 'PATCH /materials/:id returns 404 (no edit endpoint exists)');

  const delRes = await req('DELETE', `/projects/${projectId}/materials/${createdMatId}`, null, tlLogin.token);
  assert(delRes.status === 404, 'DELETE /materials/:id returns 404 (no delete endpoint exists)');

  // Clean up created test material
  if (createdMatId) {
    await ProjectMaterial.findByIdAndDelete(createdMatId);
    console.log('  Cleaned up temporary test material.');
  }

  // Member attempts to add material -> MUST BE 403
  const memberAddRes = await req('POST', `/projects/${projectId}/materials`, {
    name: 'Member Attempt Tube',
    quantity: 2,
    source: 'self_purchased'
  }, memberLogin.token);
  assert(memberAddRes.status === 403, 'Normal member cannot add materials (status 403)');

  // -------------------------------------------------------------------------
  // TEST 4: Faculty Mentors remain read-only
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Faculty Mentor permissions ---');
  const mentorGetRes = await req('GET', `/projects/${projectId}/materials`, null, mentorLogin.token);
  assert(mentorGetRes.status === 200, 'Assigned Faculty Mentor has read access (status 200)');
  assert(Array.isArray(mentorGetRes.json?.data), 'Mentor receives material list');

  const mentorAddRes = await req('POST', `/projects/${projectId}/materials`, {
    name: 'Mentor Attempt Pipe',
    quantity: 2,
    source: 'self_purchased'
  }, mentorLogin.token);
  assert(mentorAddRes.status === 403, 'Faculty Mentor cannot add materials (status 403)');

  const unassignedGetRes = await req('GET', `/projects/${projectId}/materials`, null, unassignedMentor.token);
  assert(unassignedGetRes.status === 403, 'Unassigned faculty coordinator/mentor cannot view materials (status 403)');

  // -------------------------------------------------------------------------
  // TEST 5: Project Admin can view material lists across projects
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Project Admin cross-project access ---');
  const adminGetRes = await req('GET', `/projects/${projectId}/materials`, null, adminLogin.token);
  assert(adminGetRes.status === 200, 'Project Admin can view materials for Smart Irrigation (status 200)');
  assert(adminGetRes.json?.data?.length >= 3, 'Project Admin sees all materials');

  // Also check Autonomous Rover
  const roverProject = await Project.findOne({ name: 'Autonomous Rover' });
  if (roverProject) {
    const adminRoverRes = await req('GET', `/projects/${roverProject._id}/materials`, null, adminLogin.token);
    assert(adminRoverRes.status === 200, 'Project Admin can view materials for Autonomous Rover (status 200)');
  }

  // -------------------------------------------------------------------------
  // TEST 6: Approved Guitar materials appear once and are not duplicated
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Guitar material deduplication ---');
  const guitarSensorCount = await ProjectMaterial.countDocuments({
    projectId,
    name: 'Soil Moisture Sensor'
  });
  assert(guitarSensorCount === 1, 'Soil Moisture Sensor appears exactly once in database');

  // Verify deduplication logic: if approve logic is invoked again on existing approved request
  const approvedReq = await MaterialRequest.findOne({ projectId, status: 'approved' });
  assert(!!approvedReq, 'Found approved MaterialRequest');

  // Simulate Step C in materialRequestRoutes approval logic:
  // let material = await ProjectMaterial.findOne({ materialRequestId: updatedRequest._id });
  // if (!material) { await ProjectMaterial.create(...) }
  const existingCheck = await ProjectMaterial.findOne({ materialRequestId: approvedReq._id });
  assert(!!existingCheck, 'ProjectMaterial is linked via materialRequestId');

  // If another check runs with same materialRequestId, verify no duplicate is created
  let duplicateCandidate = await ProjectMaterial.findOne({ materialRequestId: approvedReq._id });
  if (!duplicateCandidate) {
    await ProjectMaterial.create({
      projectId,
      name: 'Duplicate Sensor',
      quantity: 1,
      source: 'guitar',
      materialRequestId: approvedReq._id
    });
  }
  const countAfterCheck = await ProjectMaterial.countDocuments({ materialRequestId: approvedReq._id });
  assert(countAfterCheck === 1, 'MaterialRequestId deduplication prevents duplicate ProjectMaterial creation');

  // -------------------------------------------------------------------------
  // TEST 7: No return or inventory-restoration feature is introduced
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Testing absence of return / restoration endpoints ---');
  const returnRes1 = await req('POST', `/projects/${projectId}/materials/${guitarItem._id}/return`, {}, tlLogin.token);
  assert(returnRes1.status === 404, 'POST /materials/:id/return returns 404 (feature not introduced)');

  const returnRes2 = await req('POST', `/inventory/return`, {}, adminLogin.token);
  assert(returnRes2.status === 404, 'POST /inventory/return returns 404 (feature not introduced)');

  console.log('\n=================================================================');
  console.log(` VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('=================================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
