const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./modules/auth/auth.routes');
const automationRoutes = require('./modules/automation/automation.routes');
const billingRoutes = require('./modules/billing_hn/billing.routes');
const cashRoutes = require('./modules/cash/cash.routes');
const customersRoutes = require('./modules/customers/customers.routes');
const goalsRoutes = require('./modules/goals/goals.routes');
const imagesRoutes = require('./modules/products/images.routes');
const layawayRoutes = require('./modules/layaway/layaway.routes');
const loyaltyRoutes = require('./modules/loyalty/loyalty.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const productsRoutes = require('./modules/products/products.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const salesRoutes = require('./modules/sales/sales.routes');
const storeSettingsRoutes = require('./modules/store_settings/store-settings.routes');
const usersRoutes = require('./modules/users/users.routes');
const variantsRoutes = require('./modules/products/variants.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
  res.json({ ok: true });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/automation', automationRoutes);
apiRouter.use('/billing', billingRoutes);
apiRouter.use('/cash', cashRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/customers', customersRoutes);
apiRouter.use('/goals', goalsRoutes);
apiRouter.use('/store-settings', storeSettingsRoutes);
apiRouter.use('/products', productsRoutes);
apiRouter.use('/variants', variantsRoutes);
apiRouter.use('/images', imagesRoutes);
apiRouter.use('/layaways', layawayRoutes);
apiRouter.use('/sales', salesRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/', loyaltyRoutes);

app.use('/api', apiRouter);

module.exports = app;
