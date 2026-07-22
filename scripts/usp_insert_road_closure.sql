USE [TABULAR]
GO

-- Create table for road closures if it does not exist
IF OBJECT_ID('dbo.tbl_road_closures', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_road_closures (
        id INT IDENTITY(1,1) PRIMARY KEY,
        closure_id NVARCHAR(250) NULL,
        street_name NVARCHAR(500) NOT NULL,
        direction NVARCHAR(50) NULL,
        reason NVARCHAR(500) NULL,
        lane_impacted NVARCHAR(250) NULL,
        access_allowed NVARCHAR(250) NULL,
        description NVARCHAR(MAX) NULL,
        start_time DATETIMEOFFSET NULL,
        end_time DATETIMEOFFSET NULL,
        alternate_route NVARCHAR(1000) NULL,
        contact_name NVARCHAR(250) NULL,
        contact_email NVARCHAR(500) NULL,
            feature_geojson NVARCHAR(MAX) NULL,
        created_by NVARCHAR(500) NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIMEOFFSET NULL
    );
END
GO

-- Add type + type-specific columns (Blocks/Closures/Detours) if this script previously ran
-- against an older version of the table.
IF COL_LENGTH('dbo.tbl_road_closures', 'closure_type') IS NULL
    ALTER TABLE dbo.tbl_road_closures ADD closure_type NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.tbl_road_closures', 'block_id') IS NULL
    ALTER TABLE dbo.tbl_road_closures ADD block_id NVARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.tbl_road_closures', 'detour_id') IS NULL
    ALTER TABLE dbo.tbl_road_closures ADD detour_id NVARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.tbl_road_closures', 'url') IS NULL
    ALTER TABLE dbo.tbl_road_closures ADD url NVARCHAR(1000) NULL;
GO

IF COL_LENGTH('dbo.tbl_road_closures', 'active_incident') IS NULL
    ALTER TABLE dbo.tbl_road_closures ADD active_incident NVARCHAR(5) NULL;
GO

IF COL_LENGTH('dbo.tbl_road_closures', 'street_override') IS NULL
    ALTER TABLE dbo.tbl_road_closures ADD street_override NVARCHAR(5) NULL DEFAULT 'Yes';
GO

IF COL_LENGTH('dbo.tbl_road_closures', 'contact_phone') IS NULL
    ALTER TABLE dbo.tbl_road_closures ADD contact_phone NVARCHAR(15) NULL;
GO

-- Stored procedure to insert a road closure and return the new id
CREATE OR ALTER PROCEDURE dbo.usp_insert_road_closure
    @closureId NVARCHAR(250) = NULL,
    @streetName NVARCHAR(500),
    @direction NVARCHAR(50) = NULL,
    @reason NVARCHAR(500) = NULL,
    @laneImpacted NVARCHAR(250) = NULL,
    @accessAllowed NVARCHAR(250) = NULL,
    @description NVARCHAR(MAX) = NULL,
    @startTime DATETIMEOFFSET = NULL,
    @endTime DATETIMEOFFSET = NULL,
    @alternateRoute NVARCHAR(1000) = NULL,
    @contactName NVARCHAR(250) = NULL,
    @contactEmail NVARCHAR(500) = NULL,
    @featureGeoJSON NVARCHAR(MAX) = NULL,
    @createdBy NVARCHAR(500) = NULL,
    @closureType NVARCHAR(20) = NULL,
    @blockId NVARCHAR(50) = NULL,
    @detourId NVARCHAR(50) = NULL,
    @url NVARCHAR(1000) = NULL,
    @activeIncident NVARCHAR(5) = NULL,
    @streetOverride NVARCHAR(5) = NULL,
    @contactPhone NVARCHAR(15) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.tbl_road_closures
        (closure_id, street_name, direction, reason, lane_impacted, access_allowed, description, start_time, end_time, alternate_route, contact_name, contact_email, feature_geojson, created_by, created_at,
         closure_type, block_id, detour_id, url, active_incident, street_override, contact_phone)
    VALUES
        (@closureId, @streetName, @direction, @reason, @laneImpacted, @accessAllowed, @description, @startTime, @endTime, @alternateRoute, @contactName, @contactEmail, @featureGeoJSON, @createdBy, SYSUTCDATETIME(),
         @closureType, @blockId, @detourId, @url, @activeIncident, @streetOverride, @contactPhone);

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
END
GO

