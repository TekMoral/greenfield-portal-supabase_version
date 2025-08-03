// Contact Information Data Structure
// This file contains all contact information for Greenfield College
// Update this file to modify contact details across the website

// Main contact information
export const contactInfo = {
  address: {
    street: "Plot 17, Adewale Fajuyi Street, Off Awolowo Road, Ikoyi",
    city: "Lagos Island",
    state: "Lagos State",
    country: "Nigeria",
    postalCode: "100225",
    fullAddress: "Plot 17 Adewale Fajuyi Street, Off awolowo Road, Ikoyi, Lagos Island, Nigeria 100225"
  },
  phone: {
    main: "+234 803 454 3622",
    admissions: "+234 803 454 3623",
    emergency: "+234 803 454 3624",
    finance: "+234 803 454 3625"
  },
  email: {
    general: "info@greenfield.edu.ng",
    admissions: "admissions@greenfield.edu.ng",
    academics: "academics@greenfield.edu.ng",
    support: "support@greenfield.edu.ng",
    finance: "finance@greenfield.edu.ng",
    news: "news@greenfield.edu.ng"
  },
  officeHours: {
    weekdays: "Monday - Friday: 8:00 AM - 4:00 PM",
    saturday: "Saturday: 9:00 AM - 1:00 PM",
    sunday: "Sunday: Closed",
    emergency: "Emergency line available 24/7"
  },
  socialMedia: [
    {
      name: "Facebook",
      url: "https://facebook.com/greenfieldcollege",
      icon: "facebook",
      color: "bg-blue-600 hover:bg-blue-700",
      username: "@greenfieldcollege"
    },
    {
      name: "Twitter",
      url: "https://twitter.com/greenfieldcollege",
      icon: "twitter",
      color: "bg-sky-500 hover:bg-sky-600",
      username: "@greenfieldcollege"
    },
    {
      name: "Instagram",
      url: "https://instagram.com/greenfieldcollege",
      icon: "instagram",
      color: "bg-pink-600 hover:bg-pink-700",
      username: "@greenfieldcollege"
    },
    {
      name: "YouTube",
      url: "https://youtube.com/greenfieldcollege",
      icon: "youtube",
      color: "bg-red-600 hover:bg-red-700",
      username: "Greenfield College"
    }
  ]
};

// Department-specific contact information
export const departments = [
  {
    name: "Admissions Office",
    description: "New student enrollment and admission inquiries",
    phone: contactInfo.phone.admissions,
    email: contactInfo.email.admissions,
    hours: "Monday - Friday: 8:00 AM - 4:00 PM",
    icon: "🎓",
    head: "Mrs. Sarah Adebayo",
    location: "Ground Floor, Admin Block"
  },
  {
    name: "Academic Office",
    description: "Academic programs, curriculum, and student records",
    phone: contactInfo.phone.main,
    email: contactInfo.email.academics,
    hours: "Monday - Friday: 8:00 AM - 4:00 PM",
    icon: "📚",
    head: "Dr. Michael Oluwaole",
    location: "First Floor, Admin Block"
  },
  {
    name: "Student Support",
    description: "Student welfare, counseling, and general support",
    phone: contactInfo.phone.main,
    email: contactInfo.email.support,
    hours: "Monday - Friday: 8:00 AM - 4:00 PM",
    icon: "🤝",
    head: "Mrs. Funmi Okafor",
    location: "Student Services Building"
  },
  {
    name: "Finance Office",
    description: "Fee payments, financial aid, and billing inquiries",
    phone: contactInfo.phone.finance,
    email: contactInfo.email.finance,
    hours: "Monday - Friday: 8:00 AM - 3:00 PM",
    icon: "💰",
    head: "Mr. Tunde Akinola",
    location: "Ground Floor, Admin Block"
  }
];

// Quick contact cards for homepage/other pages
export const quickContacts = [
  {
    title: "General Inquiries",
    description: "For general questions and information",
    phone: contactInfo.phone.main,
    email: contactInfo.email.general,
    icon: "📞",
    color: "from-green-500 to-emerald-500"
  },
  {
    title: "Admissions",
    description: "For enrollment and admission questions",
    phone: contactInfo.phone.admissions,
    email: contactInfo.email.admissions,
    icon: "🎓",
    color: "from-blue-500 to-indigo-500"
  },
  {
    title: "Emergency",
    description: "For urgent matters outside office hours",
    phone: contactInfo.phone.emergency,
    email: contactInfo.email.general,
    icon: "🚨",
    color: "from-red-500 to-orange-500"
  }
];

// Contact form subjects for dropdown
export const contactSubjects = [
  { value: "admissions", label: "Admissions Inquiry" },
  { value: "academic", label: "Academic Information" },
  { value: "fees", label: "Fees and Payments" },
  { value: "support", label: "Student Support" },
  { value: "facilities", label: "Facilities and Infrastructure" },
  { value: "events", label: "Events and Activities" },
  { value: "partnership", label: "Partnership Opportunities" },
  { value: "media", label: "Media and Press" },
  { value: "general", label: "General Inquiry" },
  { value: "other", label: "Other" }
];

// Map coordinates (replace with actual coordinates)
export const mapCoordinates = {
  latitude: 6.5244,
  longitude: 3.3792,
  zoom: 15
};

// Transportation information
export const transportation = {
  publicTransport: [
    "BRT Bus Stop: Ikorodu Road (5 minutes walk)",
    "Lagos Bus Stop: Education Avenue (2 minutes walk)",
    "Taxi/Uber pickup point: Main Gate"
  ],
  parking: {
    available: true,
    capacity: "200 vehicles",
    cost: "Free for visitors",
    hours: "6:00 AM - 6:00 PM"
  },
  landmarks: [
    "Opposite Lagos State Library",
    "Near Education District Office",
    "Behind Central Bank of Nigeria Branch"
  ]
};

// Helper functions
export const formatPhoneNumber = (phone) => {
  // Remove any existing formatting
  const cleaned = phone.replace(/\D/g, '');

  // Format as +234 XXX XXX XXXX
  if (cleaned.startsWith('234')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  return phone;
};

export const getEmailByDepartment = (department) => {
  const deptMap = {
    'admissions': contactInfo.email.admissions,
    'academic': contactInfo.email.academics,
    'support': contactInfo.email.support,
    'finance': contactInfo.email.finance,
    'general': contactInfo.email.general
  };

  return deptMap[department] || contactInfo.email.general;
};

export const getPhoneByDepartment = (department) => {
  const deptMap = {
    'admissions': contactInfo.phone.admissions,
    'finance': contactInfo.phone.finance,
    'emergency': contactInfo.phone.emergency,
    'general': contactInfo.phone.main
  };

  return deptMap[department] || contactInfo.phone.main;
};

// Social media icon components data
export const socialIcons = {
  facebook: {
    viewBox: "0 0 24 24",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
  },
  twitter: {
    viewBox: "0 0 24 24",
    path: "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"
  },
  instagram: {
    viewBox: "0 0 24 24",
    path: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z"
  },
  linkedin: {
    viewBox: "0 0 24 24",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
  },
  youtube: {
    viewBox: "0 0 24 24",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
  }
};
