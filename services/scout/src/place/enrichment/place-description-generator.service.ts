import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";

@Injectable()
export class PlaceDescriptionGeneratorService {
  private readonly logger = new Logger(PlaceDescriptionGeneratorService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates a tourist-friendly description for a place using OpenAI.
   * Returns null when OPENAI_API_KEY is missing or on error.
   */
  public async generate(location: string, placeName: string): Promise<string | null> {
    const apiKey = this.configService.get<string>("OPENAI_API_KEY", "");
    if (!apiKey) return null;

    try {
      const model = new ChatOpenAI({
        openAIApiKey: apiKey,
        model: "gpt-4o-mini",
        temperature: 0,
      });

      const prompt = `## Role
You are a tourist guide writer.

## Context
Location: ${location}
Place: ${placeName}

## Task
Write a brief, tourist-friendly description (2–3 sentences) for this place. Focus on what makes it interesting for visitors.

## Desired output
A single paragraph description suitable for a route stop. No bullet points or headers.`;

      const response = await model.invoke(prompt);
      const raw = response.content;
      const content = typeof raw === "string" ? raw.trim() : "";
      return content.length > 0 ? content : null;
    } catch (err) {
      this.logger.warn(`Failed to generate description for ${placeName}: ${err}`);
      return null;
    }
  }
}
