-- FUNCTION: public.usp_get_map_settings(character varying, character varying, boolean)

-- DROP FUNCTION IF EXISTS public.usp_get_map_settings(character varying, character varying, boolean);

CREATE OR REPLACE FUNCTION public.usp_get_map_settings(
	current_map_name character varying,
	version_id character varying,
	secured boolean)
    RETURNS TABLE(json text, allowed_roles text, is_secured boolean, published boolean) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
IF version_id is null THEN
BEGIN
RETURN QUERY 
	select public.tbl_map_settings_json.json,  public.tbl_map_settings.allowed_roles, public.tbl_map_settings.is_secured,public.tbl_map_settings_json.active 
	from public.tbl_map_settings 
	INNER JOIN public.tbl_map_settings_json ON public.tbl_map_settings.id = public.tbl_map_settings_json.parent_id
	where public.tbl_map_settings_json.active = true 
		and (public.tbl_map_settings.map_name = current_map_name OR (current_map_name is null and public.tbl_map_settings.is_default = true))
		and (public.tbl_map_settings.is_secured = secured OR secured=true);
END;
ELSE
BEGIN
RETURN QUERY 
	select public.tbl_map_settings_json.json,  public.tbl_map_settings.allowed_roles,public.tbl_map_settings.is_secured,public.tbl_map_settings_json.active
	from public.tbl_map_settings 
	INNER JOIN public.tbl_map_settings_json ON public.tbl_map_settings.id = public.tbl_map_settings_json.parent_id
	where public.tbl_map_settings_json.id::character varying = version_id 
		and (public.tbl_map_settings.map_name = current_map_name OR (current_map_name is null and public.tbl_map_settings.is_default = true))
		and (public.tbl_map_settings.is_secured = secured OR secured=true);
END;
END IF;
END; 
$BODY$;

ALTER FUNCTION public.usp_get_map_settings(character varying, character varying, boolean)
    OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.usp_get_map_settings(character varying, character varying, boolean) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.usp_get_map_settings(character varying, character varying, boolean) TO pg_read_all_data;

GRANT EXECUTE ON FUNCTION public.usp_get_map_settings(character varying, character varying, boolean) TO postgres;

