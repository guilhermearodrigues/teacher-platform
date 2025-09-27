import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { useStudents, CreateStudentData } from '../contexts/StudentsContext';
import { useMessages } from '../contexts/MessagesContext';
import { exportStudentsToCSV, parseCSVFile, generateSampleCSV, ImportResult } from '../utils/csvUtils';

const Students: React.FC = () => {
  const { students, addStudent, updateStudent, deleteStudent, importStudents } = useStudents();
  const { getStudentUsageStats } = useMessages();
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Responsive design state
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isSmallMobile = windowWidth < 640;
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newStudentData, setNewStudentData] = useState<CreateStudentData>({
    firstName: '',
    lastName: '',
    phone: ''
  });

  const [editStudentData, setEditStudentData] = useState<CreateStudentData>({
    firstName: '',
    lastName: '',
    phone: ''
  });

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudentData.firstName && newStudentData.lastName && newStudentData.phone) {
      try {
        await addStudent(newStudentData);
        setNewStudentData({ firstName: '', lastName: '', phone: '' });
        setIsAddingStudent(false);
      } catch (error) {
        // Error is already handled in the context, just keep the modal open
        console.error('Failed to add student:', error);
      }
    }
  };

  const handleStatusToggle = (studentId: string, currentStatus: 'active' | 'inactive') => {
    updateStudent(studentId, {
      status: currentStatus === 'active' ? 'inactive' : 'active'
    });
  };

  const handleDeleteStudent = (studentId: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      deleteStudent(studentId);
    }
  };

  const handleEditStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setEditStudentData({
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone
      });
      setEditingStudentId(studentId);
    }
  };

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudentId && editStudentData.firstName && editStudentData.lastName && editStudentData.phone) {
      updateStudent(editingStudentId, editStudentData);
      setEditingStudentId(null);
      setEditStudentData({ firstName: '', lastName: '', phone: '' });
    }
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setEditStudentData({ firstName: '', lastName: '', phone: '' });
  };

  const handleExportStudents = () => {
    exportStudentsToCSV(students);
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setImportFile(file);

    try {
      const result = await parseCSVFile(file);
      setImportPreview(result);
    } catch (error) {
      alert('Error parsing CSV file: ' + (error as Error).message);
      setImportFile(null);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview?.data || importPreview.data.length === 0) {
      alert('No valid data to import');
      return;
    }

    setIsImporting(true);
    try {
      const result = await importStudents(importPreview.data);

      let message = `Import completed!\n`;
      message += `✅ Successfully imported: ${result.success} students\n`;

      if (result.failed > 0) {
        message += `❌ Failed to import: ${result.failed} students\n`;
        if (result.errors.length > 0) {
          message += `\nErrors:\n${result.errors.slice(0, 5).join('\n')}`;
          if (result.errors.length > 5) {
            message += `\n... and ${result.errors.length - 5} more errors`;
          }
        }
      }

      alert(message);

      // Reset import state
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert('Import failed: ' + (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelImport = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Layout>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: '2rem',
          gap: isMobile ? '1rem' : '0'
        }}>
          <div>
            <h1 style={{
              color: '#333',
              marginBottom: '0.5rem',
              fontSize: isMobile ? '1.5rem' : '2rem'
            }}>
              Students Management
            </h1>
            <p style={{
              color: '#666',
              margin: 0,
              fontSize: isMobile ? '1rem' : '1.1rem'
            }}>
              Manage your students and their information
            </p>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: isSmallMobile ? 'column' : 'row',
            gap: '0.75rem',
            width: isMobile ? '100%' : 'auto'
          }}>
            <button
              onClick={() => setShowImportModal(true)}
              style={{
                padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                width: isSmallMobile ? '100%' : 'auto',
                backgroundColor: '#38a169',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              📥 Import CSV
            </button>
            <button
              onClick={handleExportStudents}
              disabled={students.length === 0}
              style={{
                padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                width: isSmallMobile ? '100%' : 'auto',
                backgroundColor: students.length === 0 ? '#a0aec0' : '#ed8936',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: students.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              📤 Export CSV
            </button>
            <button
              onClick={() => setIsAddingStudent(true)}
              style={{
                padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                width: isSmallMobile ? '100%' : 'auto',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              + Add New Student
            </button>
          </div>
        </div>


        {/* Add Student Modal */}
        {isAddingStudent && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ marginBottom: '1.5rem', color: '#333', textAlign: 'center' }}>Add New Student</h3>
              <form onSubmit={handleAddStudent}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isSmallMobile ? '1fr' : '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={newStudentData.firstName}
                      onChange={(e) => setNewStudentData({ ...newStudentData, firstName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={newStudentData.lastName}
                      onChange={(e) => setNewStudentData({ ...newStudentData, lastName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                      required
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={newStudentData.phone}
                      onChange={(e) => setNewStudentData({ ...newStudentData, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                      placeholder="e.g., (555) 123-4567"
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    type="submit"
                    style={{
                      padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                width: isSmallMobile ? '100%' : 'auto',
                      backgroundColor: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Add Student
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingStudent(false);
                      setNewStudentData({ firstName: '', lastName: '', phone: '' });
                    }}
                    style={{
                      padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                width: isSmallMobile ? '100%' : 'auto',
                      backgroundColor: '#e2e8f0',
                      color: '#4a5568',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Student Modal */}
        {editingStudentId && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ marginBottom: '1.5rem', color: '#333', textAlign: 'center' }}>Edit Student</h3>
              <form onSubmit={handleUpdateStudent}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isSmallMobile ? '1fr' : '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editStudentData.firstName}
                      onChange={(e) => setEditStudentData({ ...editStudentData, firstName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editStudentData.lastName}
                      onChange={(e) => setEditStudentData({ ...editStudentData, lastName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                      required
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editStudentData.phone}
                      onChange={(e) => setEditStudentData({ ...editStudentData, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                      placeholder="e.g., (555) 123-4567"
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    type="submit"
                    style={{
                      padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                width: isSmallMobile ? '100%' : 'auto',
                      backgroundColor: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Update Student
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={{
                      padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                width: isSmallMobile ? '100%' : 'auto',
                      backgroundColor: '#e2e8f0',
                      color: '#4a5568',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Students Modal */}
        {showImportModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ marginBottom: '1.5rem', color: '#333', textAlign: 'center' }}>
                Import Students from CSV
              </h3>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f7fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  marginBottom: '1rem'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#2d3748' }}>CSV Format Requirements:</h4>
                  <ul style={{ margin: '0', paddingLeft: '1.5rem', color: '#4a5568' }}>
                    <li>Required columns: <strong>First Name</strong>, <strong>Last Name</strong>, <strong>Phone</strong></li>
                    <li>First row should contain column headers</li>
                    <li>Phone numbers can include spaces, dashes, and parentheses</li>
                  </ul>
                  <button
                    onClick={generateSampleCSV}
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#4299e1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    📄 Download Sample CSV
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImportFileChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px dashed #cbd5e0',
                    borderRadius: '6px',
                    backgroundColor: '#f7fafc'
                  }}
                />
              </div>

              {importFile && importPreview && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#2d3748' }}>Preview:</h4>

                  {importPreview.success ? (
                    <div>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#38a169' }}>
                        ✅ Found {importPreview.data?.length} valid students to import
                      </p>

                      {importPreview.data && importPreview.data.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                          <strong>Sample data:</strong>
                          <div style={{
                            maxHeight: '150px',
                            overflowY: 'auto',
                            marginTop: '0.5rem',
                            fontSize: '0.875rem'
                          }}>
                            {importPreview.data.slice(0, 5).map((student, index) => (
                              <div key={index} style={{
                                padding: '0.25rem 0',
                                borderBottom: index < 4 ? '1px solid #e2e8f0' : 'none'
                              }}>
                                {student.firstName} {student.lastName} - {student.phone}
                              </div>
                            ))}
                            {importPreview.data.length > 5 && (
                              <div style={{ padding: '0.25rem 0', color: '#718096', fontStyle: 'italic' }}>
                                ... and {importPreview.data.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#e53e3e' }}>
                        ❌ No valid students found
                      </p>
                    </div>
                  )}

                  {importPreview.errors && importPreview.errors.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <strong style={{ color: '#e53e3e' }}>Errors:</strong>
                      <div style={{
                        maxHeight: '100px',
                        overflowY: 'auto',
                        marginTop: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#e53e3e'
                      }}>
                        {importPreview.errors.slice(0, 3).map((error, index) => (
                          <div key={index} style={{ padding: '0.125rem 0' }}>
                            • {error}
                          </div>
                        ))}
                        {importPreview.errors.length > 3 && (
                          <div style={{ padding: '0.125rem 0', fontStyle: 'italic' }}>
                            ... and {importPreview.errors.length - 3} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={handleConfirmImport}
                  disabled={!importPreview?.success || isImporting}
                  style={{
                    padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                width: isSmallMobile ? '100%' : 'auto',
                    backgroundColor: (!importPreview?.success || isImporting) ? '#a0aec0' : '#38a169',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: (!importPreview?.success || isImporting) ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {isImporting ? 'Importing...' : 'Import Students'}
                </button>
                <button
                  onClick={handleCancelImport}
                  disabled={isImporting}
                  style={{
                    padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                width: isSmallMobile ? '100%' : 'auto',
                    backgroundColor: '#e2e8f0',
                    color: '#4a5568',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: isImporting ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{ margin: 0, color: '#333' }}>
              All Students ({students.length})
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Phone</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Date of Start</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Chatbot Usage</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem' }}>
                      <strong>{student.firstName} {student.lastName}</strong>
                    </td>
                    <td style={{ padding: '1rem', color: '#666' }}>{student.phone}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: student.status === 'active' ? '#c6f6d5' : '#fed7d7',
                        color: student.status === 'active' ? '#2f855a' : '#c53030'
                      }}>
                        {student.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#666' }}>{student.enrollmentDate}</td>
                    <td style={{ padding: '1rem' }}>
                      {(() => {
                        const stats = getStudentUsageStats(student.id);

                        return (
                          <div style={{ fontSize: '0.875rem' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              marginBottom: '0.25rem'
                            }}>
                              <span style={{ color: '#4299e1', fontWeight: '500' }}>
                                {stats.totalMessages}
                              </span>
                              <span style={{ color: '#666', marginLeft: '0.25rem' }}>
                                total messages
                              </span>
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#718096'
                            }}>
                              {stats.messagesThisWeek} this week
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#718096',
                              marginTop: '0.25rem'
                            }}>
                              Avg: {stats.averageMessagesPerDay}/day
                            </div>
                            {stats.totalMessages > 0 && (
                              <div style={{
                                marginTop: '0.25rem',
                                padding: '0.125rem 0.5rem',
                                backgroundColor: '#f0fff4',
                                color: '#38a169',
                                borderRadius: '12px',
                                fontSize: '0.625rem',
                                display: 'inline-block'
                              }}>
                                Active User
                              </div>
                            )}
                            {stats.lastMessageDate && (
                              <div style={{
                                fontSize: '0.625rem',
                                color: '#a0aec0',
                                marginTop: '0.25rem'
                              }}>
                                Last: {new Date(stats.lastMessageDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleEditStudent(student.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#bee3f8',
                            color: '#2b6cb0',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleStatusToggle(student.id, student.status)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: student.status === 'active' ? '#fed7d7' : '#c6f6d5',
                            color: student.status === 'active' ? '#c53030' : '#2f855a',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {student.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#fed7d7',
                            color: '#c53030',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Students;