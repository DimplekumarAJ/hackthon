require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { supabase, mapAppToDb, mapDbToApp, mapUserToDb, mapDbToUser } = require('./lib/supabase');

const PORT = process.env.PORT || 8000;
const DATA_FILE = path.join(__dirname, 'database.json');

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

// Initialize database with realistic Mysuru C&D data
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
  }
};

// Load or save DB
function getDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch(e) {}
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  return initialData;
}

function saveDB(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API ROUTING FOR AUTH & ALL 14 MODULES ---
  if (pathname.startsWith('/api/')) {
    const db = getDB();

    // 0. Auth Endpoints
    if (pathname.includes('/auth/login') && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        let payload = {};
        try { payload = JSON.parse(body || '{}'); } catch(e) {}
        const email = (payload.email || '').trim().toLowerCase();
        const password = (payload.password || '').trim();

        // 1. Check built-in accounts
        let user = SYSTEM_ACCOUNTS.find(u => checkUserCredentials(u, email, password));

        // 2. Check local database
        if (!user) {
          user = (db.registeredUsers || []).find(u => checkUserCredentials(u, email, password));
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
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        let payload = {};
        try { payload = JSON.parse(body || '{}'); } catch(e) {}
        const name = (payload.name || '').trim();
        const email = (payload.email || '').trim().toLowerCase();
        const phone = (payload.phone || '').trim();
        const password = (payload.password || '').trim();

        let cloudUsers = [];
        try {
          cloudUsers = await fetchCloudUsers();
        } catch(e) {}

        const allRegistered = [...(db.registeredUsers || [])];
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

        if (!db.registeredUsers) db.registeredUsers = [];
        const localIdx = db.registeredUsers.findIndex(u => (u.email || '').toLowerCase().trim() === email);
        if (localIdx >= 0) {
          db.registeredUsers[localIdx] = newUser;
        } else {
          db.registeredUsers.push(newUser);
        }
        saveDB(db);

        // Supabase DB Persistence
        if (supabase) {
          try {
            supabase.from('users').upsert(mapUserToDb(newUser)).catch(() => {});
          } catch(e) {}
        }

        const cloudIdx = cloudUsers.findIndex(u => (u.email || '').toLowerCase().trim() === email);
        if (cloudIdx >= 0) {
          cloudUsers[cloudIdx] = newUser;
        } else {
          cloudUsers.push(newUser);
        }
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

      // Fetch from Supabase
      if (supabase) {
        try {
          const { data: suUsers } = await supabase.from('users').select('*');
          if (Array.isArray(suUsers)) {
            suUsers.forEach(row => {
              const u = mapDbToUser(row);
              if (!combined.find(c => c.email.toLowerCase() === u.email.toLowerCase())) {
                combined.push(u);
              }
            });
          }
        } catch(e) {}
      }

      cloudUsers.forEach(u => {
        if (!combined.find(c => c.email.toLowerCase() === u.email.toLowerCase())) {
          combined.push(u);
        }
      });
      (db.registeredUsers || []).forEach(u => {
        if (!combined.find(c => c.email.toLowerCase() === u.email.toLowerCase())) {
          combined.push(u);
        }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(combined.map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, authority: u.authority, assignedPin: u.assignedPin || u.pin || '', assignedArea: u.assignedArea || '', designation: u.designation || '' }))));
      return;
    }

    // 1. Dashboard Stats
    if (pathname === '/api/dashboard/stats' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ stats: db.stats, hotspots: db.hotspots }));
      return;
    }

    // 2. Applications
    if (pathname === '/api/applications') {
      if (method === 'GET') {
        if (supabase) {
          try {
            const { data: suApps } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
            if (Array.isArray(suApps) && suApps.length > 0) {
              db.applications = suApps.map(mapDbToApp);
            }
          } catch(e) {}
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.applications));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const item = JSON.parse(body || '{}');
          item.id = item.id || ('#MCC' + new Date().getFullYear() + Math.floor(100000 + Math.random() * 900000));
          
          const existingAppIdx = db.applications.findIndex(a => a.id === item.id);
          const baseApp = existingAppIdx >= 0 ? db.applications[existingAppIdx] : {};
          const mergedItem = { ...baseApp, ...item };

          const pin = String(mergedItem.pincode || mergedItem.pin || '570001').trim();
          mergedItem.pin = pin;
          mergedItem.pincode = pin;
          mergedItem.status = mergedItem.status || 'Pending Inspection';
          mergedItem.lat = mergedItem.lat || 12.2958;
          mergedItem.lng = mergedItem.lng || 76.6394;
          mergedItem.gpsLocation = mergedItem.gpsLocation || `${mergedItem.lat}° N, ${mergedItem.lng}° E`;
          mergedItem.mapUrl = mergedItem.mapUrl || `https://www.google.com/maps?q=${mergedItem.lat},${mergedItem.lng}`;
          mergedItem.photos = mergedItem.photos || (mergedItem.photo ? [mergedItem.photo] : []);
          mergedItem.photo = mergedItem.photo || (mergedItem.photos && mergedItem.photos[0]) || null;
          mergedItem.submittedAt = mergedItem.submittedAt || new Date().toISOString();

          // Auto-route by PIN code to designated Authority & Inspector if not set
          if (!mergedItem.authorityKey) {
            if (pin.startsWith('570026') || pin.startsWith('571130') || pin.startsWith('570028') || pin.startsWith('571311')) {
              mergedItem.authorityKey = 'gp';
              mergedItem.authority = mergedItem.authority || 'Bogadi Gram Panchayat';
              mergedItem.assignedInspectorName = mergedItem.assignedInspectorName || 'S. Nanjappa';
              mergedItem.assignedInspectorEmail = mergedItem.assignedInspectorEmail || 'nanjappa.gp@gmail.com';
              mergedItem.assignedOfficerEmail = 'gp@gmail.com';
            } else if (pin.startsWith('570018') || pin.startsWith('570017') || pin.startsWith('570027') || pin.startsWith('571607')) {
              mergedItem.authorityKey = 'tp';
              mergedItem.authority = mergedItem.authority || 'Hootagalli Town Panchayat';
              mergedItem.assignedInspectorName = mergedItem.assignedInspectorName || 'M. Anand';
              mergedItem.assignedInspectorEmail = mergedItem.assignedInspectorEmail || 'anand.tp@gmail.com';
              mergedItem.assignedOfficerEmail = 'tp@gmail.com';
            } else {
              mergedItem.authorityKey = 'mcc';
              mergedItem.authority = mergedItem.authority || 'Mysuru Municipal Corporation (MCC Urban)';
              mergedItem.assignedInspectorName = mergedItem.assignedInspectorName || 'Rajesh Kumar';
              mergedItem.assignedInspectorEmail = mergedItem.assignedInspectorEmail || 'inspector.mcc@gmail.com';
              mergedItem.assignedOfficerEmail = 'mcc@gmail.com';
            }
          }

          // Check if custom inspector was registered for this PIN
          const customInspectors = (db.registeredUsers || []).filter(u => u.role === 'inspector');
          const matchedCustom = customInspectors.find(ins => {
            const insPin = String(ins.assignedPin || ins.pin || '').trim();
            return insPin === pin || insPin.includes(pin);
          });
          if (matchedCustom) {
            mergedItem.assignedInspectorName = matchedCustom.name;
            mergedItem.assignedInspectorEmail = matchedCustom.email;
          }

          // Upsert to Supabase
          if (supabase) {
            try {
              await supabase.from('applications').upsert(mapAppToDb(mergedItem));
            } catch(e) {}
          }

          // Update applications collection
          if (existingAppIdx >= 0) {
            db.applications[existingAppIdx] = mergedItem;
          } else {
            db.applications.unshift(mergedItem);
          }

          // Auto-create/sync inspection record
          if (!db.inspections) db.inspections = [];
          const inspId = 'INSP-' + (mergedItem.id.replace(/[^0-9]/g, '').slice(-4) || Math.floor(100 + Math.random() * 900));
          const inspectionRecord = {
            id: inspId,
            caseId: mergedItem.id,
            applicationId: mergedItem.id,
            applicantName: mergedItem.applicantName || 'Citizen',
            phone: mergedItem.phone || '',
            siteAddress: mergedItem.address || 'Mysuru Site',
            address: mergedItem.address || 'Mysuru Site',
            pin: mergedItem.pin,
            pincode: mergedItem.pincode,
            gpsLocation: mergedItem.gpsLocation,
            lat: mergedItem.lat,
            lng: mergedItem.lng,
            mapUrl: mergedItem.mapUrl,
            inspector: mergedItem.assignedInspectorName,
            assignedInspectorName: mergedItem.assignedInspectorName,
            assignedInspectorEmail: mergedItem.assignedInspectorEmail,
            authorityKey: mergedItem.authorityKey,
            authority: mergedItem.authority,
            date: mergedItem.inspectionTime ? new Date(mergedItem.inspectionTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ('Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
            time: mergedItem.inspectionTime ? new Date(mergedItem.inspectionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: mergedItem.status,
            photo: mergedItem.photo,
            photos: mergedItem.photos,
            propertyDetails: mergedItem.propertyId || 'Residential Site',
            tonnage: mergedItem.tonnage || '10 MT',
            inspectorNotes: mergedItem.inspectorNotes || '',
            documents: 'Khatta & Site Blueprint Validated'
          };
          
          const existingInspIdx = db.inspections.findIndex(i => i.caseId === mergedItem.id || i.applicationId === mergedItem.id);
          if (existingInspIdx >= 0) {
            db.inspections[existingInspIdx] = { ...db.inspections[existingInspIdx], ...inspectionRecord };
          } else {
            db.inspections.unshift(inspectionRecord);
          }

          // Update stats
          db.stats.totalApplications = db.applications.length;
          db.stats.pendingInspections = db.inspections.filter(i => i.status !== 'Approved' && i.status !== 'Completed').length;
          db.stats.pendingDebris = db.applications.filter(a => a.status !== 'Approved').length;

          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item: mergedItem, inspection: inspectionRecord }));
        });
        return;
      }
    }

    // 3. PIN Code & Area Mapping
    if (pathname === '/api/pin-mappings') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.pinMappings));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          db.pinMappings.push(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 4. Authorities
    if (pathname === '/api/authorities') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.authorities));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          db.authorities.push(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 5. Inspectors / Field Officers
    if (pathname === '/api/inspectors') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.inspectors));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          item.empId = item.empId || 'INS-' + Math.floor(100 + Math.random() * 900);
          db.inspectors.push(item);
          db.stats.activeOfficers += 1;
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 6. Inspection Management
    if (pathname === '/api/inspections') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.inspections));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          db.inspections.push(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 7. Demolition Requests
    if (pathname === '/api/demolition-requests') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.demolitionRequests));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          item.requestId = 'DEM-2026-' + Math.floor(100 + Math.random() * 900);
          db.demolitionRequests.unshift(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 8. Demolition Status
    if (pathname === '/api/demolition-status') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.demolitionStatus));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          db.demolitionStatus.push(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 9. Certificates
    if (pathname === '/api/certificates') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.certificates));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          item.certificateId = 'CERT-CD-MYS-' + Math.floor(1000 + Math.random() * 9000);
          item.issueDate = new Date().toISOString().split('T')[0];
          db.certificates.unshift(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 10. Water / Electricity Benefits
    if (pathname === '/api/utilities') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.utilities));
        return;
      }
    }

    // 11. Notifications
    if (pathname === '/api/notifications') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.notifications));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          item.timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
          item.status = 'Delivered';
          db.notifications.unshift(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 12. Reports & Analytics
    if (pathname === '/api/reports') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.reports));
        return;
      }
    }

    // 13. Users (Returns real registered users & customers)
    if (pathname === '/api/users') {
      if (method === 'GET') {
        let cloudUsers = [];
        try {
          cloudUsers = await fetchCloudUsers();
        } catch(e) {}
        const combined = [...(db.registeredUsers || [])];
        cloudUsers.forEach(cu => {
          if (!combined.find(r => (r.email || '').toLowerCase().trim() === (cu.email || '').toLowerCase().trim())) {
            combined.push(cu);
          }
        });
        const users = combined.map(u => ({
          name: u.name,
          role: u.authority || (u.role === 'admin' ? 'Admin' : 'Customer'),
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
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          db.users.push(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 14. Settings
    if (pathname === '/api/settings') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.settings));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const updated = JSON.parse(body || '{}');
          db.settings = { ...db.settings, ...updated };
          saveDB(db);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, settings: db.settings }));
        });
        return;
      }
    }
  }

  // --- STATIC FILE SERVING ---
  let filePath = path.join(__dirname, pathname === '/' ? 'src/index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'src', pathname);
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Smart Civic Waste Routing Backend Server running on http://localhost:${PORT}`);
});
