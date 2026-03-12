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

import { ns } from "../common/constants";
import { CityEntity } from "../city/city.entity";

export enum PlaceCategory {
  MUSEUM = "museum",
  TOURIST_ATTRACTION = "tourist_attraction",
  PARK = "park",
  SHOPPING_MALL = "shopping_mall",
  STORE = "store",
  POINT_OF_INTEREST = "point_of_interest",
  CHURCH = "church",
  PLACE_OF_WORSHIP = "place_of_worship",
  NATURAL_FEATURE = "natural_feature",
  ART_GALLERY = "art_gallery",
  AMUSEMENT_PARK = "amusement_park",
  HIKING_AREA = "hiking_area",
  STREET = "route",
  SQUARE = "plaza",
  VIEWPOINT = "scenic_spot",
  MONUMENT = "monument",
}

export enum PlaceSource {
  GOOGLE = "google",
  OSM = "osm",
}

/** Matches Google Places API price_level: 0=free, 1=inexpensive, 2=moderate, 3=expensive, 4=very_expensive */
export enum PriceLevel {
  FREE = "free",
  INEXPENSIVE = "inexpensive",
  MODERATE = "moderate",
  EXPENSIVE = "expensive",
  VERY_EXPENSIVE = "very_expensive",
}

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
  mediaUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
