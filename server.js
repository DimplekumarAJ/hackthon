const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;
const DATA_FILE = path.join(__dirname, 'database.json');

// Initialize database with realistic Mysuru C&D data
const initialData = {
  stats: {
    totalApplications: 142,
    pendingInspections: 18,
    pendingDebris: 34,
    completedCollections: 90,
    activeOfficers: 26,
    totalTonnageCollected: '3,840 MT',
    recyclingEfficiency: '95.4%'
  },
  hotspots: [
    { area: 'Bogadi 2nd Stage Ring Road', pin: '570026', authority: 'Gram Panchayat', debrisType: 'Concrete & Masonry Rubble', severity: 'Critical', reportedTonnage: '85 MT' },
    { area: 'Kumbarakoppal ZWM Perimeter', pin: '570016', authority: 'MCC Zone 1', debrisType: 'Excavation Silt & Stones', severity: 'Medium', reportedTonnage: '40 MT' },
    { area: 'Hootagalli Industrial Sector 3', pin: '570018', authority: 'Town Panchayat', debrisType: 'Demolition Concrete Slab', severity: 'High', reportedTonnage: '120 MT' },
    { area: 'Hebbal Ring Road Junction', pin: '570017', authority: 'MCC Zone 2', debrisType: 'Tiles & Plaster Scrap', severity: 'Medium', reportedTonnage: '25 MT' }
  ],
  applications: [
    { id: 'APP-CD-2026-001', applicantName: 'Karthik Gowda', phone: '+91 98450 11223', address: 'Site #42, Vijayanagar 4th Stage', pin: '570017', area: 'Vijayanagar', ward: 'Ward 28', propertyDetails: 'G+2 Residential Demolition (3,200 sqft)', documents: 'Demolition_Permit_01.pdf, Site_Photo.jpg', status: 'Approved' },
    { id: 'APP-CD-2026-002', applicantName: 'Smt. Rajeshwari Patil', phone: '+91 98450 44556', address: 'Plot 18B, Bogadi Ring Road Cross', pin: '570026', area: 'Bogadi', ward: 'GP Ward 3', propertyDetails: 'Commercial Building Renovations (1,800 sqft)', documents: 'Debris_Assessment.pdf', status: 'Pending Inspection' },
    { id: 'APP-CD-2026-003', applicantName: 'Prestige Builders Mysuru', phone: '+91 98450 77889', address: 'Survey #89, Hootagalli Main Rd', pin: '570018', area: 'Hootagalli', ward: 'TP Ward 6', propertyDetails: 'Industrial Shed Demolition (12,000 sqft)', documents: 'Environmental_NOC.pdf, Survey_Map.pdf', status: 'Debris Collection' },
    { id: 'APP-CD-2026-004', applicantName: 'Mysore Heritage Renovators', phone: '+91 98450 99001', address: 'Sayyaji Rao Road Near Palace', pin: '570001', area: 'Palace Core', ward: 'Ward 14', propertyDetails: 'Heritage Facade Restoration Rubble', documents: 'Heritage_Clearance.pdf', status: 'Completed' }
  ],
  pinMappings: [
    { pin: '570001', ward: 'Ward 14 (Devaraja)', area: 'Palace Core / City Center', streets: 'Sayyaji Rao Rd, Ashoka Rd, Irwin Rd', mapLocation: '12.3051° N, 76.6551° E', authority: 'Mysuru Municipal Corporation (MCC)', officer: 'Sri. Suresh Kumar (MCC-01)' },
    { pin: '570002', ward: 'Ward 18 (Gokulam)', area: 'Gokulam & Vontikoppal', streets: 'Contour Rd, Temple Rd, 3rd Stage', mapLocation: '12.3271° N, 76.6264° E', authority: 'Mysuru Municipal Corporation (MCC)', officer: 'Sri. Suresh Kumar (MCC-01)' },
    { pin: '570026', ward: 'GP Ward 1-4', area: 'Bogadi Peripheral & Ring Road', streets: 'Bogadi Main Rd, Gadhinglaj Cross', mapLocation: '12.3021° N, 76.5912° E', authority: 'Gram Panchayat A', officer: 'Smt. Lakshmi Devi (GP-02)' },
    { pin: '570018', ward: 'TP Ward 1-8', area: 'Hootagalli Industrial Belt', streets: 'KIADB Belagola Cross, Ring Rd Exit', mapLocation: '12.3489° N, 76.5744° E', authority: 'Town Panchayat A', officer: 'Sri. Venkatesh M (TP-03)' }
  ],
  authorities: [
    { name: 'Mysuru Municipal Corporation (MCC)', department: 'C&D Waste Enforcement Cell', areaWard: '65 Urban Wards / 9 Zones', contactDetails: 'Sri. Suresh Kumar · mcc.cd@mysuru.gov.in · 0821-2440890', address: 'MCC Head Office, Sayyaji Rao Rd, Mysuru' },
    { name: 'Bogadi Gram Panchayat', department: 'Rural Sanitation & Debris Clearance', areaWard: 'Bogadi, Maratikyathanahalli', contactDetails: 'Smt. Lakshmi Devi · gp.bogadi@mysuru.gov.in · 0821-2598711', address: 'GP Bhavan, Bogadi Village' },
    { name: 'Hootagalli Town Panchayat', department: 'Suburban Civic & Demolition Desk', areaWard: 'Hootagalli CMC & Industrial Zone', contactDetails: 'Sri. Venkatesh M · tp.hootagalli@mysuru.gov.in · 0821-2402122', address: 'Town Council Office, Hootagalli' }
  ],
  inspectors: [
    { name: 'Sri. Suresh Kumar', empId: 'MCC-INS-104', phone: '+91 98450 00002', assignedArea: 'MCC Zones 1, 2, 3 (PIN 570001, 570002)', activeCases: 6, status: 'Active' },
    { name: 'Smt. Lakshmi Devi', empId: 'GP-INS-201', phone: '+91 98450 00003', assignedArea: 'Gram Panchayat Bogadi (PIN 570026)', activeCases: 4, status: 'Active' },
    { name: 'Sri. Venkatesh M', empId: 'TP-INS-308', phone: '+91 98450 00004', assignedArea: 'Town Panchayat Hootagalli (PIN 570018)', activeCases: 5, status: 'Active' },
    { name: 'Manjunatha (Squad Lead)', empId: 'FLD-CREW-04', phone: '+91 98450 00005', assignedArea: 'MCC Heavy Fleet & Tipper 4', activeCases: 3, status: 'On Duty' }
  ],
  inspections: [
    { application: 'APP-CD-2026-001', location: 'Site #42, Vijayanagar 4th Stage', inspector: 'Sri. Suresh Kumar', inspectionDate: '2026-09-18', photos: 'before_vijayanagar.jpg', debrisType: 'Reinforced Concrete & Bricks', estimatedQuantity: '45 Metric Tonnes', remarks: 'Requires 1 JCB and 4 Tipper truck loads. Clear access available.', status: 'Verified' },
    { application: 'APP-CD-2026-002', location: 'Plot 18B, Bogadi Ring Road Cross', inspector: 'Smt. Lakshmi Devi', inspectionDate: '2026-09-19', photos: 'before_bogadi.jpg', debrisType: 'Tiles, Plaster & Mortar', estimatedQuantity: '18 Metric Tonnes', remarks: 'Panchayat tractor units dispatched.', status: 'Scheduled' },
    { application: 'APP-CD-2026-003', location: 'Survey #89, Hootagalli Industrial', inspector: 'Sri. Venkatesh M', inspectionDate: '2026-09-17', photos: 'before_hootagalli.jpg', debrisType: 'Steel Truss & Concrete Pavement', estimatedQuantity: '140 Metric Tonnes', remarks: 'Major commercial clearance to Kumbarakoppal recycling unit.', status: 'Completed' }
  ],
  demolitionRequests: [
    { requestId: 'DEM-2026-801', property: 'Old Cinema Hall Complex', location: 'Devaraja Urs Road, Mysuru (PIN 570001)', applicant: 'Apex Infrastructure Ltd', estimatedDebris: '320 MT Concrete', documents: 'Structural_Audit.pdf, Demolition_Plan.pdf', status: 'Approved & Dispatched' },
    { requestId: 'DEM-2026-802', property: 'Residential Villa (Pre-1970)', location: 'Yadavagiri 3rd Main (PIN 570020)', applicant: 'M. S. Nagaraj', estimatedDebris: '65 MT Brick/Timber', documents: 'Demolition_NOC.pdf', status: 'Under Review' },
    { requestId: 'DEM-2026-803', property: 'Warehouse Shed', location: 'Kadakola Industrial Belt (PIN 571311)', applicant: 'Mysore Logistics Corp', estimatedDebris: '110 MT Steel & Asphalt', documents: 'KIADB_Clearance.pdf', status: 'Collection in Progress' }
  ],
  demolitionStatus: [
    { requestId: 'DEM-2026-801', scheduledDate: '2026-09-15', completionDate: '2026-09-18', beforePhoto: 'site_before_801.jpg', afterPhoto: 'site_cleared_801.jpg', debrisQuantity: '320 MT', collectionStatus: '100% Cleared & Recycled' },
    { requestId: 'DEM-2026-803', scheduledDate: '2026-09-17', completionDate: '2026-09-20', beforePhoto: 'site_before_803.jpg', afterPhoto: 'in_progress.jpg', debrisQuantity: '70 MT / 110 MT', collectionStatus: '65% Hauled to Rayanakere Yard' }
  ],
  certificates: [
    { certificateId: 'CERT-CD-MYS-8821', applicationId: 'APP-CD-2026-004', applicant: 'Mysore Heritage Renovators', property: 'Sayyaji Rao Road Restorations', issueDate: '2026-09-18', qrCode: 'QR_VERIFIED_8821', downloadUrl: '#' },
    { certificateId: 'CERT-CD-MYS-8790', applicationId: 'APP-CD-2026-001', applicant: 'Karthik Gowda', property: 'Vijayanagar 4th Stage Site 42', issueDate: '2026-09-16', qrCode: 'QR_VERIFIED_8790', downloadUrl: '#' }
  ],
  utilities: [
    { property: 'Site #42, Vijayanagar 4th Stage', connectionType: 'Permanent Water & Electricity Connection', requestStatus: 'Civic Rebate Approved', authority: 'Chamundeshwari Electricity (CHESCOM) & MCC Water Board', referenceNumber: 'UTIL-CHES-2026-4412' },
    { property: 'Old Cinema Hall Complex, D. Urs Rd', connectionType: 'Commercial Water Clearance Rebate (10%)', requestStatus: 'Disposal Verified & Endorsed', authority: 'Mysuru Urban Development Authority (MUDA)', referenceNumber: 'UTIL-MUDA-2026-9018' }
  ],
  notifications: [
    { recipient: 'Sri. Suresh Kumar (MCC Officer)', message: 'New C&D Grievance logged at PIN 570001 (Devaraja Market). Immediate triage required.', type: 'SMS + System Alert', status: 'Delivered', timestamp: '2026-09-18 09:31' },
    { recipient: 'Karthik Gowda (Applicant)', message: 'Your Demolition Waste clearance APP-CD-2026-001 is completed. Download your Green Certificate.', type: 'WhatsApp + SMS', status: 'Delivered', timestamp: '2026-09-18 14:10' },
    { recipient: 'Manjunatha (Fleet Crew 4)', message: 'JCB & 10T Tipper unit assigned to Bogadi 2nd Stage blackspot clearing.', type: 'Field App Dispatch', status: 'Delivered', timestamp: '2026-09-18 10:00' }
  ],
  reports: {
    monthlyTrend: [
      { month: 'Apr 2026', tonnage: 920, applications: 82, resolved: 78 },
      { month: 'May 2026', tonnage: 1150, applications: 104, resolved: 98 },
      { month: 'Jun 2026', tonnage: 1340, applications: 122, resolved: 116 },
      { month: 'Jul 2026', tonnage: 1480, applications: 142, resolved: 135 }
    ],
    authorityBreakdown: [
      { authority: 'MCC Urban', percentage: '68%', tonnage: '2,610 MT' },
      { authority: 'Gram Panchayat', percentage: '20%', tonnage: '770 MT' },
      { authority: 'Town Panchayat', percentage: '12%', tonnage: '460 MT' }
    ]
  },
  users: [
    { name: 'Dr. Ramesh Rao', role: 'Super Admin', phone: '+91 98450 00001', email: 'admin@mysuru.gov.in', area: 'Greater Mysuru Master Control', permissions: 'Full System & Policy Rights', status: 'Active' },
    { name: 'Sri. Suresh Kumar', role: 'MCC Officer', phone: '+91 98450 00002', email: 'mcc.officer@mysuru.gov.in', area: 'MCC Zones 1, 2, 3', permissions: 'Inspection & Dispatch Authority', status: 'Active' },
    { name: 'Smt. Lakshmi Devi', role: 'Gram Panchayat Officer', phone: '+91 98450 00003', email: 'gp.officer@mysuru.gov.in', area: 'Bogadi & Rural Periphery', permissions: 'Panchayat Clearance Officer', status: 'Active' },
    { name: 'Sri. Venkatesh M', role: 'Town Panchayat Officer', phone: '+91 98450 00004', email: 'tp.officer@mysuru.gov.in', area: 'Hootagalli Town Panchayat', permissions: 'Suburban Triage Lead', status: 'Active' }
  ],
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
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API ROUTING FOR ALL 14 MODULES ---
  if (pathname.startsWith('/api/')) {
    const db = getDB();

    // 1. Dashboard Stats
    if (pathname === '/api/dashboard/stats' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ stats: db.stats, hotspots: db.hotspots }));
      return;
    }

    // 2. Applications
    if (pathname === '/api/applications') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.applications));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          item.id = 'APP-CD-2026-' + Math.floor(100 + Math.random() * 900);
          item.status = item.status || 'Pending Inspection';
          db.applications.unshift(item);
          db.stats.totalApplications += 1;
          db.stats.pendingInspections += 1;
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
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

    // 13. Users
    if (pathname === '/api/users') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.users));
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
