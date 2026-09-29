import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export async function AuthorizeUser(groups: string[]) {
  const allowedGroups: string[] = [];  
  const allowedLocations: string[] = [];  
  const appId = process.env.AZURE_AD_CLIENT_ID;
  try {
    const result = await prisma.$queryRaw`
    SELECT * FROM public.usp_get_security_roles(${process.env.AZURE_AD_TENANT_ID}, ${appId})
  `;
    (result as Array<{ azure_ad_group_id: string; azure_ad_app_id: string; name: string }>)?.forEach((record) => {
      if (groups.includes(record.azure_ad_group_id)) {
        if (record.azure_ad_app_id) allowedGroups.push(record.name);
        else allowedLocations.push(record.name);
      }
    });
    return { roles: [...new Set(allowedGroups)], locations: [...new Set(allowedLocations)] };
  } catch (error) {
    console.log(error);
    return { roles: [], locations: [] };
  }
}
export async function GetAllRoles() {
  const locations: string[] = [];  
  const roles: string[] = [];  
  const appId = process.env.AZURE_AD_CLIENT_ID;
  try {
    const result = await prisma.$queryRaw`
    SELECT DISTINCT name, azure_ad_app_id FROM public.usp_get_security_roles(${process.env.AZURE_AD_TENANT_ID}, ${appId}) ORDER BY name
  `;
    (result as Array<{ name: string; azure_ad_app_id: string }>)?.forEach((record) => {
      if (record.azure_ad_app_id) {
        roles.push(record.name);
      } else {
        locations.push(record.name);
      }
    });
    return { roles: roles, locations: locations };
  } catch (error) {
    console.log(error);
    return { roles: [], locations: [] };
  }
}
