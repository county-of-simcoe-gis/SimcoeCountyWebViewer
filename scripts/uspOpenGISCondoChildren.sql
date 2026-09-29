USE [TABULAR]
GO

/****** Object:  StoredProcedure [dbo].[uspOpenGISCondoChildren]    Script Date: 2025/10/20 9:12:57 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO




CREATE OR ALTER       PROCEDURE [dbo].[uspOpenGISCondoChildren]
	@condoArn nvarchar(250),
	@locations nvarchar(500)
AS
BEGIN
	SET NOCOUNT ON
	


	SELECT        main.ARN, case when main.UnitNumber is not null then main.UnitNumber else main.[Location] end UnitNumber
	FROM            OASYS.dbo.view_CondoOasysPrimary AS main LEFT OUTER JOIN
								tbl_PartnerLookup AS LU ON LEFT(main.ARN, 4) = LU.MuniCode
	WHERE        (main.CondoARN = @condoArn) AND (LU.FriendlyName IN
									(SELECT value
									FROM STRING_SPLIT(@locations, ','))) OR
								(main.CondoARN = @condoArn) AND (@locations LIKE '%COUNTY OF SIMCOE%')
	ORDER BY main.ARN, main.UnitNumber


END
GO


