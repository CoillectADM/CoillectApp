import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user/user.entity';
import { Company } from 'src/company/entities/company/company.entity';

export type CollectionRequestStatus =
  | 'PENDING'
  | 'REFUSED'
  | 'SCHEDULED'
  | 'CANCELLED'
  | 'COMPLETED';

@Entity({ name: 'collection_requests' })
export class CollectionRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @ManyToOne(() => Company, { eager: true })
  company: Company;

  @Column({ type: 'varchar', length: 20 })
  status: CollectionRequestStatus;

  @CreateDateColumn()
  requestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduledDate: Date | null;

  @Column({ nullable: true })
  userCpfSnapshot: string;

  @Column({ nullable: true })
  companyCnpjSnapshot: string;

  @Column({ nullable: true })
  userAddressSnapshot: string;
}
