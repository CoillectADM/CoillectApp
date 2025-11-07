// src/user/entities/usuario-telefone.entity.ts

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('usuario_telefone')
export class UserPhoneNumber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  telefone: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_usuario' }) // FK
  usuario: User;
}
