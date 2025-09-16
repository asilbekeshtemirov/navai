import { IsString, IsEnum, IsOptional } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  message: string;

  @IsEnum(['text', 'audio'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  audioUrl?: string;
}