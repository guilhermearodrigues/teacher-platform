import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  enrollmentDate: string;
  status: 'active' | 'inactive';
  userId: string;
}

export interface CreateStudentData {
  firstName: string;
  lastName: string;
  phone: string;
}

interface StudentsContextType {
  students: Student[];
  loading: boolean;
  error: string | null;
  addStudent: (studentData: CreateStudentData) => Promise<void>;
  updateStudent: (id: string, studentData: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  getStudent: (id: string) => Student | undefined;
  fetchStudents: () => Promise<void>;
  importStudents: (studentsData: CreateStudentData[]) => Promise<{ success: number; failed: number; errors: string[] }>;
}

const StudentsContext = createContext<StudentsContextType | undefined>(undefined);

export const StudentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [refreshTimeoutId, setRefreshTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Debounced auto-refresh function
  const scheduleAutoRefresh = () => {
    // Clear any existing timeout
    if (refreshTimeoutId) {
      clearTimeout(refreshTimeoutId);
    }

    // Schedule a new refresh
    const timeoutId = setTimeout(() => {
      fetchStudents();
    }, 300); // 300ms delay to prevent rapid consecutive refreshes

    setRefreshTimeoutId(timeoutId);
  };

  const fetchStudents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedStudents: Student[] = data.map(student => ({
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        phone: student.phone,
        enrollmentDate: student.enrollment_date,
        status: student.status,
        userId: student.user_id
      }));

      setStudents(formattedStudents);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      setError(error.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async (studentData: CreateStudentData) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('students')
        .insert({
          first_name: studentData.firstName,
          last_name: studentData.lastName,
          phone: studentData.phone,
          user_id: user.id,
          enrollment_date: new Date().toISOString().split('T')[0],
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const newStudent: Student = {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        phone: data.phone,
        enrollmentDate: data.enrollment_date,
        status: data.status,
        userId: data.user_id
      };

      setStudents(prev => [newStudent, ...prev]);
      console.log('Student added:', newStudent);

      // Auto-refresh to ensure data consistency
      scheduleAutoRefresh();
    } catch (error: any) {
      console.error('Error adding student:', error);
      setError(error.message || 'Failed to add student');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateStudent = async (id: string, studentData: Partial<Student>) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updateData: any = {};
      if (studentData.firstName) updateData.first_name = studentData.firstName;
      if (studentData.lastName) updateData.last_name = studentData.lastName;
      if (studentData.phone) updateData.phone = studentData.phone;
      if (studentData.status) updateData.status = studentData.status;

      const { data, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updatedStudent: Student = {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        phone: data.phone,
        enrollmentDate: data.enrollment_date,
        status: data.status,
        userId: data.user_id
      };

      setStudents(prev =>
        prev.map(student =>
          student.id === id ? updatedStudent : student
        )
      );
      console.log('Student updated:', updatedStudent);

      // Auto-refresh to ensure data consistency
      scheduleAutoRefresh();
    } catch (error: any) {
      console.error('Error updating student:', error);
      setError(error.message || 'Failed to update student');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (id: string) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setStudents(prev => prev.filter(student => student.id !== id));
      console.log('Student deleted:', id);

      // Auto-refresh to ensure data consistency
      scheduleAutoRefresh();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      setError(error.message || 'Failed to delete student');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getStudent = (id: string) => {
    return students.find(student => student.id === id);
  };

  const importStudents = async (studentsData: CreateStudentData[]) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      // Process students in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < studentsData.length; i += batchSize) {
        const batch = studentsData.slice(i, i + batchSize);

        for (const studentData of batch) {
          try {
            const { error } = await supabase
              .from('students')
              .insert({
                first_name: studentData.firstName,
                last_name: studentData.lastName,
                phone: studentData.phone,
                user_id: user.id,
                enrollment_date: new Date().toISOString().split('T')[0],
                status: 'active'
              });

            if (error) {
              failedCount++;
              errors.push(`${studentData.firstName} ${studentData.lastName}: ${error.message}`);
            } else {
              successCount++;
            }
          } catch (error: any) {
            failedCount++;
            errors.push(`${studentData.firstName} ${studentData.lastName}: ${error.message || 'Unknown error'}`);
          }
        }

        // Add a small delay between batches to prevent rate limiting
        if (i + batchSize < studentsData.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Refresh the students list after import
      await fetchStudents();

      console.log(`Import completed: ${successCount} successful, ${failedCount} failed`);

      return {
        success: successCount,
        failed: failedCount,
        errors
      };
    } catch (error: any) {
      console.error('Error importing students:', error);
      setError(error.message || 'Failed to import students');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [user]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
      }
    };
  }, [refreshTimeoutId]);

  const value = {
    students,
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudent,
    fetchStudents,
    importStudents
  };

  return (
    <StudentsContext.Provider value={value}>
      {children}
    </StudentsContext.Provider>
  );
};

export const useStudents = () => {
  const context = useContext(StudentsContext);
  if (context === undefined) {
    throw new Error('useStudents must be used within a StudentsProvider');
  }
  return context;
};