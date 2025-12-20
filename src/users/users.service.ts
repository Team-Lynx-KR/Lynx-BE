import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(userData);
    return await this.usersRepository.save(newUser);
  }

  /** 이메일로 사용자 조회 */
  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({ where: { email } });
    return user ? user : undefined;
  }

  /** 리프레시 토큰 업데이트 */
  async updateRefreshToken(email: string, refreshToken: string): Promise<void> {
    await this.usersRepository.update({ email }, { refreshToken });
  }
}