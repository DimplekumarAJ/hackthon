require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://evnjukozsucobknwvzfp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2bmp1a296c3Vjb2Jrbnd2emZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTc3MjA1MywiZXhwIjoyMTA1MzQ4MDUzfQ.OzV3s8TKPGefQPdAKfMEUwKFYJwa4cYH6vsl7E9uGKk';

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err.message);
  }
}

// Map application object to database columns (snake_case/jsonb)
function mapAppToDb(app) {
  return {
    id: app.id,
    applicant_name: app.applicantName || app.applicant_name,
    phone: app.phone,
    pincode: app.pincode || app.pin,
    address: app.address,
    property_id: app.propertyId || app.property_id,
    certificate_no: app.certificateNo || app.certificate_no,
    certificate_type: app.certificateType || app.certificate_type,
    issue_date: app.issueDate || app.issue_date,
    status: app.status || 'Pending Verification',
    tonnage: Number(app.tonnage) || 10,
    gps_location: app.gpsLocation || app.gps_location,
    lat: Number(app.lat) || 12.2958,
    lng: Number(app.lng) || 76.6394,
    map_url: app.mapUrl || app.map_url,
    photos: Array.isArray(app.photos) ? app.photos : (app.photo ? [app.photo] : []),
    photo: app.photo || (Array.isArray(app.photos) && app.photos[0] ? app.photos[0] : null),
    authority: app.authority,
    authority_key: app.authorityKey || app.authority_key,
    assigned_inspector_name: app.assignedInspectorName || app.assigned_inspector_name,
    assigned_inspector_email: app.assignedInspectorEmail || app.assigned_inspector_email,
    inspector_notes: app.inspectorNotes || app.inspector_notes,
    inspection_time: app.inspectionTime || app.inspection_time || null,
    audited_by: app.auditedBy || app.audited_by,
    audited_at: app.auditedAt || app.audited_at || null,
    created_at: app.submittedAt || app.createdAt || new Date().toISOString()
  };
}

// Map db row back to camelCase application object
function mapDbToApp(row) {
  return {
    id: row.id,
    applicantName: row.applicant_name,
    phone: row.phone,
    pincode: row.pincode,
    pin: row.pincode,
    address: row.address,
    propertyId: row.property_id,
    certificateNo: row.certificate_no,
    certificateType: row.certificate_type,
    issueDate: row.issue_date,
    status: row.status,
    tonnage: row.tonnage,
    gpsLocation: row.gps_location,
    lat: row.lat,
    lng: row.lng,
    mapUrl: row.map_url,
    photos: Array.isArray(row.photos) ? row.photos : [],
    photo: row.photo,
    authority: row.authority,
    authorityKey: row.authority_key,
    assignedInspectorName: row.assigned_inspector_name,
    assignedInspectorEmail: row.assigned_inspector_email,
    inspectorNotes: row.inspector_notes,
    inspectionTime: row.inspection_time,
    auditedBy: row.audited_by,
    auditedAt: row.audited_at,
    submittedAt: row.created_at
  };
}

// Map user to DB
function mapUserToDb(u) {
  return {
    id: u.id,
    name: u.name,
    email: (u.email || '').toLowerCase().trim(),
    phone: u.phone || '',
    password: u.password || '',
    role: u.role || 'citizen',
    department: u.department || '',
    department_name: u.departmentName || u.department_name || '',
    assigned_pin: u.assignedPin || u.assigned_pin || u.pin || '',
    assigned_area: u.assignedArea || u.assigned_area || '',
    designation: u.designation || '',
    created_by: u.createdBy || u.created_by || '',
    status: u.status || 'Active',
    created_at: u.createdAt || new Date().toISOString()
  };
}

function mapDbToUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    password: row.password,
    role: row.role,
    department: row.department,
    departmentName: row.department_name,
    assignedPin: row.assigned_pin,
    pin: row.assigned_pin,
    assignedArea: row.assigned_area,
    designation: row.designation,
    createdBy: row.created_by,
    status: row.status,
    createdAt: row.created_at
  };
}

module.exports = {
  supabase,
  mapAppToDb,
  mapDbToApp,
  mapUserToDb,
  mapDbToUser
};
