import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** 이메일 */
  @IsEmail()
  email: string;

  /** 비밀번호 */
  @IsString()
  @MinLength(8)
  password: string;
}