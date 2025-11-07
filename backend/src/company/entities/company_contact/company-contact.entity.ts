// src/company/entities/company-contact.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne
} from 'typeorm';
import { Company } from '../company/company.entity';

@Entity('company_contacts')
export class CompanyContact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  receptionPhone: string;

  @Column({ nullable: true })
  adminPhone: string;

  @Column({ nullable: true })
  extension: string;

  @Column({ nullable: true })
  email: string;

  @ManyToOne(() => Company, company => company.contacts)
  company: Company;
}
