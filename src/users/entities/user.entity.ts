import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  /** 이메일 */
  @Column({ unique: true })
  email: string;

  /** 비밀번호 */
  @Column()
  password: string;

  /** 닉네임 */
  @Column({ unique: true })
  nickname: string;

  /** 리프레시 토큰 */
  @Column({ nullable: true })
  refreshToken: string;

  /** 생성일 */
  @CreateDateColumn()
  createdAt: Date;
}