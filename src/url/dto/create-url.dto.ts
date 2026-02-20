import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
export class CreateUrlDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  longUrl: string;
}