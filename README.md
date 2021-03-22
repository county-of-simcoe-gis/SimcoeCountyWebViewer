# Simcoe County OpenLayers Map Viewer

## Live site can be found [here](https://opengis.simcoe.ca/public)

Please visit our release page for stable downloads. [Releases](https://github.com/county-of-simcoe-gis/SimcoeCountyWebViewer/releases)

This site has officially went live as a production release on Mar 22nd, 2021.

This app is built using React, OpenLayers and GeoServer. Many components are configurable to point to your own WMS/WFS, XYZ services. Some components use a custom rest api, such as the search and property report.

It's built using a framework to easily create your own tools and themes (instructions below) using the provided templates. Control what layers, tools and themes are loaded using the config at the root of the src folder.

The Table of Contents (layers tab) utilizes groups in GeoServer.

Contributions are welcome. Even if you only clone it and add tools to your own project, please share them back and I'll integrate them if useful.

For a list of projects that support this site please visit our main page.
[SimcoeCountyGIS](https://github.com/county-of-simcoe-gis)

![](demo.gif)

## Getting Started

We've built a deployment doc to help setup our solution. [Deployment Doc here](https://github.com/county-of-simcoe-gis/SimcoeCountyDeploymentGuide)

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

```
Node JS
```

### Installing

```
git clone https://github.com/county-of-simcoe-gis/SimcoeCountyWebViewer.git
cd SimcoeCountyWebViewer
npm install
npm start
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
- **Tom Reed** - Joined the team in 2021 - [Tom Reed](https://github.com/reed-tom)

## Contributors

- MTO - Various Enhancements - [Nedim Oren](https://github.com/oren-ned)
- Spatial DNA - Print Tool - [Spatial DNA](https://github.com/SpatialDNA)
- Kristie Hu - Immigration Services Theme - [Kristie Hu](https://github.com/Kristiehu)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
