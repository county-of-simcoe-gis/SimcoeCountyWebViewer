import prisma from "@/lib/prisma";
import { Tbl211Raw, Tbl211FrenchRaw, Prisma } from "@prisma/client";

/**
 * Get distinct categories (group_name) from 211 database
 * @param isFrench - Whether to return French or English categories
 * @returns Array of category strings (group_name values)
 */
export async function getCategories(isFrench: boolean): Promise<string[]> {
  const categories = await prisma.tbl211Categories.findMany({
    where: {
      isFrench: isFrench,
    },
    select: {
      groupName: true,
    },
    distinct: ["groupName"],
    orderBy: {
      groupName: "asc",
    },
  });

  return categories.map((cat) => cat.groupName).filter((name): name is string => name !== null);
}

/**
 * Get sub-categories (general_heading) filtered by parent category (group_name)
 * @param category - Parent category (group_name) to filter by
 * @param isFrench - Whether to return French or English sub-categories
 * @returns Array of sub-category strings (general_heading values)
 */
export async function getSubCategories(category: string, isFrench: boolean): Promise<string[]> {
  const subCategories = await prisma.tbl211Categories.findMany({
    where: {
      groupName: {
        contains: category,
        mode: "insensitive",
      },
      isFrench: isFrench,
    },
    select: {
      generalHeading: true,
    },
    distinct: ["generalHeading"],
    orderBy: {
      generalHeading: "asc",
    },
  });

  return subCategories.map((subCat) => subCat.generalHeading).filter((name): name is string => name !== null);
}

/**
 * Get filtered 211 service entries
 * @param category - Category filter (group_name, use "All" for no filter)
 * @param subCategory - Sub-category filter (general_heading, use "All" for no filter)
 * @param age - Age category filter (use "All" for no filter)
 * @param isFrench - Whether to query French or English data
 * @returns Array of 211 service records
 */
export async function getResults(category: string, subCategory: string, age: string, isFrench: boolean): Promise<(Tbl211Raw | Tbl211FrenchRaw)[]> {
  // Convert "All" to empty string for wildcard matching
  const categoryFilter = category === "All" ? "" : category;
  const subCategoryFilter = subCategory === "All" ? "" : subCategory;
  const ageFilter = age === "All" ? "" : age;

  // Build where clause for case-insensitive contains filtering
  const andConditions: Prisma.Tbl211RawWhereInput[] = [
    // Only show records with valid coordinates
    {
      latitude: {
        not: "",
      },
    },
    // Exclude records marked as "Do Not Map"
    {
      mapRecord: {
        not: "Do Not Map",
      },
    },
  ];

  // Always apply these filters to match the old SQL behavior where `ilike '%' || $1 || '%'`
  // was always present. When the filter is empty, this acts as `ilike '%%'` which matches
  // all non-null values — correctly excluding records with NULL in these columns.
  // cwdSimcategoryHeadinggroups contains group_name values (semicolon-delimited)
  andConditions.push({
    cwdSimcategoryHeadinggroups: {
      contains: categoryFilter,
      mode: "insensitive",
    },
  });

  // cwdSimcategoryHeadings contains general_heading values (semicolon-delimited)
  andConditions.push({
    cwdSimcategoryHeadings: {
      contains: subCategoryFilter,
      mode: "insensitive",
    },
  });

  andConditions.push({
    ageCategory: {
      contains: ageFilter,
      mode: "insensitive",
    },
  });

  const whereClause = {
    AND: andConditions,
  };

  // Use separate calls for each table to avoid TypeScript union issues
  if (isFrench) {
    return prisma.tbl211FrenchRaw.findMany({
      where: whereClause as Prisma.Tbl211FrenchRawWhereInput,
    });
  }

  return prisma.tbl211Raw.findMany({
    where: whereClause,
  });
}
