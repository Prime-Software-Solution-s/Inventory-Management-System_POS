import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/formatters';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';

const toneByType = {
  info: 'neutral',
  success: 'success',
  warning: 'warning',
  critical: 'danger',
};

const NotificationCenter = ({ open, onClose, notifications, unreadCount, onRead, onReadAll }) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="notification-panel"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 18 }}
        >
          <div className="notification-header">
            <div>
              <h3>Notifications</h3>
              <p>{unreadCount} unread updates</p>
            </div>
            <Button variant="ghost" size="sm" icon={CheckCheck} onClick={onReadAll}>
              Mark all read
            </Button>
          </div>

          <div className="notification-list">
            {notifications.length ? (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  className={`notification-item ${notification.read ? 'notification-read' : ''}`}
                  type="button"
                  onClick={() => {
                    if (!notification.read) {
                      onRead(notification._id);
                    }

                    navigate(notification.link || '/dashboard');
                    onClose();
                  }}
                >
                  <div className="notification-item-head">
                    <strong>{notification.title}</strong>
                    <StatusBadge tone={toneByType[notification.type]}>{notification.type}</StatusBadge>
                  </div>
                  <p>{notification.message}</p>
                  <span>{formatDate(notification.createdAt)}</span>
                </button>
              ))
            ) : (
              <div className="empty-panel-state">
                <BellRing size={18} />
                <p>No notifications yet.</p>
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export { NotificationCenter };
