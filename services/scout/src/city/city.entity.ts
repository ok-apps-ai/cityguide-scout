import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ns } from "../common/constants";

@Entity({ name: "cities", schema: ns })
export class CityEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "geometry", spatialFeatureType: "Polygon", srid: 4326 })
  boundary: string;

  @CreateDateColumn()
  createdAt: Date;
}
