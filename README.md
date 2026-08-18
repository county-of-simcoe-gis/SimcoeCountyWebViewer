# County of Simcoe Interactive Map

An interactive web mapping application for exploring geographic data, property information, and community services across Simcoe County.

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
- [Attribute Table](#attribute-table)
- [Property Information](#property-information)
- [Right-Click Context Menu](#right-click-context-menu)
- [More Menu](#more-menu)
- [Map Legend](#map-legend)
- [Printing](#printing)
- [Drawing & Annotation](#drawing--annotation)
- [Signing In](#signing-in)
- [URL Sharing & Deep Linking](#url-sharing--deep-linking)
- [Developer Guide](#developer-guide)
- [Revision History](#revision-history)

---

## Getting Started

When the application loads, the map opens to Simcoe County using the default topographic basemap. The main interface consists of:

- **Header bar** with the search box, logo, and profile button
- **Sidebar** for Layers, Tools, My Maps, Themes, and Reports
- **Map area** with navigation controls, a share button, and the basemap switcher
- **Slim sidebar** icons along the left edge when the full sidebar is collapsed

Click the **☰ hamburger menu** in the top-left corner, or use a slim sidebar icon, to open the main sidebar.

---

## Searching

![Search Bar](images/documentation/search-bar-expanded.png)

The search bar supports both live map content and service-backed searches. Depending on the current configuration, available search types can include:

- **Address** searches
- **Parcel** searches by Assessment Roll Number (ARN)
- **Map Layer** searches
- **Tool** searches
- **Theme** searches
- **Road Segment** searches
- **Open Street Map** searches

Use the filter dropdown at the left side of the search box to limit results to a single type, or leave it on **All** to search across everything at once.

Useful behavior:

- Start typing at least 2 characters to see results.
- Matching tools, themes, and layers can appear immediately from local app data.
- The last 6 searches are stored and shown when the search box receives focus.
- Selecting a result zooms the map and, where applicable, opens the matching layer, tool, theme, or location.

---

## Map Navigation

![Map Controls](images/documentation/map-controls.png)

| Action                  | Desktop                                       | Mobile         |
| ----------------------- | --------------------------------------------- | -------------- |
| Pan                     | Click and drag                                | Touch and drag |
| Zoom in or out          | Mouse wheel or **+/−** buttons                | Pinch to zoom  |
| Zoom to full extent     | Click the home or extent button               | Same           |
| Previous or next extent | Use the back and forward extent buttons       | Same           |
| Current location        | Click the GPS button to zoom to your location | Same           |
| Reset rotation          | Click the rotation reset control when visible | Same           |
| Full screen             | Click the full-screen toggle                  | Same           |
| Share current view      | Click the share button to copy a deep link    | Same           |

Additional controls such as the coordinate grid, scale display, and scale selector can be turned on or off from **Tools → Settings**.

---

## Basemap Switcher

![Basemap Switcher](images/documentation/basemap-switcher.gif)

The basemap switcher is located in the **bottom-right corner** of the map.

### Topographic Basemaps

- **Topographic** — Default county topographic view with Canadian styling
- **Light Grey** — Minimal light-grey base for thematic overlays
- **Streets** — Street-focused dark basemap
- **LIO Topographic** — Ontario LIO cartographic tiles
- **Open Street Map** — Standard OSM tiles

### Imagery

Switch to the **Imagery** view to browse aerial photography. A year slider lets you move through imagery from **1954 to 2025** plus current world imagery.

Use the **Streets Overlay** checkbox to show street labels on top of imagery.

---

## Sidebar

The sidebar contains five main tabs. You can open them from the full sidebar or from the slim icon bar when the sidebar is collapsed.

### Layers

![Layers Panel](images/documentation/toc-view-layer-options.gif)

The Layers tab, also called the Table of Contents, controls the map layers that are currently available.

- Search layers by name.
- Toggle layer visibility with the checkbox beside each layer.
- Expand a layer to view its inline legend.
- Use the layer menu to access **Layer Info**, **Zoom to Layer**, **Download**, **Attribute Table**, **Opacity**, and **Remove Layer** when available.
- Adjust per-layer opacity directly in the layer list.
- Open the settings menu to switch between **List** and **Folder** view, sort alphabetically, adjust global opacity, save or reset layer state, and open the full legend.

### Tools

The Tools tab contains the current tools available in the application:

| Tool                                | Description                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Measure**                         | Measure distance, area, circles, rectangles, and compass bearings in multiple units.                   |
| **Coordinates**                     | Read live coordinates from the map and zoom to entered coordinates in multiple coordinate systems.     |
| **Print**                           | Create a server-side PDF or image print of the current map.                                            |
| **Add Data**                        | Add your own GeoJSON, KML, GPX, Shapefile, or CSV files, or connect to WMS, WFS, and ArcGIS services.  |
| **Lot and Concession**              | Search parcels by township, lot, and concession.                                                       |
| **External Services (Street View)** | Open links to Google Maps, Google Street View, Bing Maps, and related services for a clicked location. |
| **Weather**                         | View Environment Canada radar and forecast information.                                                |
| **Settings**                        | Control visible map widgets and manage locally stored application data.                                |
| **Available Maps**                  | Browse and switch to other map configurations made available in the application.                       |

### My Maps

![My Maps Panel](images/documentation/my-maps-drawing-demo.gif)

My Maps is the application's drawing and annotation workspace. Use it to sketch map notes, highlight areas, drop markers, and export your work. See [Drawing & Annotation](#drawing-annotation) for the full workflow.

### Themes

Themes are pre-configured map experiences focused on specific topics. Activating a theme can turn on related layers and open theme-specific content.

Current themes include:

- **Solid Waste Facilities** — Waste facilities and bag tag purchase locations
- **Forestry** — County forests, recreation features, and related park information
- **Child Care Facilities** — Licensed child care providers and related information
- **Immigration Services** — Newcomer and settlement resources
- **211 Community Services** — Community support services across Simcoe County
- **511 Live Feeds** — Live traffic-related feeds from MTO and Waze

### Reports

The Reports tab collects results from **Identify**, property reports, and other query-driven panels. Use the back and forward buttons at the top of the tab to move through recent report history.

---

## Attribute Table

![Attribute Table](images/documentation/attribute-table-demo.gif)

The Attribute Table opens as a docked panel along the bottom of the map for layers that support tabular inspection.

You can typically open it from a layer's options menu. Once open, it supports:

- Multiple open layer tabs
- Row highlighting and map-linked selection
- Zooming the map to selected rows or visible results
- Selection, invert selection, and clear selection actions
- Filter clearing and map-based selection tools
- CSV export for selected records
- Minimize, restore, resize, or close the table panel

This is useful when you need to inspect or export feature data without leaving the map.

---

## Property Information

![Property Popup](images/documentation/parcel-click-popup.png)

Click a parcel, when zoomed in far enough, to open the quick property popup. Depending on the property and available data, it can include:

- Address and Assessment Roll Number (ARN)
- Assessed value
- Waste collection day
- Broadband coverage details
- Quick actions such as **Add to My Maps**, **Share**, and **Terms**

Click **More Information** to open the full property report in the Reports tab. Full reports can include emergency services, waste details, nearby schools, the nearest fire hydrant, hospital information, and other property-related details.

For condominium properties, a record selector lets you choose the specific unit to inspect.

---

## Right-Click Context Menu

![Context Menu](images/documentation/right-click-menu.png)

Right-click on the map to open the context menu.

| Option                     | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| **Switch To Basic**        | Collapse the sidebar for a minimal map view.                               |
| **Property Report**        | Open a property report for the clicked parcel or location.                 |
| **Add Marker Point**       | Drop a marker and send it to My Maps.                                      |
| **Report a Problem**       | Open the feedback flow for the clicked location.                           |
| **Identify**               | Query visible layers at the clicked point and send the results to Reports. |
| **Save as Default Extent** | Save the current map extent as your default starting view.                 |
| **More...**                | Open the More Menu.                                                        |

---

## More Menu

![More Menu](images/documentation/more-menu.png)

Open the More Menu from the slim sidebar's bottom button or from the right-click context menu.

The menu provides quick access to:

- **Take a Screenshot** — Save the current map view as a PNG image
- **Themes** — Open a theme directly
- **Tools** — Open a tool directly
- **What's New** — Open the current release notes page when configured
- **Feedback** — Open the feedback form when configured
- **Map Legend** — Open the full legend modal
- **Help** — Open this help documentation
- **Terms and Conditions** — Open the terms of use page when configured

---

## Map Legend

The legend displays symbology for the currently visible layers, organized by layer group.

You can open it from either of these paths:

- **More Menu → Map Legend**
- **Layers → Settings → Open Legend**

The legend modal is print-friendly, so you can use your browser's print tools for a hard copy if needed.

---

## Printing

Generate a server-side PDF or image output of the current map view. Options include page size, orientation, title, resolution, and advanced scale control.

---

## Drawing & Annotation

![Drawing Tools](images/documentation/mymaps-feature-menu.png)
The **My Maps** tab provides drawing and annotation workflow.

### Drawing Tools

Choose a shape from the toolbar and draw directly on the map:

- **Point**
- **Line**
- **Polygon**
- **Circle**
- **Rectangle**
- **Arrow**
- **Text**
- **Callout**
- **Bearing**

Hold **Shift** while drawing lines or polygons to switch into freehand mode. Choose a draw colour before starting when you want a consistent symbol style.

### Managing Drawn Features

Each feature appears in the My Maps item list. You can rename items and open a feature menu with actions such as:

- **Buffer**
- **Symbolize**
- **Measure**
- **Zoom To**
- **Show Geometry**
- **Export** as GeoJSON, KML, or EsriJSON
- **Identify**
- **Delete**

### Advanced Editing

Use the **Advanced** panel to turn on vertex editing or translate and move mode. You can also export all My Maps features together when you want to keep a copy of your work.

---

## Signing In

Use the profile button in the top-right corner to sign in with a County of Simcoe account through Azure AD.

---

## URL Sharing & Deep Linking

Use the **Share map** control in the map toolbar to copy a URL that preserves the current map state, including map center, zoom, visible layers, active theme or tool, basemap selection, and map configuration when available.

You can also build links manually with query parameters.

| Parameter                      | Example                                                  | Description                                                                     |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `ARN`                          | `?ARN=431001012345`                                      | Zoom to and show property information for a specific roll number.               |
| `TAB`                          | `?TAB=tools`                                             | Open a sidebar tab such as `layers`, `tools`, `mymaps`, `themes`, or `reports`. |
| `TOOL`                         | `?TOOL=Measure`                                          | Open a tool directly.                                                           |
| `THEME`                        | `?THEME=Forestry`                                        | Activate a theme directly.                                                      |
| `MUNI`                         | `?MUNI=Barrie`                                           | Limit search behavior to a municipality.                                        |
| `Q`                            | `?Q=123+Main+St`                                         | Supply a search query.                                                          |
| `QT`                           | `?Q=123+Main+St&QT=Address`                              | Set the search type for the query.                                              |
| `X`, `Y`                       | `?X=-8895000&Y=5532000`                                  | Center the map on specific coordinates.                                         |
| `ZOOM`                         | `?X=-8895000&Y=5532000&ZOOM=12`                          | Set the initial zoom level.                                                     |
| `XMIN`, `YMIN`, `XMAX`, `YMAX` | `?XMIN=-8900000&YMIN=5525000&XMAX=-8890000&YMAX=5535000` | Open the map to a specific extent instead of a center point.                    |
| `SR`                           | `?X=-8895000&Y=5532000&SR=3857`                          | Define the spatial reference used by coordinate parameters.                     |
| `LAYERS`                       | `?LAYERS=Assessment Parcels,Roads`                       | Turn on specific layers by name.                                                |
| `TOCTYPE`                      | `?TOCTYPE=FOLDER`                                        | Set the Layers tab to `LIST` or `FOLDER` mode.                                  |
| `GROUP`                        | `?TOCTYPE=LIST&GROUP=Property`                           | Activate a specific layer group.                                                |
| `EXPAND_LEGEND`                | `?LAYERS=Assessment Parcels&EXPAND_LEGEND=true`          | Expand legends for matching layers on load.                                     |
| `BASEMAP`                      | `?BASEMAP=topo`                                          | Set the basemap mode, such as `topo` or `imagery`.                              |
| `NAME`                         | `?BASEMAP=topo&NAME=Light+Grey`                          | Choose a named basemap within the active basemap mode.                          |
| `SLIDER_OPEN`                  | `?BASEMAP=imagery&SLIDER_OPEN=true`                      | Open the imagery year slider when the map loads.                                |

The property popup's **Share** button can also generate a direct property link.

---

## Developer Guide

### Setup

```bash
npm install
npm run dev
```

### Scripts

| Command              | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `npm run dev`        | Start the development server.                               |
| `npm run build`      | Create a production build.                                  |
| `npm start`          | Start the production server.                                |
| `npm run lint`       | Run ESLint.                                                 |
| `npm test`           | Run unit tests with Vitest, React Testing Library, and MSW. |
| `npm run test:watch` | Run unit tests in watch mode.                               |
| `npm run test:ui`    | Run tests with the Vitest UI.                               |
| `npm run e2e`        | Run Playwright end-to-end tests.                            |

### Notes

- Tests run in JSDOM.
- Global test setup lives in `src/test/setup.ts` with MSW support in `src/test/testServer.ts`.
- The `@/*` path alias is available in both the app and tests.

---

## Revision History

### v2.0.0 (2026-07-07)

Major upgrade from the legacy viewer to the Next.js platform.

- Delivered a fully upgraded [Attribute Table](#attribute-table) experience with multi-layer tabs, map-linked row selection, better filtering workflows, and CSV export support.
- Added stronger Attribute Table data handling across service types, including both WFS and ArcGIS-backed layers where configured.
- Introduced a **unified map interaction and popup handler** so click results and popup behavior are more consistent across identify, parcel, and tool-driven map interactions. ![Map Click Results](images/documentation/map-results-popup.gif)
- Expanded right-click and map action workflows, including cleaner handoff from context actions to Reports and My Maps.
- Improved **URL sharing and deep linking** so shared links more reliably restore map extent, visible layers, basemap, and active app context. ![Share Map](images/documentation/share-map.gif)
- Enhanced mobile and tablet workflows with responsive layouts and touch-friendly behavior for side panels and map-first tasks.
- Expanded core map workflow coverage with modern automated testing to improve release stability across tools, layers, and reporting flows.
- Modernized the application foundation to support continued feature growth across the viewer, tools, themes, and reporting experiences.
- Added **dark mode** and user theme preference toggle ![Dark Mode](images/documentation/dark-mode.gif)
