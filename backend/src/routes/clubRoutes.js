import express from 'express';
import Club from '../models/Club.js';
import ClubMembership from '../models/ClubMembership.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAnyRole } from '../middleware/requireRole.js';
import { uploadImages, getBase64DataURI, handleUploadError } from '../middleware/upload.js';
import { uploadImage, deleteAsset } from '../services/cloudinaryService.js';

const router = express.Router();

// ── POST /api/clubs/:id/logo ──────────────────────────────────────────────
router.post(
  '/:id/logo',
  requireAuth,
  requireAnyRole('club_admin', 'faculty_coordinator'),
  uploadImages.single('logo'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image provided' });
      }

      const club = await Club.findById(req.params.id);
      if (!club) {
        return res.status(404).json({ success: false, message: 'Club not found' });
      }

      // Authorization: Faculty Coordinator can only update their assigned club
      if (req.user.role === 'faculty_coordinator') {
        if (!club.facultyCoordinatorId || club.facultyCoordinatorId.toString() !== req.user.userId) {
          return res.status(403).json({
            success: false,
            message: 'You are not assigned as the coordinator for this club',
          });
        }
      }

      const fileUri = getBase64DataURI(req.file);
      const result = await uploadImage(fileUri, { folder: 'cnp/clubs' });

      // Clean up old logo
      if (club.logoPublicId) {
        try {
          await deleteAsset(club.logoPublicId, 'image');
        } catch (err) {
          console.error(`Failed to delete old club logo ${club.logoPublicId}:`, err.message);
        }
      }

      club.logo = result.secure_url;
      club.logoPublicId = result.public_id;
      await club.save();

      res.status(200).json({
        success: true,
        message: 'Club logo updated successfully',
        data: { logo: club.logo },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── POST /api/clubs/:id/cover_image ───────────────────────────────────────
router.post(
  '/:id/cover_image',
  requireAuth,
  requireAnyRole('club_admin', 'faculty_coordinator'),
  uploadImages.single('coverImage'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image provided' });
      }

      const club = await Club.findById(req.params.id);
      if (!club) {
        return res.status(404).json({ success: false, message: 'Club not found' });
      }

      // Authorization: Faculty Coordinator can only update their assigned club
      if (req.user.role === 'faculty_coordinator') {
        if (!club.facultyCoordinatorId || club.facultyCoordinatorId.toString() !== req.user.userId) {
          return res.status(403).json({
            success: false,
            message: 'You are not assigned as the coordinator for this club',
          });
        }
      }

      const fileUri = getBase64DataURI(req.file);
      const result = await uploadImage(fileUri, { folder: 'cnp/clubs/covers' });

      // Clean up old cover image
      if (club.coverImagePublicId) {
        try {
          await deleteAsset(club.coverImagePublicId, 'image');
        } catch (err) {
          console.error(`Failed to delete old club cover image ${club.coverImagePublicId}:`, err.message);
        }
      }

      club.coverImage = result.secure_url;
      club.coverImagePublicId = result.public_id;
      await club.save();

      res.status(200).json({
        success: true,
        message: 'Club cover image updated successfully',
        data: { coverImage: club.coverImage },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── POST /api/clubs ───────────────────────────────────────────────────────────
// Create a new club.
// Only club_admin can create clubs.
// createdBy is derived from the authenticated user — never trusted from client.
router.post('/', requireAuth, requireAnyRole('club_admin'), async (req, res) => {
  try {
    const { name, description, logo, images, facultyCoordinatorId } = req.body;
    const createdBy = req.user.userId; // SECURITY: from JWT, never from body

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'name and description are required',
      });
    }

    const club = await Club.create({
      name,
      description,
      logo: logo || null,
      images: images || [],
      facultyCoordinatorId: facultyCoordinatorId || null,
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: 'Club created successfully',
      data: club,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ── PATCH /api/clubs/:clubId ──────────────────────────────────────────────────
// Edit club details. Only club_admin can edit club details.
router.patch('/:clubId', requireAuth, requireAnyRole('club_admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const { clubId } = req.params;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    if (name !== undefined) club.name = name;
    if (description !== undefined) club.description = description;

    await club.save();

    res.status(200).json({
      success: true,
      message: 'Club details updated successfully',
      data: club,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid club ID format' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PATCH /api/clubs/:clubId/coordinator ──────────────────────────────────────
// Reassign Faculty Coordinator. Only club_admin can do this.
router.patch('/:clubId/coordinator', requireAuth, requireAnyRole('club_admin'), async (req, res) => {
  try {
    const { facultyCoordinatorId } = req.body;
    const { clubId } = req.params;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    // If they want to unset the coordinator
    if (facultyCoordinatorId === null || facultyCoordinatorId === '') {
      club.facultyCoordinatorId = null;
    } else {
      const fcUser = await User.findById(facultyCoordinatorId);
      if (!fcUser) {
        return res.status(404).json({ success: false, message: 'Supplied facultyCoordinatorId user not found' });
      }
      if (fcUser.role !== 'faculty_coordinator') {
        return res.status(400).json({ success: false, message: 'Supplied user is not a faculty_coordinator' });
      }
      club.facultyCoordinatorId = facultyCoordinatorId;
    }

    await club.save();
    await club.populate('facultyCoordinatorId', 'name email role profileImage department semester');

    res.status(200).json({
      success: true,
      message: 'Faculty Coordinator updated successfully',
      data: club,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/clubs ────────────────────────────────────────────────────────────
// Return all clubs — publicly readable (any authenticated user).
router.get('/', requireAuth, async (_req, res) => {
  try {
    const clubs = await Club.find()
      .populate('facultyCoordinatorId', 'name email role profileImage department semester')
      .populate('createdBy', 'name email role profileImage department semester')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: clubs.length,
      data: clubs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ── POST /api/clubs/:clubId/members ───────────────────────────────────────────
// Add a student to a club (administrative add, not via join request).
// SECURITY:
//   - faculty_coordinator: can only add to their assigned club
//   - club_admin: can add to any club
router.post(
  '/:clubId/members',
  requireAuth,
  requireAnyRole('faculty_coordinator', 'club_admin'),
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { studentId, membershipType, position } = req.body;

      if (!studentId || !membershipType) {
        return res.status(400).json({
          success: false,
          message: 'studentId and membershipType are required',
        });
      }

      // Verify the club exists
      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).json({
          success: false,
          message: 'Club not found',
        });
      }

      // Faculty Coordinator: must be the assigned coordinator of THIS club
      if (req.user.role === 'faculty_coordinator') {
        if (
          !club.facultyCoordinatorId ||
          club.facultyCoordinatorId.toString() !== req.user.userId
        ) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to manage this club',
          });
        }
      }

      const membership = await ClubMembership.create({
        studentId,
        clubId,
        membershipType,
        position: position || null,
      });

      // Populate student info before returning
      await membership.populate('studentId', 'name email role profileImage department semester');
      await membership.populate('clubId', 'name');

      res.status(201).json({
        success: true,
        message: 'Member added to club successfully',
        data: membership,
      });
    } catch (error) {
      // MongoDB duplicate key error code
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'This student is already a member of this club. Duplicate membership is not allowed.',
        });
      }
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ── GET /api/clubs/:clubId/members ────────────────────────────────────────────
// Return all members of a club — readable by any authenticated user.
router.get('/:clubId/members', requireAuth, async (req, res) => {
  try {
    const { clubId } = req.params;

    // Verify the club exists
    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found',
      });
    }

    const members = await ClubMembership.find({ clubId })
      .populate('studentId', 'name email role profileImage department semester') // Only safe fields — no passwords
      .sort({ joinedAt: 1 });

    res.status(200).json({
      success: true,
      club: { id: club._id, name: club.name },
      count: members.length,
      data: members,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ── DELETE /api/clubs/:clubId/members/:studentId ──────────────────────────────
router.delete(
  '/:clubId/members/:studentId',
  requireAuth,
  requireAnyRole('faculty_coordinator', 'club_admin'),
  async (req, res) => {
    try {
      const { clubId, studentId } = req.params;

      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).json({ success: false, message: 'Club not found' });
      }

      if (req.user.role === 'faculty_coordinator') {
        if (!club.facultyCoordinatorId || club.facultyCoordinatorId.toString() !== req.user.userId) {
          return res.status(403).json({ success: false, message: 'You are not authorized to manage this club' });
        }
      }

      const membership = await ClubMembership.findOneAndDelete({ clubId, studentId });
      if (!membership) {
        return res.status(404).json({ success: false, message: 'Membership not found' });
      }

      res.status(200).json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── PATCH /api/clubs/:clubId/members/:studentId ───────────────────────────────
router.patch(
  '/:clubId/members/:studentId',
  requireAuth,
  requireAnyRole('faculty_coordinator', 'club_admin'),
  async (req, res) => {
    try {
      const { clubId, studentId } = req.params;
      const { membershipType, position } = req.body;

      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).json({ success: false, message: 'Club not found' });
      }

      if (req.user.role === 'faculty_coordinator') {
        if (!club.facultyCoordinatorId || club.facultyCoordinatorId.toString() !== req.user.userId) {
          return res.status(403).json({ success: false, message: 'You are not authorized to manage this club' });
        }
      }

      if (membershipType && !['member', 'core_team'].includes(membershipType)) {
        return res.status(400).json({ success: false, message: 'Invalid membershipType' });
      }

      const membership = await ClubMembership.findOne({ clubId, studentId });
      if (!membership) {
        return res.status(404).json({ success: false, message: 'Membership not found' });
      }

      if (membershipType !== undefined) {
        membership.membershipType = membershipType;
      }
      
      if (position !== undefined) {
        membership.position = position || null;
      }

      await membership.save();
      await membership.populate('studentId', 'name email role profileImage department semester');
      await membership.populate('clubId', 'name');

      res.status(200).json({ success: true, message: 'Membership updated successfully', data: membership });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
