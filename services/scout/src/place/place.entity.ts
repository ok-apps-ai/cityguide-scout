import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { PlaceCategory, PlaceSource, PriceLevel } from "@framework/types";

import { ns } from "../common/constants";
import { CityEntity } from "../city/city.entity";

export { PlaceCategory, PlaceSource, PriceLevel };

@Entity({ name: "places", schema: ns })
export class PlaceEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  cityId: string;

  @ManyToOne(() => CityEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "city_id" })
  city: CityEntity;

  @Column({ type: "varchar", length: 512 })
  name: string;

  @Index({ spatial: true })
  @Column({ type: "geometry", srid: 4326 })
  geom: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: true })
  googlePlaceId: string | null;

  @Column({ type: "enum", enum: PlaceSource })
  source: PlaceSource;

  @Column({ type: "varchar", length: 64, nullable: true })
  osmId: string | null;

  @Column({ type: "enum", enum: PlaceCategory })
  category: PlaceCategory;

  @Column("text", { array: true, default: () => "'{}'" })
  types: string[];

  @Column({ type: "decimal", precision: 3, scale: 1, nullable: true })
  rating: number | null;

  @Column({ type: "int", nullable: true })
  reviewCount: number | null;

  @Column({ type: "enum", enum: PriceLevel, nullable: true })
  priceLevel: PriceLevel | null;

  @Column({ type: "int", nullable: true })
  visitDurationMinutes: number | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "text", nullable: true })
  photoName: string | null;

  @Column({ type: "text", nullable: true })
  mediaUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
