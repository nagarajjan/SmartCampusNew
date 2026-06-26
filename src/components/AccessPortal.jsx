import React, { useState } from 'react';

export default function AccessPortal({ 
  profiles, 
  onAddProfile, 
  onUpdateProfile, 
  onDeleteProfile,
  quickRegData,
  onClearQuickReg
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'Vehicle',
    value: '',
    role: 'Student',
    tier: 'Tier 2',
    allowedDays: 'Weekdays',
    allowedTimings: '08:00 - 18:00'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');

  // Trigger quick registration if passed from manual clearance
  React.useEffect(() => {
    if (quickRegData) {
      setFormData(quickRegData);
      setEditingId(null);
      setIsFormOpen(true);
      onClearQuickReg(); // Clear so it doesn't fire repeatedly
    }
  }, [quickRegData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.value) return;

    if (editingId) {
      onUpdateProfile({ ...formData, id: editingId });
    } else {
      onAddProfile({ ...formData, id: Date.now() });
    }

    setIsFormOpen(false);
    resetForm();
  };

  const handleEdit = (profile) => {
    setEditingId(profile.id);
    setFormData({
      name: profile.name,
      type: profile.type,
      value: profile.value,
      role: profile.role,
      tier: profile.tier,
      allowedDays: profile.allowedDays,
      allowedTimings: profile.allowedTimings
    });
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Vehicle',
      value: '',
      role: 'Student',
      tier: 'Tier 2',
      allowedDays: 'Weekdays',
      allowedTimings: '08:00 - 18:00'
    });
    setEditingId(null);
  };

  // Filter & Search Logic
  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesTier = filterTier === 'ALL' || p.tier === filterTier;
    
    return matchesSearch && matchesTier;
  });

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Access Credentials Manager</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Maintain active security tags, facial biometric registers, license plate matching lists, and schedule permissions.
          </p>
        </div>
        
        <button 
          className="btn-primary" 
          onClick={() => { resetForm(); setIsFormOpen(true); }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          ADD NEW CREDENTIAL
        </button>
      </div>

      {/* Search and Filters toolbar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search by name, license plate, role..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.2rem' }}
          />
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Access Level:</span>
          <select 
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            style={{ width: '130px' }}
          >
            <option value="ALL">All Tiers</option>
            <option value="Tier 1">Tier 1 (Guest)</option>
            <option value="Tier 2">Tier 2 (Faculty/Staff)</option>
            <option value="Tier 3">Tier 3 (Admin/Secure)</option>
          </select>
        </div>
      </div>

      {/* CRUD Form Dialog (Modal Style but embedded) */}
      {isFormOpen && (
        <div style={{ 
          background: 'rgba(7, 10, 19, 0.95)',
          border: '1px solid var(--color-primary)',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 0 20px rgba(56, 189, 248, 0.15)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-primary)' }}>
            {editingId ? 'Edit Access Credential' : 'Create New Access Credential'}
          </h4>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Full Name / Entity Name *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Dr. Sarah Jenkins"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Credential Registry Type
                </label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, value: e.target.value === 'Face' ? `FACE-ID-${Math.floor(10000+Math.random()*90000)}` : '' })}
                >
                  <option value="Vehicle">Vehicle License Plate Reader (LPR)</option>
                  <option value="Face">Facial Biometrics Scanner (FR)</option>
                  <option value="RFID">Physical Card RFID Badge</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Credential ID Value (e.g. License Plate) *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={formData.type === 'Vehicle' ? "e.g. BMA-9921" : "e.g. RFID-88219"}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  User Role Label
                </label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="Faculty">Faculty / Professor</option>
                  <option value="Student">Student</option>
                  <option value="Staff">Operations Staff</option>
                  <option value="Contractor">Construction / Contractor</option>
                  <option value="Admin">Security Administrator</option>
                  <option value="Visitor/Guest">Visitor / Guest</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Access Tier Level
                </label>
                <select 
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                >
                  <option value="Tier 1">Tier 1 (Guest - Entry/Exit points only)</option>
                  <option value="Tier 2">Tier 2 (Standard Faculty / Student access)</option>
                  <option value="Tier 3">Tier 3 (Admin / High Security Buildings)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Allowed Days
                </label>
                <select 
                  value={formData.allowedDays}
                  onChange={(e) => setFormData({ ...formData, allowedDays: e.target.value })}
                >
                  <option value="Weekdays">Weekdays (Mon - Fri)</option>
                  <option value="Everyday">Everyday (Mon - Sun)</option>
                  <option value="Weekends">Weekends Only (Sat - Sun)</option>
                  <option value="Monday, Wednesday, Friday">Mon, Wed, Fri</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Allowed Hours Windows (Format: HH:MM - HH:MM or "24 Hours")
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 08:00 - 18:00"
                  value={formData.allowedTimings}
                  onChange={(e) => setFormData({ ...formData, allowedTimings: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsFormOpen(false)}>
                CANCEL
              </button>
              <button type="submit" className="btn-primary">
                {editingId ? 'SAVE CHANGES' : 'CREATE CREDENTIAL'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Credentials Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Name</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Validation Source</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Identifier Value</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Role</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Access Tier</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Allowed Schedule</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  No credentials found matching the search criteria.
                </td>
              </tr>
            ) : (
              filteredProfiles.map(p => (
                <tr 
                  key={p.id} 
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span 
                      className="badge"
                      style={{
                        backgroundColor: p.type === 'Vehicle' ? 'rgba(56, 189, 248, 0.1)' : p.type === 'Face' ? 'rgba(129, 140, 248, 0.1)' : 'rgba(0, 255, 159, 0.1)',
                        color: p.type === 'Vehicle' ? 'var(--color-primary)' : p.type === 'Face' ? 'var(--color-secondary)' : 'var(--color-granted)',
                        border: 'none',
                        fontSize: '0.65rem'
                      }}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{p.value}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{p.role}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ 
                      color: p.tier === 'Tier 3' ? 'var(--color-denied)' : p.tier === 'Tier 2' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      fontWeight: 600 
                    }}>
                      {p.tier}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ fontSize: '0.8rem' }}>{p.allowedDays}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{p.allowedTimings}</div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleEdit(p)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: 'var(--color-primary)', 
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textDecoration: 'underline'
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${p.name}'s credentials?`)) {
                            onDeleteProfile(p.id);
                          }
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: 'var(--color-denied)', 
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textDecoration: 'underline'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
