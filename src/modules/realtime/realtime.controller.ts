import { Controller, Get, Post, Body, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiConsumes, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { InferenceService } from '../inference/inference.service';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { SttFileUploadDto, SttBodyDto, TtsBodyDto } from './realtime.dto';

@ApiTags('realtime')
@ApiExtraModels(SttBodyDto, SttFileUploadDto)
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly inference: InferenceService) {}

  @Get('stt')
  @ApiOperation({ summary: 'WebSocket STT namespace docs', description: 'Connect to Socket.io namespace /ws/stt with auth { apiKey } or header X-API-Key. Events: audio_chunk, audio_done; server emits partial, final, done.' })
  sttDoc() { return { namespace: '/ws/stt' }; }

  @Get('tts')
  @ApiOperation({ summary: 'WebSocket TTS namespace docs', description: 'Connect to Socket.io namespace /ws/tts with auth { apiKey } or header X-API-Key. Events: speak; server emits audio, done.' })
  ttsDoc() { return { namespace: '/ws/tts' }; }

  @Post('stt')
  @ApiOperation({ summary: 'Submit audio for STT (JSON or multipart file)' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(SttBodyDto) },
        { $ref: getSchemaPath(SttFileUploadDto) },
      ],
    },
  })
  @ApiQuery({ name: 'stream', required: false, type: Boolean })
  @UseInterceptors(FileInterceptor('file'))
  async sttOnce(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
    @Query('stream') stream: string,
    @Res() res: Response,
  ) {
    const doStream = stream === 'true' || stream === '1';

    // Prefer uploaded file if present
    let audioBase64 = body?.audioBase64;
    const audioUrl = body?.audioUrl;
    if (file) {
      audioBase64 = file.buffer.toString('base64');
    }

    if (doStream) {
      res.setHeader('Content-Type', 'application/x-ndjson');
      for await (const evt of this.inference.sttStream({ audioBase64, audioUrl })) {
        res.write(JSON.stringify(evt) + '\n');
      }
      return res.end();
    }
    const result = await this.inference.sttInfer({ audioBase64, audioUrl });
    return res.json(result);
  }

  @Post('stt/file')
  @ApiOperation({ summary: 'Upload audio file for STT (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SttFileUploadDto })
  @ApiQuery({ name: 'stream', required: false, type: Boolean })
  @UseInterceptors(FileInterceptor('file'))
  async sttFile(@UploadedFile() file: Express.Multer.File, @Query('stream') stream: string, @Res() res: Response) {
    if (!file) return res.status(400).json({ message: 'file is required' });
    const base64 = file.buffer.toString('base64');
    const doStream = stream === 'true' || stream === '1';
    if (doStream) {
      res.setHeader('Content-Type', 'application/x-ndjson');
      for await (const evt of this.inference.sttStream({ audioBase64: base64 })) {
        res.write(JSON.stringify(evt) + '\n');
      }
      return res.end();
    }
    const result = await this.inference.sttInfer({ audioBase64: base64 });
    return res.json(result);
  }

  @Post('tts')
  @ApiOperation({ summary: 'Submit text for TTS' })
  @ApiBody({ type: TtsBodyDto })
  @ApiQuery({ name: 'stream', required: false, type: Boolean })
  async ttsOnce(@Body() body: any, @Query('stream') stream: string, @Res() res: Response) {
    const doStream = stream === 'true' || stream === '1';
    if (doStream) {
      res.setHeader('Content-Type', 'application/x-ndjson');
      for await (const evt of this.inference.ttsStream({ text: body?.text })) {
        res.write(JSON.stringify(evt) + '\n');
      }
      return res.end();
    }
    const result = await this.inference.ttsInfer({ text: body?.text });
    return res.json(result);
  }
} 