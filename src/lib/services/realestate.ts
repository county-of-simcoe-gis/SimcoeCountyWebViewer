/**
 * Real Estate Service
 * Fetches listing images from Bridge Interactive API (MLS)
 */

interface BridgeMedia {
  Order: number;
  MediaURL: string;
}

interface BridgeListingValue {
  City?: string;
  UnparsedAddress?: string;
  Media?: BridgeMedia[];
}

interface BridgeApiResponse {
  value?: BridgeListingValue[];
}

export interface ListingImage {
  order: number;
  url: string;
}

/**
 * Fetch listing images from Bridge Interactive API by listing ID
 * @param listingId - The MLS listing ID
 * @returns Array of listing images with order and URL
 */
export async function getListingImages(listingId: string): Promise<ListingImage[]> {
  const bridgeApiUrl = process.env.BRIDGE_API_URL;
  const bridgeApiKey = process.env.BRIDGE_API_KEY;

  if (!bridgeApiUrl || !bridgeApiKey) {
    console.error("BRIDGE_API_URL or BRIDGE_API_KEY environment variables are not set");
    return [];
  }

  const url = `${bridgeApiUrl}?$filter=ListingId eq '${listingId}'&$select=City,Media,UnparsedAddress&access_token=${bridgeApiKey}`;

  const response = await fetch(url);
  const data: BridgeApiResponse = await response.json();

  if (data.value && data.value.length > 0) {
    const images: ListingImage[] = [];
    data.value.forEach((item) => {
      if (item.Media) {
        item.Media.forEach((media) => {
          images.push({ order: media.Order, url: media.MediaURL });
        });
      }
    });
    return images;
  }

  return [];
}
