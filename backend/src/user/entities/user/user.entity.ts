import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  status_email: boolean;

  @Column()
  data_nascimento: Date;

  @CreateDateColumn({ name: 'created_at' })
  data_cadastro: Date;

  // Exemplo de relação: um usuário tem vários posts (opcional)
  // @OneToMany(() => Post, post => post.user)
  // posts: Post[];
}
