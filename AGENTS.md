# AGENTS

This file captures project conventions and workflows for humans and AI agents.

## Repo layout
- `services/server`: NestJS API. used for testing purposes and acts as gateway to scout microservice
- `services/scout`: NestJS API with Typeorm. makes request to google places and open street map to collect data about tourists attractions in the city and build route

## Setup

Install dependencies:
```
npm install
```

### Running tests

Start test databases before running tests:
```
docker compose up -d
```

## Tooling
- Node.js >= 24 (`.nvmrc`).
- npm workspaces from repo root.

## React style
- Follow existing formatting: 2-space indentation, semicolons, double quotes.
- Keep imports grouped by external packages then internal modules.
- DTO and React props should be passed as a single variable, then spread on the first line inside the function.
  - Example (DTO): `create(dto: CreateAssetDto) { const { title, description } = dto; ... }`
  - Example (props): `export const Button = (props: IButtonProps) => { const { text, isLoading } = props; ... }`
- Function components only.
- Props interfaces use `I<ComponentName>Props`.
- Components export prop types.
- MUI styled API is common; styled components live in `styled.ts` next to the component.

## NestJS style
- Modules typically include `*.module.ts`, `*.service.ts`, `*.controller.ts`, and `*.entity.ts` files (see `services/server/src/marketplace/showroom`).
- Services are the single point for actions on a model and are used by controllers.
- Inject repositories with `@InjectRepository(Entity)` in services.
- Always add `Logger` to new modules, even if the module is empty.
- Variables holding DB entities use the `Entity` suffix (e.g., `merchantEntity`).
- Variables holding DB repositories use the `EntityRepository` suffix (e.g., `merchantEntityRepository`).

## Scout module structure

Scout modules follow a consistent layout. Use this structure when creating or refactoring modules.

### Folder layout

- **`types/`** — One interface per file, re-exported from `types/index.ts`
- **`dto/`** — One DTO per file, re-exported from `dto/index.ts`
- **Subfolders** — Split by responsibility (e.g. `fetcher/` and `places/` for collector sources)

### Collector modules (Google, OSM)

Data-source modules (Google Places, OSM) use two subfolders:

- **`fetcher/`** — HTTP client, API calls, fetcher-specific types
- **`places/`** — Collection orchestration, mapping to place model, constants

```
collector/google/
├── fetcher/
│   ├── fetcher.module.ts
│   ├── fetcher.service.ts
│   └── types/
│       ├── index.ts
│       └── *.interface.ts
├── places/
│   ├── places.module.ts
│   ├── places.service.ts
│   └── ...
├── google.module.ts
└── index.ts
```

### Types and DTOs

- **Types:** One interface per file (e.g. `nearby-place.interface.ts` → `INearbyPlace`)
- **DTOs:** One DTO or interface per file in `dto/` (e.g. `generate-routes-body.dto.ts`)
- **Re-exports:** Each `types/` and `dto/` folder has an `index.ts` that re-exports all

### Imports

Import from the barrel files:

```ts
import { INearbyPlace, IFetcherOptions } from "./types";
import { IGenerateRoutesBody } from "./dto";
```

## Build and development
- Root build command: `npm run build` (builds shared packages).

## Migrations

### File naming

- One migration file per logical change (one table, one type set, one index group). Never combine unrelated tables in one file.
- File names follow the pattern `<timestamp>-<PascalCaseName>.ts`, e.g. `1773218686204-CreateCitiesTable.ts`.
- Timestamps must be real Unix milliseconds (`Date.now()`). When creating several migrations at once, space them at least 5 000 ms apart so ordering is unambiguous:
  ```bash
  node -e "const t = Date.now(); for (let i = 0; i < 5; i++) console.log(t + i * 5000)"
  ```
- The class name must embed the same timestamp: `CreateCitiesTable1773218686204`.

### Required order for a fresh schema

1. `CreateSchema` — creates the PostgreSQL schema.
2. `CreatePostgisExtension` — enables the PostGIS extension.
3. One file per table, in dependency order (referenced tables before referencing tables).

### Schema migration

Import `ns` from `src/common/constants` and call TypeORM helpers directly — no factory functions:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";
import { ns } from "../common/constants";

export class CreateSchema1773218676204 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createSchema(ns, true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropSchema(ns);
  }
}
```

### Table / type migrations

- Always prefix table and type names with `${ns}.` using a template literal — never hardcode the schema name.
- Never quote plain identifiers (column names, constraint names, index names). Only quote reserved words if absolutely necessary.
- Column-level types that live in the schema (enums) are also prefixed: `${ns}.price_level_enum`.

```ts
import { MigrationInterface, QueryRunner } from "typeorm";
import { ns } from "../common/constants";

export class CreateCitiesTable1773218686204 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ${ns}.cities (
        id         UUID NOT NULL DEFAULT gen_random_uuid(),
        name       VARCHAR(255) NOT NULL,
        boundary   GEOMETRY(POLYGON, 4326) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_cities PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX cities_boundary_idx ON ${ns}.cities USING GIST (boundary)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX ${ns}.cities_boundary_idx`);
    await queryRunner.query(`DROP TABLE ${ns}.cities`);
  }
}
```

### Registering migrations

Import each class into `database.config.ts` and add it to the `migrations` array in timestamp order:

```ts
import { ns } from "../../common/constants";
import { CreateSchema1773218676204 } from "../../migrations/1773218676204-CreateSchema";
// ...

const config: PostgresConnectionOptions = {
  migrationsTableName: ns,
  migrations: [
    CreateSchema1773218676204,
    CreatePostgisExtension1773218681204,
    CreateCitiesTable1773218686204,
    // ...
  ],
};
```

### Inline SQL in services

Use the same `${ns}.` template-literal prefix in any raw SQL written inside services or nodes — never hardcode the schema string:

```ts
import { ns } from "../common/constants";

await this.cityEntityRepository.query(
  `SELECT id::text, name FROM ${ns}.cities ORDER BY created_at ASC`,
);
```

### Updating existing databases after a refactor

When migration files are renamed or split, update the migrations tracking table in every affected database to replace old records with the new ones:

```sql
DELETE FROM scout WHERE name = 'OldMigrationName';
INSERT INTO scout (timestamp, name) VALUES (1773218686204, 'CreateCitiesTable1773218686204');
```


## Tests
- Backend tests use Jest with `*.spec.ts` (see `services/server`).
- Seeding in tests uses seed module/service; this is an exception to the single service point rule for model actions.
- Run server tests: `npm run --prefix ./services/scout test`
- Run scout e2e tests: `npm run --prefix ./services/scout test:e2e`
- **Route e2e test** (`route.e2e.spec.ts`) uses backup data. Restore the backup to `scout-test` first:
  ```bash
  npm run --prefix ./services/scout db:restore-test
  ```

### Scout development database

To drop and recreate both `scout-development` and `scout-test`, apply migrations, and add Marbella (triggers POI collection + route generation):

1. Start server and scout (required for API):
   ```bash
   npm run --prefix ./services/server dev   # port 3001
   npm run --prefix ./services/scout dev   # port 3010
   ```
2. Run drop-and-create (adds Marbella via `POST /cities` if API is reachable):
   ```bash
   npm run --prefix ./services/scout db:drop-and-create
   ```
   If the API was not reachable, add Marbella manually after servers are up:
   ```bash
   npm run --prefix ./services/scout db:add-marbella
   ```

To reset `scout-development` from a backup and trigger routes:

1. Clean and restore latest backup:
   ```bash
   npm run --prefix ./services/scout db:reset-dev
   ```
2. Start server and scout, then trigger route generation:
   ```bash
   npm run --prefix ./services/scout db:trigger-routes
   ```
   Or for any city: `curl -X POST http://localhost:3001/cities/{cityId}/generate-routes`


### E2E test structure

Follow this pattern when writing e2e tests:

1. **`describe`** — Declare `let` variables at this level when tests share seed data.
   ```ts
   let cityEntity: CityEntity;
   let collected: IUpsertPlacePayload[];
   ```

2. **`beforeAll`** — Create the NestJS testing module. No JWT or authentication setup is required for service-level tests.
   ```ts
   beforeAll(async () => {
     testModule = await Test.createTestingModule({
       imports: [ConfigModule.forRoot({ envFilePath: `.env.test` }), TypeOrmModule.forRoot({...}), CitySeedModule],
       providers: [MyService],
     }).compile();

     service = testModule.get(MyService);
     citySeedService = testModule.get(CitySeedService);
     cityEntityRepository = testModule.get<Repository<CityEntity>>(getRepositoryToken(CityEntity));
   });
   ```

3. **`beforeEach`** — Reset state and seed data using the seed service.
   ```ts
   beforeEach(async () => {
     collected = [];
     cityEntity = await citySeedService.seedCity();
   });
   ```

4. **`it`** — Use seed service methods for entity creation. Pass assertion-relevant values (names, IDs) as overrides; keep internal values inside helpers.
    - **(a) Per-test seed** — Pass overrides directly in the `it`:
   ```ts
   it('should find city by name', async () => {
     const testCityName = 'Vatican City';
     cityEntity = await citySeedService.seedCity({ name: testCityName });
     expect(cityEntity.name).toEqual(testCityName);
   });
   ```
    - **(b) Shared seed in `beforeEach`** — declare at `describe` level, seed in `beforeEach`:
   ```ts
   let cityEntity: CityEntity;
   beforeEach(async () => {
     cityEntity = await citySeedService.seedCity();
   });
   it('should collect places', async () => {
     await service.collectForCity(cityEntity);
     expect(collected.length).toBeGreaterThan(0);
   });
   ```

- **Assertions**
    - Always use the full property path with `.toEqual()` instead of `.toHaveProperty()`
  ```ts
  expect(sample.cityId).toEqual(cityEntity.id);
  ```
    - Always use the full property path with `.toBeDefined()` instead of `.toHaveProperty()`
  ```ts
  expect(sample.name).toBeDefined();
  ```
    - Check arrays for type and length
  ```ts
  expect(collected).toBeInstanceOf(Array);
  expect(collected).toHaveLength(1);
  ```
    - Avoid `.toMatchObject()`

5. **`afterEach`** — Delete all entities created during the test using `createQueryBuilder`:
   ```ts
   await cityEntityRepository.createQueryBuilder().delete().execute();
   ```

6. **`afterAll`** — Close the testing module:
   ```ts
   await testModule.close();
   ```

### Seed modules and services

- Each entity that needs test data gets a `*.seed.service.ts` and `*.seed.module.ts` next to its entity file (e.g. `city.seed.service.ts`, `city.seed.module.ts`).
- Seed methods are prefixed with `seed` and accept an `overrides` object defaulting to `{}`:
  ```ts
  public async seedCity(overrides: { name?: string; ... } = {}): Promise<CityEntity>
  ```
- Use `this.entityRepository.manager.query()` for raw SQL when the ORM cannot express the operation (e.g. PostGIS geometry inserts).
- Import the `SeedModule` in the test module — never call seed methods directly from `DataSource` in tests.
