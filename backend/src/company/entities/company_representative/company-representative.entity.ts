// src/company/entities/company-representative.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn
} from 'typeorm';
import { Company } from '../company/company.entity';

@Entity('company_representatives')
export class CompanyRepresentative {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  cpf: string;

  @Column()
  position: string;

  @Column()
  commercialPhone: string;

  @Column()
  email: string;

  @Column()
  address: string;

  @OneToOne(() => Company, company => company.representative)
  @JoinColumn()
  company: Company;
}
