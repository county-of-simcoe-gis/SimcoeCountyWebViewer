# County of Simcoe Interactive Map

An interactive web mapping application for exploring geographic data, property information, and community services across Simcoe County.

![Application Overview](images/help/overview.png)

---

## Table of Contents

- [Getting Started](#getting-started)
- [Searching](#searching)
- [Map Navigation](#map-navigation)
- [Basemap Switcher](#basemap-switcher)
- [Sidebar](#sidebar)
  - [Layers](#layers)
  - [Tools](#tools)
  - [My Maps](#my-maps)
  - [Themes](#themes)
  - [Reports](#reports)
- [Property Information](#property-information)
- [Right-Click Context Menu](#right-click-context-menu)
- [More Menu](#more-menu)
- [Map Legend](#map-legend)
- [Printing](#printing)
- [Drawing & Annotation](#drawing--annotation)
- [Signing In](#signing-in)
- [URL Sharing & Deep Linking](#url-sharing--deep-linking)
- [Developer Guide](#developer-guide)

---

## Getting Started

When the application loads, the map displays centred on Simcoe County with the default topographic basemap. The main interface consists of:

- **Header bar** at the top with the search bar, logo, and profile button
- **Sidebar** on the left for Layers, Tools, My Maps, Themes, and Reports
- **Map area** in the centre with zoom controls and a basemap switcher
- **Slim sidebar** icons along the left edge when the sidebar is collapsed

Click the **☰ hamburger menu** in the top-left corner (or a tab icon on the slim sidebar) to open the sidebar.

---

## Searching

![Search Bar](images/help/search.png)

The search bar at the top of the header supports multiple search types:

- **Addresses** — Type a street address to find and zoom to a property
- **Parcels** — Search by Assessment Roll Number (ARN)
- **Map Layers** — Find and toggle layers by name
- **Tools & Themes** — Quickly open any tool or theme
- **Road Segments** — Search for a specific road segment
- **Open Street Map** — Search OSM data

Use the **filter dropdown** (left of the search input) to narrow results to a specific type. Begin typing at least 2 characters to see results. Your last 6 searches are remembered and shown when the search bar is focused.

Click a result to zoom to that location and place a marker on the map.

---

## Map Navigation

| Action               | Desktop                                      | Mobile         |
| -------------------- | -------------------------------------------- | -------------- |
| Pan                  | Click and drag                               | Touch and drag |
| Zoom in/out          | Mouse wheel or **+/−** buttons               | Pinch to zoom  |
| Zoom to full extent  | Click the home/extent button                 | Same           |
| Previous/next extent | Back/forward extent buttons                  | Same           |
| Current location     | Click the GPS button to fly to your location | Same           |
| Full screen          | Click the full-screen toggle                 | Same           |

Additional controls such as the coordinate grid, scale display, and rotation reset can be toggled from **Tools → Settings**.

---

## Basemap Switcher

![Basemap Switcher](images/help/basemap-switcher.png)

Located in the **bottom-right corner** of the map. Switch between two modes:

### Topographic Basemaps

- **Topographic** (default) — ESRI World Topo with Canadian styling
- **Light Grey** — Minimal light grey basemap
- **Streets** — Street-focused dark theme
- **LIO Topographic** — Ontario LIO cartographic tiles
- **Open Street Map** — Standard OSM tiles

### Imagery (Aerial Photos)

Switch to the Imagery tab to view aerial photography. A **year slider** lets you scrub through historical imagery from **1954 to 2024**, plus a current Google satellite layer.

Toggle the **Streets Overlay** checkbox to show street names on top of imagery.

---

## Sidebar

The sidebar contains five tabs, accessible from the tab icons at the top of the panel or from the slim sidebar when the panel is collapsed.

### Layers

![Layers Panel](images/help/layers.png)

The Layers tab (Table of Contents) lets you manage which data layers are visible on the map.

- **Search** layers by name using the search box at the top
- **Toggle visibility** using the checkbox next to each layer
- **Expand a layer** to view its inline legend
- **Layer options** (three-dot menu or right-click) provide: Layer Info (metadata), Zoom to Layer, Download, Attribute Table, Opacity slider, and Remove Layer
- **Settings** (gear icon) allow you to sort alphabetically, switch between list and folder view, adjust global opacity, save/reset layer states, and open the full map legend

### Tools

The Tools tab contains utilities for interacting with the map:

| Tool                   | Description                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Measure**            | Measure distance or area on the map. Supports line, polygon, circle, rectangle, and compass bearing. Multiple unit options available |
| **Coordinates**        | View live coordinates as your mouse moves. Input a coordinate to zoom to it. Supports Web Mercator, Lat/Long, NAD83, and NAD27       |
| **Print**              | Generate a PDF or PNG of the current map view (server-side). Options include page size, title, and resolution                        |
| **Print Local (Beta)** | Client-side print with preview. Add decorations like a scale bar, north arrow, and attributions                                      |
| **Add Data**           | Import your own data files (GeoJSON, KML, GPX, Shapefile, CSV) or connect to external WMS/WFS/ArcGIS services                        |
| **Lot and Concession** | Search parcels by geographic township, lot number, and concession                                                                    |
| **External Services**  | Click the map to get links to Google Maps, Google Street View, Bing Maps, and other services at that location                        |
| **Weather**            | View Environment Canada radar imagery and weather forecasts                                                                          |
| **Settings**           | Toggle map controls on/off and manage locally saved data                                                                             |
| **Available Maps**     | Browse and switch between different map configurations                                                                               |

### My Maps

![My Maps Panel](images/help/mymaps.png)

My Maps is a full-featured drawing and annotation toolkit. See [Drawing & Annotation](#drawing--annotation) for details.

### Themes

Themes are pre-configured map views focused on a specific topic. Activating a theme loads relevant layers and may open a custom sidebar panel. Available themes include:

- **Solid Waste Facilities** — Waste facilities, bag tag purchase locations
- **Forestry** — County forests, recreation, conservation areas, parks
- **Child Care Facilities** — Licensed child care providers
- **Immigration Services** — Resources for newcomers
- **Commercial Real Estate** — Commercial property listings
- **211 Community Services** — Community services across Simcoe County
- **Zoning** — Zoning information for properties
- **Broadband** — Broadband coverage data
- **511 Live Feeds** — Live traffic feeds from MTO and Waze

Additional themes may be available when signed in.

### Reports

The Reports tab displays results from the **Identify** tool, property reports, and other query results. Use the back/forward buttons to navigate through your report history.

---

## Property Information

![Property Popup](images/help/property-popup.png)

**Click on any parcel** (when zoomed in sufficiently) to see a quick property popup with:

- Address and Assessment Roll Number (ARN)
- Assessed value
- Waste collection day
- Broadband coverage
- Quick action buttons: **Add to My Maps**, **Share** (copies a URL with the property ARN), and **Terms**

Click **"More Information"** to open a full property report in the Reports tab, which includes emergency services, waste collection details, nearby schools, closest fire hydrant, hospital, and more.

For **condominiums**, a record selector appears to let you choose a specific unit.

---

## Right-Click Context Menu

![Context Menu](images/help/context-menu.png)

Right-click anywhere on the map to access:

| Option               | Description                                                                       |
| -------------------- | --------------------------------------------------------------------------------- |
| **Switch To Basic**  | Collapse the sidebar for a minimal map view                                       |
| **Property Report**  | View property details for the parcel at the clicked point                         |
| **Add Marker Point** | Drop a marker and add it to My Maps                                               |
| **Report a Problem** | Submit feedback about something at this location                                  |
| **Identify**         | Query all visible layers at the clicked point and show results in the Reports tab |
| **More...**          | Open the More Menu                                                                |

---

## More Menu

The More Menu provides quick access to all themes, tools, and additional options. Open it from the **slim sidebar** (bottom icon) or the right-click context menu.

The **Other** section includes:

- **What's New** — View recent updates and changes
- **Feedback** — Submit feedback about the application
- **Take a Screenshot** — Save the current map view as a PNG image
- **Map Legend** — Open the full legend for all visible layers
- **Help** — Open this help documentation
- **Terms and Conditions** — View the terms of use

---

## Map Legend

The legend displays the symbology for all currently visible layers, organized by layer group. Open it from the **More Menu → Map Legend** or from the **Layers settings** (gear icon → Open Legend).

The legend modal is print-friendly — use your browser's print function to generate a hard copy.

---

## Printing

Two print options are available under **Tools**:

### Print (Server-Side)

Generates a high-quality PDF or PNG using the print server. Configure the page size (Letter, Tabloid, etc.), orientation, map title, and resolution (DPI). An advanced option lets you force a specific scale.

### Print Local (Beta)

A client-side alternative that generates the print directly in your browser. Preview the output before downloading. Add optional decorations: scale bar, north arrow, and attribution text with configurable positioning.

---

## Drawing & Annotation

![Drawing Tools](images/help/drawing-tools.png)

The **My Maps** tab provides a full drawing toolkit:

### Drawing Tools

Select a shape from the toolbar — **Point**, **Line**, **Polygon**, **Circle**, **Rectangle**, **Arrow**, **Text**, **Callout**, or **Bearing** — then draw on the map. Hold **Shift** while drawing lines or polygons for freehand mode. Choose a draw colour from the colour palette before you begin.

### Managing Drawn Features

Each drawn feature appears in the items list. Click a feature's label to rename it. Use the options menu (three-dot icon) on any feature to:

- **Buffer** — Create a buffer zone around the feature
- **Symbolize** — Customize point size, stroke, fill colour, and opacity
- **Measure** — Calculate the feature's length or area
- **Zoom To** — Centre the map on the feature
- **Show Geometry** — View the feature's coordinates
- **Export** — Download as GeoJSON, KML, or EsriJSON
- **Identify** — Query layers at the feature's location
- **Delete** — Remove the feature

### Saving & Sharing

Use the **Advanced** panel to toggle vertex editing or translate/move mode. Save your drawings to the server for later retrieval using a unique My Maps ID, or export all features at once.

---

## Signing In

Click the **profile button** in the top-right corner of the header to sign in with your County of Simcoe account (Azure AD). Signing in unlocks additional tools and themes that are not available to public users.

When signed in, the profile dropdown shows your name, email, assigned roles, and application version.

---

## URL Sharing & Deep Linking

Share specific map views by adding parameters to the URL:

| Parameter | Example               | Description                                                          |
| --------- | --------------------- | -------------------------------------------------------------------- |
| `ARN`     | `?ARN=431001012345`   | Zoom to and show property info for a specific roll number            |
| `SEARCH`  | `?SEARCH=123+Main+St` | Auto-run a search on page load                                       |
| `TAB`     | `?TAB=tools`          | Open a specific sidebar tab (layers, tools, mymaps, themes, reports) |
| `THEME`   | `?THEME=Forestry`     | Activate a specific theme                                            |
| `MAP_ID`  | `?MAP_ID=5`           | Load a specific map configuration                                    |
| `MUNI`    | `?MUNI=Barrie`        | Filter searches to a specific municipality                           |
| `MYMAPS`  | `?MYMAPS=true`        | Open the My Maps tab on load                                         |

You can also share a direct link to a property using the **Share** button in the property popup.

---

## Developer Guide

### Setup

```bash
npm install
npm run dev
```

### Scripts

| Command              | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Start development server                              |
| `npm run build`      | Production build                                      |
| `npm start`          | Start production server                               |
| `npm run lint`       | Run ESLint                                            |
| `npm test`           | Run unit tests (Vitest + React Testing Library + MSW) |
| `npm run test:watch` | Run tests in watch mode                               |
| `npm run test:ui`    | Run tests with Vitest UI                              |
| `npm run e2e`        | Run Playwright E2E tests                              |

### Notes

- Tests run in JSDOM. Global setup is in `src/test/setup.ts` with MSW in `src/test/testServer.ts`.
- Path alias `@/*` is supported in tests via `vitest.config.ts`.
