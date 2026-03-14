import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

import { RouteMode } from "@framework/types";
import type { IFindRoutesDto } from "@framework/types";

const ROUTE_MODES = Object.values(RouteMode) as [RouteMode, ...RouteMode[]];

export class FindRoutesDto implements IFindRoutesDto {
  @ApiPropertyOptional({ enum: RouteMode, description: "Filter routes by mode" })
  @IsOptional()
  @IsIn(ROUTE_MODES)
  routeMode?: RouteMode;
}
