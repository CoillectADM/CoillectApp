import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

export default new DataSource({
  type: 'postgres',
  host: 'localhost', // ⚠️ rodando fora do Docker, então use localhost
  port: 5482, // porta mapeada no docker-compose
  username: 'postgres',
  password: 'postgres',
  database: 'app_db',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
