import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  /** 이메일 */
  @IsEmail()
  email: string;

  /** 8자 이상의 비밀번호 */
  @IsString()
  @MinLength(8)
  password: string;

  /** 닉네임 */
  @IsString()
  nickname: string;
}