import { Controller, Post, UploadedFile, UseInterceptors, Res, Req, Get, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import logger from '../../utils/logger';
import { DbService } from '../../config/db.service';
import { AuthGuard } from '../../guards/auth.guard';
import { S3Service } from '../../utils/s3.utils';
import { ConfigService } from '../../config/config.service';
import { Upload } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  private s3Service: S3Service;

  constructor(
    private readonly db: DbService,
    private readonly configService: ConfigService,
  ) {
    this.s3Service = new S3Service(configService);
  }

  @Post('single')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @SwaggerApiResponse({ status: 201, description: 'File uploaded successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Bad request - No file provided' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerApiResponse({ status: 500, description: 'Internal server error' })
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request, @Res() res: Response) {
    const requestId = res.locals.requestId || 'unknown';
    const userId = (req as any).user?.id; // Assuming user is attached to request after auth
    
    logger.info('File upload attempt', { 
      requestId, 
      filename: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size
    });

    if (!file) {
      return ApiResponse.badRequest(res, 'No file provided');
    }

    try {
      // Upload file to S3
      const s3Key = await this.s3Service.uploadFile(file.buffer, file.originalname, file.mimetype);
      
      // Save metadata to database only if database is enabled
      let uploadRecord: Upload | null = null;
      if (this.db.isDatabaseEnabled()) {
        uploadRecord = await this.db.upload.create({
          data: {
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            s3Key: s3Key,
            s3Bucket: this.configService.get('AWS_S3_BUCKET'),
            userId: userId || null,
          },
        });
      }

      // Generate signed URL for access
      const signedUrl = await this.s3Service.getSignedUrl(s3Key);

      const result = {
        id: uploadRecord?.id || 'temp-id',
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: signedUrl,
      };

      logger.info('File uploaded successfully', { requestId, fileId: uploadRecord?.id || 'temp-id' });
      
      return ApiResponse.success(res, result, 'File uploaded successfully');
    } catch (error) {
      logger.error('File upload failed', { requestId, error: error.message });
      return ApiResponse.error(res, 'Failed to upload file');
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get upload by ID' })
  @ApiParam({ name: 'id', description: 'Upload ID', type: 'string' })
  @SwaggerApiResponse({ status: 200, description: 'Upload retrieved successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerApiResponse({ status: 404, description: 'Upload not found' })
  @SwaggerApiResponse({ status: 500, description: 'Internal server error' })
  async getUpload(@Param('id') id: string, @Res() res: Response) {
    const requestId = res.locals.requestId || 'unknown';
    
    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      return ApiResponse.badRequest(res, 'Database is disabled in development mode');
    }
    
    try {
      const upload = await this.db.upload.findUnique({
        where: { id },
      });
      
      if (!upload) {
        return ApiResponse.notFound(res, 'Upload not found');
      }
      
      // Generate signed URL for access
      const signedUrl = await this.s3Service.getSignedUrl(upload.s3Key);
      
      const result = {
        id: upload.id,
        filename: upload.originalName,
        mimetype: upload.mimeType,
        size: upload.size,
        url: signedUrl,
        createdAt: upload.createdAt,
      };
      
      return ApiResponse.success(res, result);
    } catch (error) {
      logger.error('Failed to retrieve upload', { requestId, error: error.message });
      return ApiResponse.error(res, 'Failed to retrieve upload');
    }
  }
}