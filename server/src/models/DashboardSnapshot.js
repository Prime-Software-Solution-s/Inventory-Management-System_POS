const mongoose = require('mongoose');

const dashboardSnapshotSchema = new mongoose.Schema(
  {
    monthKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    stats: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    charts: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    activity: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    snapshotSource: {
      type: String,
      enum: ['live', 'backfill'],
      default: 'live',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DashboardSnapshot', dashboardSnapshotSchema);
