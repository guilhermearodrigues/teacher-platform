import { Student, CreateStudentData } from '../contexts/StudentsContext';

export interface ImportResult {
  success: boolean;
  data?: CreateStudentData[];
  errors?: string[];
  invalidRows?: number[];
}

export const exportStudentsToCSV = (students: Student[]): void => {
  if (students.length === 0) {
    alert('No students to export');
    return;
  }

  // Define CSV headers
  const headers = ['First Name', 'Last Name', 'Phone', 'Status', 'Enrollment Date'];

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...students.map(student => [
      `"${student.firstName}"`,
      `"${student.lastName}"`,
      `"${student.phone}"`,
      `"${student.status}"`,
      `"${student.enrollmentDate}"`
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const parseCSVFile = (file: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseCSVText(text);
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          errors: ['Failed to read file: ' + (error as Error).message]
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        errors: ['Failed to read file']
      });
    };

    reader.readAsText(file);
  });
};

const parseCSVText = (text: string): ImportResult => {
  const lines = text.split('\n').filter(line => line.trim() !== '');

  if (lines.length < 2) {
    return {
      success: false,
      errors: ['CSV file must contain at least a header row and one data row']
    };
  }

  // Parse header row
  const headers = parseCSVRow(lines[0]);
  const expectedHeaders = ['first name', 'last name', 'phone'];

  // Validate headers (case insensitive)
  const headerMap: { [key: string]: number } = {};
  headers.forEach((header, index) => {
    headerMap[header.toLowerCase().trim()] = index;
  });

  const missingHeaders = expectedHeaders.filter(header =>
    !(header in headerMap)
  );

  if (missingHeaders.length > 0) {
    return {
      success: false,
      errors: [`Missing required columns: ${missingHeaders.join(', ')}`]
    };
  }

  // Parse data rows
  const data: CreateStudentData[] = [];
  const errors: string[] = [];
  const invalidRows: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowData = parseCSVRow(lines[i]);

    if (rowData.length === 0) continue; // Skip empty rows

    try {
      const student = parseStudentRow(rowData, headerMap);
      if (student) {
        data.push(student);
      } else {
        invalidRows.push(i + 1);
      }
    } catch (error) {
      errors.push(`Row ${i + 1}: ${(error as Error).message}`);
      invalidRows.push(i + 1);
    }
  }

  return {
    success: data.length > 0,
    data,
    errors: errors.length > 0 ? errors : undefined,
    invalidRows: invalidRows.length > 0 ? invalidRows : undefined
  };
};

const parseCSVRow = (row: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last field
  result.push(current.trim());

  return result;
};

const parseStudentRow = (
  rowData: string[],
  headerMap: { [key: string]: number }
): CreateStudentData | null => {
  const firstName = rowData[headerMap['first name']]?.replace(/^"|"$/g, '').trim();
  const lastName = rowData[headerMap['last name']]?.replace(/^"|"$/g, '').trim();
  const phone = rowData[headerMap['phone']]?.replace(/^"|"$/g, '').trim();

  // Validate required fields
  if (!firstName || !lastName || !phone) {
    const missing = [];
    if (!firstName) missing.push('First Name');
    if (!lastName) missing.push('Last Name');
    if (!phone) missing.push('Phone');
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Validate phone format (basic validation)
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error(`Invalid phone number format: ${phone}`);
  }

  return {
    firstName,
    lastName,
    phone
  };
};

export const generateSampleCSV = (): void => {
  const sampleData = [
    ['First Name', 'Last Name', 'Phone'],
    ['John', 'Doe', '(555) 123-4567'],
    ['Jane', 'Smith', '+1 555 987-6543'],
    ['Michael', 'Johnson', '555-111-2222']
  ];

  const csvContent = sampleData.map(row =>
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_students_import.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};