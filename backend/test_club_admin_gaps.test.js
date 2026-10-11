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

beforeAll(async () => {
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
});

afterAll(async () => {
  await User.deleteMany({ _id: { $in: [adminId, coordinatorId, studentId] } });
  await Club.deleteMany({ _id: clubId });
  await JoinRequest.deleteMany({ clubId });
  await mongoose.connection.close();
});

describe('Club Admin Gaps', () => {
  it('CLUB EDIT: Club Admin can update name and description', async () => {
    const res = await request(app)
      .patch(`/api/clubs/${clubId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Name', description: 'Updated Description' });
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Name');
    expect(res.body.data.description).toBe('Updated Description');
  });
  
  it('CLUB EDIT: Non-Club-Admin cannot update club details', async () => {
    const res = await request(app)
      .patch(`/api/clubs/${clubId}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ name: 'Hacked Name' });
      
    expect(res.status).toBe(403);
  });
  
  it('COORDINATOR: Club Admin can assign a valid Faculty Coordinator', async () => {
    const res = await request(app)
      .patch(`/api/clubs/${clubId}/coordinator`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ facultyCoordinatorId: coordinatorId });
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.facultyCoordinatorId._id).toBe(coordinatorId);
  });
  
  it('COORDINATOR: Non-Faculty-Coordinator user cannot be assigned', async () => {
    const res = await request(app)
      .patch(`/api/clubs/${clubId}/coordinator`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ facultyCoordinatorId: studentId });
      
    expect(res.status).toBe(400);
  });
  
  it('JOIN REQUESTS: Club Admin can retrieve club requests across multiple clubs', async () => {
    const res = await request(app)
      .get(`/api/join-requests/club/all`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].requestType).toBe('club');
  });
  
  it('JOIN REQUESTS: Unauthorized roles cannot access the global endpoint', async () => {
    const res = await request(app)
      .get(`/api/join-requests/club/all`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
      
    expect(res.status).toBe(403);
  });
});
