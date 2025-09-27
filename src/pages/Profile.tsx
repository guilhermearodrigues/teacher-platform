import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Responsive design state
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isSmallMobile = windowWidth < 640;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.last_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || ''
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    setUpdateSuccess(false);
  };

  const validateForm = () => {
    const newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    let isValid = true;

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number format is invalid';
      isValid = false;
    }

    // Password validation - only if user wants to change password
    const hasPasswordFields = formData.currentPassword || formData.newPassword || formData.confirmPassword;

    if (hasPasswordFields) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password';
        isValid = false;
      }

      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required';
        isValid = false;
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'New password must be at least 6 characters';
        isValid = false;
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your new password';
        isValid = false;
      } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    try {
      const hasPasswordFields = formData.currentPassword || formData.newPassword || formData.confirmPassword;

      // Prepare update data
      const updateData: any = {
        email: formData.email,
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone
        }
      };

      // Add password to update if user wants to change it
      if (hasPasswordFields) {
        updateData.password = formData.newPassword;
      }

      const { error } = await supabase.auth.updateUser(updateData);

      if (error) {
        console.error('Profile update error:', error);
        // Handle specific password errors
        if (error.message.includes('password') || error.message.includes('credentials')) {
          setErrors(prev => ({
            ...prev,
            currentPassword: 'Current password is incorrect'
          }));
        } else {
          setErrors(prev => ({
            ...prev,
            email: error.message || 'Failed to update profile'
          }));
        }
      } else {
        setUpdateSuccess(true);
        // Clear password fields after successful update
        if (hasPasswordFields) {
          setFormData(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }));
        }
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Profile update exception:', error);
      setErrors(prev => ({
        ...prev,
        email: 'An error occurred while updating your profile'
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ padding: isMobile ? '1rem' : '2rem' }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: isMobile ? '0' : '0 1rem'
        }}>
          <h1 style={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 'bold',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            color: '#1a202c'
          }}>
            Profile Settings
          </h1>

          {updateSuccess && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#c6f6d5',
              border: '1px solid #9ae6b4',
              borderRadius: '6px',
              marginBottom: '1.5rem',
              color: '#22543d'
            }}>
              Profile updated successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isSmallMobile ? '1fr' : '1fr 1fr',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div className="form-group">
                <label htmlFor="firstName" style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#2d3748'
                }}>
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.firstName ? '#e53e3e' : '#d1d5db'}`,
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <span style={{ color: '#e53e3e', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                    {errors.firstName}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="lastName" style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#2d3748'
                }}>
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.lastName ? '#e53e3e' : '#d1d5db'}`,
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <span style={{ color: '#e53e3e', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                    {errors.lastName}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="email" style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#2d3748'
              }}>
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.email ? '#e53e3e' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <span style={{ color: '#e53e3e', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  {errors.email}
                </span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="phone" style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#2d3748'
              }}>
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.phone ? '#e53e3e' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
                placeholder="Enter your phone number"
              />
              {errors.phone && (
                <span style={{ color: '#e53e3e', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  {errors.phone}
                </span>
              )}
            </div>

            {/* Password Change Section */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              backgroundColor: '#f7fafc'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#2d3748'
              }}>
                Change Password
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#718096',
                marginBottom: '1rem'
              }}>
                Leave blank to keep your current password
              </p>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="currentPassword" style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#2d3748'
                }}>
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.currentPassword ? '#e53e3e' : '#d1d5db'}`,
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                  placeholder="Enter your current password"
                />
                {errors.currentPassword && (
                  <span style={{ color: '#e53e3e', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                    {errors.currentPassword}
                  </span>
                )}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isSmallMobile ? '1fr' : '1fr 1fr',
                gap: '1rem'
              }}>
                <div className="form-group">
                  <label htmlFor="newPassword" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: '#2d3748'
                  }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.newPassword ? '#e53e3e' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                    placeholder="Enter new password"
                  />
                  {errors.newPassword && (
                    <span style={{ color: '#e53e3e', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                      {errors.newPassword}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: '#2d3748'
                  }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.confirmPassword ? '#e53e3e' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                    placeholder="Confirm new password"
                  />
                  {errors.confirmPassword && (
                    <span style={{ color: '#e53e3e', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                      {errors.confirmPassword}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '1rem',
              borderTop: '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: '0.875rem', color: '#718096' }}>
                * Required fields
              </span>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: loading ? '#a0aec0' : '#4299e1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#3182ce';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#4299e1';
                  }
                }}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;