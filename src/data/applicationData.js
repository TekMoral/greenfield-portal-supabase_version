// Application Data Structure
// This file contains all application-related information for Greenfield College
// Update this file to modify application process details, fees, deadlines, etc.

// Application fees and costs
export const applicationFees = {
  applicationForm: "₦5,000",
  processingFee: "₦10,000",
  total: "₦15,000",
  latePenalty: "₦5,000",
  paymentMethods: [
    "Bank transfer to school account",
    "Cash payment at school office",
    "Mobile money transfer",
    "Online payment portal (coming soon)"
  ]
};

// Application deadlines and important dates
export const applicationDeadlines = {
  regularDeadline: {
    date: "August 31, 2025",
    time: "4:00 PM",
    description: "Regular application deadline"
  },
  lateDeadline: {
    date: "September 15, 2025",
    time: "4:00 PM",
    description: "Late application deadline (with penalty)",
    penalty: applicationFees.latePenalty
  },
  examDates: {
    start: "september 20, 2025",
    end: "April 22, 2025",
    description: "Entrance examination period"
  },
  resultDate: {
    date: "september 23, 2025",
    description: "Results publication date"
  }
};

// Contact information for applications
export const applicationContact = {
  phone: "+234 803 454 3623",
  email: "admissions@greenfield.edu.ng",
  office: "Admissions Office, Ground Floor, Admin Block",
  officeHours: {
    weekdays: "Monday - Friday: 8:00 AM - 4:00 PM",
    saturday: "Saturday: 9:00 AM - 1:00 PM",
    sunday: "Sunday: Closed"
  }
};

// Application process steps
export const applicationSteps = [
  {
    step: "01",
    title: "Visit Our Campus",
    description: "Come to our admissions office to collect the physical application form and get guidance from our staff.",
    details: [
      "Bring a valid ID (parent/guardian)",
      "Visit during office hours",
      "Speak with admissions counselor",
      "Get campus tour (optional)"
    ],
    icon: "🏫",
    duration: "30-45 minutes",
    required: true
  },
  {
    step: "02",
    title: "Complete the Form",
    description: "Fill out the application form carefully with all required information and gather necessary documents.",
    details: [
      "Fill all sections completely",
      "Attach required documents",
      "Include passport photographs",
      "Review for accuracy"
    ],
    icon: "📝",
    duration: "1-2 hours",
    required: true
  },
  {
    step: "03",
    title: "Pay Application Fees",
    description: "Pay the required application and processing fees through our approved payment methods.",
    details: [
      "Bank transfer or cash payment",
      "Get payment receipt",
      "Attach receipt to application",
      "Keep copy for records"
    ],
    icon: "💳",
    duration: "15-30 minutes",
    required: true
  },
  {
    step: "04",
    title: "Submit Application",
    description: "Return the completed form with all documents and payment receipt to our admissions office.",
    details: [
      "Submit before deadline",
      "Get acknowledgment receipt",
      "Note your application number",
      "Schedule entrance exam (if applicable)"
    ],
    icon: "📤",
    duration: "15 minutes",
    required: true
  }
];

// Application form fields preview
export const formSections = [
  {
    section: "Student Information",
    icon: "👤",
    fields: [
      "Full Name",
      "Date of Birth",
      "Gender",
      "Nationality",
      "State of Origin",
      "Home Address",
      "Phone Number",
      "Email Address"
    ]
  },
  {
    section: "Parent/Guardian Information",
    icon: "���‍👩‍👧‍👦",
    fields: [
      "Father's Full Name",
      "Father's Occupation",
      "Father's Phone & Email",
      "Mother's Full Name",
      "Mother's Occupation",
      "Mother's Phone & Email",
      "Guardian Information (if applicable)"
    ]
  },
  {
    section: "Academic Information",
    icon: "📚",
    fields: [
      "Previous School Name",
      "Last Class Completed",
      "Academic Year",
      "Reason for Transfer",
      "Academic Records",
      "Special Needs (if any)"
    ]
  },
  {
    section: "Additional Information",
    icon: "📋",
    fields: [
      "Medical Information",
      "Emergency Contact",
      "Extracurricular Interests",
      "How you heard about us",
      "Parent/Student Declaration",
      "Signature and Date"
    ]
  }
];

// Required documents checklist
export const requiredDocuments = [
  {
    document: "Birth Certificate",
    description: "Original and photocopy",
    icon: "📄",
    mandatory: true,
    notes: "Must be government-issued"
  },
  {
    document: "Previous School Report",
    description: "Last 2 terms/semesters",
    icon: "📊",
    mandatory: true,
    notes: "Official transcripts required"
  },
  {
    document: "Transfer Certificate",
    description: "If from another school",
    icon: "📋",
    mandatory: false,
    notes: "Required only for transfer students"
  },
  {
    document: "Passport Photographs",
    description: "4 recent passport-size photos",
    icon: "📸",
    mandatory: true,
    notes: "White background, recent photos"
  },
  {
    document: "Medical Certificate",
    description: "Health fitness certificate",
    icon: "🏥",
    mandatory: true,
    notes: "From registered medical practitioner"
  },
  {
    document: "Parent/Guardian ID",
    description: "Valid identification",
    icon: "🆔",
    mandatory: true,
    notes: "National ID, driver's license, or passport"
  }
];

// Application form download information
export const formDownload = {
  available: true,
  fileSize: "2.5 MB",
  format: "PDF",
  version: "2025.1",
  lastUpdated: "January 2025",
  downloadUrl: "/forms/greenfield-application-form-2025.pdf",
  instructions: [
    "Download and print the form",
    "Fill out all sections in black ink",
    "Attach all required documents",
    "Submit to admissions office before deadline"
  ]
};

// Class levels and age requirements
export const classLevels = [
  {
    level: "Nursery 1",
    ageRange: "3-4 years",
    requirements: ["Basic toilet training", "Social readiness"]
  },
  {
    level: "Nursery 2",
    ageRange: "4-5 years",
    requirements: ["Nursery 1 completion", "Basic communication skills"]
  },
  {
    level: "Primary 1",
    ageRange: "5-6 years",
    requirements: ["Nursery completion", "School readiness assessment"]
  },
  {
    level: "Primary 2-6",
    ageRange: "6-11 years",
    requirements: ["Previous class completion", "Transfer certificate (if applicable)"]
  },
  {
    level: "JSS 1",
    ageRange: "11-12 years",
    requirements: ["Primary 6 completion", "Common Entrance result"]
  },
  {
    level: "JSS 2-3",
    ageRange: "12-14 years",
    requirements: ["Previous class completion", "Academic records"]
  },
  {
    level: "SSS 1",
    ageRange: "14-15 years",
    requirements: ["JSS 3 completion", "BECE result"]
  },
  {
    level: "SSS 2-3",
    ageRange: "15-17 years",
    requirements: ["Previous class completion", "Academic records"]
  }
];

// Entrance examination information
export const entranceExam = {
  required: true,
  subjects: ["Mathematics", "English Language", "General Knowledge"],
  duration: "2 hours",
  format: "Written examination",
  passingScore: "60%",
  retakePolicy: "One retake allowed after 6 months",
  exemptions: [
    "Students with exceptional academic records",
    "Transfer students from partner schools"
  ]
};

// Application tips and guidelines
export const applicationTips = [
  {
    category: "Before You Apply",
    tips: [
      "Visit the school for a campus tour",
      "Attend our information sessions",
      "Prepare all required documents",
      "Review admission requirements carefully"
    ]
  },
  {
    category: "Filling the Form",
    tips: [
      "Use black ink for handwritten forms",
      "Provide complete and accurate information",
      "Double-check all entries before submission",
      "Ensure all sections are filled"
    ]
  },
  {
    category: "Document Preparation",
    tips: [
      "Make clear photocopies of all documents",
      "Organize documents in the required order",
      "Keep original documents for verification",
      "Translate foreign documents to English"
    ]
  },
  {
    category: "Submission",
    tips: [
      "Submit well before the deadline",
      "Get acknowledgment receipt",
      "Keep copies of all submitted documents",
      "Follow up on application status"
    ]
  }
];

// Helper functions
export const calculateApplicationFee = (isLate = false) => {
  const baseAmount = parseInt(applicationFees.total.replace(/[₦,]/g, ''));
  const penalty = isLate ? parseInt(applicationFees.latePenalty.replace(/[₦,]/g, '')) : 0;
  return `₦${(baseAmount + penalty).toLocaleString()}`;
};

export const isApplicationOpen = () => {
  const now = new Date();
  const deadline = new Date(applicationDeadlines.lateDeadline.date);
  return now <= deadline;
};

export const getDaysUntilDeadline = () => {
  const now = new Date();
  const deadline = new Date(applicationDeadlines.regularDeadline.date);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export const getApplicationStatus = () => {
  const now = new Date();
  const regularDeadline = new Date(applicationDeadlines.regularDeadline.date);
  const lateDeadline = new Date(applicationDeadlines.lateDeadline.date);

  if (now <= regularDeadline) {
    return 'open';
  } else if (now <= lateDeadline) {
    return 'late';
  } else {
    return 'closed';
  }
};

// School benefits and selling points
export const schoolBenefits = [
  "98% university acceptance rate",
  "Small class sizes (max 25 students)",
  "Experienced, caring teachers",
  "Modern facilities & technology",
  "Strong moral & ethical foundation",
  "Comprehensive extracurricular programs",
  "Individual attention for each student",
  "Safe and nurturing environment"
];
