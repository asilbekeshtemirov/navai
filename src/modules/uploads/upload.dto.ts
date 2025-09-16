import { IsString, IsOptional, IsMimeType } from 'class-validator';

export class UploadFileDto {
  @IsString()
  @IsOptional()
  name?: string;
}