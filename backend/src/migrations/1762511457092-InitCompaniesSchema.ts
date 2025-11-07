import { MigrationInterface, QueryRunner } from "typeorm";

export class InitCompaniesSchema1762511457092 implements MigrationInterface {
    name = 'InitCompaniesSchema1762511457092';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "companies" (
                "id" SERIAL NOT NULL,
                "name" VARCHAR(100) NOT NULL,
                "email" VARCHAR NOT NULL UNIQUE,
                "password" VARCHAR NOT NULL,
                "cnpj" VARCHAR NOT NULL UNIQUE,
                "role" VARCHAR NOT NULL DEFAULT 'company',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "registrationStage" VARCHAR(12) NOT NULL DEFAULT 'STEP_1',
                CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id")
            );
        `);

        await queryRunner.query(`
            CREATE TABLE "company_addresses" (
                "id" SERIAL NOT NULL,
                "cep" VARCHAR NOT NULL,
                "street" VARCHAR NOT NULL,
                "number" VARCHAR NOT NULL,
                "complement" VARCHAR NULL,
                "neighborhood" VARCHAR NOT NULL,
                "city" VARCHAR NOT NULL,
                "state" VARCHAR NOT NULL,
                "companyId" INTEGER,
                CONSTRAINT "PK_company_addresses_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_company_addresses_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            );
        `);

        await queryRunner.query(`
            CREATE TABLE "company_contacts" (
                "id" SERIAL NOT NULL,
                "receptionPhone" VARCHAR NULL,
                "adminPhone" VARCHAR NULL,
                "extension" VARCHAR NULL,
                "email" VARCHAR NULL,
                "companyId" INTEGER,
                CONSTRAINT "PK_company_contacts_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_company_contacts_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            );
        `);

        await queryRunner.query(`
            CREATE TABLE "company_representatives" (
                "id" SERIAL NOT NULL,
                "name" VARCHAR NOT NULL,
                "cpf" VARCHAR NOT NULL UNIQUE,
                "position" VARCHAR NOT NULL,
                "commercialPhone" VARCHAR NOT NULL,
                "email" VARCHAR NOT NULL,
                "address" VARCHAR NOT NULL,
                "companyId" INTEGER,
                CONSTRAINT "PK_company_representatives_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_company_representatives_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "company_representatives"`);
        await queryRunner.query(`DROP TABLE "company_contacts"`);
        await queryRunner.query(`DROP TABLE "company_addresses"`);
        await queryRunner.query(`DROP TABLE "companies"`);
    }
}
