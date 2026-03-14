import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import type { IRouteOptions } from "@framework/types";
import { PriceLevel, RouteMode, RouteTheme } from "@framework/types";

import { ns } from "../common/constants";
import { CityEntity } from "../city/city.entity";
import { PlaceEntity } from "../place/place.entity";
import { RouteStopEntity } from "./route-stop.entity";

@Entity({ name: "routes", schema: ns })
export class RouteEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  cityId: string;

  @ManyToOne(() => CityEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "city_id" })
  city: CityEntity;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "enum", enum: RouteTheme })
  theme: RouteTheme;

  @Column({ type: "enum", enum: RouteMode, default: RouteMode.WALKING })
  routeMode: RouteMode;

  @Column({ type: "int" })
  durationMinutes: number;

  @Column({ type: "decimal", precision: 6, scale: 2 })
  distanceKm: number;

  @Column({ type: "enum", enum: PriceLevel })
  priceLevel: PriceLevel;

  @Column({ type: "uuid", nullable: true })
  startPlaceId: string | null;

  @ManyToOne(() => PlaceEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "start_place_id" })
  startPlace: PlaceEntity | null;

  @Column({ type: "geometry", spatialFeatureType: "LineString", srid: 4326 })
  routeGeometry: string;

  @Column({ type: "jsonb" })
  generationOptions: IRouteOptions | Record<string, never>;

  @OneToMany(() => RouteStopEntity, stop => stop.route, { cascade: true })
  stops: RouteStopEntity[];

  @CreateDateColumn()
  createdAt: Date;
}
