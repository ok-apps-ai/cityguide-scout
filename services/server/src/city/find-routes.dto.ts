import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

const ROUTE_MODES = ["walking", "cycling", "driving"] as const;

export class FindRoutesDto {
  @ApiPropertyOptional({ enum: ROUTE_MODES, description: "Filter routes by mode" })
  @IsOptional()
  @IsIn(ROUTE_MODES)
  routeMode?: (typeof ROUTE_MODES)[number];
}
