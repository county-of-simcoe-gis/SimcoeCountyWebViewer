-- FUNCTION: public.usp_get_security_roles(character varying, character varying)

-- DROP FUNCTION IF EXISTS public.usp_get_security_roles(character varying, character varying);

CREATE OR REPLACE FUNCTION public.usp_get_security_roles(
	tenant character varying,
	appid character varying)
    RETURNS TABLE(name character varying, azure_ad_group_id character varying, azure_ad_app_id character varying) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN

RETURN QUERY SELECT
	security_groups."name", security_groups.azure_ad_group_id,security_groups.azure_app_id
	FROM public.tbl_security_roles security_groups
	WHERE security_groups.azure_tenant_id = tenant and (security_groups.azure_app_id = appId or security_groups.azure_app_id is null);
END; 
$BODY$;

ALTER FUNCTION public.usp_get_security_roles(character varying, character varying)
    OWNER TO postgres;
