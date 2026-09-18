const fs = require('fs');
const path = require('path');
const url = require('url');

const initialData = {
  stats: {
    totalApplications: 0,
    pendingInspections: 0,
    pendingDebris: 0,
    completedCollections: 0,
    activeOfficers: 3,
    totalTonnageCollected: '0 MT',
    recyclingEfficiency: '100%'
  },
  hotspots: [],
  applications: [],
  pinMappings: [
    { pin: '570001', ward: 'Ward 14 (Devaraja)', area: 'Palace Core / City Center', streets: 'Sayyaji Rao Rd, Ashoka Rd, Irwin Rd', mapLocation: '12.3051° N, 76.6551° E', authority: 'Mysuru Municipal Corporation (MCC)', officer: 'MCC Admin' },
    { pin: '570002', ward: 'Ward 18 (Gokulam)', area: 'Gokulam & Vontikoppal', streets: 'Contour Rd, Temple Rd, 3rd Stage', mapLocation: '12.3271° N, 76.6264° E', authority: 'Mysuru Municipal Corporation (MCC)', officer: 'MCC Admin' },
    { pin: '570026', ward: 'GP Ward 1-4', area: 'Bogadi Peripheral & Ring Road', streets: 'Bogadi Main Rd, Gadhinglaj Cross', mapLocation: '12.3021° N, 76.5912° E', authority: 'Bogadi Gram Panchayat', officer: 'Panchayat Admin' },
    { pin: '570018', ward: 'TP Ward 1-8', area: 'Hootagalli Industrial Belt', streets: 'KIADB Belagola Cross, Ring Rd Exit', mapLocation: '12.3489° N, 76.5744° E', authority: 'Hootagalli Town Panchayat', officer: 'Town Panchayat Admin' }
  ],
  authorities: [
    { name: 'Mysuru Municipal Corporation (MCC)', department: 'C&D Waste Enforcement Cell', areaWard: '65 Urban Wards / 9 Zones', contactDetails: 'mcc@gmail.com · 0821-2440890', address: 'MCC Head Office, Sayyaji Rao Rd, Mysuru' },
    { name: 'Bogadi Gram Panchayat', department: 'Rural Sanitation & Debris Clearance', areaWard: 'Bogadi, Maratikyathanahalli', contactDetails: 'gp@gmail.com · 0821-2598711', address: 'GP Bhavan, Bogadi Village' },
    { name: 'Hootagalli Town Panchayat', department: 'Suburban Civic & Demolition Desk', areaWard: 'Hootagalli CMC & Industrial Zone', contactDetails: 'tp@gmail.com · 0821-2402122', address: 'Town Council Office, Hootagalli' }
  ],
  inspectors: [],
  inspections: [],
  demolitionRequests: [],
  demolitionStatus: [],
  certificates: [],
  utilities: [],
  notifications: [],
  reports: {
    monthlyTrend: [],
    authorityBreakdown: []
  },
  users: [],
  settings: {
    autoRoutingEnabled: true,
    slaHoursThreshold: 4,
    defaultDestinationFacility: 'Kumbarakoppal ZWM C&D Plant',
    smsGateway: 'Active (Govt of Karnataka SMS Portal)',
    effectiveJurisdictionShiftMode: 'Dynamic Timestamp Rule'
  },
  registeredUsers: []
};

const https = require('https');

const CLOUD_OBJECT_ID = 'ff808181a09d98f701a0b5665eda376f';

function fetchCloudUsers() {
  return new Promise((resolve) => {
    https.get('https://api.restful-api.dev/objects/' + CLOUD_OBJECT_ID, { headers: { 'User-Agent': 'NodeJS' } }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed && parsed.data && Array.isArray(parsed.data.users)) {
            resolve(parsed.data.users);
            return;
          }
        } catch(e) {}
        resolve([]);
      });
    }).on('error', () => resolve([]));
  });
}

function persistCloudUsers(users) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ data: { users } });
    const req = https.request('https://api.restful-api.dev/objects/' + CLOUD_OBJECT_ID, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NodeJS'
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(true));
    });
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

const SYSTEM_ACCOUNTS = [
  {
    id: 'u_admin_gmail',
    name: 'Super Administrator',
    email: 'admin@gmail.com',
    passwords: ['admin123', 'admin', '123456', 'admin1', 'admin@123', 'password'],
    password: 'admin123',
    role: 'admin',
    authority: 'Super Admin',
    phone: '+91 98450 00001'
  },
  {
    id: 'u_admin',
    name: 'Super Administrator',
    email: 'admin@mysuru.gov.in',
    passwords: ['admin123', 'admin', '123456', 'admin1', 'admin@123', 'password'],
    password: 'admin123',
    role: 'admin',
    authority: 'Super Admin',
    phone: '+91 98450 00001'
  },
  {
    id: 'u_superadmin_gmail',
    name: 'Super Administrator',
    email: 'superadmin@gmail.com',
    passwords: ['admin123', 'admin', '123456', 'password'],
    password: 'admin123',
    role: 'admin',
    authority: 'Super Admin',
    phone: '+91 98450 00001'
  },
  {
    id: 'u_mcc',
    name: 'MCC Executive Officer',
    email: 'mcc.officer@mysuru.gov.in',
    passwords: ['mcc123', 'admin123', '123456', 'mcc'],
    password: 'mcc123',
    role: 'admin',
    authority: 'MCC Admin',
    phone: '+91 98450 00002'
  },
  {
    id: 'u_mcc_gmail',
    name: 'MCC Executive Officer',
    email: 'mcc@gmail.com',
    passwords: ['mcc123', 'admin123', '123456', 'mcc'],
    password: 'mcc123',
    role: 'admin',
    authority: 'MCC Admin',
    phone: '+91 98450 00002'
  },
  {
    id: 'u_gp',
    name: 'Gram Panchayat PDO',
    email: 'gp.officer@mysuru.gov.in',
    passwords: ['gp123', 'admin123', '123456', 'gp'],
    password: 'gp123',
    role: 'admin',
    authority: 'Panchayat Admin',
    phone: '+91 98450 00003'
  },
  {
    id: 'u_gp_gmail',
    name: 'Gram Panchayat PDO',
    email: 'gp@gmail.com',
    passwords: ['gp123', 'admin123', '123456', 'gp'],
    password: 'gp123',
    role: 'admin',
    authority: 'Panchayat Admin',
    phone: '+91 98450 00003'
  },
  {
    id: 'u_tp',
    name: 'Town Panchayat Chief Officer',
    email: 'tp.officer@mysuru.gov.in',
    passwords: ['tp123', 'admin123', '123456', 'tp'],
    password: 'tp123',
    role: 'admin',
    authority: 'Town Panchayat Admin',
    phone: '+91 98450 00004'
  },
  {
    id: 'u_tp_gmail',
    name: 'Town Panchayat Chief Officer',
    email: 'tp@gmail.com',
    passwords: ['tp123', 'admin123', '123456', 'tp'],
    password: 'tp123',
    role: 'admin',
    authority: 'Town Panchayat Admin',
    phone: '+91 98450 00004'
  },
  {
    id: 'u_cust',
    name: 'Ananya Sharma',
    email: 'customer@gmail.com',
    passwords: ['user123', '123456', 'user', 'customer', 'password'],
    password: 'user123',
    role: 'citizen',
    authority: 'Customer',
    phone: '+91 98450 77777'
  },
  {
    id: 'u_user_gmail',
    name: 'Citizen User',
    email: 'user@gmail.com',
    passwords: ['user123', '123456', 'user', 'password'],
    password: 'user123',
    role: 'citizen',
    authority: 'Customer',
    phone: '+91 98450 88888'
  }
];

function checkUserCredentials(u, email, pass) {
  if ((u.email || '').toLowerCase().trim() !== email) return false;
  if (u.passwords && Array.isArray(u.passwords)) {
    if (u.passwords.includes(pass)) return true;
  }
  return (u.password || '').trim() === pass;
}

module.exports = async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const getBody = (cb) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { cb(JSON.parse(body || '{}')); } catch(e) { cb({}); }
    });
  };

  // Auth endpoints
  if (pathname.includes('/auth/login') && method === 'POST') {
    getBody(async payload => {
      const email = (payload.email || '').trim().toLowerCase();
      const password = (payload.password || '').trim();

      // 1. Check built-in accounts first
      let user = SYSTEM_ACCOUNTS.find(u => checkUserCredentials(u, email, password));

      // 2. Check memory cache
      if (!user) {
        user = (initialData.registeredUsers || []).find(u => checkUserCredentials(u, email, password));
      }

      // 3. Check cloud store
      if (!user) {
        try {
          const cloudUsers = await fetchCloudUsers();
          user = cloudUsers.find(u => checkUserCredentials(u, email, password));
        } catch(e) {}
      }

      if (user) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Invalid email or password. Please check your credentials.' }));
      }
    });
    return;
  }

  if (pathname.includes('/auth/register') && method === 'POST') {
    getBody(async payload => {
      const name = (payload.name || '').trim();
      const email = (payload.email || '').trim().toLowerCase();
      const phone = (payload.phone || '').trim();
      const password = (payload.password || '').trim();

      // Fetch cloud users for cross-device consistency
      let cloudUsers = [];
      try {
        cloudUsers = await fetchCloudUsers();
      } catch(e) {}

      const allRegistered = [...(initialData.registeredUsers || [])];
      cloudUsers.forEach(cu => {
        if (!allRegistered.find(r => r.email.toLowerCase() === cu.email.toLowerCase())) {
          allRegistered.push(cu);
        }
      });

      const isInspector = payload.role === 'inspector' || (payload.authority && payload.authority.toLowerCase().includes('inspector'));
      const existingRegisteredIdx = allRegistered.findIndex(u => (u.email || '').toLowerCase().trim() === email);

      if (existingRegisteredIdx >= 0 && !isInspector) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Email already exists' }));
        return;
      }

      const isFirst = (allRegistered.length === 0) && !isInspector;
      const newUser = {
        id: 'u_' + Date.now(),
        name: name || 'User',
        email,
        phone,
        password,
        role: isInspector ? 'inspector' : (isFirst ? 'admin' : (payload.role || 'citizen')),
        department: (payload.department || '').trim(),
        authority: isInspector ? (payload.authority || 'Ward Inspector (PIN: ' + (payload.assignedPin || payload.pin || '570001') + ')') : (isFirst ? 'Super Admin' : (payload.authority || 'Customer')),
        assignedPin: (payload.assignedPin || payload.pin || '').trim(),
        assignedArea: (payload.assignedArea || payload.area || '').trim(),
        designation: (payload.designation || 'Ward Health Inspector').trim(),
        createdAt: new Date().toISOString()
      };

      if (!initialData.registeredUsers) initialData.registeredUsers = [];
      const localIdx = initialData.registeredUsers.findIndex(u => (u.email || '').toLowerCase().trim() === email);
      if (localIdx >= 0) {
        initialData.registeredUsers[localIdx] = newUser;
      } else {
        initialData.registeredUsers.push(newUser);
      }

      const cloudIdx = cloudUsers.findIndex(u => (u.email || '').toLowerCase().trim() === email);
      if (cloudIdx >= 0) {
        cloudUsers[cloudIdx] = newUser;
      } else {
        cloudUsers.push(newUser);
      }

      // Persist to cloud store asynchronously
      persistCloudUsers(cloudUsers).catch(() => {});

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, user: newUser }));
    });
    return;
  }

  if (pathname.includes('/auth/users')) {
    let cloudUsers = [];
    try {
      cloudUsers = await fetchCloudUsers();
    } catch(e) {}
    const combined = [...SYSTEM_ACCOUNTS];
    cloudUsers.forEach(u => {
      if (!combined.find(c => c.email.toLowerCase() === u.email.toLowerCase())) {
        combined.push(u);
      }
    });
    (initialData.registeredUsers || []).forEach(u => {
      if (!combined.find(c => c.email.toLowerCase() === u.email.toLowerCase())) {
        combined.push(u);
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(combined.map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, authority: u.authority, assignedPin: u.assignedPin || u.pin || '', assignedArea: u.assignedArea || '', designation: u.designation || '' }))));
    return;
  }

  // Routing API requests
  if (pathname.includes('/dashboard/stats')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stats: initialData.stats, hotspots: initialData.hotspots }));
    return;
  }

  if (pathname.includes('/applications')) {
    if (method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(initialData.applications));
      return;
    }
    if (method === 'POST') {
      getBody(payload => {
        const item = payload || {};
        item.id = item.id || ('#MCC' + new Date().getFullYear() + Math.floor(100000 + Math.random() * 900000));
        const pin = String(item.pincode || item.pin || '570001').trim();
        item.pin = pin;
        item.pincode = pin;
        item.status = item.status || 'Pending Inspection';
        item.lat = item.lat || 12.2958;
        item.lng = item.lng || 76.6394;
        item.gpsLocation = item.gpsLocation || `${item.lat}° N, ${item.lng}° E`;
        item.mapUrl = item.mapUrl || `https://www.google.com/maps?q=${item.lat},${item.lng}`;
        item.photos = item.photos || (item.photo ? [item.photo] : []);
        item.photo = item.photo || (item.photos && item.photos[0]) || null;
        item.submittedAt = item.submittedAt || new Date().toISOString();

        // Auto-route by PIN code to designated Authority & Inspector
        if (pin.startsWith('570026') || pin.startsWith('571130') || pin.startsWith('570028') || pin.startsWith('571311')) {
          item.authorityKey = 'gp';
          item.authority = item.authority || 'Bogadi Gram Panchayat';
          item.assignedInspectorName = item.assignedInspectorName || 'S. Nanjappa';
          item.assignedInspectorEmail = item.assignedInspectorEmail || 'nanjappa.gp@gmail.com';
          item.assignedOfficerEmail = 'gp@gmail.com';
        } else if (pin.startsWith('570018') || pin.startsWith('570017') || pin.startsWith('570027') || pin.startsWith('571607')) {
          item.authorityKey = 'tp';
          item.authority = item.authority || 'Hootagalli Town Panchayat';
          item.assignedInspectorName = item.assignedInspectorName || 'M. Anand';
          item.assignedInspectorEmail = item.assignedInspectorEmail || 'anand.tp@gmail.com';
          item.assignedOfficerEmail = 'tp@gmail.com';
        } else {
          item.authorityKey = 'mcc';
          item.authority = item.authority || 'Mysuru Municipal Corporation (MCC Urban)';
          item.assignedInspectorName = item.assignedInspectorName || 'Rajesh Kumar';
          item.assignedInspectorEmail = item.assignedInspectorEmail || 'inspector.mcc@gmail.com';
          item.assignedOfficerEmail = 'mcc@gmail.com';
        }

        const existingAppIdx = initialData.applications.findIndex(a => a.id === item.id);
        if (existingAppIdx >= 0) {
          initialData.applications[existingAppIdx] = { ...initialData.applications[existingAppIdx], ...item };
        } else {
          initialData.applications.unshift(item);
        }

        // Sync inspections
        if (!initialData.inspections) initialData.inspections = [];
        const inspId = 'INSP-' + (item.id.replace(/[^0-9]/g, '').slice(-4) || Math.floor(100 + Math.random() * 900));
        const inspectionRecord = {
          id: inspId,
          caseId: item.id,
          applicationId: item.id,
          applicantName: item.applicantName || 'Citizen',
          phone: item.phone || '',
          siteAddress: item.address || 'Mysuru Site',
          address: item.address || 'Mysuru Site',
          pin: item.pin,
          pincode: item.pincode,
          gpsLocation: item.gpsLocation,
          lat: item.lat,
          lng: item.lng,
          mapUrl: item.mapUrl,
          inspector: item.assignedInspectorName,
          assignedInspectorName: item.assignedInspectorName,
          assignedInspectorEmail: item.assignedInspectorEmail,
          authorityKey: item.authorityKey,
          authority: item.authority,
          date: item.issueDate || 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'Pending Verification',
          photo: item.photo,
          photos: item.photos,
          propertyDetails: item.propertyId || 'Residential Site',
          tonnage: '10 MT',
          documents: 'Khatta & Site Blueprint Validated'
        };

        const existingInspIdx = initialData.inspections.findIndex(i => i.caseId === item.id || i.applicationId === item.id);
        if (existingInspIdx >= 0) {
          initialData.inspections[existingInspIdx] = { ...initialData.inspections[existingInspIdx], ...inspectionRecord };
        } else {
          initialData.inspections.unshift(inspectionRecord);
        }

        initialData.stats.totalApplications = initialData.applications.length;
        initialData.stats.pendingInspections = initialData.inspections.filter(i => i.status !== 'Approved' && i.status !== 'Completed').length;
        initialData.stats.pendingDebris = initialData.applications.filter(a => a.status !== 'Approved').length;

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, item, inspection: inspectionRecord }));
      });
      return;
    }
  }

  if (pathname.includes('/pin-mappings')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialData.pinMappings));
    return;
  }

  if (pathname.includes('/authorities')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialData.authorities));
    return;
  }

  if (pathname.includes('/inspectors')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialData.inspectors));
    return;
  }

  if (pathname.includes('/inspections')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialData.inspections));
    return;
  }

  if (pathname.includes('/demolition-requests')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialData.demolitionRequests));
    return;
  }

  if (pathname.includes('/demolition-status')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialData.demolitionStatus));
    return;
  }

  if (pathname.includes('/certificates')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialData.certificates));
    return;
  }

  if (pathname.includes('/utilities')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialData.utilities));
    return;
  }

  if (pathname.includes('/notifications')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialData.notifications));
    return;
  }

  if (pathname.includes('/reports')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialData.reports));
    return;
  }

  if (pathname.includes('/users')) {
    let cloudUsers = [];
    try {
      cloudUsers = await fetchCloudUsers();
    } catch(e) {}
    const combined = [...(initialData.registeredUsers || [])];
    cloudUsers.forEach(cu => {
      if (!combined.find(r => (r.email || '').toLowerCase().trim() === (cu.email || '').toLowerCase().trim())) {
        combined.push(cu);
      }
    });
    const users = combined.map(u => ({
      name: u.name,
      role: u.authority || u.role || 'Customer',
      phone: u.phone || 'N/A',
      email: u.email,
      area: u.department || (u.role === 'admin' ? 'Mysuru Municipal Authority' : 'Mysuru Citizen Portal'),
      permissions: u.role === 'admin' ? 'Full System & Inspection Rights' : 'Lodge & Track Debris Clearances',
      status: 'Active'
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(users));
    return;
  }

  if (pathname.includes('/settings')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialData.settings));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'API Online', version: '2.0.0', project: 'Smart Civic C&D Routing Mysuru' }));
};
