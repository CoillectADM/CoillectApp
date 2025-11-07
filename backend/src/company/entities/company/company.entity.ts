// src/company/entities/company/company.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne
} from 'typeorm';
import { CompanyAddress } from '../company_address/company-address.entity';
import { CompanyContact } from '../company_contact/company-contact.entity';
import { CompanyRepresentative } from '../company_representative/company-representative.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ unique: true })
  cnpj: string;

  @Column({ default: 'company' })
  role: string;

  // 👇 Nova coluna adicionada para rastrear o progresso do cadastro
  @Column({ type: 'varchar', length: 12, default: 'STEP_1' })
registrationStage: 'STEP_1' | 'STEP_2' | 'STEP_3' | 'STEP_4' | 'COMPLETED';


  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => CompanyAddress, address => address.company)
  addresses: CompanyAddress[];

  @OneToMany(() => CompanyContact, contact => contact.company)
  contacts: CompanyContact[];

  @OneToOne(() => CompanyRepresentative, rep => rep.company)
  representative: CompanyRepresentative;
}
