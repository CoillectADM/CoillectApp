import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIconeUrlToCompanies1764197724946 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN "iconeUrl" VARCHAR NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
      DROP COLUMN "iconeUrl"
    `);
  }

}
