const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');

const listNotifications = asyncHandler(async (req, res) => {
  const [items, unreadCount] = await Promise.all([
    Notification.find()
      .select('title message type read link createdAt')
      .sort({ createdAt: -1 })
      .limit(25)
      .lean(),
    Notification.countDocuments({ read: false }),
  ]);

  res.json({
    items,
    unreadCount,
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { read: true },
    { new: true }
  );

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found.');
  }

  res.json(notification);
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ read: false }, { $set: { read: true } });
  res.json({ message: 'All notifications marked as read.' });
});

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
