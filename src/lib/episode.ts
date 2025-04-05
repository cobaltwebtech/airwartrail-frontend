import { getCollection } from "astro:content";

/**
 * Retrieves episodes from the collection, filtering out drafts and sorting by date
 * @param max Optional maximum number of episodes to return
 * @returns Sorted array of episodes
 */
export const getEpisodes = async (max?: number) => {
  try {
    const episodes = await getCollection("episodes");

    // Ensure we have valid episodes
    if (!episodes || episodes.length === 0) {
      return [];
    }

    // Sort and return
    const sortedEpisodes = episodes.sort(
      (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
    );

    return max ? sortedEpisodes.slice(0, max) : sortedEpisodes;
  } catch (error) {
    console.error("Error in getEpisodes:", error);
    return [];
  }
};

/**
 * Retrieves all episodes including drafts
 * @param max Optional maximum number of episodes to return
 * @returns Sorted array of all episodes
 */
export const getAllEpisodes = async (max?: number) => {
  return (await getCollection("episodes"))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, max);
};
