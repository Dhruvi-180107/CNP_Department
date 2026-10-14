/**
 * Task 2H — Material Requests Routes (secured in 2J Part 2)
 * Mounted at: /api/material-requests  (via server.js)
 *
 * SECURITY (2J Part 2):
 *   - All routes require authentication.
 *   - Actor identity from req.user (JWT) — never from body/query.
 *   - POST /: student must be Team Leader of the project (from JWT).
 *   - GET / (admin list): requires project_admin.
 *   - GET /project/:projectId: allowed by project_admin, assigned faculty_mentor, or project member.
 *   - PATCH approve/reject: project_admin only.
 *
 * Routes:
 *   POST   /                           — Team Leader creates request
 *   GET    /                           — project_admin: all requests
 *   GET    /project/:projectId         — project member / mentor / admin
 *   PATCH  /:requestId/approve         — project_admin approves (runs full workflow)
 *   PATCH  /:requestId/reject          — project_admin rejects (reason required)
 */

import express from 'express';
import Project from '../models/Project.js';
import ProjectMembership from '../models/ProjectMembership.js';
import ProjectMentor from '../models/ProjectMentor.js';
import GuitarInventory from '../models/GuitarInventory.js';
import MaterialRequest from '../models/MaterialRequest.js';
import ProjectMaterial from '../models/ProjectMaterial.js';
import InventoryAllocation from '../models/InventoryAllocation.js';
import User from '../models/User.js';
import { createNotification, createNotifications } from '../services/notificationService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole, requireAnyRole } from '../middleware/requireRole.js';
import { uploadMixed, getBase64DataURI, handleUploadError } from '../middleware/upload.js';
import { uploadImage, uploadRaw } from '../services/cloudinaryService.js';

const router = express.Router();

// ── POST /api/material-requests ───────────────────────────────────────────────
// Team Leader creates a material request from Guitar inventory.
// Supports optional reference document/PDF and optional component image.
// SECURITY: requestedBy derived from req.user.userId — never from body.
router.post(
  '/',
  requireAuth,
  requireAnyRole('student'),
  uploadMixed.fields([
    { name: 'document', maxCount: 1 },
    { name: 'referenceFile', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  handleUploadError,
  async (req, res) => {
    try {
      const { projectId, inventoryItemId, quantity, reason, specifications } = req.body;
      const requestedBy = req.user.userId; // SECURITY: from JWT

      if (!projectId || !inventoryItemId || quantity == null) {
        return res.status(400).json({
          success: false,
          message: 'projectId, inventoryItemId, and quantity are required',
        });
      }

      const qty = Number(quantity);
      if (isNaN(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: 'quantity must be a positive integer' });
      }

      if (!reason || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Reason or explanation of the requirement is required',
        });
      }

      // 1. Verify project exists
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      // 2. Verify requester is the Team Leader of this project
      if (!project.teamLeaderId || project.teamLeaderId.toString() !== requestedBy) {
        return res.status(403).json({
          success: false,
          message: 'Only the Team Leader of this project can submit material requests',
        });
      }

      // 3. Verify inventory item exists
      const invItem = await GuitarInventory.findById(inventoryItemId);
      if (!invItem) {
        return res.status(404).json({ success: false, message: 'Inventory item not found' });
      }

      // 4. Validate inventory availability limits
      if (qty > invItem.availableQuantity) {
        return res.status(400).json({
          success: false,
          message: `Requested quantity (${qty}) exceeds available stock (${invItem.availableQuantity})`,
        });
      }

      // 5. Handle optional file uploads
      let documentUrl = null;
      let documentPublicId = null;
      let documentOriginalName = null;

      const docFile = req.files?.document?.[0] || req.files?.referenceFile?.[0];
      if (docFile) {
        const fileUri = getBase64DataURI(docFile);
        let uploadResult;
        if (docFile.mimetype.startsWith('image/')) {
          uploadResult = await uploadImage(fileUri, { folder: 'cnp/material-requests' });
        } else {
          uploadResult = await uploadRaw(fileUri, {
            folder: 'cnp/material-requests',
            originalName: docFile.originalname,
            mimeType: docFile.mimetype,
          });
        }
        documentUrl = uploadResult.secure_url;
        documentPublicId = uploadResult.public_id;
        documentOriginalName = docFile.originalname;
      }

      let imageUrl = null;
      let imagePublicId = null;

      const imgFile = req.files?.image?.[0];
      if (imgFile) {
        const fileUri = getBase64DataURI(imgFile);
        const uploadResult = await uploadImage(fileUri, { folder: 'cnp/material-requests' });
        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;
      }

      const request = await MaterialRequest.create({
        projectId,
        requestedBy, // SECURITY: JWT-derived
        inventoryItemId,
        materialName: invItem.name,
        specifications: specifications ? specifications.trim() : '',
        quantity: qty,
        reason: reason.trim(),
        status: 'pending',
        documentUrl,
        documentPublicId,
        documentOriginalName,
        imageUrl,
        imagePublicId,
      });

      await request.populate('requestedBy', 'name email role department semester');
      await request.populate('projectId', 'name status');
      await request.populate('inventoryItemId', 'name category availableQuantity totalQuantity location');

      // Notify Project Admin(s) about the new material request from Guitar inventory
      try {
        const projectAdmins = await User.find({ role: 'project_admin' });
        if (projectAdmins.length > 0) {
          const requesterName = request.requestedBy?.name || req.user.name || 'Team Leader';
          await createNotifications(
            projectAdmins.map((admin) => ({
              userId: admin._id,
              type: 'material_request_submitted',
              title: 'New Material Request',
              message: `Team Leader ${requesterName} requested ${qty}x "${invItem.name}" for project "${project.name}".`,
              relatedId: request._id,
              link: '/material-requests',
              actionText: 'Review Request',
              metadata: {
                actorId: req.user.userId,
                actorName: requesterName,
                actorEmail: request.requestedBy?.email || req.user.email || null,
                department: request.requestedBy?.department || req.user.department || null,
                semester: request.requestedBy?.semester || req.user.semester || null,
                projectId: project._id,
                projectName: project.name,
                entityName: invItem.name,
                quantity: qty,
                reason: reason.trim(),
                status: 'pending',
                action: 'submitted',
              },
            }))
          );
        }
      } catch (notifErr) {
        console.error('[Notification] material_request_submitted error:', notifErr.message);
      }

      res.status(201).json({
        success: true,
        message: 'Material request submitted successfully',
        data: request,
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid ID format' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── GET /api/material-requests ────────────────────────────────────────────────
// project_admin sees ALL requests.
// SECURITY: No adminId query param needed — role from JWT.
router.get('/', requireAuth, requireRole('project_admin'), async (_req, res) => {
  try {
    const requests = await MaterialRequest.find()
      .populate('requestedBy', 'name email role department semester')
      .populate('projectId', 'name status')
      .populate('inventoryItemId', 'name category availableQuantity totalQuantity location')
      .populate('reviewedBy', 'name email role department semester')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/material-requests/project/:projectId ─────────────────────────────
// Project members, mentor, and admin can view requests for a project.
// SECURITY: identity from req.user — no userId query param needed.
router.get('/project/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const actingUser = req.user; // SECURITY: JWT-derived

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Authorization by role:
    if (actingUser.role === 'project_admin') {
      // Admin can view any project's requests — ok
    } else if (actingUser.role === 'faculty_mentor') {
      // Mentor must be assigned to this project
      const mentorAssign = await ProjectMentor.findOne({ projectId, mentorId: actingUser.userId });
      if (!mentorAssign) {
        return res.status(403).json({
          success: false,
          message: 'Faculty Mentor can only view requests for assigned projects',
        });
      }
    } else if (actingUser.role === 'student') {
      // Student must be a member of the project or designated Team Leader
      const membership = await ProjectMembership.findOne({ projectId, studentId: actingUser.userId });
      const tlId = project.teamLeaderId ? (project.teamLeaderId._id || project.teamLeaderId).toString() : null;
      const isTL = tlId && tlId === actingUser.userId;
      if (!membership && !isTL) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this project',
        });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const requests = await MaterialRequest.find({ projectId })
      .populate('requestedBy', 'name email role department semester')
      .populate('projectId', 'name status')
      .populate('inventoryItemId', 'name category availableQuantity totalQuantity location')
      .populate('reviewedBy', 'name email role department semester')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PATCH /api/material-requests/:requestId/approve ──────────────────────────
// Project Admin approves request — runs the full atomic workflow:
//   1. Validate
//   2. Set request status = approved (atomically prevent duplicate approvals)
//   3. Decrease inventory.availableQuantity (atomically prevent negative inventory)
//   4. Create ProjectMaterial entry (source = guitar)
//   5. Create InventoryAllocation record
// SECURITY: project_admin only. adminId derived from JWT.
router.patch('/:requestId/approve', requireAuth, requireRole('project_admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user.userId; // SECURITY: from JWT

    // 1. Load & validate request
    const request = await MaterialRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Material request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Request is already ${request.status}. Only pending requests can be approved.`,
      });
    }

    // 2. Validate inventory
    const invItem = await GuitarInventory.findById(request.inventoryItemId);
    if (!invItem) {
      return res.status(404).json({ success: false, message: 'Inventory item no longer exists' });
    }
    if (request.quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid request quantity' });
    }
    if (request.quantity > invItem.availableQuantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient inventory. Requested: ${request.quantity}, Available: ${invItem.availableQuantity}`,
      });
    }

    // 3. Validate project & Team Leader
    const project = await Project.findById(request.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Associated project not found' });
    }
    if (
      !project.teamLeaderId ||
      project.teamLeaderId.toString() !== request.requestedBy.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: 'The requester is no longer the Team Leader of this project. Cannot approve.',
      });
    }

    // ── All validations passed — execute workflow atomically ──────────────────

    // Step A: Atomically claim request status (pending -> approved) to prevent duplicate approvals
    const updatedRequest = await MaterialRequest.findOneAndUpdate(
      { _id: requestId, status: 'pending' },
      {
        $set: {
          status: 'approved',
          reviewedBy: adminId, // SECURITY: JWT-derived
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(409).json({
        success: false,
        message: 'Request is no longer pending or was already processed.',
      });
    }

    // Step B: Atomically decrease availableQuantity with safety check against negative inventory
    const updatedInv = await GuitarInventory.findOneAndUpdate(
      { _id: invItem._id, availableQuantity: { $gte: updatedRequest.quantity } },
      { $inc: { availableQuantity: -updatedRequest.quantity } },
      { new: true }
    );

    if (!updatedInv) {
      // Rollback request status if inventory was claimed in race condition
      await MaterialRequest.findByIdAndUpdate(requestId, {
        $set: { status: 'pending', reviewedBy: null, reviewedAt: null },
      });
      return res.status(400).json({
        success: false,
        message: `Insufficient inventory. Requested: ${updatedRequest.quantity}, Available: ${invItem.availableQuantity}`,
      });
    }

    // Step C: Create ProjectMaterial entry (guitar source) — prevent duplicate entries
    let material = await ProjectMaterial.findOne({ materialRequestId: updatedRequest._id });
    if (!material) {
      material = await ProjectMaterial.create({
        projectId: updatedRequest.projectId,
        name: invItem.name,
        quantity: updatedRequest.quantity,
        source: 'guitar',
        inventoryItemId: invItem._id,
        materialRequestId: updatedRequest._id,
        addedBy: adminId, // SECURITY: JWT-derived
        image: updatedRequest.imageUrl || null,
        imagePublicId: updatedRequest.imagePublicId || null,
        specifications: updatedRequest.specifications || '',
        documentUrl: updatedRequest.documentUrl || null,
        documentPublicId: updatedRequest.documentPublicId || null,
        documentOriginalName: updatedRequest.documentOriginalName || null,
      });
    }

    // Step D: Create InventoryAllocation record
    const allocation = await InventoryAllocation.create({
      inventoryItemId: invItem._id,
      projectId: updatedRequest.projectId,
      materialRequestId: updatedRequest._id,
      quantity: updatedRequest.quantity,
      allocatedBy: adminId, // SECURITY: JWT-derived
      allocatedAt: new Date(),
    });

    // Populate for response
    await updatedRequest.populate('requestedBy', 'name email role department semester');
    await updatedRequest.populate('projectId', 'name status');
    await updatedRequest.populate('inventoryItemId', 'name category availableQuantity totalQuantity location');
    await updatedRequest.populate('reviewedBy', 'name email role department semester');

    // Step E: Notify the Team Leader that their request was approved
    const approverName = req.user.name || 'Project Admin';
    createNotification({
      userId: project.teamLeaderId,
      type: 'material_request_approved',
      title: 'Material Request Approved',
      message: `Project Admin ${approverName} approved your request for ${updatedRequest.quantity}x "${invItem.name}" for project "${project.name}".`,
      relatedId: updatedRequest._id,
      link: `/projects/${project._id}`,
      actionText: 'View Materials',
      metadata: {
        actorId: req.user.userId,
        actorName: approverName,
        projectId: project._id,
        projectName: project.name,
        entityName: invItem.name,
        quantity: updatedRequest.quantity,
        action: 'approved',
      },
    }).catch((e) => console.error('[Notification] material_request_approved:', e.message));

    res.status(200).json({
      success: true,
      message: 'Material request approved. Inventory updated and project material added.',
      data: {
        request: updatedRequest,
        material,
        allocation,
        inventory: {
          name: updatedInv.name,
          availableQuantity: updatedInv.availableQuantity,
          totalQuantity: updatedInv.totalQuantity,
        },
      },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PATCH /api/material-requests/:requestId/reject ────────────────────────────
// Project Admin rejects request — rejectionReason is REQUIRED.
// Inventory and project material list are NOT changed.
// SECURITY: project_admin only. adminId derived from JWT.
router.patch('/:requestId/reject', requireAuth, requireRole('project_admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user.userId; // SECURITY: from JWT

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'rejectionReason is required when rejecting a material request',
      });
    }

    const updatedRequest = await MaterialRequest.findOneAndUpdate(
      { _id: requestId, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          rejectionReason: rejectionReason.trim(),
          reviewedBy: adminId, // SECURITY: JWT-derived
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedRequest) {
      const existing = await MaterialRequest.findById(requestId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Material request not found' });
      }
      return res.status(409).json({
        success: false,
        message: `Request is already ${existing.status}. Only pending requests can be rejected.`,
      });
    }

    await updatedRequest.populate('requestedBy', 'name email role department semester');
    await updatedRequest.populate('projectId', 'name status');
    await updatedRequest.populate('inventoryItemId', 'name category availableQuantity totalQuantity location');
    await updatedRequest.populate('reviewedBy', 'name email role department semester');

    // Notify the Team Leader about the rejection (inventory unchanged)
    const rejectedProject = await Project.findById(updatedRequest.projectId).select('name teamLeaderId');
    const rejectedInvItem = await GuitarInventory.findById(updatedRequest.inventoryItemId).select('name');
    const rejectorName = req.user.name || 'Project Admin';
    if (rejectedProject?.teamLeaderId) {
      createNotification({
        userId: rejectedProject.teamLeaderId,
        type: 'material_request_rejected',
        title: 'Material Request Rejected',
        message: `Your request for ${updatedRequest.quantity}x "${rejectedInvItem?.name || 'item'}" for project "${rejectedProject.name}" was rejected by ${rejectorName}. Reason: ${rejectionReason.trim()}`,
        relatedId: updatedRequest._id,
        link: `/projects/${rejectedProject._id}`,
        actionText: 'View Request History',
        metadata: {
          actorId: req.user.userId,
          actorName: rejectorName,
          projectId: rejectedProject._id,
          projectName: rejectedProject.name,
          entityName: rejectedInvItem?.name,
          quantity: updatedRequest.quantity,
          reason: rejectionReason.trim(),
          action: 'rejected',
        },
      }).catch((e) => console.error('[Notification] material_request_rejected:', e.message));
    }

    res.status(200).json({
      success: true,
      message: 'Material request rejected.',
      data: updatedRequest,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
