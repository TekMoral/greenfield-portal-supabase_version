# News & Events Data Management

This directory contains the data structure for managing news posts and events on the Greenfield College website.

## Files

- `newsEventsData.js` - Contains all news posts, events, and related data structures

## How to Update Content

### Adding News Posts

To add a new news post, add an object to the `newsData` array in `newsEventsData.js`:

```javascript
{
  id: 7, // Increment from the last ID
  title: "Your News Title",
  summary: "Brief summary of the news article",
  content: "Full article content (optional for now)",
  image: "https://example.com/image.jpg", // Use high-quality images
  date: "2025-01-20", // Format: YYYY-MM-DD
  category: "achievement", // See categories below
  author: "Author Name",
  tags: ["tag1", "tag2", "tag3"], // Relevant tags
  featured: false // Set to true for featured articles
}
```

### Adding Events

To add a new event, add an object to the `eventsData` array:

```javascript
{
  id: 8, // Increment from the last ID
  title: "Event Title",
  description: "Detailed description of the event",
  date: "2025-03-01", // Format: YYYY-MM-DD
  time: "10:00 AM - 2:00 PM",
  venue: "Event Location",
  category: "academic", // See categories below
  status: "upcoming", // "upcoming" or "past"
  registrationRequired: true, // true or false
  capacity: 150, // Number or null if unlimited
  contact: "contact@greenfield.edu.ng",
  organizer: "Department Name"
}
```

### Updating Featured Announcement

To change the featured announcement banner, update the `featuredAnnouncement` object:

```javascript
export const featuredAnnouncement = {
  id: 1,
  title: "New Announcement Title",
  summary: "Brief description of the announcement",
  image: "https://example.com/banner-image.jpg",
  date: "2025-01-20",
  category: "announcement",
  urgent: true,
  link: "/relevant-page" // Link to relevant page
};
```

## Categories

### News Categories
- `achievement` - Awards, competitions, recognitions
- `academic` - Academic programs, curriculum updates
- `infrastructure` - New facilities, renovations
- `sports` - Sports events, competitions
- `community` - Community events, partnerships
- `events` - General school events

### Event Categories
- `academic` - Academic events, exams
- `orientation` - New student orientations
- `guidance` - Career guidance, counseling
- `cultural` - Cultural celebrations, festivals
- `celebration` - Celebrations, ceremonies
- `sports` - Sports events, competitions

## Image Guidelines

- Use high-quality images (minimum 800px width for news, 2000px for featured)
- Prefer landscape orientation (16:9 or 4:3 aspect ratio)
- Use relevant, professional images
- Consider using Unsplash for stock photos: https://unsplash.com/

## Date Formatting

- Always use YYYY-MM-DD format for dates
- Use 12-hour format for times (e.g., "2:00 PM - 5:00 PM")
- Be consistent with time formatting

## Best Practices

1. **Keep summaries concise** - Aim for 1-2 sentences that capture the essence
2. **Use descriptive titles** - Make them engaging but informative
3. **Tag appropriately** - Use 2-4 relevant tags per news post
4. **Update regularly** - Keep content fresh and current
5. **Archive old events** - Change status from "upcoming" to "past" after events occur
6. **Maintain consistency** - Follow the same style and tone across all content

## Future Backend Integration

This data structure is designed to be easily migrated to a backend system:

- Each object has a unique `id` field for database primary keys
- Date fields are in ISO format for easy parsing
- Categories are standardized for consistent filtering
- All required fields are clearly defined

When implementing a CMS or admin panel, these same field structures can be used for forms and database schemas.

## Contact

For questions about content management or technical issues, contact:
- Technical: dev@greenfield.edu.ng
- Content: communications@greenfield.edu.ng