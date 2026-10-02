export const monetizationConfig = {
  mockPayments: String(process.env.MONETIZATION_MOCK_PAYMENTS ?? (process.env.NODE_ENV !== 'production')).toLowerCase() === 'true',
  categories: ['frame','background','badge','name_effect','banner','theme','sticker','emoji'],
  subscriptionStatuses: ['inactive','active','expired','cancelled'],
};
