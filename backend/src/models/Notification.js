import mongoose from 'mongoose';

// ── Notification ──────────────────────────────────────────────────────────────
// Central notification model. userId = the recipient.
// relatedId = the ID of the triggering entity (joinRequest, project, update, etc.)

const NOTIFICATION_TYPES = [
  'club_join_request',
  'club_join_approved',
  'club_join_rejected',
  'project_join_request',
  'project_join_approved',
  'project_join_rejected',
  'mentor_assigned',
  'project_update',
  'material_request_approved',
  'material_request_rejected',
  'material_request_submitted',
  'material_request_created',
  'material_request',
  'material_added',
  'project_material_added',
  'event_created',
  'event_reminder',
];

const notificationSchema = new mongoose.Schema(
  {
    // Recipient of the notification
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'type is required'],
      enum: {
        values: NOTIFICATION_TYPES,
        message: `type must be one of: ${NOTIFICATION_TYPES.join(', ')}`,
      },
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'message is required'],
      trim: true,
    },
    // ID of the related entity (join request, project, update, material request…)
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Optional navigation link/route to the relevant page
    link: {
      type: String,
      default: null,
      trim: true,
    },
    // Optional label for the primary action button (e.g. 'View Feedback', 'View Materials')
    actionText: {
      type: String,
      default: null,
      trim: true,
    },
    // Structured contextual details about the action and related resources
    metadata: {
      actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      actorName: {
        type: String,
        default: null,
        trim: true,
      },
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null,
      },
      projectName: {
        type: String,
        default: null,
        trim: true,
      },
      clubId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Club',
        default: null,
      },
      clubName: {
        type: String,
        default: null,
        trim: true,
      },
      entityName: {
        type: String,
        default: null,
        trim: true,
      },
      quantity: {
        type: Number,
        default: null,
      },
      reason: {
        type: String,
        default: null,
        trim: true,
      },
      feedbackText: {
        type: String,
        default: null,
        trim: true,
      },
      action: {
        type: String,
        default: null,
        trim: true,
      },
      actorEmail: {
        type: String,
        default: null,
        trim: true,
      },
      department: {
        type: String,
        default: null,
        trim: true,
      },
      semester: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      status: {
        type: String,
        default: null,
        trim: true,
      },
      requestDate: {
        type: Date,
        default: null,
      },
      source: {
        type: String,
        default: null,
        trim: true,
      },
      hasAttachments: {
        type: Boolean,
        default: false,
      },
      attachmentCount: {
        type: Number,
        default: 0,
      },
      creationTime: {
        type: Date,
        default: null,
      },
      submissionTime: {
        type: Date,
        default: null,
      },
      eventDate: {
        type: Date,
        default: null,
      },
      location: {
        type: String,
        default: null,
        trim: true,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for efficient unread-count queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
