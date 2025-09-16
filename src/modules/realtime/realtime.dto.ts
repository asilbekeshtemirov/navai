import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SttFileUploadDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Audio file (wav/mp3/ogg/webm)' })
  file: any;
}

export class SttBodyDto {
  @ApiPropertyOptional({ type: 'string', description: 'Audio content as Base64 string', example: 'UklGRiQAAABXQVZF...' })
  audioBase64?: string;

  @ApiPropertyOptional({ type: 'string', description: 'Publicly reachable audio URL', example: 'https://cdn.example.com/audio/sample.wav' })
  audioUrl?: string;
}

export class TtsBodyDto {
  @ApiProperty({ type: 'string', description: 'Text to synthesize', example: 'Salom, dunyo!' })
  text: string;
} 