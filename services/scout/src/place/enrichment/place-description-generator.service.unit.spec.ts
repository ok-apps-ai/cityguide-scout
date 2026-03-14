import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { PlaceDescriptionGeneratorService } from "./place-description-generator.service";

const mockInvoke = jest.fn();

jest.mock("@langchain/openai", () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: mockInvoke,
  })),
}));

describe("PlaceDescriptionGeneratorService", () => {
  let service: PlaceDescriptionGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({})],
      providers: [PlaceDescriptionGeneratorService],
    }).compile();

    service = module.get(PlaceDescriptionGeneratorService);
    mockInvoke.mockReset();
  });

  it("returns null when OPENAI_API_KEY is missing", async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({})],
      providers: [PlaceDescriptionGeneratorService],
    })
      .overrideProvider(ConfigService)
      .useValue({ get: (key: string, def?: string) => (key === "OPENAI_API_KEY" ? "" : (def ?? "")) })
      .compile();

    const svc = module.get(PlaceDescriptionGeneratorService);
    const result = await svc.generate("Marbella, Spain", "Puerto Banús");

    expect(result).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("returns generated description with Role, Context, Task, Desired output in prompt", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mockInvoke.mockResolvedValue({ content: "A vibrant marina with luxury yachts and waterfront dining." });

    const result = await service.generate("Marbella, Spain", "Puerto Banús Marina");

    expect(result).toEqual("A vibrant marina with luxury yachts and waterfront dining.");
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const prompt = mockInvoke.mock.calls[0][0] as string;
    expect(prompt).toContain("## Role");
    expect(prompt).toContain("## Context");
    expect(prompt).toContain("Location: Marbella, Spain");
    expect(prompt).toContain("Place: Puerto Banús Marina");
    expect(prompt).toContain("## Task");
    expect(prompt).toContain("## Desired output");
  });

  it("returns null when response content is empty", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mockInvoke.mockResolvedValue({ content: "" });

    const result = await service.generate("Rome", "Colosseum");

    expect(result).toBeNull();
  });

  it("returns null and logs on error", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mockInvoke.mockRejectedValue(new Error("API error"));

    const result = await service.generate("Paris", "Eiffel Tower");

    expect(result).toBeNull();
  });
});
