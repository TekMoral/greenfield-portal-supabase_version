// News & Events Data Structure
// This file contains all the data for news posts and events
// Update this file to add, edit, or remove news and events

// Featured announcement - displayed prominently at the top
export const featuredAnnouncement = {
  id: 1,
  title: "2025 Academic Session Registration Now Open",
  summary: "We are excited to announce that registration for the 2025 academic session is now open. Early bird discounts available until March 31st.",
  image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
  date: "2025-08-15",
  category: "announcement",
  urgent: true,
  link: "/admission"
};

// News posts data
export const newsData = [
  {
    id: 1,
    title: "Greenfield College Wins Regional Science Competition",
    summary: "Our brilliant students secured first place in the Regional Science Fair with their innovative renewable energy project.",
    content: "Full article content would go here...",
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    date: "2025-01-10",
    category: "achievement",
    author: "Dr. Sarah Johnson",
    tags: ["science", "competition", "students"],
    featured: true
  },
  {
    id: 2,
    title: "New Computer Laboratory Officially Opened",
    summary: "State-of-the-art computer lab with 40 modern workstations now available for students across all levels.",
    content: "Full article content would go here...",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    date: "2025-01-08",
    category: "infrastructure",
    author: "Admin Team",
    tags: ["technology", "infrastructure", "education"],
    featured: false
  },
  {
    id: 3,
    title: "Outstanding WAEC Results for Class of 2024",
    summary: "98% of our students achieved excellent grades in the 2024 WAEC examinations, with 85% scoring distinctions.",
    content: "Full article content would go here...",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    date: "2025-01-05",
    category: "academic",
    author: "Academic Office",
    tags: ["results", "waec", "achievement"],
    featured: true
  },
  {
    id: 4,
    title: "Inter-House Sports Competition 2025",
    summary: "Annual sports competition showcased incredible talent and sportsmanship across all four houses.",
    content: "Full article content would go here...",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    date: "2025-01-03",
    category: "sports",
    author: "Sports Department",
    tags: ["sports", "competition", "houses"],
    featured: false
  },
  {
    id: 5,
    title: "Parent-Teacher Conference Success",
    summary: "Productive discussions between parents and teachers strengthened our school-home partnership.",
    content: "Full article content would go here...",
    image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    date: "2024-12-20",
    category: "community",
    author: "Parent Relations",
    tags: ["parents", "teachers", "conference"],
    featured: false
  },
  {
    id: 6,
    title: "Christmas Carol Service 2024",
    summary: "Beautiful Christmas celebration brought together students, staff, and families in festive harmony.",
    content: "Full article content would go here...",
    image: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    date: "2024-12-15",
    category: "events",
    author: "Events Team",
    tags: ["christmas", "celebration", "community"],
    featured: false
  }
];

// Events data
export const eventsData = [
  {
    id: 1,
    title: "New Student Orientation",
    description: "Welcome program for new students and their parents. Campus tour, meet the teachers, and introduction to school policies.",
    date: "2025-02-15",
    time: "9:00 AM - 12:00 PM",
    venue: "Main Assembly Hall",
    category: "orientation",
    status: "upcoming",
    registrationRequired: true,
    capacity: 200,
    contact: "admissions@greenfield.edu.ng",
    organizer: "Admissions Office"
  },
  {
    id: 2,
    title: "Science Fair 2025",
    description: "Annual science exhibition where students showcase innovative projects and experiments across various scientific disciplines.",
    date: "2025-03-10",
    time: "10:00 AM - 4:00 PM",
    venue: "Science Laboratory Complex",
    category: "academic",
    status: "upcoming",
    registrationRequired: false,
    capacity: 500,
    contact: "science@greenfield.edu.ng",
    organizer: "Science Department"
  },
  {
    id: 3,
    title: "Career Guidance Workshop",
    description: "Professional career counselors will guide students on university choices and career paths.",
    date: "2025-02-28",
    time: "2:00 PM - 5:00 PM",
    venue: "Conference Room A",
    category: "guidance",
    status: "upcoming",
    registrationRequired: true,
    capacity: 100,
    contact: "guidance@greenfield.edu.ng",
    organizer: "Guidance & Counseling"
  },
  {
    id: 4,
    title: "Annual Cultural Day",
    description: "Celebration of Nigerian culture with traditional dances, music, food, and cultural displays.",
    date: "2025-04-20",
    time: "11:00 AM - 6:00 PM",
    venue: "School Grounds",
    category: "cultural",
    status: "upcoming",
    registrationRequired: false,
    capacity: 1000,
    contact: "events@greenfield.edu.ng",
    organizer: "Cultural Committee"
  },
  {
    id: 5,
    title: "Mid-Term Examinations",
    description: "Mid-term assessment for all students across all subjects and grade levels.",
    date: "2025-03-15",
    time: "8:00 AM - 3:00 PM",
    venue: "All Classrooms",
    category: "academic",
    status: "upcoming",
    registrationRequired: false,
    capacity: null,
    contact: "academics@greenfield.edu.ng",
    organizer: "Academic Office"
  },
  {
    id: 6,
    title: "Christmas Carol Service 2024",
    description: "Annual Christmas celebration with carols, performances, and festive activities for the school community.",
    date: "2024-12-15",
    time: "6:00 PM - 8:00 PM",
    venue: "Main Assembly Hall",
    category: "celebration",
    status: "past",
    registrationRequired: false,
    capacity: 300,
    contact: "events@greenfield.edu.ng",
    organizer: "Events Committee"
  },
  {
    id: 7,
    title: "Inter-House Sports Competition 2024",
    description: "Annual sports competition featuring athletics, football, basketball, and other sporting events.",
    date: "2024-11-20",
    time: "8:00 AM - 5:00 PM",
    venue: "Sports Complex",
    category: "sports",
    status: "past",
    registrationRequired: false,
    capacity: 800,
    contact: "sports@greenfield.edu.ng",
    organizer: "Sports Department"
  }
];

// Categories for filtering
export const newsCategories = [
  'all',
  'achievement',
  'academic',
  'infrastructure',
  'sports',
  'community',
  'events'
];

export const eventCategories = [
  'all',
  'academic',
  'orientation',
  'guidance',
  'cultural',
  'celebration',
  'sports'
];

// Helper functions
export const getNewsByCategory = (category) => {
  if (category === 'all') return newsData;
  return newsData.filter(news => news.category === category);
};

export const getEventsByStatus = (status) => {
  return eventsData.filter(event => event.status === status);
};

export const getFeaturedNews = () => {
  return newsData.filter(news => news.featured);
};

export const getUpcomingEvents = () => {
  return eventsData.filter(event => event.status === 'upcoming');
};

export const getPastEvents = () => {
  return eventsData.filter(event => event.status === 'past');
};

// Date formatting helpers
export const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

export const formatTime = (timeString) => {
  return timeString;
};

// Status and category color helpers
export const getStatusColor = (status) => {
  switch (status) {
    case 'upcoming': return 'bg-green-100 text-green-700';
    case 'past': return 'bg-gray-100 text-gray-700';
    case 'current': return 'bg-orange-100 text-orange-700';
    default: return 'bg-blue-100 text-blue-700';
  }
};

export const getCategoryColor = (category) => {
  const colors = {
    achievement: 'bg-yellow-100 text-yellow-700',
    academic: 'bg-blue-100 text-blue-700',
    infrastructure: 'bg-purple-100 text-purple-700',
    sports: 'bg-green-100 text-green-700',
    community: 'bg-pink-100 text-pink-700',
    events: 'bg-indigo-100 text-indigo-700',
    orientation: 'bg-teal-100 text-teal-700',
    guidance: 'bg-orange-100 text-orange-700',
    cultural: 'bg-red-100 text-red-700',
    celebration: 'bg-purple-100 text-purple-700',
    announcement: 'bg-orange-100 text-orange-700'
  };
  return colors[category] || 'bg-gray-100 text-gray-700';
};
