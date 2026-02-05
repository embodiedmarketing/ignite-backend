import axios from "axios";
import { env } from "../config/env";
export async function getVimeoTranscript(
  videoUrl: string,
  vimeoAccessToken?: string
): Promise<string> {
  try {
    const token = vimeoAccessToken || env.VIMEO_ACCESS_TOKEN;
    
    if (!token) {
      throw new Error("Vimeo access token is required.");
    }

    let videoId: string;
    const urlMatch = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (urlMatch) {
      videoId = urlMatch[1];
    } else {
      videoId = videoUrl.split("/").pop()?.split("?")[0] || "";
      if (!videoId || isNaN(Number(videoId))) {
        throw new Error("Invalid Vimeo URL.");
      }
    }

    const response = await axios.get(
      `https://api.vimeo.com/videos/${videoId}/texttracks`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const tracks = response.data.data;
    const transcriptTrack = tracks.find((t: any) => t.language === "en") || tracks[0];

    if (!transcriptTrack || !transcriptTrack.link) {
      throw new Error("No transcript track link found.");
    }

    const vttResponse = await axios.get(transcriptTrack.link);
    const vttData = vttResponse.data;

    const lines = vttData.split(/\r?\n/);
    const transcriptLines: string[] = [];
    let currentTimestamp = "";
    let currentText = "";

    for (let line of lines) {
      line = line.trim();

      const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2})\.\d{3} -->/);
      
      if (timestampMatch) {
        if (currentTimestamp && currentText) {
          transcriptLines.push(`[${currentTimestamp}] ${currentText.trim()}`);
          currentText = ""; 
        }
        currentTimestamp = timestampMatch[1];
      } else if (
        line !== "" && 
        !line.includes("WEBVTT") && 
        !line.match(/^\d+$/)
      ) {
        currentText += (currentText ? " " : "") + line;
      }
    }

    if (currentTimestamp && currentText) {
      transcriptLines.push(`[${currentTimestamp}] ${currentText.trim()}`);
    }
    return transcriptLines.join("\n");

  } catch (error: any) {
    console.error("Error extracting Vimeo transcript:", error.message);
    throw new Error(`Failed to extract transcript: ${error.message}`);
  }
}