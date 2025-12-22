// In a real application, this service would connect to a Bible API 
// or a local database to fetch verse texts based on a reference.

/**
 * Retrieves the text of a Bible verse.
 * @param verseReference The reference of the verse to retrieve (e.g., "Salmos 23:1").
 * @returns The verse text as a string, or null if not found.
 */
export async function getVerse(verseReference: string): Promise<string | null> {
    try {
        const response = await fetch(`https://bible-api.com/${verseReference}?translation=rvr1960`);
        if (!response.ok) {
            console.error("Bible API error:", response.status, response.statusText);
            return `No se pudo encontrar el versículo: ${verseReference}`;
        }
        const data = await response.json();
        return data.text.trim();
    } catch (error) {
        console.error("Error fetching verse:", error);
        return `Error al buscar el versículo: ${verseReference}.`;
    }
}
