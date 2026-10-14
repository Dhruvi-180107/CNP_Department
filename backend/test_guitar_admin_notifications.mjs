import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import User from './src/models/User.js';
import Project from './src/models/Project.js';
import GuitarInventory from './src/models/GuitarInventory.js';
import MaterialRequest from './src/models/MaterialRequest.js';
import ProjectMaterial from './src/models/ProjectMaterial.js';
import Notification from './src/models/Notification.js';

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

  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function run() {
  console.log('\n=================================================================');
  console.log(' PROJECT ADMIN (GUITAR) NOTIFICATIONS VERIFICATION TEST');
  console.log('=================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  // 1. Authenticate users
  const admin = await loginUser('vivek.malhotra@test.com');
  const tl = await loginUser('arjun.mehta@test.com');
  const mentor = await loginUser('amit.joshi@test.com');
  const student = await loginUser('riya.sharma@test.com');

  assert(admin.user.role === 'project_admin', 'Vivek Malhotra is authenticated as project_admin');
  assert(tl.user.role === 'student', 'Arjun Mehta is authenticated as student');

  // Find Project & Inventory Item
  const project = await Project.findOne({ name: 'Smart Irrigation System' });
  assert(!!project, 'Found project "Smart Irrigation System"');
  const projectId = project._id.toString();

  // Ensure inventory item exists with available quantity
  let invItem = await GuitarInventory.findOne({ availableQuantity: { $gte: 2 } });
  if (!invItem) {
    invItem = await GuitarInventory.create({
      name: 'Test Arduino Uno',
      description: 'Microcontroller board',
      category: 'Microcontrollers',
      totalQuantity: 20,
      availableQuantity: 20,
      location: 'Bin A-1',
    });
  }
  assert(!!invItem, `Found Guitar inventory item "${invItem.name}" with stock: ${invItem.availableQuantity}`);

  const adminIdStr = admin.user._id.toString();

  // -------------------------------------------------------------------------
  // TEST 1: New project material request creates Project Admin notification
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Material Request Submission Notification ---');
  const testReqReason = `Urgent requirement for field sensor prototype #${Date.now()}`;
  const mrRes = await req('POST', '/material-requests', {
    projectId,
    inventoryItemId: invItem._id.toString(),
    quantity: 1,
    reason: testReqReason,
    specifications: '3.3V compatible',
  }, tl.token);

  assert(mrRes.status === 201, `Team Leader submitted material request (status 201, got ${mrRes.status})`);
  const createdMrId = mrRes.json?.data?._id;
  assert(!!createdMrId, 'Created MaterialRequest ID returned');

  // Verify notification stored in MongoDB for Project Admin
  const mrNotif = await Notification.findOne({
    userId: admin.user._id,
    type: 'material_request_submitted',
    relatedId: createdMrId,
  });

  assert(!!mrNotif, 'Persisted notification found in MongoDB for Project Admin (Vivek Malhotra)');
  assert(mrNotif?.userId.toString() === adminIdStr, `Notification stored with correct recipient userId: ${mrNotif?.userId}`);
  assert(mrNotif?.title === 'New Material Request', `Notification title is "New Material Request" (got: "${mrNotif?.title}")`);
  assert(mrNotif?.message.includes(invItem.name), `Notification message mentions material name "${invItem.name}"`);
  assert(mrNotif?.message.includes(project.name), `Notification message mentions project name "${project.name}"`);
  assert(mrNotif?.link === '/material-requests', `Notification link points to /material-requests (got: "${mrNotif?.link}")`);
  assert(mrNotif?.actionText === 'Review Request', `Notification actionText is "Review Request" (got: "${mrNotif?.actionText}")`);
  assert(mrNotif?.metadata?.entityName === invItem.name, 'Metadata entityName matches inventory item');
  assert(mrNotif?.metadata?.quantity === 1, 'Metadata quantity is 1');
  assert(mrNotif?.metadata?.actorName === 'Arjun Mehta', `Metadata actorName identifies TL Arjun Mehta (got: "${mrNotif?.metadata?.actorName}")`);
  assert(mrNotif?.metadata?.reason === testReqReason, 'Metadata reason matches submitted reason');

  // -------------------------------------------------------------------------
  // TEST 2: Self-purchased / owned material addition creates notification
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Self-Purchased Material Addition Notification ---');
  const testMatName = `Solar Panel Module ${Date.now()}`;
  const addMatRes = await req('POST', `/projects/${projectId}/materials`, {
    name: testMatName,
    quantity: 2,
    source: 'self_purchased',
    specifications: '12V 10W polycrystalline',
  }, tl.token);

  assert(addMatRes.status === 201, `Team Leader added self-purchased material (status 201, got ${addMatRes.status})`);
  const createdMatId = addMatRes.json?.data?._id;
  assert(!!createdMatId, 'Created ProjectMaterial ID returned');

  // Verify notification stored in MongoDB for Project Admin
  const matNotif = await Notification.findOne({
    userId: admin.user._id,
    type: 'material_added',
    relatedId: createdMatId,
  });

  assert(!!matNotif, 'Persisted notification found in MongoDB for Project Admin for added material');
  assert(matNotif?.userId.toString() === adminIdStr, `Notification stored with correct recipient userId: ${matNotif?.userId}`);
  assert(matNotif?.title === 'New Project Material Added', `Notification title is "New Project Material Added" (got: "${matNotif?.title}")`);
  assert(matNotif?.message.includes(testMatName), `Notification message mentions material name "${testMatName}"`);
  assert(matNotif?.message.includes('Self-purchased'), 'Notification message mentions source (Self-purchased)');
  assert(matNotif?.link.includes(`/projects/${projectId}`), `Notification link points to /projects/${projectId} (got: "${matNotif?.link}")`);
  assert(matNotif?.actionText === 'View Materials', `Notification actionText is "View Materials" (got: "${matNotif?.actionText}")`);
  assert(matNotif?.metadata?.entityName === testMatName, 'Metadata entityName matches material name');
  assert(matNotif?.metadata?.quantity === 2, 'Metadata quantity is 2');
  assert(matNotif?.metadata?.actorName === 'Arjun Mehta', 'Metadata actorName identifies TL');

  // -------------------------------------------------------------------------
  // TEST 3: Authenticated Project Admin retrieves notifications from API
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Notification Retrieval from API by Project Admin ---');
  const adminNotifsRes = await req('GET', '/notifications', null, admin.token);
  assert(adminNotifsRes.status === 200, 'GET /notifications returns 200 for Project Admin');
  const adminNotifs = adminNotifsRes.json?.data || [];
  assert(adminNotifs.length >= 2, `Project Admin inbox has notifications (count: ${adminNotifs.length})`);

  const fetchedMrNotif = adminNotifs.find((n) => n._id === mrNotif._id.toString());
  assert(!!fetchedMrNotif, 'Retrieved Material Request notification in API response');
  assert(fetchedMrNotif?.actionText === 'Review Request', 'Retrieved notification has actionText: "Review Request"');
  assert(fetchedMrNotif?.link === '/material-requests', 'Retrieved notification has link: "/material-requests"');

  const fetchedMatNotif = adminNotifs.find((n) => n._id === matNotif._id.toString());
  assert(!!fetchedMatNotif, 'Retrieved Material Added notification in API response');
  assert(fetchedMatNotif?.actionText === 'View Materials', 'Retrieved notification has actionText: "View Materials"');

  // -------------------------------------------------------------------------
  // TEST 4: Unread counts and read status work correctly
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Read / Unread Status and Counters ---');
  const unreadRes = await req('GET', '/notifications/unread-count', null, admin.token);
  assert(unreadRes.status === 200, 'GET /notifications/unread-count returns 200');
  const initialUnread = unreadRes.json?.count;
  assert(typeof initialUnread === 'number' && initialUnread >= 2, `Unread count is positive (${initialUnread})`);

  // Mark single notification as read
  const markRes = await req('PATCH', `/notifications/${mrNotif._id}/read`, {}, admin.token);
  assert(markRes.status === 200, 'PATCH /notifications/:id/read returns 200');
  assert(markRes.json?.data?.isRead === true, 'Notification isRead is updated to true');

  // Check unread count decremented
  const unreadAfterSingle = (await req('GET', '/notifications/unread-count', null, admin.token)).json?.count;
  assert(unreadAfterSingle === initialUnread - 1, `Unread count decremented by 1 (now: ${unreadAfterSingle})`);

  // Mark all as read
  const markAllRes = await req('PATCH', '/notifications/read-all', {}, admin.token);
  assert(markAllRes.status === 200, 'PATCH /notifications/read-all returns 200');

  const finalUnread = (await req('GET', '/notifications/unread-count', null, admin.token)).json?.count;
  assert(finalUnread === 0, `All notifications marked read, unread count is 0 (got: ${finalUnread})`);

  // -------------------------------------------------------------------------
  // TEST 5: Security & Isolation (Students and Mentors cannot see admin notifs)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Role Isolation & IDOR Protection ---');
  // Student checks notifications
  const studentNotifs = (await req('GET', '/notifications', null, student.token)).json?.data || [];
  const leakedToStudent = studentNotifs.find((n) => n._id === mrNotif._id.toString() || n._id === matNotif._id.toString());
  assert(!leakedToStudent, 'Unrelated Student CANNOT see Project Admin notifications');

  // Mentor checks notifications
  const mentorNotifs = (await req('GET', '/notifications', null, mentor.token)).json?.data || [];
  const leakedToMentor = mentorNotifs.find((n) => n._id === mrNotif._id.toString() || n._id === matNotif._id.toString());
  assert(!leakedToMentor, 'Faculty Mentor CANNOT see Project Admin notifications');

  // Student attempts to mark Project Admin notification as read -> 403 Forbidden
  const idorRes = await req('PATCH', `/notifications/${mrNotif._id}/read`, {}, student.token);
  assert(idorRes.status === 403, 'Student cannot mark Project Admin notification as read (HTTP 403 Forbidden)');

  // -------------------------------------------------------------------------
  // TEST 6: Deduplication Check
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Deduplication ---');
  const countBeforeDup = await Notification.countDocuments({
    userId: admin.user._id,
    type: 'material_request_submitted',
    relatedId: createdMrId,
  });

  // Import createNotification directly and attempt to fire duplicate for same relatedId
  const { createNotification } = await import('./src/services/notificationService.js');
  await createNotification({
    userId: admin.user._id,
    type: 'material_request_submitted',
    title: 'New Material Request',
    message: 'Duplicate test',
    relatedId: createdMrId,
  });

  const countAfterDup = await Notification.countDocuments({
    userId: admin.user._id,
    type: 'material_request_submitted',
    relatedId: createdMrId,
  });

  assert(countAfterDup === countBeforeDup, `Duplicate notification was prevented (count: ${countAfterDup})`);

  // -------------------------------------------------------------------------
  // TEST 7: Multi-admin support
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Testing Multiple Project Admin Recipients ---');
  const allAdmins = await User.find({ role: 'project_admin' });
  assert(allAdmins.length >= 1, `System has ${allAdmins.length} Project Admin accounts`);
  for (const pa of allAdmins) {
    const adminNotifsCount = await Notification.countDocuments({
      userId: pa._id,
      relatedId: { $in: [createdMrId, createdMatId] },
    });
    assert(adminNotifsCount >= 2, `Admin ${pa.name} (${pa.email}) received notifications for project administration events (${adminNotifsCount})`);
  }

  console.log('\n=================================================================');
  console.log(` GUITAR ADMIN NOTIFICATION TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
