const express = require('express');
const router = express.Router();

router.use((req, res) => {
  res.json({
    subscription: {
      plans: [
        { id: 'lite', name: 'Lite', price: 25, dataGB: 5, days: 2, currency: 'INR' },
        { id: 'premium', name: 'Premium', price: 49, dataGB: 10, days: 4, currency: 'INR' },
        { id: 'pro', name: 'Pro', price: 99, dataGB: 20, days: 6, currency: 'INR' },
        { id: 'pro_max', name: 'Pro Max', price: 200, dataGB: 50, days: 8, currency: 'INR' },
      ],
    },
  });
});

module.exports = router;
