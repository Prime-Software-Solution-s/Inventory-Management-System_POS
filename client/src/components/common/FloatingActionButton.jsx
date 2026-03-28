const FloatingActionButton = ({ icon: Icon, label, onClick }) => (
  <button className="floating-action-button" type="button" onClick={onClick} aria-label={label}>
    <Icon size={20} />
  </button>
);

export { FloatingActionButton };
