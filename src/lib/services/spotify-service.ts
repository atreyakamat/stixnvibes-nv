const MOCK_TRACKS: Record<string, { title: string; artist: string; album: string; coverUrl: string }> = {
  "4cOdK2wGLETKBW3PvgPWqT": {
    title: "Starboy",
    artist: "The Weeknd, Daft Punk",
    album: "Starboy",
    coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop",
  },
  "0VjdiWvhSt8WwStMfaSu8b": {
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop",
  },
  "7qiZ22zxs8N9JhGZ220k40": {
    title: "Shape of You",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop",
  },
};

function parseTrackId(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  const matchUrl = clean.match(/track\/([a-zA-Z0-9]{22})/);
  if (matchUrl) return matchUrl[1];
  const matchUri = clean.match(/spotify:track:([a-zA-Z0-9]{22})/);
  if (matchUri) return matchUri[1];
  if (/^[a-zA-Z0-9]{22}$/.test(clean)) return clean;
  return null;
}

export class SpotifyService {
  async getTrackMetadata(urlOrId: string) {
    const trackId = parseTrackId(urlOrId);
    if (!trackId) {
      throw new Error("Invalid Spotify track URL or ID format");
    }

    const known = MOCK_TRACKS[trackId];
    const track = {
      id: trackId,
      title: known?.title ?? "Custom Vibe Track",
      artist: known?.artist ?? "Stix N Vibes Artist",
      album: known?.album ?? "Special Edition Album",
      coverUrl: known?.coverUrl ?? "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop",
      spotifyUrl: `https://open.spotify.com/track/${trackId}`,
      durationMs: 214000,
      formattedDuration: "03:34",
    };

    return { track };
  }
}
