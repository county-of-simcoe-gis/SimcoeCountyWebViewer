USE [TABULAR]
GO

/****** Object:  StoredProcedure [dbo].[usp_PBI_add_report_parameter]    Script Date: 2026/09/28 2:12:28 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- =============================================
-- Author:		Tom Reed
-- Create date: 2023-07-24 08:47
-- Description:	Accepts report parameters and optionally a batchId and returns BatchID
-- =============================================
CREATE OR ALTER     PROCEDURE [dbo].[usp_PBI_add_report_parameter]
	(
	@report  nvarchar(50),
	@name  nvarchar(50),
	@value  nvarchar(max),
	@type  nvarchar(50),
	@batchId  uniqueidentifier = null
	)

AS
BEGIN

	SET NOCOUNT ON;
	IF @batchId IS NULL
		SET @batchId = newid();

	INSERT INTO PBI_Report_Parameters (parameter_name, parameter_value, parameter_type, report, batch_id)
		VALUES ( @name, @value, @type,@report, @batchId );
	SELECT @batchId AS BatchID;

END
GO


