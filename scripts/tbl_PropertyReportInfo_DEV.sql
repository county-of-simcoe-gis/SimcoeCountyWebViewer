USE [TABULAR]
GO

/****** Object:  View [dbo].[view_PropertyReportInfo_DEV]    Script Date: 2025/10/20 9:55:23 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO








CREATE OR ALTER   VIEW [dbo].[view_PropertyReportInfo_DEV]
AS
SELECT
    Main.ARN,
    Main.AssessedValue,
    REPLACE(ISNULL(Main.REPORT_PUBLIC, ''), 'http:', 'https:') AS REPORT_PUBLIC,
    Main.REGULAR_COLLECTION_DAY,
    Main.REGULAR_COLLECTION_DAY AS GARBAGEDAY,
    Main.SCHOOL_CATHOLIC_ELEMENTARY,
    Main.SCHOOL_CATHOLIC_SECONDARY,
    Main.SCHOOL_PUBLIC_ELEMENTARY,
    Main.SCHOOL_PUBLIC_SECONDARY,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_PREFERED_KM END AS LANDFILL_PREFERED_KM,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_PREFERED_SITE_ID END AS LANDFILL_PREFERED_SITE_ID,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_CLOSEST_SITE_ID END AS LANDFILL_CLOSEST_SITE_ID,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_CLOSEST_NAME END AS LANDFILL_CLOSEST_NAME,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_CLOSEST_ADDRESS END AS LANDFILL_CLOSEST_ADDRESS,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_CLOSEST_KM END AS LANDFILL_CLOSEST_KM,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_CLOSEST_PIN END AS LANDFILL_CLOSEST_PIN,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_HAZARD_SITE_ID END AS LANDFILL_HAZARD_SITE_ID,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_HAZARD_NAME END AS LANDFILL_HAZARD_NAME,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_HAZARD_ADDRESS END AS LANDFILL_HAZARD_ADDRESS,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_HAZARD_KM END AS LANDFILL_HAZARD_KM,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.LANDFILL_HAZARD_PIN END AS LANDFILL_HAZARD_PIN,
    Main.POLICE_NAME,
    Main.POLICE_KM,
    Main.POLICE_ADDRESS,
    Main.POLICE_ARN,
    Main.FIREHALL_STATION_ID,
    Main.FIREHALL_KM,
    Main.FIREHALL_STATION_NAME,
    Main.FIREHALL_STATION_ADDRESS,
    Main.FIREHALL_ARN,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.FIRE_HYDRANT_KM END AS FIRE_HYDRANT_KM,
    Main.LIBRARY_NAME,
    Main.LIBRARY_ADDRESS,
    Main.LIBRARY_URL,
    Main.LIBRARY_KM,
    Main.LIBRARY_ARN,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG1_ID END AS BAG_TAG1_ID,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG1_NAME END AS BAG_TAG1_NAME,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG1_ADDRESS END AS BAG_TAG1_ADDRESS,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG1_KM END AS BAG_TAG1_KM,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG2_ID END AS BAG_TAG2_ID,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG2_NAME END AS BAG_TAG2_NAME,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG2_ADDRESS END AS BAG_TAG2_ADDRESS,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG2_KM END AS BAG_TAG2_KM,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG3_ID END AS BAG_TAG3_ID,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG3_NAME END AS BAG_TAG3_NAME,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG3_ADDRESS END AS BAG_TAG3_ADDRESS,
    CASE WHEN Main.ARN LIKE '4342%' THEN 'Please Contact City of Barrie'
         WHEN Main.ARN LIKE '4352%' THEN 'Please Contact City of Orillia'
         ELSE Main.BAG_TAG3_KM END AS BAG_TAG3_KM,
    Main.ADMIN_NAME,
    Main.ADMIN_KM,
    Main.ADMIN_ARN,
    Main.ADMIN_ADDRESS,
    Main.ADMIN_URL,
    Main.PropertyDescripter,
    Main.HOSPITAL_NAME,
    Main.HOSPITAL_ADDRESS,
    Main.HOSPITAL_URL,
    ISNULL(Main.UniqueMaps, 1) AS UniqueMaps,
    COALESCE(Main.MapsAddressID, Main.ADDRESSID) AS AddressID,
    ISNULL(Main.HasZoning, 0) AS HasZoning,
    Main.FullName,
    Main.StNum,
    Main.Muni
FROM dbo.tbl_PropertyReportInfo_DEV AS Main
WHERE Main.ARN IS NOT NULL AND Main.ARN <> ''
GO


