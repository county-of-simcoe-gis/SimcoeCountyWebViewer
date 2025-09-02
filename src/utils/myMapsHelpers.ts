/**
 * Utility functions for MyMaps functionality
 */

import { Style, Fill, Stroke, Circle as CircleStyle, Text, RegularShape } from 'ol/style'
import { Feature } from 'ol'
import { Point, LineString, Polygon, Circle } from 'ol/geom'
import { fromCircle } from 'ol/geom/Polygon'
import { getLength, getArea } from 'ol/sphere'
import GeoJSON from 'ol/format/GeoJSON'
import KML from 'ol/format/KML'
import EsriJSON from 'ol/format/EsriJSON'
import type { 
  MyMapsItem, 
  FeatureStyleOptions,
  ValidationResult,
  StyleJSON
} from '@/types/myMaps'

// Generate unique identifier
export const generateUID = (): string => {
  return 'mymaps_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// Convert degrees to radians
export const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}

// Convert radians to degrees
export const radiansToDegrees = (radians: number): number => {
  return radians * (180 / Math.PI)
}

// Calculate bearing between two points
export const calculateBearing = (coord1: number[], coord2: number[]): number => {
  const dLon = coord2[0] - coord1[0]
  const y = Math.sin(dLon) * Math.cos(coord2[1])
  const x = Math.cos(coord1[1]) * Math.sin(coord2[1]) - 
            Math.sin(coord1[1]) * Math.cos(coord2[1]) * Math.cos(dLon)
  
  const bearing = Math.atan2(y, x)
  return ((radiansToDegrees(bearing) + 360) % 360)
}

// Format length output
export const formatLength = (line: LineString): string => {
  const length = getLength(line)
  let output: string
  
  if (length > 1000) {
    output = Math.round((length / 1000) * 100) / 100 + ' km'
  } else {
    output = Math.round(length * 100) / 100 + ' m'
  }
  
  return output
}

// Format area output
export const formatArea = (polygon: Polygon): string => {
  const area = getArea(polygon)
  let output: string
  
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + ' km²'
  } else {
    output = Math.round(area * 100) / 100 + ' m²'
  }
  
  return output
}

// Create default drawing style
export const createDefaultDrawStyle = (options: FeatureStyleOptions = {}): Style => {
  const {
    drawColor = '#e809e5',
    strokeWidth = 2,
    fillOpacity = 0.3,
    strokeOpacity = 0.8,
    pointRadius = 8,
    isText = false,
    geometryType = 'Point'
  } = options

  const fillColor = `${drawColor}${Math.round(fillOpacity * 255).toString(16).padStart(2, '0')}`
  const strokeColor = `${drawColor}${Math.round(strokeOpacity * 255).toString(16).padStart(2, '0')}`

  const styleConfig: {
    fill?: Fill
    stroke?: Stroke
    image?: CircleStyle
    text?: Text
  } = {
    fill: new Fill({
      color: fillColor
    }),
    stroke: new Stroke({
      color: strokeColor,
      width: strokeWidth
    })
  }

  // Add point style for points and text
  if (geometryType === 'Point' || isText) {
    styleConfig.image = new CircleStyle({
      radius: pointRadius,
      fill: new Fill({
        color: fillColor
      }),
      stroke: new Stroke({
        color: strokeColor,
        width: strokeWidth
      })
    })
  }

  // Add text style for text features
  if (isText) {
    styleConfig.text = new Text({
      text: 'Text',
      font: '12px Arial',
      fill: new Fill({
        color: drawColor
      }),
      stroke: new Stroke({
        color: '#ffffff',
        width: 2
      })
    })
  }

  return new Style(styleConfig)
}

// Convert OpenLayers style to JSON representation
export const styleToJSON = (style: Style): StyleJSON => {
  if (!style) return {} as StyleJSON

  const styleObj: Partial<StyleJSON> = {}
  
  const fill = style.getFill()
  if (fill) {
    const color = fill.getColor()
    if (color) {
      styleObj.fill = {
        color: typeof color === 'string' ? color : (color as number[])
      }
    }
  }

  const stroke = style.getStroke()
  if (stroke) {
    const color = stroke.getColor()
    if (color) {
      styleObj.stroke = {
        color: typeof color === 'string' ? color : (color as number[]),
        width: stroke.getWidth()
      }
    }
  }

  const image = style.getImage()
  if (image instanceof CircleStyle) {
    const imageFill = image.getFill()
    const imageStroke = image.getStroke()
    
    styleObj.image = {
      type: 'circle' as const,
      radius: image.getRadius(),
      fill: imageFill ? { color: imageFill.getColor() as string } : undefined,
      stroke: imageStroke ? { 
        color: imageStroke.getColor() as string, 
        width: imageStroke.getWidth() 
      } : undefined
    }
  } else if (image instanceof RegularShape) {
    const imageFill = image.getFill()
    const imageStroke = image.getStroke()
    
    styleObj.image = {
      type: 'regularShape' as const,
      radius: image.getRadius(),
      radius2: image.getRadius2(),
      points: image.getPoints(),
      angle: image.getAngle(),
      fill: imageFill ? { color: imageFill.getColor() as string } : undefined,
      stroke: imageStroke ? { 
        color: imageStroke.getColor() as string, 
        width: imageStroke.getWidth() 
      } : undefined
    }
  }

  const text = style.getText()
  if (text) {
    const textFill = text.getFill()
    const textStroke = text.getStroke()
    
    const textContent = text.getText()
    const textString = Array.isArray(textContent) ? textContent.join(' ') : (textContent || '')
    
    styleObj.text = {
      text: textString,
      font: text.getFont(),
      fill: textFill ? { 
        color: typeof textFill.getColor() === 'string' ? textFill.getColor() as string : (textFill.getColor() as number[])
      } : undefined,
      stroke: textStroke ? {
        color: typeof textStroke.getColor() === 'string' ? textStroke.getColor() as string : (textStroke.getColor() as number[]),
        width: textStroke.getWidth()
      } : undefined
    }
  }

  return styleObj as StyleJSON
}

// Convert JSON representation back to OpenLayers style
export const styleFromJSON = (styleJSON: StyleJSON): Style => {
  if (!styleJSON) return new Style()

  const styleConfig: {
    fill?: Fill
    stroke?: Stroke
    image?: CircleStyle
    text?: Text
  } = {}

  if (styleJSON.fill) {
    styleConfig.fill = new Fill({
      color: styleJSON.fill.color
    })
  }

  if (styleJSON.stroke) {
    styleConfig.stroke = new Stroke({
      color: styleJSON.stroke.color,
      width: styleJSON.stroke.width
    })
  }

  if (styleJSON.image) {
    if (styleJSON.image.type === 'circle') {
      const imageConfig: {
        radius: number
        fill?: Fill
        stroke?: Stroke
      } = {
        radius: styleJSON.image.radius || 8
      }
      
      if (styleJSON.image.fill) {
        imageConfig.fill = new Fill({
          color: styleJSON.image.fill.color
        })
      }
      
      if (styleJSON.image.stroke) {
        imageConfig.stroke = new Stroke({
          color: styleJSON.image.stroke.color,
          width: styleJSON.image.stroke.width
        })
      }
      
      styleConfig.image = new CircleStyle(imageConfig)
    } else if (styleJSON.image.type === 'regularShape') {
      const regularShapeConfig: {
        points: number
        radius: number
        radius2?: number
        angle?: number
        fill?: Fill
        stroke?: Stroke
      } = {
        points: styleJSON.image.points || 4,
        radius: styleJSON.image.radius || 8,
        radius2: styleJSON.image.radius2,
        angle: styleJSON.image.angle || 0
      }
      
      if (styleJSON.image.fill) {
        regularShapeConfig.fill = new Fill({
          color: styleJSON.image.fill.color
        })
      }
      
      if (styleJSON.image.stroke) {
        regularShapeConfig.stroke = new Stroke({
          color: styleJSON.image.stroke.color,
          width: styleJSON.image.stroke.width
        })
      }
      
      styleConfig.image = new RegularShape(regularShapeConfig)
    }
  }

  if (styleJSON.text) {
    const textConfig: {
      text: string
      font?: string
      fill?: Fill
      stroke?: Stroke
    } = {
      text: styleJSON.text.text,
      font: styleJSON.text.font
    }
    
    if (styleJSON.text.fill) {
      textConfig.fill = new Fill({
        color: styleJSON.text.fill.color
      })
    }
    
    if (styleJSON.text.stroke) {
      textConfig.stroke = new Stroke({
        color: styleJSON.text.stroke.color,
        width: styleJSON.text.stroke.width
      })
    }
    
    styleConfig.text = new Text(textConfig)
  }

  return new Style(styleConfig)
}

// Convert feature to GeoJSON string
export const featureToGeoJSON = (feature: Feature): string => {
  const geoJSONFormat = new GeoJSON({
    dataProjection: 'EPSG:3857',
    featureProjection: 'EPSG:3857'
  })
  
  return geoJSONFormat.writeFeature(feature, {
    dataProjection: 'EPSG:3857',
    featureProjection: 'EPSG:3857'
  })
}

// Convert GeoJSON string to feature
export const featureFromGeoJSON = (geoJSONString: string): Feature => {
  const geoJSONFormat = new GeoJSON({
    dataProjection: 'EPSG:3857',
    featureProjection: 'EPSG:3857'
  })
  
  const result = geoJSONFormat.readFeature(geoJSONString, {
    dataProjection: 'EPSG:3857',
    featureProjection: 'EPSG:3857'
  })
  
  // readFeature can return Feature | Feature[], ensure we get a Feature
  return Array.isArray(result) ? result[0] : result
}

// Convert circle to polygon (for GeoJSON compatibility)
export const convertCircleToPolygon = (feature: Feature): Feature => {
  const geometry = feature.getGeometry()
  
  if (geometry instanceof Circle) {
    const polygon = fromCircle(geometry, 64) // 64 sides for smooth circle
    const newFeature = feature.clone()
    newFeature.setGeometry(polygon)
    return newFeature
  }
  
  return feature
}

// Create arrow geometry from LineString
export const createArrowFromLine = (lineGeometry: LineString): Polygon => {
  const coords = lineGeometry.getCoordinates()
  if (coords.length < 2) throw new Error('Line must have at least 2 coordinates')
  
  const start = coords[0]
  const end = coords[coords.length - 1]
  
  // Calculate arrow head
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0])
  const arrowLength = 20
  const arrowAngle = Math.PI / 6 // 30 degrees
  
  const arrowHead1 = [
    end[0] - arrowLength * Math.cos(angle - arrowAngle),
    end[1] - arrowLength * Math.sin(angle - arrowAngle)
  ]
  
  const arrowHead2 = [
    end[0] - arrowLength * Math.cos(angle + arrowAngle),
    end[1] - arrowLength * Math.sin(angle + arrowAngle)
  ]
  
  // Create polygon for arrow
  const arrowCoords = [
    ...coords,
    arrowHead1,
    end,
    arrowHead2,
    end,
    coords[0] // Close the polygon
  ]
  
  return new Polygon([arrowCoords])
}

// Validate MyMaps item
export const validateMyMapsItem = (item: Partial<MyMapsItem>): ValidationResult => {
  const errors: string[] = []
  
  if (!item.id) errors.push('ID is required')
  if (!item.label || typeof item.label !== 'string') errors.push('Label must be a non-empty string')
  if (!item.featureGeoJSON) errors.push('Feature GeoJSON is required')
  if (!item.drawType) errors.push('Draw type is required')
  if (!item.geometryType) errors.push('Geometry type is required')
  if (typeof item.visible !== 'boolean') errors.push('Visible must be a boolean')
  if (typeof item.labelVisible !== 'boolean') errors.push('Label visible must be a boolean')
  if (typeof item.labelRotation !== 'number') errors.push('Label rotation must be a number')
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Export features to different formats
export const exportFeatures = (features: Feature[], format: 'geojson' | 'kml' | 'esrijson'): string => {
  switch (format) {
    case 'geojson': {
      const geoJSONFormat = new GeoJSON()
      return geoJSONFormat.writeFeatures(features)
    }
    case 'kml': {
      const kmlFormat = new KML()
      return kmlFormat.writeFeatures(features)
    }
    case 'esrijson': {
      const esriFormat = new EsriJSON()
      return esriFormat.writeFeatures(features)
    }
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

// Get geometry center for popup positioning  
export const getGeometryCenter = (geometry: Point | LineString | Polygon | Circle): number[] => {
  if (geometry instanceof Point) {
    return geometry.getCoordinates()
  } else if (geometry instanceof LineString) {
    const coords = geometry.getCoordinates()
    const midIndex = Math.floor(coords.length / 2)
    return coords[midIndex]
  } else if (geometry instanceof Polygon || geometry instanceof Circle) {
    return geometry.getExtent() ? [
      (geometry.getExtent()[0] + geometry.getExtent()[2]) / 2,
      (geometry.getExtent()[1] + geometry.getExtent()[3]) / 2
    ] : [0, 0]
  }
  
  return [0, 0]
}

// Generate file download
export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain'): void => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

// Copy to clipboard utility
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.width = '2em'
    textArea.style.height = '2em'
    textArea.style.padding = '0'
    textArea.style.border = 'none'
    textArea.style.outline = 'none'
    textArea.style.boxShadow = 'none'
    textArea.style.background = 'transparent'
    
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      document.body.removeChild(textArea)
      return false
    }
  }
}

// Debounce function for performance
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}
