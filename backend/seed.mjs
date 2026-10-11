import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

import connectDB from './config/db.js';
import User from './src/models/User.js';
import Club from './src/models/Club.js';
import Project from './src/models/Project.js';
import ClubMembership from './src/models/ClubMembership.js';
import ProjectMembership from './src/models/ProjectMembership.js';
import ProjectMentor from './src/models/ProjectMentor.js';
import JoinRequest from './src/models/JoinRequest.js';
import ProjectUpdate from './src/models/ProjectUpdate.js';
import ProjectFeedback from './src/models/ProjectFeedback.js';
import Event from './src/models/Event.js';
import Notification from './src/models/Notification.js';
import GuitarInventory from './src/models/GuitarInventory.js';
import InventoryAllocation from './src/models/InventoryAllocation.js';
import MaterialRequest from './src/models/MaterialRequest.js';
import ProjectMaterial from './src/models/ProjectMaterial.js';

import { uploadImage, uploadRaw } from './src/services/cloudinaryService.js';

if (process.env.NODE_ENV === 'production') {
  console.error('CRITICAL: Cannot run seed script in production environment.');
  process.exit(1);
}

const ASSETS_DIR = path.join(process.cwd(), 'seed-assets');

// Helper to reliably read file path
const getAssetPath = (type, filename) => {
  const p = path.join(ASSETS_DIR, type, filename);
  if (!fs.existsSync(p)) {
    console.warn(`Warning: Asset not found at ${p}`);
    return null;
  }
  return p;
};

async function uploadAssetIfPresent(type, filename, folder, isRaw = false) {
  const p = getAssetPath(type, filename);
  if (!p) return null;
  if (isRaw) {
    return await uploadRaw(p, { folder, originalName: filename, mimeType: 'application/pdf' });
  }
  return await uploadImage(p, { folder });
}

let report = {
  users: 0,
  clubs: 0,
  projects: 0,
  clubMemberships: 0,
  projectMemberships: 0,
  projectMentors: 0,
  joinRequests: 0,
  events: 0,
  projectUpdates: 0,
  projectFeedbacks: 0,
  guitarInventory: 0,
  materialRequests: 0,
  projectMaterials: 0,
  inventoryAllocations: 0,
  notifications: 0,
  cloudinaryAssetsUploaded: 0
};

async function runSeed() {
  console.log('WARNING: This will delete existing development data in MongoDB.');
  await connectDB();

  console.log('Clearing collections...');
  await Promise.all([
    User.deleteMany({}),
    Club.deleteMany({}),
    Project.deleteMany({}),
    ClubMembership.deleteMany({}),
    ProjectMembership.deleteMany({}),
    ProjectMentor.deleteMany({}),
    JoinRequest.deleteMany({}),
    ProjectUpdate.deleteMany({}),
    ProjectFeedback.deleteMany({}),
    Event.deleteMany({}),
    Notification.deleteMany({}),
    GuitarInventory.deleteMany({}),
    InventoryAllocation.deleteMany({}),
    MaterialRequest.deleteMany({}),
    ProjectMaterial.deleteMany({})
  ]);

  console.log('Collections cleared.');

  // USERS
  const usersData = [
    { name: 'Arjun Mehta', email: 'arjun.mehta@test.com', role: 'student', profileImageFile: 'arjun-mehta.jpg' },
    { name: 'Riya Sharma', email: 'riya.sharma@test.com', role: 'student', profileImageFile: 'riya-sharma.jpg' },
    { name: 'Kabir Patel', email: 'kabir.patel@test.com', role: 'student', profileImageFile: 'kabir-patel.jpg' },
    { name: 'Ananya Singh', email: 'ananya.singh@test.com', role: 'student', profileImageFile: 'ananya-singh.jpg' },
    { name: 'Dr. Neha Verma', email: 'neha.verma@test.com', role: 'faculty_coordinator', profileImageFile: 'neha-verma.jpg', department: 'Computer Science' },
    { name: 'Dr. Rahul Desai', email: 'rahul.desai@test.com', role: 'faculty_coordinator', profileImageFile: 'rahul-desai.jpg', department: 'Electronics' },
    { name: 'Dr. Amit Joshi', email: 'amit.joshi@test.com', role: 'faculty_mentor', profileImageFile: 'amit-joshi.jpg', department: 'Computer Science' },
    { name: 'Dr. Priya Nair', email: 'priya.nair@test.com', role: 'faculty_mentor', profileImageFile: 'priya-nair.jpg', department: 'Electronics' },
    { name: 'Karan Shah', email: 'karan.shah@test.com', role: 'club_admin', profileImageFile: 'karan-shah.jpg' },
    { name: 'Vivek Malhotra', email: 'vivek.malhotra@test.com', role: 'project_admin', profileImageFile: 'vivek-malhotra.jpg' }
  ];

  const userDocs = {};
  for (const u of usersData) {
    const asset = await uploadAssetIfPresent('profiles', u.profileImageFile, 'seed/profiles');
    if (asset) report.cloudinaryAssetsUploaded++;
    
    const user = new User({
      name: u.name,
      email: u.email,
      password: 'Test@12345',
      role: u.role,
      department: u.department,
      profileImage: asset ? asset.secure_url : null,
      profileImagePublicId: asset ? asset.public_id : null
    });
    await user.save(); // save is required to hash the password
    userDocs[u.name] = user;
    report.users++;
  }
  
  // CLUBS
  const clubsData = [
    { name: 'Robotics Club', description: 'Build robots.', coordinator: 'Dr. Neha Verma', logoFile: 'robotics-club.jpg' },
    { name: 'Coding Club', description: 'Write code.', coordinator: 'Dr. Rahul Desai', logoFile: 'coding-club.jpg' },
    { name: 'Photography Club', description: 'Take photos.', coordinator: 'Dr. Neha Verma', logoFile: 'photography-club.jpg' }
  ];

  const clubDocs = {};
  for (const c of clubsData) {
    const asset = await uploadAssetIfPresent('clubs', c.logoFile, 'seed/clubs');
    if (asset) report.cloudinaryAssetsUploaded++;

    const club = await Club.create({
      name: c.name,
      description: c.description,
      facultyCoordinatorId: userDocs[c.coordinator]._id,
      createdBy: userDocs['Karan Shah']._id,
      logo: asset ? asset.secure_url : null,
      logoPublicId: asset ? asset.public_id : null
    });
    clubDocs[c.name] = club;
    report.clubs++;
  }

  // CLUB MEMBERSHIPS
  const clubMembersData = [
    { club: 'Robotics Club', student: 'Arjun Mehta', type: 'core_team', pos: 'Team Lead' },
    { club: 'Robotics Club', student: 'Riya Sharma', type: 'core_team', pos: 'Technical Head' },
    { club: 'Robotics Club', student: 'Kabir Patel', type: 'member' },
    { club: 'Robotics Club', student: 'Ananya Singh', type: 'member' },
    { club: 'Coding Club', student: 'Arjun Mehta', type: 'member' },
    { club: 'Coding Club', student: 'Kabir Patel', type: 'core_team', pos: 'Development Lead' },
    { club: 'Coding Club', student: 'Ananya Singh', type: 'member' },
    { club: 'Photography Club', student: 'Riya Sharma', type: 'core_team', pos: 'Creative Head' },
    { club: 'Photography Club', student: 'Ananya Singh', type: 'core_team', pos: 'Content Coordinator' },
    { club: 'Photography Club', student: 'Arjun Mehta', type: 'member' }
  ];

  for (const cm of clubMembersData) {
    await ClubMembership.create({
      studentId: userDocs[cm.student]._id,
      clubId: clubDocs[cm.club]._id,
      membershipType: cm.type,
      position: cm.pos || null
    });
    report.clubMemberships++;
  }

  // PROJECTS
  const projectsData = [
    { name: 'Smart Irrigation System', status: 'active', leader: 'Arjun Mehta', imageFile: 'smart-irrigation.jpg' },
    { name: 'Autonomous Rover', status: 'active', leader: 'Kabir Patel', imageFile: 'autonomous-rover.jpg' },
    { name: 'Campus Energy Monitor', status: 'active', leader: 'Riya Sharma', imageFile: 'campus-energy.jpg' }
  ];

  const projectDocs = {};
  for (const p of projectsData) {
    const asset = await uploadAssetIfPresent('projects', p.imageFile, 'seed/projects');
    if (asset) report.cloudinaryAssetsUploaded++;

    const proj = await Project.create({
      name: p.name,
      description: `Description for ${p.name}`,
      status: p.status,
      createdBy: userDocs['Vivek Malhotra']._id,
      teamLeaderId: userDocs[p.leader]._id,
      image: asset ? asset.secure_url : null,
      imagePublicId: asset ? asset.public_id : null
    });
    projectDocs[p.name] = proj;
    report.projects++;
  }

  // PROJECT MEMBERS
  const projectMembersData = [
    { project: 'Smart Irrigation System', members: ['Arjun Mehta', 'Riya Sharma', 'Kabir Patel'] },
    { project: 'Autonomous Rover', members: ['Kabir Patel', 'Arjun Mehta', 'Ananya Singh'] },
    { project: 'Campus Energy Monitor', members: ['Riya Sharma', 'Ananya Singh', 'Arjun Mehta'] }
  ];

  for (const pm of projectMembersData) {
    for (const member of pm.members) {
      await ProjectMembership.create({
        studentId: userDocs[member]._id,
        projectId: projectDocs[pm.project]._id
      });
      report.projectMemberships++;
    }
  }

  // PROJECT MENTORS
  const projectMentorsData = [
    { project: 'Smart Irrigation System', primary: 'Dr. Amit Joshi', additional: 'Dr. Priya Nair' },
    { project: 'Autonomous Rover', primary: 'Dr. Priya Nair' },
    { project: 'Campus Energy Monitor', primary: 'Dr. Amit Joshi' }
  ];

  for (const pmd of projectMentorsData) {
    if (pmd.primary) {
      await ProjectMentor.create({ projectId: projectDocs[pmd.project]._id, mentorId: userDocs[pmd.primary]._id, isPrimary: true });
      report.projectMentors++;
    }
    if (pmd.additional) {
      await ProjectMentor.create({ projectId: projectDocs[pmd.project]._id, mentorId: userDocs[pmd.additional]._id, isPrimary: false });
      report.projectMentors++;
    }
  }

  // JOIN REQUESTS
  const joinReqsData = [
    { type: 'club', student: 'Ananya Singh', target: 'Robotics Club', status: 'pending', reviewer: 'Dr. Neha Verma' },
    { type: 'club', student: 'Arjun Mehta', target: 'Coding Club', status: 'approved', reviewer: 'Dr. Rahul Desai' },
    { type: 'club', student: 'Kabir Patel', target: 'Photography Club', status: 'rejected', reviewer: 'Dr. Neha Verma' },
    { type: 'project', student: 'Ananya Singh', target: 'Smart Irrigation System', status: 'pending', reviewer: 'Dr. Amit Joshi' },
    { type: 'project', student: 'Arjun Mehta', target: 'Autonomous Rover', status: 'approved', reviewer: 'Dr. Priya Nair' },
    { type: 'project', student: 'Kabir Patel', target: 'Campus Energy Monitor', status: 'rejected', reviewer: 'Dr. Amit Joshi' }
  ];

  for (const jr of joinReqsData) {
    await JoinRequest.create({
      requestType: jr.type,
      studentId: userDocs[jr.student]._id,
      clubId: jr.type === 'club' ? clubDocs[jr.target]._id : null,
      projectId: jr.type === 'project' ? projectDocs[jr.target]._id : null,
      status: jr.status,
      reviewerId: userDocs[jr.reviewer]._id
    });
    report.joinRequests++;
  }

  // EVENTS
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const eventsData = [
    { title: 'Robotics Workshop', club: 'Robotics Club', date: future, location: 'Innovation Lab' },
    { title: 'Competitive Programming Contest', club: 'Coding Club', date: future, location: 'Computer Lab' },
    { title: 'Photography Walk', club: 'Photography Club', date: future, location: 'University Campus' },
    { title: 'Introduction to Robotics', club: 'Robotics Club', date: past, location: 'Seminar Hall' },
    { title: 'Web Development Bootcamp', club: 'Coding Club', date: past, location: 'Computer Lab' }
  ];

  for (const e of eventsData) {
    await Event.create({
      title: e.title,
      description: e.title + ' description',
      clubId: clubDocs[e.club]._id,
      eventDate: e.date,
      location: e.location,
      createdBy: userDocs['Karan Shah']._id
    });
    report.events++;
  }

  // PROJECT UPDATES + DOCUMENTS
  const updatesData = [
    { project: 'Smart Irrigation System', title: 'Initial Sensor Integration', student: 'Arjun Mehta', doc: 'smart-irrigation-update.pdf' },
    { project: 'Smart Irrigation System', title: 'Water Pump Testing', student: 'Riya Sharma', doc: null },
    { project: 'Autonomous Rover', title: 'Obstacle Detection Prototype', student: 'Kabir Patel', doc: 'autonomous-rover-update.pdf' },
    { project: 'Campus Energy Monitor', title: 'Energy Sensor Setup', student: 'Riya Sharma', doc: 'campus-energy-update.pdf' }
  ];

  const updateDocs = {};
  for (const ud of updatesData) {
    let files = [];
    if (ud.doc) {
      const asset = await uploadAssetIfPresent('documents', ud.doc, 'seed/documents', true);
      if (asset) {
        files.push({ name: ud.doc, url: asset.secure_url, publicId: asset.public_id, size: asset.bytes, type: 'application/pdf' });
        report.cloudinaryAssetsUploaded++;
      }
    }

    const pUpdate = await ProjectUpdate.create({
      projectId: projectDocs[ud.project]._id,
      studentId: userDocs[ud.student]._id,
      title: ud.title,
      description: `Detailed description for ${ud.title}`,
      files
    });
    updateDocs[ud.project] = pUpdate;
    report.projectUpdates++;
  }

  // PROJECT FEEDBACK
  const feedbacksData = [
    { project: 'Smart Irrigation System', mentor: 'Dr. Amit Joshi', text: 'Sensor integration looks promising. Improve calibration before the next testing stage.' },
    { project: 'Autonomous Rover', mentor: 'Dr. Priya Nair', text: 'Obstacle detection is working. Test the system under different lighting and surface conditions.' }
  ];

  for (const fb of feedbacksData) {
    await ProjectFeedback.create({
      projectId: projectDocs[fb.project]._id,
      mentorId: userDocs[fb.mentor]._id,
      updateId: updateDocs[fb.project] ? updateDocs[fb.project]._id : null,
      feedbackText: fb.text
    });
    report.projectFeedbacks++;
  }

  // GUITAR INVENTORY
  const inventoryData = [
    { name: 'Jumper Wires', totalQuantity: 100, availableQuantity: 70 },
    { name: 'Arduino Uno', totalQuantity: 20, availableQuantity: 14 },
    { name: 'Ultrasonic Sensor', totalQuantity: 30, availableQuantity: 24 },
    { name: 'Soil Moisture Sensor', totalQuantity: 25, availableQuantity: 18 },
    { name: 'DC Motor', totalQuantity: 40, availableQuantity: 32 }
  ];

  const inventoryDocs = {};
  for (const inv of inventoryData) {
    const item = await GuitarInventory.create({
      name: inv.name,
      totalQuantity: inv.totalQuantity,
      availableQuantity: inv.availableQuantity,
      createdBy: userDocs['Vivek Malhotra']._id
    });
    inventoryDocs[inv.name] = item;
    report.guitarInventory++;
  }

  // MATERIAL REQUESTS
  const matRequestsData = [
    { project: 'Smart Irrigation System', leader: 'Arjun Mehta', item: 'Soil Moisture Sensor', qty: 4, status: 'approved', reviewer: 'Vivek Malhotra' },
    { project: 'Autonomous Rover', leader: 'Kabir Patel', item: 'Ultrasonic Sensor', qty: 3, status: 'approved', reviewer: 'Vivek Malhotra' },
    { project: 'Campus Energy Monitor', leader: 'Riya Sharma', item: 'Arduino Uno', qty: 2, status: 'pending' },
    { project: 'Smart Irrigation System', leader: 'Arjun Mehta', item: 'Jumper Wires', qty: 50, status: 'rejected', reason: 'The requested quantity is higher than the currently approved requirement. Please submit a smaller quantity.', reviewer: 'Vivek Malhotra' }
  ];

  const mrDocs = [];
  for (const mr of matRequestsData) {
    const req = await MaterialRequest.create({
      projectId: projectDocs[mr.project]._id,
      requestedBy: userDocs[mr.leader]._id,
      inventoryItemId: inventoryDocs[mr.item]._id,
      quantity: mr.qty,
      status: mr.status,
      rejectionReason: mr.reason || null,
      reviewedBy: mr.reviewer ? userDocs[mr.reviewer]._id : null,
      reviewedAt: mr.reviewer ? Date.now() : null
    });
    mrDocs.push({ req, data: mr });
    report.materialRequests++;
  }

  // PROJECT MATERIALS & ALLOCATIONS
  // Note: Only for approved requests
  for (const item of mrDocs) {
    const { req, data } = item;
    if (data.status === 'approved') {
      await InventoryAllocation.create({
        inventoryItemId: req.inventoryItemId,
        projectId: req.projectId,
        materialRequestId: req._id,
        quantity: req.quantity,
        allocatedBy: req.reviewedBy
      });
      report.inventoryAllocations++;

      await ProjectMaterial.create({
        projectId: req.projectId,
        name: data.item,
        quantity: req.quantity,
        source: 'guitar',
        inventoryItemId: req.inventoryItemId,
        materialRequestId: req._id,
        addedBy: req.reviewedBy // Allocation automatically created it
      });
      report.projectMaterials++;
    }
  }

  const additionalMaterialsData = [
    { project: 'Smart Irrigation System', name: 'PVC Pipe', source: 'self_purchased', qty: 10, addedBy: 'Arjun Mehta' },
    { project: 'Smart Irrigation System', name: 'Water Tank', source: 'owned', qty: 1, addedBy: 'Arjun Mehta' },
    { project: 'Autonomous Rover', name: 'Chassis Plate', source: 'self_purchased', qty: 1, addedBy: 'Kabir Patel' },
    { project: 'Autonomous Rover', name: 'Li-ion Battery', source: 'owned', qty: 2, addedBy: 'Kabir Patel' },
    { project: 'Campus Energy Monitor', name: 'Jumper Wires', source: 'self_purchased', qty: 10, addedBy: 'Riya Sharma' }
  ];

  for (const pm of additionalMaterialsData) {
    await ProjectMaterial.create({
      projectId: projectDocs[pm.project]._id,
      name: pm.name,
      quantity: pm.qty,
      source: pm.source,
      addedBy: userDocs[pm.addedBy]._id
    });
    report.projectMaterials++;
  }
  
  // Add image to Project Material items to test image storage schema if possible
  const materialImages = [
    { name: 'Soil Moisture Sensor', file: 'soil-moisture-sensor.jpg' },
    { name: 'Ultrasonic Sensor', file: 'ultrasonic-sensor.jpg' },
    { name: 'Arduino Uno', file: 'arduino-uno.jpg' },
    { name: 'Jumper Wires', file: 'jumper-wires.jpg' }
  ];
  for (const mi of materialImages) {
    const asset = await uploadAssetIfPresent('materials', mi.file, 'seed/materials');
    if (asset) {
      report.cloudinaryAssetsUploaded++;
      await ProjectMaterial.updateMany({ name: mi.name }, { image: asset.secure_url, imagePublicId: asset.public_id });
    }
  }

  // NOTIFICATIONS
  const notificationsData = [
    { user: 'Arjun Mehta', type: 'material_request_approved', title: 'Request Approved', msg: 'Your material request was approved.' },
    { user: 'Arjun Mehta', type: 'material_request_rejected', title: 'Request Rejected', msg: 'Your material request was rejected.' },
    { user: 'Arjun Mehta', type: 'project_update', title: 'Mentor Feedback Received', msg: 'You have new feedback from your mentor.' }, // using project_update as a stand in for feedback received
    { user: 'Riya Sharma', type: 'project_update', title: 'Project Update', msg: 'Your project has an update.' },
    { user: 'Riya Sharma', type: 'material_request_rejected', title: 'Material Request Pending', msg: 'Your request is pending.' }, // No exact pending type, using something else or standard if allowed. Wait, NOTIFICATION_TYPES does not have material_request_pending. So use project_update for now. Let me just use valid enum.
    { user: 'Ananya Singh', type: 'club_join_request', title: 'Join Request', msg: 'Your join request is pending.' },
    { user: 'Dr. Neha Verma', type: 'club_join_request', title: 'New Join Request', msg: 'You have a new club join request.' },
    { user: 'Dr. Amit Joshi', type: 'project_join_request', title: 'New Join Request', msg: 'You have a new project join request.' },
    { user: 'Dr. Amit Joshi', type: 'project_update', title: 'Project Update Submitted', msg: 'A student has submitted an update.' },
    { user: 'Vivek Malhotra', type: 'material_request_approved', title: 'Pending Material Request', msg: 'There is a pending material request.' },
    { user: 'Vivek Malhotra', type: 'project_join_request', title: 'Pending Project Request', msg: 'There is a pending project request.' }
  ];

  for (const n of notificationsData) {
    await Notification.create({
      userId: userDocs[n.user]._id,
      type: n.type,
      title: n.title,
      message: n.msg,
      isRead: false
    });
    report.notifications++;
  }

  console.log('\n--- SEED COMPLETE ---');
  console.log(report);
  
  // Clean up
  mongoose.disconnect();
  process.exit(0);
}

runSeed().catch(err => {
  console.error(err);
  process.exit(1);
});
