# Cabarrus Flood Smart Intake

## Project Purpose

The Cabarrus Flood Smart Intake project is an interactive property identification and floodplain screening tool being developed to help streamline the initial intake process for flood-related inquiries in Cabarrus County, North Carolina.

The goal is to allow a user to enter a property identifier and begin gathering relevant property and GIS information to support floodplain screening and intake workflows.

---

## Current Version

The project currently contains:

- `index.html` — Application structure and user interface
- `style.css` — Application styling and layout
- `script.js` — Application logic and property search functionality

The current interface includes:

### Property Search

The user can enter a Cabarrus County property identifier, including:

- Property PIN
- Legacy PIN / Old PIN
- Parcel number

### Property Profile

The application is designed to display:

- Search Input
- Legacy PIN / Old PIN
- Current PIN
- Property Owner
- Property Status

### Flood Smart Intake Workflow

The application also contains the beginning structure for a larger Flood Smart Intake workflow.

---

## Current Development Status

### Working

- User interface and application layout
- Property search input
- Property profile display
- JavaScript search workflow
- GitHub repository backup

### Current Issue

The application successfully sends a request to the Cabarrus County GIS service, but the GIS response currently returns an error indicating:

`Service Parcels/MapServer not started`

This means the next phase of development is to identify the correct publicly accessible Cabarrus County GIS service endpoint and update the application to use the correct service.

---

## Development History

The project was initially developed using browser-based coding tools including CodePen.

The project was then moved to GitHub to provide:

- Permanent backup
- Version history
- Protection against losing development work
- A central location for future development

---

## Next Steps

1. Identify the correct live Cabarrus County GIS endpoint.
2. Connect the property search to the working GIS service.
3. Retrieve parcel geometry and property information.
4. Add floodplain data screening.
5. Develop the Flood Smart Intake workflow.
6. Improve error handling and validation.
7. Create a stable free development workflow connected to GitHub.

---

## Technology

This project currently uses:

- HTML
- CSS
- JavaScript
- Public GIS/REST services
- GitHub for source control and project backup

---

## Important Note

This is an active development project.

The current GitHub repository should be treated as the primary backup and source repository for the project. Major development changes should be saved to GitHub regularly.

---

## Project Goal

The long-term goal is to develop a practical interactive tool that can help streamline property identification, GIS research, floodplain screening, and the initial intake process for flood-related inquiries.
