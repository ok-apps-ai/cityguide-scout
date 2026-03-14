import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsLatitude,
  IsLongitude,
  ValidateNested,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { Type } from "class-transformer";

import type { ILatLng, ICreateCityDto } from "@framework/types";

class LatLngDto implements ILatLng {
  @ApiProperty({ example: 50.59, description: "Latitude (-90 to 90)" })
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 30.83, description: "Longitude (-180 to 180)" })
  @IsLongitude()
  lng: number;
}

@ValidatorConstraint({ name: "isBoundingBox", async: false })
class IsBoundingBoxConstraint implements ValidatorConstraintInterface {
  public validate(_: unknown, args: ValidationArguments): boolean {
    const dto = args.object as CreateCityDto;
    if (!dto.northeast || !dto.southwest) {
      return false;
    }
    return dto.northeast.lat > dto.southwest.lat && dto.northeast.lng > dto.southwest.lng;
  }

  public defaultMessage(): string {
    return "northeast.lat must be greater than southwest.lat and northeast.lng must be greater than southwest.lng";
  }
}

export class CreateCityDto implements ICreateCityDto {
  @ApiProperty({ example: "Kyiv, Ukraine" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: () => LatLngDto, description: "North-east corner of the bounding box" })
  @ValidateNested()
  @Validate(IsBoundingBoxConstraint)
  @Type(() => LatLngDto)
  northeast: LatLngDto;

  @ApiProperty({ type: () => LatLngDto, description: "South-west corner of the bounding box" })
  @ValidateNested()
  @Type(() => LatLngDto)
  southwest: LatLngDto;
}
