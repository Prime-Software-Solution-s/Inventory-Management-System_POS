import { Bell, Command, Menu, MoonStar, SunMedium } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const Topbar = ({
  title,
  description,
  onMenuClick,
  onPaletteOpen,
  onNotificationsOpen,
  notificationCount,
  user,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="topbar">
      <div className="topbar-meta">
        <button className="icon-button topbar-menu" type="button" onClick={onMenuClick}>
          <Menu size={18} />
        </button>
        <div className="topbar-copy">
          <span className="topbar-kicker">Operations Center</span>
          <div className="topbar-title-row">
            <strong>{title}</strong>
            <span>{todayLabel}</span>
          </div>
          <p>{description}</p>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="shortcut-button" type="button" onClick={onPaletteOpen}>
          <Command size={15} />
          <span>Command</span>
          <kbd>Ctrl K</kbd>
        </button>

        <button className="icon-button" type="button" onClick={toggleTheme} aria-label="Toggle theme">
          {isDark ? <SunMedium size={18} /> : <MoonStar size={18} />}
        </button>

        <button className="icon-button notification-trigger" type="button" onClick={onNotificationsOpen}>
          <Bell size={18} />
          {notificationCount ? <span>{notificationCount}</span> : null}
        </button>

        <div className="user-pill">
          <strong>{user?.name}</strong>
          <span>{user?.role}</span>
        </div>
      </div>
    </header>
  );
};

export { Topbar };
