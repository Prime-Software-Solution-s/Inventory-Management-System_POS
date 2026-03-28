const LoadingScreen = ({
  message = 'Preparing workspace',
  description = 'Syncing products, orders, and warehouse analytics.',
}) => (
  <div className="loading-screen loading-screen-static">
    <div className="loading-canvas loading-canvas-placeholder" aria-hidden="true">
      <span className="loading-orb loading-orb-one" />
      <span className="loading-orb loading-orb-two" />
      <span className="loading-orb loading-orb-three" />
    </div>
    <div className="loading-copy">
      <span className="section-eyebrow">InventoryOS</span>
      <h2>{message}</h2>
      <p>{description}</p>
    </div>
  </div>
);

export { LoadingScreen };
