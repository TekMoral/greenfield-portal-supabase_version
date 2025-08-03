import { createNotification } from '../services/notificationService';

// Test function to create a sample notification
export const createTestNotification = async (userId) => {
  try {
    const testNotification = {
      userId: userId,
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working.',
      data: {
        testData: 'Sample data'
      },
      priority: 'normal'
    };

    const result = await createNotification(testNotification);
    console.log('Test notification created:', result);
    return result;
  } catch (error) {
    console.error('Error creating test notification:', error);
    throw error;
  }
};

// Test function to create a sample report status notification
export const createTestReportNotification = async (userId) => {
  try {
    const testReportNotification = {
      userId: userId,
      type: 'report_status_update',
      title: 'Report Approved',
      message: 'Your report for John Doe (Mathematics) has been approved.',
      data: {
        reportId: 'test-report-123',
        studentName: 'John Doe',
        subjectName: 'Mathematics',
        className: 'Grade 10A',
        status: 'reviewed',
        adminNotes: '',
        term: 1,
        academicYear: 2024
      },
      priority: 'normal'
    };

    const result = await createNotification(testReportNotification);
    console.log('Test report notification created:', result);
    return result;
  } catch (error) {
    console.error('Error creating test report notification:', error);
    throw error;
  }
};