import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './src/models/User.js';
import Club from './src/models/Club.js';
import JoinRequest from './src/models/JoinRequest.js';
import { clubJoinRouter, joinRequestRouter } from './src/routes/joinRequestRoutes.js';
import clubRoutes from './src/routes/clubRoutes.js';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/clubs', clubRoutes);
app.use('/api/clubs', clubJoinRouter);
app.use('/api/join-requests', joinRequestRouter);

let adminToken;
let coordinatorToken;
let studentToken;
let clubId;
let adminId;
let coordinatorId;
let studentId;

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
};

async function runTests() {
  console.log('--- Starting tests ---');
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'secret';
  await connectDB();
  
  await User.deleteMany({ email: { $in: ['test-club-admin@example.com', 'test-fc@example.com', 'test-student@example.com'] } });
  
  const admin = await User.create({ name: 'Club Admin', email: 'test-club-admin@example.com', password: 'password', role: 'club_admin' });
  adminId = admin._id.toString();
  adminToken = generateToken(adminId, 'club_admin');
  
  const fc = await User.create({ name: 'FC', email: 'test-fc@example.com', password: 'password', role: 'faculty_coordinator' });
  coordinatorId = fc._id.toString();
  coordinatorToken = generateToken(coordinatorId, 'faculty_coordinator');
  
  const student = await User.create({ name: 'Student', email: 'test-student@example.com', password: 'password', role: 'student' });
  studentId = student._id.toString();
  studentToken = generateToken(studentId, 'student');
  
  const club = await Club.create({ name: 'Test Club', description: 'Test', createdBy: adminId });
  clubId = club._id.toString();
  
  await JoinRequest.create({ requestType: 'club', studentId, clubId, reviewerId: fc._id, status: 'pending' });

  // TESTS
  let passes = 0;
  let fails = 0;

  const check = (condition, msg) => {
    if (condition) {
      console.log(`PASS: ${msg}`);
      passes++;
    } else {
      console.error(`FAIL: ${msg}`);
      fails++;
    }
  };

  try {
    const res1 = await request(app)
      .patch(`/api/clubs/${clubId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Name', description: 'Updated Description' });
    check(res1.status === 200 && res1.body.data.name === 'Updated Name', 'CLUB EDIT: Club Admin can update name and description');

    const res2 = await request(app)
      .patch(`/api/clubs/${clubId}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ name: 'Hacked Name' });
    check(res2.status === 403, 'CLUB EDIT: Non-Club-Admin cannot update club details');

    const res3 = await request(app)
      .patch(`/api/clubs/${clubId}/coordinator`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ facultyCoordinatorId: coordinatorId });
    check(res3.status === 200 && res3.body.data.facultyCoordinatorId._id === coordinatorId, 'COORDINATOR: Club Admin can assign a valid Faculty Coordinator');

    const res4 = await request(app)
      .patch(`/api/clubs/${clubId}/coordinator`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ facultyCoordinatorId: studentId });
    check(res4.status === 400, 'COORDINATOR: Non-Faculty-Coordinator user cannot be assigned');

    const res5 = await request(app)
      .get(`/api/join-requests/club/all`)
      .set('Authorization', `Bearer ${adminToken}`);
    check(res5.status === 200 && res5.body.data.length > 0 && res5.body.data[0].requestType === 'club', 'JOIN REQUESTS: Club Admin can retrieve club requests across multiple clubs');

    const res6 = await request(app)
      .get(`/api/join-requests/club/all`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    check(res6.status === 403, 'JOIN REQUESTS: Unauthorized roles cannot access the global endpoint');

  } catch (e) {
    console.error(e);
  }

  // Cleanup
  await User.deleteMany({ _id: { $in: [adminId, coordinatorId, studentId] } });
  await Club.deleteMany({ _id: clubId });
  await JoinRequest.deleteMany({ clubId });
  await mongoose.connection.close();

  console.log(`\nResults: ${passes} passed, ${fails} failed.`);
  if (fails > 0) process.exit(1);
}

runTests();
