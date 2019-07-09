# Simcoe County OpenLayers Map Viewer

## Live beta site can be found [here](https://opengis.simcoe.ca/public)

The goal of this project is to replace [this viewer](https://maps.simcoe.ca/public) using an open source environment. The existing viewer is built using the ESRI 3.x JS api/DOJO with the Web App Builder and ArcGIS Server.

This app is built using React, OpenLayers and GeoServer. Many components are configurable to point to your own WMS/WFS, XYZ services. Some components use a custom rest api, such as the search and property report.

**GeoServer Server Rest API end points need to be enabled for this app to work!**

It's built using a framework to easily create your own tools and themes (instructions below) using the provided templates. Control what layers, tools and themes are loaded using the config at the root of the src folder.

The Table of Contents (layers tab) utilizes groups in GeoServer.

Heads up. This project is <b>not</b> complete and missing many components but the "core" framework and design is in place. New functionality will be posted to the beta site above.

Contributions are welcome. Even if you only clone it and add tools to your own project, please share them back and I'll integrate them if useful.

This app works in conjunction with these supporting projects.

1. [WebApi](https://github.com/county-of-simcoe-gis/SimcoeCountyWebApi)
2. [Feedback](https://github.com/county-of-simcoe-gis/SimcoeCountyFeedback)
3. [GeoServerLayerInfo](https://github.com/county-of-simcoe-gis/SimcoeCountyGeoServerLayerInfo)

![](demo.gif)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

```
Node JS
```

### Installing

```
In the src directory, type `npm install` in the terminal.<br>
In the src directory, type `npm start` in the terminal.
```

## Deployment

In the project diretory, type `npm run build` in the terminal. Details can be found with [Create React App](https://github.com/facebook/create-react-app)

## To create a new tool

1. Create new directory for tool in 'src/sidebar/components/tools/yourToolName'
2. Copy template files into the previous directory from 'src/componentTemplate/ToolComponent.jsx' and 'src/componentTemplate/toolComponent.css
3. Rename the files to your component name (case sentive)
4. Add tool to the main config in 'src/config.json'. Copy existing tool text in the config, for an example.

## To create a new theme

1. Create new directory for theme in 'src/sidebar/components/theme/yourThemeName'
2. Copy template files into the previous directory from 'src/componentTemplate/ThemeComponent.jsx' and 'src/componentTemplate/themeComponent.css
3. Rename the files to your component name (case sentive)
4. Add theme to the main config in 'src/config.json'. Copy existing theme text in the config, for an example.

## Built With

- [React](https://reactjs.org/) - The web framework used
- [OpenLayers](https://openlayers.org/) - Mapping framework
- [GeoServer](http://geoserver.org/) - Backend Map Server

## Authors

- **Al Proulx** - _Initial work_ - [Al Proulx](https://github.com/iquitwow)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
