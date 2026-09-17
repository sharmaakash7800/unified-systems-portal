require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Role = require('../models/Role');
const User = require('../models/User');
const System = require('../models/System');

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/unified_systems_portal';
  console.log(`[Seed] Connecting to ${uri}...`);

  try {
    await mongoose.connect(uri);
    console.log('[Seed] Database connected.');

    // 1. Organization
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: 'Universal Enterprise',
        shortName: 'UE',
        branding: {
          primaryColor: '#2563eb',
          portalTitle: 'Unified Systems Portal',
        },
        contactEmail: 'admin@portal.local',
      });
      console.log('[Seed] Organization created:', org.name);
    }

    // 2. Roles
    const defaultRoles = [
      {
        name: 'Super Admin',
        description: 'Complete unrestricted control over the entire portal and all systems',
        permissions: ['*'],
        isSystemRole: true,
      },
      {
        name: 'Admin',
        description: 'Manage users, roles, and view registered business systems',
        permissions: [
          'portal.dashboard.view',
          'users.view',
          'users.create',
          'users.edit',
          'roles.manage',
          'systems.view',
          'systems.manage',
          'audit.view',
          'supply-pms.access',
          'service-pms.access',
        ],
        isSystemRole: true,
      },
      {
        name: 'Operations Manager',
        description: 'Operational view with access to both Supply and Service systems',
        permissions: [
          'portal.dashboard.view',
          'supply-pms.access',
          'service-pms.access',
        ],
        isSystemRole: false,
      },
      {
        name: 'Supply Specialist',
        description: 'Dedicated access strictly restricted to Supply PMS',
        permissions: [
          'portal.dashboard.view',
          'supply-pms.access',
        ],
        isSystemRole: false,
      },
      {
        name: 'Service Engineer',
        description: 'Dedicated access strictly restricted to Service PMS',
        permissions: [
          'portal.dashboard.view',
          'service-pms.access',
        ],
        isSystemRole: false,
      },
    ];

    const rolesMap = {};
    for (const r of defaultRoles) {
      let roleDoc = await Role.findOne({ name: r.name });
      if (!roleDoc) {
        roleDoc = await Role.create(r);
        console.log(`[Seed] Created Role: ${r.name}`);
      } else {
        roleDoc.permissions = r.permissions;
        await roleDoc.save();
      }
      rolesMap[r.name] = roleDoc;
    }

    // 3. Business Systems (Dynamic Registry - Supply PMS and Service PMS)
    const initialSystems = [
      {
        name: 'Supply PMS',
        slug: 'supply-pms',
        description: 'Supply chain, procurement, materials & vendor management operations',
        icon: 'package',
        url: 'https://pms-central-kini.onrender.com/',
        category: 'Procurement & Logistics',
        status: 'active',
        sortOrder: 1,
        requiredPermission: 'supply-pms.access',
      },
      {
        name: 'Service PMS',
        slug: 'service-pms',
        description: 'Site execution, commissioning, maintenance & field service management',
        icon: 'wrench',
        url: 'https://sharmaakash7800.github.io/Service-PMS/',
        category: 'Field Operations',
        status: 'active',
        sortOrder: 2,
        requiredPermission: 'service-pms.access',
      },
    ];

    for (const sys of initialSystems) {
      let sysDoc = await System.findOne({ slug: sys.slug });
      if (!sysDoc) {
        sysDoc = await System.create(sys);
        console.log(`[Seed] Registered System: ${sys.name} (${sys.slug})`);
      }
    }

    // 4. Default Super Admin User
    const adminEmail = 'admin@portal.local';
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      const passwordHash = await User.hashPassword('Admin@123456');
      adminUser = await User.create({
        name: 'Portal Administrator',
        email: adminEmail,
        passwordHash,
        role: rolesMap['Super Admin']._id,
        organizationId: org._id,
        systemAccess: ['supply-pms', 'service-pms'],
        status: 'active',
      });
      console.log(`[Seed] Created Super Admin: ${adminEmail} (password: Admin@123456)`);
    }

    // 5. Sample restricted user for testing RBAC
    const supplyUserEmail = 'supply.user@portal.local';
    let supplyUser = await User.findOne({ email: supplyUserEmail });
    if (!supplyUser) {
      const passwordHash = await User.hashPassword('User@123456');
      supplyUser = await User.create({
        name: 'Rohit (Supply Team)',
        email: supplyUserEmail,
        passwordHash,
        role: rolesMap['Supply Specialist']._id,
        organizationId: org._id,
        systemAccess: ['supply-pms'],
        status: 'active',
      });
      console.log(`[Seed] Created Supply-only User: ${supplyUserEmail} (password: User@123456)`);
    }

    console.log('[Seed] Database seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
}

seed();
