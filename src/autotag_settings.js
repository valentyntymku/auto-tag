export default {
  DebugLogging: (process.env.DEBUG_LOGGING === 'Enabled'),
  DebugLoggingOnFailure: (process.env.DEBUG_LOGGING_ON_FAILURE !== 'Disabled'),
  AutoTags: {
    CreateTime: (process.env.CREATE_TIME !== 'Disabled'),
    InvokedBy: (process.env.INVOKED_BY !== 'Disabled'),
    OwnerEmail: (process.env.OWNER_EMAIL !== 'Disabled'),
    CostCenter: (process.env.COST_CENTER !== 'Disabled')

  },
  CustomTags: (!process.env.CUSTOM_TAGS || process.env.CUSTOM_TAGS === '') ? '{}' : process.env.CUSTOM_TAGS
};
