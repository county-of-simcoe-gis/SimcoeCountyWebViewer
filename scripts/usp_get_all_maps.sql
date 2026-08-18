-- FUNCTION: public.usp_get_all_maps(boolean)

-- DROP FUNCTION IF EXISTS public.usp_get_all_maps(boolean);

CREATE OR REPLACE FUNCTION public.usp_get_all_maps(
	secured boolean)
    RETURNS TABLE(map_name character varying, description text, allowed_roles text, is_secured boolean, is_default boolean) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN

RETURN QUERY 
	SELECT map_settings.map_name,map_settings.description,  map_settings.allowed_roles, map_settings.is_secured, map_settings.is_default 
	FROM public.tbl_map_settings map_settings
	INNER JOIN public.tbl_map_settings_json map_json ON map_settings.id = map_json.parent_id
	WHERE map_json.active = TRUE 
	AND (map_settings.is_secured = secured)
	ORDER BY is_default desc, map_name;
END;

$BODY$;

ALTER FUNCTION public.usp_get_all_maps(boolean)
    OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.usp_get_all_maps(boolean) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.usp_get_all_maps(boolean) TO pg_read_all_data;

GRANT EXECUTE ON FUNCTION public.usp_get_all_maps(boolean) TO postgres;

