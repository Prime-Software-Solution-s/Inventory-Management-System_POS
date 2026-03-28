const User = require('../models/User');

const getBootstrapAdminConfig = () => ({
  enabled:
    process.env.NODE_ENV !== 'production' && process.env.AUTO_BOOTSTRAP_ADMIN !== 'false',
  email: process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@inventoryos.com',
  password: process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin123!',
  name: process.env.BOOTSTRAP_ADMIN_NAME || 'Admin User',
});

const ensureBootstrapAdmin = async ({ syncPassword = false } = {}) => {
  const config = getBootstrapAdminConfig();

  if (!config.enabled) {
    return null;
  }

  let admin = await User.findOne({ email: config.email.toLowerCase() }).select('+password');

  if (!admin) {
    admin = await User.create({
      name: config.name,
      email: config.email,
      password: config.password,
      role: 'admin',
    });

    console.log(`Bootstrapped default admin: ${config.email}`);
    return admin;
  }

  let shouldSave = false;

  if (admin.role !== 'admin') {
    admin.role = 'admin';
    shouldSave = true;
  }

  if (syncPassword && !(await admin.comparePassword(config.password))) {
    admin.password = config.password;
    shouldSave = true;
  }

  if (shouldSave) {
    await admin.save();
  }

  return admin;
};

const bootstrapAdmin = async () => ensureBootstrapAdmin({ syncPassword: true });

module.exports = {
  bootstrapAdmin,
  ensureBootstrapAdmin,
  getBootstrapAdminConfig,
};
