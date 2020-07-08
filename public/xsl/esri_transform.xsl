<?xml version="1.0" encoding="ISO-8859-1"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:esri_wms="http://www.esri.com/wms" xmlns="http://www.esri.com/wms">  
  <xsl:output 
    method="text" 
    indent="yes" 
    encoding="ISO-8859-1"/>     
  
  <xsl:template match="/">{  
  "type": "FeatureCollection",
  "features": [<xsl:for-each select="esri_wms:FeatureInfoResponse/esri_wms:FeatureInfoCollection/esri_wms:FeatureInfo">
    {
      "type": "Feature",
      "properties": 
        {<xsl:for-each select="esri_wms:Field">                  
          "<xsl:value-of select="esri_wms:FieldName"/>":"<xsl:value-of select="esri_wms:FieldValue"/>"<xsl:if test="position() != last()"><xsl:text>,</xsl:text></xsl:if></xsl:for-each>
        },
      "layerName":"<xsl:value-of select="../@layername"/>"  
    }<xsl:if test="position() != last()"><xsl:text>,</xsl:text></xsl:if></xsl:for-each>
  ]
}
  </xsl:template>
</xsl:stylesheet>