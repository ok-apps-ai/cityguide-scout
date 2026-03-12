import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { ns } from "../common/constants";
import { RouteEntity } from "./route.entity";
import { PlaceEntity } from "../place/place.entity";

@Entity({ name: "route_stops", schema: ns })
export class RouteStopEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  routeId: string;

  @ManyToOne(() => RouteEntity, route => route.stops, { onDelete: "CASCADE" })
  @JoinColumn({ name: "route_id" })
  route: RouteEntity;

  @Column({ type: "uuid" })
  placeId: string;

  @ManyToOne(() => PlaceEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "place_id" })
  place: PlaceEntity;

  @Column({ type: "int" })
  orderIndex: number;

  @Column({ type: "int", nullable: true })
  visitDurationMinutes: number | null;
}
