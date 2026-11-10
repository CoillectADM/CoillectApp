import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user/user.entity';
import { Company } from '../../company/entities/company/company.entity';
import { Barrel } from './barrel.entity';

/**
 * Condomínio — classe `Condominium` do diagrama de classes da API.
 * "possui síndico" (app-mobile-sindico) e é atendido por uma empresa coletora
 * (app-mobile-empresa). Os barris do condomínio apontam para ele.
 */
@Entity('condominiums')
export class Condominium {
  @PrimaryGeneratedColumn()
  id: number;

  /** nome */
  @Column({ length: 120 })
  name: string;

  /** endereco */
  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  /** Bairro, exibido na lista de reservatórios do app da empresa. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  neighborhood: string | null;

  /** Síndico responsável (usuário comum, login em /auth/login). */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  sindico: User | null;

  /** Empresa coletora que recebe as solicitações deste condomínio. */
  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  company: Company | null;

  @OneToMany(() => Barrel, (barrel) => barrel.condominium)
  barrels: Barrel[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
