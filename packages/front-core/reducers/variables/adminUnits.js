const adminUnits = {
  1000000: {
    defaultRoute: 'users/units',
    roleName: 'Unit admin',
    navigation: {
      workflow: {
        MyWorkflow: false,
      },
      users: {
        Users: false,
        Units: true,
        editable: false,
      },
      registry: {
        Registry: false,
      },
      process: {
        Process: false,
      },
      healthcheck: {
        HealthCheckPage: false,
      },
      ui: false,
    },
  },
  1000001: {
    defaultRoute: 'process',
    roleName: 'Security admin',
    navigation: {
      workflow: {
        MyWorkflow: false,
      },
      users: {
        Users: true,
        Units: true,
        editable: true,
        UserAccessJournal: true,
        UserLoginJournal: true,
        UserOperations: true,
      },
      registry: {
        Registry: false,
      },
      process: {
        Process: true,
        editable: false,
        UserProcesses: true,
      },
      healthcheck: {
        HealthCheckPage: true,
      },
      ui: false,
    },
  },
  1000002: {
    roleName: 'System admin',
    navigation: {
      workflow: {
        MyWorkflow: true,
      },
      users: {
        Users: false,
        Units: false,
        UserAccessJournal: false,
        UserLoginJournal: false,
        UserOperations: false,
      },
      registry: {
        Registry: true,
      },
      process: {
        Process: false,
        editable: false,
        UserProcesses: true,
      },
      healthcheck: {
        HealthCheckPage: true,
      },
      ui: true,
    },
  },
  1000003: {
    defaultRoute: 'process',
    roleName: 'Support admin',
    navigation: {
      workflow: {
        MyWorkflow: false,
      },
      users: {
        Users: false,
        Units: false,
      },
      registry: {
        Registry: false,
      },
      process: {
        Process: true,
        editable: true,
      },
      healthcheck: {
        HealthCheckPage: true,
      },
      ui: false,
    },
  },
  1000000041: {
    defaultRoute: '/users',
    roleName: 'Readonly Security Admin',
    navigation: {
      workflow: {
        MyWorkflow: false,
      },
      users: {
        Users: true,
        Units: true,
        editable: false,
        UserAccessJournal: true,
        UserLoginJournal: true,
        UserOperations: true,
      },
      registry: {
        Registry: false,
      },
      process: {
        Process: true,
        editable: false,
        UserProcesses: true,
      },
      healthcheck: {
        HealthCheckPage: true,
      },
      ui: false,
    },
  },
  1000000042: {
    defaultRoute: '/registry',
    roleName: 'Readonly System Admin',
    navigation: {
      workflow: {
        MyWorkflow: true,
      },
      users: {
        Users: false,
        Units: false,
        UserAccessJournal: false,
        UserLoginJournal: false,
        UserOperations: false,
      },
      registry: {
        Registry: true,
      },
      process: {
        Process: false,
        editable: false,
        UserProcesses: true,
      },
      healthcheck: {
        HealthCheckPage: true,
      },
      ui: false,
    },
  },
  1000000043: {
    defaultRoute: '/workflow/journal',
    roleName: 'Readonly Support Admin',
    navigation: {
      workflow: {
        MyWorkflow: false,
      },
      users: {
        Users: false,
        Units: false,
      },
      registry: {
        Registry: false,
      },
      process: {
        Process: true,
        editable: false,
      },
      healthcheck: {
        HealthCheckPage: true,
      },
      ui: false,
    },
  },
};

export default adminUnits;
